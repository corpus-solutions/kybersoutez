package cz.corpus.sslpinning

import android.annotation.SuppressLint
import android.os.Build
import android.os.ParcelFileDescriptor
import android.os.SystemClock
import android.system.Os
import android.util.Log
import java.io.BufferedReader
import java.io.Closeable
import java.io.DataInputStream
import java.io.File
import java.io.FileDescriptor
import java.io.FileInputStream
import java.io.FileReader
import java.io.IOException
import java.lang.reflect.Method
import java.nio.charset.StandardCharsets
import java.util.concurrent.Callable

import android.R.attr.top

/**
 * @author canyie
 */
object MagiskKiller {
    const val TAG = "MagiskKiller"

    /** Found some one tracing us (perhaps MagiskHide)  */
    const val FOUND_TRACER = 1 shl 0

    /** Bootloader is unlocked  */
    const val FOUND_BOOTLOADER_UNLOCKED = 1 shl 1

    /** Device is running a self-signed ROM  */
    const val FOUND_BOOTLOADER_SELF_SIGNED = 1 shl 2

    /** Riru installed  */
    const val FOUND_RIRU = 1 shl 3

    /** Some system properties are modified by resetprop (a tool provided by Magisk)  */
    const val FOUND_RESETPROP = 1 shl 4

    /** Found active `magisk su` session (the detection method used by HSBC app)  */
    const val FOUND_MAGISK_PTS = 1 shl 5
    fun loadNativeLibrary() {
        System.loadLibrary("safetychecker")
    }

    fun detect(apk: String?): Int {
        val detectTracerTask = detectTracer(apk)
        var result: Int
        result = detectProperties()
        result = result or detectMagiskPts()
        val tracer: Int
        tracer = try {
            detectTracerTask.call()
        } catch (e: Exception) {
            throw RuntimeException("wait trace checker", e)
        }
        if (tracer != 0) {
            Log.e(TAG, "Found magiskd $tracer")
            result = result or FOUND_TRACER
        }
        return result
    }

    fun requestTrace(): Int {
        // Here we are running in the subprocess which has PPID=1 and process name="zygote"
        // Just in case, touch app_process to trigger inotify monitor (monitored by MagiskHide)
        try {
            FileInputStream("/system/bin/app_process").use { fis -> fis.read() }
        } catch (e: IOException) {
            Log.e(TAG, "touch app_process", e)
        }

        // Wait magiskd to receive inotify event and trace us
        SystemClock.sleep(2000)

        // Read the tracer process from /proc/self/status
        return tracer
    }

    fun detectTracer(apk: String?): Callable<Int> {
        // Magisk Hide will attach processes with name=zygote/zygote64 and ppid=1
        // Orphan processes will have PPID=1
        // The return value is the pipe to communicate with the child process
        val rawReadFd = forkOrphan(apk)
        if (rawReadFd < 0) throw RuntimeException("fork failed")
        val readFd = ParcelFileDescriptor.adoptFd(rawReadFd)
        return Callable {
            DataInputStream(ParcelFileDescriptor.AutoCloseInputStream(readFd)).use { fis ->
                return@Callable fis.readUTF().toInt()
            }
        }
    }

    val tracer: Int
        get() {
            try {
                BufferedReader(FileReader("/proc/self/status")).use { br ->
                    var line: String
                    while (br.readLine().also { line = it } != null) {
                        if (line.startsWith("TracerPid:")) {
                            return line.substring("TracerPid:".length).trim { it <= ' ' }.toInt()
                        }
                    }
                }
            } catch (e: IOException) {
                throw RuntimeException("read tracer", e)
            }
            return 0
        }

    fun detectProperties(): Int {
        var result = 0
        try {
            result = detectBootloaderProperties()
            result = result or detectDalvikConfigProperties()
        } catch (e: Exception) {
            Log.e(TAG, "Failed to check props", e)
        }
        return result
    }

