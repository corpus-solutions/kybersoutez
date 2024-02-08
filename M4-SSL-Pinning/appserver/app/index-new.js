const express = require('express')
const fs = require('fs');
const https = require('https');
const path = require('path');
const jwt = require('jsonwebtoken');
const { v4: uuidv4, validate } = require('uuid');

const app = express()
app.use(express.static('static'))

const opts = {
	key: fs.readFileSync(path.join(__dirname, '/certs/server_key.pem')),
	cert: fs.readFileSync(path.join(__dirname, '/certs/server_cert.pem')),
	requestCert: true,
	rejectUnauthorized: false, // so we can do own error handling
	ca: [
		fs.readFileSync(path.join(__dirname, '/certs/server_cert.pem'))
	]
};

const http_port = 3333
const https_port = 4433

// GRATULUJI K ZÍSKÁNÍ DRUHÉHO FLAGU!
const secret = "NDc1MjQxNTQ1NTRjNTU0YTQ5MjA0YjIwNWFjZDUzNGJjMTRlY2QyMDQ0NTI1NTQ4Yzk0ODRmMjA0NjRjNDE0NzU1MjE="

app.use(express.json())

app.get('/authenticate', (req, res) => {
	const cert = req.socket.getPeerCertificate();

	if (req.client.authorized) {
		res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`);

	} else if (cert.subject) {
		res.status(403)
			 .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`);

	} else {
		res.status(401)
		   .send(`Sorry, but you need to provide a client certificate to continue.`);
	}
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

  // check client certificate?

  // respond with JWT
  var token = jwt.sign({ flag: "18d51b12-c507-11ee-b350-93bb971b46a7", uuid: r_id }, secret)
  res.set('Authorization', 'Bearer ' + Buffer.from(token, 'utf-8'))
  res.send('<html><head><title></title><body><h1>Hello hacker.</h1><span style="color:white;">' + Buffer.from(token, 'utf-8') + '</span></body>')
})

app.listen(http_port, () => {
  console.log(`HTTP server started on port ${http_port}`)
})

https.createServer(opts, app).listen(https_port, () => {
  console.log(`HTTPS server started on port ${https_port}`);
});

// should be called over HTTPS only
app.get('/authenticate/:uuid', (req, res) => {

  const sock = req.socket;

  if (typeof(sock) === "undefined") {
    res.status(401).send('Socket missing');
    return;
  }

  if (typeof(req.socket.getPeerCertificate) !== "function") {
    console.log("Not a SSL connection!");
    res.status(401)
		   .send(`Sorry, but you need to provide a client certificate to continue.`);
    return;
  }

	const cert = req.socket.getPeerCertificate();

	if (req.client.authorized) {
		res.send(`Hello ${cert.subject.CN}, your certificate was issued by ${cert.issuer.CN}!`);

	} else if (cert.subject) {
		res.status(403)
			 .send(`Sorry ${cert.subject.CN}, certificates from ${cert.issuer.CN} are not welcome here.`);

	} else {
		res.status(401)
		   .send(`Sorry, but you need to provide a client certificate to continue.`);
	}
});

// TODO:
// The goal is to respond with flag only to verified client (SSL Pinning, User-Agent, no easy use of Burp, ideally certificate-based authentification and response in JWT).
