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

const flagOne = "1efcec4a-ca7f-11ee-b6f4-2fd9776d2810"

// GRATULUJI K ZÍSKÁNÍ DRUHÉHO FLAGU!
const secret = "NDc1MjQxNTQ1NTRjNTU0YTQ5MjA0YjIwNWFjZDUzNGJjMTRlY2QyMDQ0NTI1NTQ4Yzk0ODRmMjA0NjRjNDE0NzU1MjE="

// This pins fingerprint in order to prevent using any other client certificate
const pingerprint = 'AB:6B:D9:E8:9B:88:F8:C0:9F:BD:54:77:AF:67:05:C6:27:F4:4D:C8'

//
// The Code
//

const app = express()

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

  /* Prevent crash on getPeerCertificate() when called over HTTP */
  const isHTTPS = typeof (req.socket.getPeerCertificate)
  if (isHTTPS !== "function") {
    console.log("Typeof socket is:", isHTTPS)
    console.log("Socket:", req.socket)
    res.status(415).send('Peer certificate is required. Use HTTPS.')
    return;
  }

  // Check client certificate

  const cert = req.socket.getPeerCertificate()

  if (Object.keys(cert).length == 0) {
    console.log("Socket cert is null (responding with 200 and exiting flow)")
    res.status(200)
      .send(`I'm a teapot`)
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
      res.status(412).send(`Sorry ${cert.subject.CN}, your are not welcome here.`)
      return;
    }

    // Validate pinned client fingerprint
    if (cert.fingerprint.indexOf(pingerprint) === -1) {
      res.status(403).send(`Sorry ${cert.subject.CN}, your are not welcome here.`)
      return;
    }

  }

  let r_headers = req.headers
  let r_id = req.path.replace('/authenticate/', '')

  // check user agent
  let ua = r_headers['user-agent'];

  if (ua.indexOf('Android') == -1) {
    console.log('User-Agent validation failed.')
    res.status(417).send("Try again (1).")
    return
  }

  let rw = r_headers['x-requested-with']

  if (rw.indexOf('cz.corpus.sslpinning') == -1) {
    console.log('X-Requested-With validation failed.')
    res.status(417).send("Try again (2).")
    return
  }

  // check uuid
  if (validate(r_id) === false) {
    console.log('UUID validation failed.')
    res.status(417).send("Try again (3).")
    return
  }

  // respond with JWT
  var token = jwt.sign({ flagTwo: "18d51b12-c507-11ee-b350-93bb971b46a7", uuid: r_id }, secret)
  res.set('Authorization', 'Bearer ' + Buffer.from(token, 'utf-8'))

  // HTML contents is not important
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1><span style="color:white;" id="flagOne">' + flagOne + '</span></body>')
});

// Will deprecate once client certificate authenticated login will be implemented.
app.get('/hello/:id', function mainHandler(req, res) {

  let r_body = req.body
  let r_headers = req.headers
  let r_id = req.path.replace('/hello/', '')

  console.log("GET", { r_body, r_headers, r_id })

  /** sample response:
  {
    host: '192.168.10.10:3333',
    connection: 'keep-alive',
    'upgrade-insecure-requests': '1',
    'user-agent': 'Mozilla/5.0 (Linux; Android 11; sdk_gphone_x86 Build/RSR1.201013.001; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/83.0.4103.106 Mobile Safari/537.36',
    accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,image/webp,image/apng,*\/*;q=0.8,application/signed-exchange;v=b3;q=0.9',
    'x-requested-with': 'cz.corpus.sslpinning',
    'accept-encoding': 'gzip, deflate',
    'accept-language': 'en-US,en;q=0.9'
  }
  */

  // check user agent
  let ua = r_headers['user-agent']

  if (ua.indexOf('Android') == -1) {
    console.log('User-Agent validation failed.')
    res.send("Try again (1).")
    return
  }

  let rw = r_headers['x-requested-with']

  if (rw.indexOf('cz.corpus.sslpinning') == -1) {
    console.log('X-Requested-With validation failed.')
    res.send("Try again (2).")
    return
  }

  // check uuid
  if (validate(r_id) === false) {
    console.log('UUID validation failed.')
    res.send("Try again (3).")
    return
  }

  // respond with JWT
  var token = jwt.sign({ flag: "18d51b12-c507-11ee-b350-93bb971b46a7" }, secret)

  res.set('Authorization', 'Bearer ' + Buffer.from(token, 'utf-8'))
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1><span style="color:white;" id="flagOne">' + flagOne + '</span></body>')
})

/*
app.listen(http_port, () => {
  console.log(`HTTP server started on port ${http_port}`)
})
*/

https.createServer(opts, app).listen(https_port, () => {
  console.log(`HTTPS server started on port ${https_port}`)
});

// DEPRECATED:
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Test Sentry error!")
});


