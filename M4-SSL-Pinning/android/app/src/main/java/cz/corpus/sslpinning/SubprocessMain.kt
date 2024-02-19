package cz.corpus.sslpinning

import android.os.ParcelFileDescriptor
import android.util.Log
import cz.corpus.sslpinning.MagiskKiller.requestTrace
import java.io.DataOutputStream
import java.util.Arrays

/**
 * @author canyie
 */
object SubprocessMain {
    @JvmStatic
    fun main(args: Array<String>) {
        // Parse fd
        if (args.size != 2 || "--write-fd" != args[0]) {
            val error = "Bad args passed: " + Arrays.toString(args)
            System.err.println(error)
            Log.e(MagiskKiller.TAG, error)
            System.exit(1)
        }
        var writeFd: ParcelFileDescriptor? = null
        try {
            writeFd = ParcelFileDescriptor.adoptFd(args[1].toInt())
        } catch (e: Exception) {
            System.err.println("Unable to parse " + args[1])
            e.printStackTrace()
            Log.e(MagiskKiller.TAG, "Unable to parse " + args[1], e)
            System.exit(1)
        }
        try {
            // Do our work and send the tracer's pid back to app
            val tracer = requestTrace()
            DataOutputStream(ParcelFileDescriptor.AutoCloseOutputStream(writeFd)).use { fos ->
                fos.writeUTF(
                    Integer.toString(tracer)
                )
            }
        } catch (e: Throwable) {
            e.printStackTrace()
            Log.e(MagiskKiller.TAG, "", e)
            System.exit(1)
        }
    }
}
