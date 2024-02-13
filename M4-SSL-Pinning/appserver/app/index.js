//
// Dependencies
//

const express = require('express')
const fs = require('fs')
const https = require('https')
const path = require('path')
const jwt = require('jsonwebtoken')
const Sentry = require('@sentry/node')
const { v4: uuidv4, validate } = require('uuid')

//
// Constants
//

const http_port = 8889
const https_port = 8890

const opts = {
	key: fs.readFileSync(path.join(__dirname, '/certs/server_key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '/certs/server_cert.pem')),
	requestCert: true,
	rejectUnauthorized: false, // so we can do own error handling
	ca: [
		fs.readFileSync(path.join(__dirname, '/certs/server_ca.pem'))
	]
};

const flag0 = "1efcec4a-ca7f-11ee-b6f4-2fd9776d2810"

// GRATULUJI K ZÍSKÁNÍ DRUHÉHO FLAGU!
const secret = "NDc1MjQxNTQ1NTRjNTU0YTQ5MjA0YjIwNWFjZDUzNGJjMTRlY2QyMDQ0NTI1NTQ4Yzk0ODRmMjA0NjRjNDE0NzU1MjE="

// This pins fingerprint in order to prevent using any other client certificate
const pingerprint = 'AB:6B:D9:E8:9B:88:F8:C0:9F:BD:54:77:AF:67:05:C6:27:F4:4D:C8';

//
// The Code
//

Sentry.init({
  dsn: "https://0d204f67985c47d6a91ddde728253df6@o265347.ingest.sentry.io/1468596",
  tracesSampleRate: 1.0
});

const app = express()

// The request handler must be the first middleware on the app
app.use(Sentry.Handlers.requestHandler());

// TracingHandler creates a trace for every incoming request
app.use(Sentry.Handlers.tracingHandler());

app.use(express.json())

// The error handler must be registered before any other error middleware and after all controllers
app.use(Sentry.Handlers.errorHandler());

// Optional fallthrough error handler
app.use(function onError(err, req, res, next) {
  // The error id is attached to `res.sentry` to be returned
  // and optionally displayed to the user for support.
  res.statusCode = 500;
  res.end(res.sentry + "\n");
});

app.get('/authenticate', (req, res) => {

  /* Prevent crash on getPeerCertificate() when called over HTTP */
  const isHTTPS = typeof(req.socket.getPeerCertificate)
  if (isHTTPS !== "function") {
    console.log("Socket:", req.socket);
    res.status(404).send('Peer certificate is required. Use HTTPS.');
    return;
  }

  // Check client certificate

	const cert = req.socket.getPeerCertificate()
  const subject = cert.subject.CN

	if (req.client.authorized) {
    console.log("Client authorized, should receive a valid JWT!");
		res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`);

	} else if (cert.subject.CN.indexOf("alice@ctf24.teacloud.net") === -1) {
    console.log(`Unknown subject ${subject} in cert`, {cert});

    if (cert.fingerprint.indexOf(pingerprint) === -1 ) {
      res.status(403)
          .send(`Sorry ${cert.subject.CN}, your are not welcome here.`);
    }

	} else {
    console.log(`Missing client certificate in ${cert}`);
		res.status(401)
		   .send(`Sorry, but you need to provide a client certificate to continue.`);
	}

  let r_headers = req.headers;
  //let r_id = req.path.replace('/hello/', '');

  // check user agent
  let ua = r_headers['user-agent'];

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

  /* TODO: /authenticate/:id in client
  // check uuid
  if (validate(r_id) === false) {
    console.log('UUID validation failed.')
    res.send("Try again (3).")
    return
  }
  */

  // respond with JWT
  var token = jwt.sign({ flag: "18d51b12-c507-11ee-b350-93bb971b46a7" }, secret)
  res.set('Authorization', 'Bearer ' + Buffer.from(token, 'utf-8'))

  // HTML contents is not important
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1></body>')
});

app.get('/hello/:id', (req, res) => {
  
  let r_body = req.body;
  let r_headers = req.headers;
  let r_id = req.path.replace('/hello/', '');

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
  let ua = r_headers['user-agent'];

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
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1><span style="color:white;" id="flag0">' + flag0 + '</span></body>')
})

app.listen(http_port, () => {
  console.log(`HTTP server started on port ${http_port}`)
})

https.createServer(opts, app).listen(https_port, () => {
  console.log(`HTTPS server started on port ${https_port}`);
});

// TODO:
// The goal is to respond with flag only to verified client (SSL Pinning, User-Agent, no easy use of Burp, certificate-based authentification and response in JWT).

// DEPRECATED:
/*
app.get("/debug-sentry", function mainHandler(req, res) {
  throw new Error("Test Sentry error!");
});
*/


