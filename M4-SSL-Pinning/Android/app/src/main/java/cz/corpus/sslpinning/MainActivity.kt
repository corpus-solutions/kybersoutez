package cz.corpus.sslpinning

import android.annotation.SuppressLint
import android.annotation.TargetApi
import android.net.http.SslError
import android.os.Build
import android.os.Bundle
import android.util.Log
import android.webkit.SslErrorHandler
import android.webkit.WebResourceRequest
import android.webkit.WebResourceResponse
import android.webkit.WebView
import android.webkit.WebViewClient
import androidx.appcompat.app.AppCompatActivity
import java.io.ByteArrayInputStream
import java.io.IOException
import java.io.InputStream
import java.nio.charset.StandardCharsets
import java.util.*


class MainActivity : AppCompatActivity() {

    var TAG:String = "MyApp"

    override fun onCreate(savedInstanceState: Bundle?) {

        setTheme(R.style.Theme_SSLPinning)
        super.onCreate(savedInstanceState)
        setContentView(R.layout.activity_main)
        this.title = "CTF.2024"

        val myWebView: WebView = findViewById(R.id.webview)
        val url = "http://192.168.10.10:3333/hello/" + UUID.randomUUID().toString()
        //val url = "http://192.168.10.10:3333/hello/" + UUID.randomUUID().toString()
        myWebView.loadUrl(url)

        myWebView.setWebViewClient(object : WebViewClient() {

            @SuppressLint("NewApi")
            override fun onReceivedSslError(view: WebView?, handler: SslErrorHandler, error: SslError) {
                when (error.primaryError) {
                    SslError.SSL_UNTRUSTED -> Log.d(
                        TAG,
                        "onReceivedSslError: The certificate authority is not trusted." + error.certificate.toString()
                    )
                    SslError.SSL_EXPIRED -> Log.d(
                        TAG,
                        "onReceivedSslError: The certificate has expired."
                    )
                    SslError.SSL_IDMISMATCH -> Log.d(
                        TAG,
                        "onReceivedSslError: The certificate Hostname mismatch."
                    )
                    SslError.SSL_NOTYETVALID -> Log.d(
                        TAG,
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

// Dynamic Pinning: https://www.syxra.cz/pins.json

// TODO:
// 1. Fetch certificate list from URL above
// 2. Use OkHttp and CertificatePinner (https://www.netguru.com/blog/android-certificate-pinning)

