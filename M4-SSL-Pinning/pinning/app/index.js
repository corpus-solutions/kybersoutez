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
const bcrypto = require("bcrypt")
const crypto_rounds = 14
const crypto_salt = "sslpinning.corpus.cz";
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
  const cert = new node_crypto.X509Certificate(fs.readFileSync(certPath))

  const timestamp = Date.parse(cert.validTo)/1000
  const fingerprint = Buffer.from(cert.fingerprint256.replaceAll(":", ""), 'hex').toString('base64')
  const subject = cert.subject.replace("CN=", "")

  return {
    name: subject,
    fingerprint: fingerprint,
    expires: timestamp
  }
}

// HTTP service

app.get('/pin.json', (req, res) => {

  let pins = []

  // Read JSON file with statically defined pins
  if (fs.existsSync('pin.json')) {
    const data = fs.readFileSync('pin.json', 'utf8')
    pins = JSON.parse(data)
  }

  // Read certificates and dynamically build list of pins
  let paths = searchFile(__dirname + '/data', '.pem')
  for (const cert of paths) {
    const certJSON = getCertificateDetails(cert)
    // add fingerprints if non-existent
    if (typeof(pins.fingerprints) === "undefined") pins.fingerprints = [];
    pins.fingerprints.push(certJSON)
  }

  // Add current timestamp
  pins.timestamp = Math.floor(Date.now() / 1000) // number of seconds since Unix epoch
  
  // Sign with a challenge (to be verifiable on the client side using hash+salt)
  bcrypto.genSalt(crypto_rounds)
  .then(salt => {
    console.log('Salt: ', salt+':'+crypto_salt)
    return bcrypto.hash(JSON.stringify(pins), salt+':'+crypto_salt)
  })
  .then(hash => {
    return Buffer.from(hash).toString('base64')
  })
  .then(challenge => {
    // To validate the challenge, client must calculate hash of received JSON
    // The hash in Base64 form must be same as the X-Pin-Challenge, otherwise the pinning should be rejected,
    res.set('X-Pin-Challenge', challenge)
    console.log('X-Pin-Challenge: ', challenge)
    console.log(pins)
    res.send(pins);
  })
  .catch(err => console.error(err.message))
});

// Serve preferably over HTTPS only (SSL will be unwrapped using Traefik router)
app.listen(http_port, () => {
  console.log(`SSL Pinning service started on port ${http_port}`)
})