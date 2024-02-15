const fs = require('node:fs')
const path = require('path')
const node_crypto = require('crypto')
const express = require('express')
const helmet = require('helmet')
const app = express()

//
// Configuration
//

// This would be preferably externally configurable using env var or Docker/Swarm secret
const crypto_salt = process.env.SALT;
const http_port = 8888

//
// Implementation
//

app.use(express.static('static'))
app.use(express.json())
app.use(helmet());

// Reading and parsing existing certificates

function searchFile(dir, fileName) {

  let fileList = []
  const files = fs.readdirSync(dir)
  
  files.forEach(file => {
    const filePath = path.join(dir, file);
    const fileStat = fs.statSync(filePath);
    
    if (fileStat.isDirectory()) {
      searchFile(filePath, fileName);
    } else if (file.endsWith(fileName)) {
      fileList.push(filePath);
    }
  });

  return fileList
}

function getCertificateDetails(certPath) {

  console.log("Fetching certificate from path: " + certPath)
  
  let certData;

  try {
    certData = fs.readFileSync(certPath);
  } catch (e) {
    console.error(e);
    return {}
  }

  if (certData == null) return {}
   
  try {

    let cert = new node_crypto.X509Certificate(certData)
    
    const timestamp = Date.parse(cert.validTo)/1000
    const fingerprint = Buffer.from(cert.fingerprint256.replaceAll(":", ""), 'hex').toString('base64')
    const subject = cert.subject.replace("CN=", "")

    return {
      name: subject,
      fingerprint: fingerprint,
      expires: timestamp
    }

  } catch (e) {
    console.error("Caught exception:", e);
    return {}
  }
}

// HTTP service

app.get('/', (req, res) => {
  res.send("HEALTHCHECK")
});

app.get('/pin.json', (req, res) => {

  let pins = []

  // Read JSON file with statically defined pins
  const pinPath = __dirname + '/pin.json'
  if (fs.existsSync(pinPath)) {
    const data = fs.readFileSync(pinPath, 'utf8')
    pins = JSON.parse(data)
  }

  // Read certificates and dynamically build list of pins
  let paths = searchFile(__dirname + '/data', '.pem')
  
  // add fingerprints if non-existent
  if (typeof(pins.fingerprints) === "undefined") pins.fingerprints = [];

  for (const cert of paths) {
    let certJSON = getCertificateDetails(cert)
    // add only non-empty objects to skip potential error leaks
    if (JSON.stringify(certJSON) !== '{}') pins.fingerprints.push(certJSON)
  }

  // Add current timestamp
  pins.timestamp = Math.floor(Date.now() / 1000) // number of seconds since Unix epoch
  
  var hash = node_crypto.createHash('sha256').update(crypto_salt + "$" + JSON.stringify(pins)).digest('base64');

  // Sign with a challenge (to be verifiable on the client side using hash+salt)
  
  // To validate the challenge, client must calculate hash of received JSON
  // The hash in Base64 form must be same as the X-Pin-Challenge, otherwise the pinning should be rejected,
  res.set('X-Pin-Challenge', hash)
  console.log('X-Pin-Challenge: ', hash)
  console.log(pins)
  res.send(pins);
  
});

// Serve preferably over HTTPS only (SSL will be unwrapped using Traefik router)
app.listen(http_port, () => {
  console.log(`SSL Pinning service started on port ${http_port}`)
})