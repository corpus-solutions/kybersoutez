package cz.corpus.sslpinning

import android.annotation.SuppressLint
import android.content.pm.ApplicationInfo
import android.net.http.SslError
import android.os.Bundle
import android.util.Log
import android.webkit.SslErrorHandler
import android.webkit.WebView
import android.webkit.WebViewClient
import android.widget.Button
import android.widget.Toast
import androidx.appcompat.app.AppCompatActivity
import com.google.gson.Gson
import com.scottyab.rootbeer.RootBeer
import io.sentry.Sentry
import okhttp3.CertificatePinner
import okhttp3.OkHttpClient
import okhttp3.Request
import okio.ByteString.Companion.decodeHex
import org.lsposed.lsparanoid.Obfuscate
import java.io.BufferedReader
import java.io.InputStream
import java.io.InputStreamReader
import java.net.URL
import java.security.KeyStore
import java.security.MessageDigest
import java.security.SecureRandom
import java.security.cert.Certificate
import java.security.cert.CertificateFactory
import java.security.cert.X509Certificate
import java.util.*
import javax.net.ssl.HttpsURLConnection
import javax.net.ssl.KeyManagerFactory
import javax.net.ssl.SSLContext
import javax.net.ssl.SSLSocketFactory
import javax.net.ssl.TrustManagerFactory


@Obfuscate
class MainActivity : AppCompatActivity() {

    var tag:String = "SSLPinning"

    override fun onCreate(savedInstanceState: Bundle?) {

        setTheme(R.style.Theme_SSLPinning)
        super.onCreate(savedInstanceState)

        setContentView(R.layout.activity_main)
        this.title = "CTF.2024"

        val button = findViewById<Button>(R.id.retry)

        button.setOnClickListener {
            Toast.makeText(this@MainActivity, "Retrying...", Toast.LENGTH_SHORT)
                .show()
            Thread {
                verifyConnection()
                runOnUiThread {
                    Toast.makeText(this@MainActivity, "Finished", Toast.LENGTH_SHORT)
                        .show()
                }
            }.start()
        }

        val rootBeer = RootBeer(this)
        if (rootBeer.isRooted) {
            if (this.inDevelopment()) {
                Sentry.captureMessage("Debugging on compromised device.")
                // This is currently allowed.
            } else {
                Sentry.captureMessage("Terminated on compromised device in release mode.")
                Log.d("SSLPinning", "We found indication of root. Application will be terminated.")
                this.finishAndRemoveTask()
                System.exit(0)
            }
        } else {
            Log.d("SSLPinning", "We didn't find indication of root or this is a Debug build.")
            Sentry.captureMessage("Started on valid device.")
        }

        Thread {
            // fetchPins() // this already works, verify is broken now
            verifyConnection()
            //runOnUiThread {}
        }.start()

        setupWebView()
    }

    private fun getPC():String {
        val cp = applicationContext.packageName.split(".").toTypedArray() // cz.corpus.sslpinning
        val pc = cp.reversedArray().joinToString(".") //  sslpinning.corpus.cz
        return pc
    }

    /**
     * Fetch pins using public resource (ssl-pinned)
     */
    private fun fetchPins() {

        val url = URL("https://ssl.thinx.cloud/pin.json")

        // Create SSLContext that uses no specific KeyManager or TrustManager
        // (hopefully it will use system SSL pinning)
        val context = SSLContext.getInstance("TLSv1.3")
        //context.init(kmf.keyManagers, tmf.trustManagers, null)
        context.init(null, null, null)

        val urlConnection = url.openConnection() as HttpsURLConnection
        urlConnection.sslSocketFactory = context.socketFactory

        Log.i(tag, "Fetching certificate pins...")

        try {
            val rd = BufferedReader(
                InputStreamReader(urlConnection.inputStream)
            )
            var line: String?
            while (rd.readLine().also { line = it } != null) {
                Log.d("[verify] SSLCertificatePins", line!!)
                val header = urlConnection.getHeaderField("X-Pin-Challenge")
                if (header !== null && validatePinning(line!!, header, getPC())) {
                    updateDynamicPins(line!!)
                } else {
                    Log.d(tag, "Pinning header not found.")
                }
            }
        } catch (e: java.lang.Exception) {
            if (inDevelopment()) e.printStackTrace()
            e.printStackTrace()
        } finally {
            urlConnection.disconnect()
        }
    }

