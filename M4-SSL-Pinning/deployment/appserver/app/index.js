/*
 * This service responds with flag inside JWT token to verified clients only.
 * Verification is based on SSL Pinning, Client Certificate, Bundle ID and User-Agent.
 */

//
// Dependencies
//

// Mandatory
const express = require('express')
const fs = require('fs')
const https = require('https')
const path = require('path')
const jwt = require('jsonwebtoken')
const helmet = require('helmet')
const { validate } = require('uuid')

// Monitoring and Profiling
const Sentry = require('@sentry/node')

//
// Constants
//

const version = require(__dirname + '/package.json').version
console.log(`appserver-v${version}`)

const http_port = 8889 // this is only a fallback port
const https_port = 8890

const opts = {
  key: fs.readFileSync(path.resolve(__dirname + '/certs/', 'server_key.pem')),
  cert: fs.readFileSync(path.resolve(__dirname + '/certs/', 'server_cert.pem')),
  requestCert: true,
  rejectUnauthorized: false, // so we can do own error handling
  ca: [
    fs.readFileSync(path.resolve(__dirname + '/certs/', 'server_ca.pem'))
  ]
};

const flagOne = process.env.FLAG1
const flagTwo = process.env.FLAG2

// JWT signature key ("GRATULUJI K ZÍSKÁNÍ DRUHÉHO FLAGU!")
const secret = "NDc1MjQxNTQ1NTRjNTU0YTQ5MjA0YjIwNWFjZDUzNGJjMTRlY2QyMDQ0NTI1NTQ4Yzk0ODRmMjA0NjRjNDE0NzU1MjE="

// This pins fingerprint in order to prevent using any other client certificate
const pingerprint = 'AB:6B:D9:E8:9B:88:F8:C0:9F:BD:54:77:AF:67:05:C6:27:F4:4D:C8'

//
// The Code
//

const app = express()
app.use(helmet())

Sentry.init({
  dsn: "https://0d204f67985c47d6a91ddde728253df6@o265347.ingest.sentry.io/1468596",
  integrations: [
    // enable HTTP calls tracing
    new Sentry.Integrations.Http({ tracing: true }),
    // enable Express.js middleware tracing
    new Sentry.Integrations.Express({ app }),
  ],
  // Performance Monitoring
  tracesSampleRate: 1.0, //  Capture 100% of the transactions
  // Set sampling rate for profiling - this is relative to tracesSampleRate
  profilesSampleRate: 1.0,
});

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler())

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler())

app.use(express.json())

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler())

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  console.log("ErrorHandler" + res.sentry)
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.get('/authenticate/:id', (req, res) => {

  let r_headers = req.headers
  let r_id = req.path.replace('/authenticate/', '') || false

  console.log("[authenticate] @", new Date().getTime()/1000)
  console.log("Auth=" + req.client.authorized, { r_headers, r_id })

  /* Prevent crash on getPeerCertificate() when called over HTTP */
  const isHTTPS = typeof (req.socket.getPeerCertificate)
  if (isHTTPS !== "function") {
    console.log("Typeof socket is:", isHTTPS)
    console.log("Socket:", req.socket)
    res.status(415).send('Peer certificate is required. Use HTTPS.')
    return;
  }

  // Unauthorized flow
  if (!req.client.authorized) {

    // Check client certificate
    const cert = req.socket.getPeerCertificate()

    if (Object.keys(cert).length == 0) {
      console.log("Auth="+req.client.authorized+", AND cert is null, returning 200: Try again.")
      Sentry.captureMessage("Client not authorized, returning 200: Try again.", "warning")
      res.status(200)
        .send(`Hello Hacker. Try again.`)
      return;
    }

    console.log("Debug incoming cert", { cert })

    const subject = cert.subject.CN

    // This really does not work (why?) so we're using own validation and error handling (below).
    // const authorized = req.client.authorized
    // console.log("Authorized: ", {authorized});

    // Validate subject CN
    if (cert.subject.CN.indexOf("alice@ctf24.teacloud.net") === -1) {
      console.log(`Unknown subject ${subject} in cert`, { cert })

      // Validate issuer CN
      if (cert.issuer.CN.indexOf("ctf24.teacloud.net") === -1) {
        Sentry.captureMessage("Client not authorized, returning 412: Invalid Subject", "warning")
        res.status(412).send(`Sorry ${cert.subject.CN}, your are not welcome here.`)
        return;
      }

      // Validate pinned client fingerprint
      if (cert.fingerprint.indexOf(pingerprint) === -1) {
        Sentry.captureMessage("Client not authorized, returning 412: Fingerprint mismatch", "warning")
        res.status(403).send(`Sorry ${cert.subject.CN}, your are not welcome here.`)
        return;
      }

    }

    Sentry.captureMessage("Client not authorized, passing through to other checks", "debug")

  }

  // check user agent
  let ua = r_headers['user-agent'];

  if (ua.indexOf('okhttp') !== -1) {
    // okhttp/4.9.0 is a valid client at build time
    let st = r_headers['sentry-trace'];
    if (typeof(st) === "undefined") {
      console.log('User-Agent validation failed.')
      res.status(417).send("Try again (4).")
      return
    }
  } else {
    if (ua.indexOf('Dalvik') == -1) {
      Sentry.captureMessage("Client not authorized, returning 417: Invalid User-Agent(1)", "warning")
      console.log('User-Agent validation failed.')
      res.status(417).send("Try again (1).")
      return
    }
  
    if (ua.indexOf('Android') == -1) {
      console.log('User-Agent validation failed.')
      Sentry.captureMessage("Client not authorized, returning 417: Invalid User-Agent(2)", "warning")
      res.status(417).send("Try again (2).")
      return
    }
  }

  // check xuuid (uuid, but must contain 42 on certain position thus being intentionally invalid!)
  if ((validate(r_id) !== false) || (r_id.indexOf("42") !== 24)) {
    let reason;
    if ((validate(r_id) !== false)) reason = "Validator passed when it shouldn't."; // should actually return error
    if (typeof(reason) !== "undefined") console.log('UUID validation failed. Reason:', reason)
    if ((r_id.indexOf("42") === -1)) reason = "Incorrect position:"+r_id.indexOf("42");
    if (typeof(reason) !== "undefined") console.log('UUID validation failed. Reason:', reason)
    if (typeof(reason) !== "undefined") {
      Sentry.captureMessage("Client not authorized, returning 417: Invalid UUID(3)", "warning")
      res.status(417).send("Try again (3).")
      return
    }
  } else {
    console.log("42 index: ", r_id.indexOf("42"))
  }

  // respond with JWT
  var token = jwt.sign({ flag: flagTwo, uuid: r_id }, secret)
  res.set('Authorization', 'Bearer ' + Buffer.from(token, 'utf-8'))

  // HTML contents is not important
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1><p>Find flags hidden in this app’s authentication flow.</p></body>')

  Sentry.captureMessage("Client served.", "info")
});

https.createServer(opts, app).listen(https_port, () => {
  Sentry.captureMessage("HTTPS server restarted", "info")
  console.log(`HTTPS server started on port ${https_port}`)
});