    private fun detectBootloaderProperties(): Int {
        var result = 0
        // The better way to get the filename would be `getprop -Z`
        // But "-Z" option requires Android 7.0+, and I'm lazy to implement it
        val bootloader: PropArea =
            PropArea.any("bootloader_prop", "exported2_default_prop", "default_prop")
                ?: return 0
        var values = bootloader.findPossibleValues("ro.boot.verifiedbootstate")
        // ro properties are read-only, multiple values found = the property has been modified by resetprop
        if (values.size > 1) {
            result = result or FOUND_RESETPROP
        }
        for (value in values) {
            if ("orange" == value) {
                result = result or FOUND_BOOTLOADER_UNLOCKED
                result = result and FOUND_BOOTLOADER_SELF_SIGNED.inv()
            } else if ("yellow" == value && result and FOUND_BOOTLOADER_UNLOCKED == 0) {
                result = result or FOUND_BOOTLOADER_SELF_SIGNED
            }
        }
        values = bootloader.findPossibleValues("ro.boot.vbmeta.device_state")
        if (values.size > 1) {
            result = result or FOUND_RESETPROP
        }
        for (value in values) {
            if ("unlocked" == value) {
                result = result or FOUND_BOOTLOADER_UNLOCKED
                result = result and FOUND_BOOTLOADER_SELF_SIGNED.inv()
                break
            }
        }
        return result
    }

    private fun detectDalvikConfigProperties(): Int {
        var result = 0
        val dalvikConfig: PropArea =
            PropArea.any("dalvik_config_prop", "exported_dalvik_prop", "dalvik_prop")
                ?: return 0
        val values = dalvikConfig.findPossibleValues("ro.dalvik.vm.native.bridge")
        if (values.size > 1) {
            result = result or FOUND_RESETPROP
        }
        for (value in values) {
            if ("libriruloader.so" == value) {
                result = result or FOUND_RIRU
                break
            }
        }
        return result
    }

    // Scan /dev/pts and check if there is an alive magisk pts
    // Use `magisk su` to open a root session to test it
    @SuppressLint("PrivateApi", "DiscouragedPrivateApi")
    private fun detectMagiskPts(): Int {
        val getFileContext: Method?

        // Os.getxattr is available since Oreo, fallback to getFileContext on pre O
        if (Build.VERSION.SDK_INT < Build.VERSION_CODES.O) {
            try {
                getFileContext = Class.forName("android.os.SELinux")
                    .getDeclaredMethod("getFileContext", String::class.java)
                getFileContext.isAccessible = true
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to reflect getFileContext", e)
                return 0
            }
        } else {
            getFileContext = null
        }

        // Listing files under /dev/pts is not possible because of SELinux
        // So we manually recreate the folder structure
        val basePts = File("/dev/pts")
        for (i in 0..1023) {
            val pts = File(basePts, Integer.toString(i))

            // No more pts, break.
            if (!pts.exists()) break

            // We found an active pts, check if it has magisk context.
            try {
                var ptsContext: String
                ptsContext = if (getFileContext != null) {
                    getFileContext.invoke(null, pts.getAbsolutePath()) as String
                } else {
                    @SuppressLint("NewApi", "LocalSuppress") val raw =
                        Os.getxattr(pts.getAbsolutePath(), "security.selinux")
                    // Os.getxattr returns the raw data which includes the C-style terminator ('\0')
                    // We need to manually exclude it
                    var terminatorIndex = 0
                    while (terminatorIndex < raw.size && raw[terminatorIndex].toInt() != 0) {
                        terminatorIndex++
                    }
                    String(raw, 0, terminatorIndex, StandardCharsets.UTF_8)
                }
                if ("u:object_r:magisk_file:s0" == ptsContext) return FOUND_MAGISK_PTS
            } catch (e: Throwable) {
                Log.e(TAG, "Failed to check file context of $pts", e)
            }
        }
        return 0
    }

    private fun closeQuietly(closeable: Closeable?) {
        if (closeable != null) try {
            closeable.close()
        } catch (ignored: IOException) {
        }
    }

    private fun closeQuietly(fd: FileDescriptor?) {
        if (fd != null) try {
            Os.close(fd)
        } catch (ignored: Exception) {
        }
    }

    private external fun forkOrphan(apk: String?): Int
}