    private fun inDevelopment(): Boolean {
        return 0 != applicationInfo.flags and ApplicationInfo.FLAG_DEBUGGABLE
    }

    private fun verifyConnection() {

        val url = URL("https://ctf24.teacloud.net:8890/authenticate/" + UUID.randomUUID().toString())

        val cf = CertificateFactory.getInstance("X.509")
        val caInput: InputStream
        val resource: Int

        /*** Select resource based on runtime environment */
        if (this.inDevelopment())
            resource = R.raw.trusted_roots_dev
        else
            resource = R.raw.trusted_roots

        caInput = resources.openRawResource(resource)

        /*** Get CA certificate */
        val ca: Certificate = cf.generateCertificate(caInput)
        Log.d(tag, "[verify:RootCA] ca=" + (ca as X509Certificate).getSubjectDN())

        /*** Create a KeyStore containing our trusted CAs from `trusted_roots` */
        val keyStoreType = KeyStore.getDefaultType()
        Log.d(tag, "[verify:RootCA] Root keyStoreType: " + keyStoreType)

        val keyStore = KeyStore.getInstance(keyStoreType)
        keyStore.load(null, null)

        keyStore.setCertificateEntry("ca", ca)


        // Create a TrustManager that trusts the CAs in our KeyStore
        val tmfAlgorithm = TrustManagerFactory.getDefaultAlgorithm()
        val tmf = TrustManagerFactory.getInstance(tmfAlgorithm)
        tmf.init(keyStore)

        /*** Client Certificate  */
        val pc = getPC()
        val clientKeyStore = KeyStore.getInstance("BKS")
        val certInput = resources.openRawResource(R.raw.alice)

        //try {
            clientKeyStore.load(certInput, pc.toCharArray())
        //} finally {
        //    certInput.close();
        //}

        try {

            // Create a KeyManager that uses our client cert
            val kmf = KeyManagerFactory.getInstance(KeyManagerFactory.getDefaultAlgorithm())
            kmf.init(clientKeyStore, pc.toCharArray()) // this keystore has no password?

            /*** SSL Connection (v1)  */
            // Create an SSLContext that uses our TrustManager and our KeyManager
            val context = SSLContext.getInstance("TLS") // TLSv1.2, TLSv1.3
            context.init(kmf.keyManagers, tmf.trustManagers, SecureRandom())

            /*** HttpsURLConnection with custom socket factory */
            val conn = url.openConnection() as HttpsURLConnection
            conn.sslSocketFactory = context.socketFactory
            val inputstream = conn.inputStream
            val inputstreamreader = InputStreamReader(inputstream)
            val bufferedreader = BufferedReader(inputstreamreader)

            var string: String? = null
            while (bufferedreader.readLine().also { string = it } != null) {
                Log.d("[verify] Response 1", ": $string")
            }

            // Connection to `appserver`
            val urlConnection = url.openConnection() as HttpsURLConnection
            urlConnection.sslSocketFactory = context.socketFactory

            Log.i(tag,"[verify] Authenticating client as Alice")

            val responseCode = urlConnection.responseCode

            if (responseCode != 200) {
                Log.i(tag,"[error] Server returned HTTP Error " + responseCode.toString())
                Sentry.captureMessage("Server HTTP error: "+responseCode.toString())
                // This maybe should call exit or drop an alert

                // TODO: FIXME: Returns Error 500 (probably when certificate is not used – see server log)
                return
            }

            try {
                val rd = BufferedReader(
                    InputStreamReader(urlConnection.inputStream)
                )
                var line: String?
                while (rd.readLine().also { line = it } != null) {
                    Log.d("[verify] Response 2", ": $line")
                }
            } catch (e: java.lang.Exception) {
                Log.d(tag, "[verify] Authentication InputStream Exception:")
                if (this.inDevelopment()) e.printStackTrace()
                Sentry.captureException(e)
            } finally {
                urlConnection.disconnect()
            }

        } catch (e: Exception) {
            Log.d(tag, "[verify] Verification Exception.")
            if (this.inDevelopment()) e.printStackTrace()
            Sentry.captureException(e)
            System.exit(0)
        }
    }


    private fun updateDynamicPins(line: String) {

        // TODO: Update dynamic pins for connections to be used or rather pass further to prevent keeping this in memory?

        val gson = Gson()
        var data = gson.fromJson(line.trimIndent(), PinningModel::class.java)
        //println(data.fingerprints)
        //println(data.timestamp)

        val certificatePinner = CertificatePinner.Builder()

        for (pin in data.fingerprints) {
            certificatePinner.add(pin.name!!, "sha256/" + pin.fingerprint!!)
        }

        // Keep for later
        //return

        // This seems to be missing SSLFactory
        val okHttpClient = OkHttpClient.Builder()
            .certificatePinner(certificatePinner.build())
            .build()

        // Do something with the okHttpClient (call /authenticate/:id) and put result into the WebView
        val url = URL("https://ctf24.teacloud.net:8890/authenticate/" + UUID.randomUUID().toString())

        val request: Request = Request.Builder()
            .url(url)
            .build()

        okHttpClient.newCall(request).execute().use {
                response ->
            {
                Log.d("PinnedResponse", response.body?.string()!!)
                // Inject pinned response HTML to WebView (nothing complex, no images or relative paths needed)
                //val myWebView: WebView = findViewById(R.id.webview)
                //myWebView.loadData(response.body?.string()!!, "text/html; charset=utf-8", "UTF-8")

            }
        }
    }
    private fun hash(data: String): String {
        val bytes = data.toString().toByteArray()
        val md = MessageDigest.getInstance("SHA-256")
        val digest = md.digest(bytes)
        return digest.fold("", { str, it -> str + "%02x".format(it) })
    }

    /***
     * Validates pinning header by calculating hash + salt.
     * Returns false if hashes are not the same.
     */

    fun ByteArray.toHex(): String = joinToString(separator = "") { eachByte -> "%02x".format(eachByte) }
    fun validatePinning(json:String, header:String, pc: String): Boolean {
        val deBase = Base64.getDecoder().decode(header)
        val inHash = hash(pc + "$" + json)
        val inHashEncoded = Base64.getEncoder().encode(inHash.toByteArray())
        val headerHex = deBase.toHex()
        return if (inHash.equals(headerHex)) true else false
    }

    private fun setupWebView() {
        val myWebView: WebView = findViewById(R.id.webview)

        // This should use HttpsURLConnection with client certificate instead (old variant)
        val url = "https://ctf24.teacloud.net/hello/" + UUID.randomUUID().toString()

        myWebView.loadUrl(url)

        myWebView.setWebViewClient(object : WebViewClient() {

            @SuppressLint("NewApi")
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler, error: SslError) {
                when (error.primaryError) {
                    SslError.SSL_UNTRUSTED -> Log.d(
                        tag,
                        "onReceivedSslError: The certificate authority is not trusted." + error.certificate.toString()
                    )
                    SslError.SSL_EXPIRED -> Log.d(
                        tag,
                        "onReceivedSslError: The certificate has expired."
                    )
                    SslError.SSL_IDMISMATCH -> Log.d(
                        tag,
                        "onReceivedSslError: The certificate Hostname mismatch."
                    )
                    SslError.SSL_NOTYETVALID -> Log.d(
                        tag,
                        "onReceivedSslError: The certificate is not yet valid."
                    )
                }
                //handler.proceed()
                handler.cancel()
            }
        })
    }
}

// https://community.letsencrypt.org/t/certificate-is-not-trusted-on-android/120061
// Using cross-signed CA certificate in `trusted_roots` from https://letsencrypt.org/certs/lets-encrypt-x3-cross-signed.pem.txt
