const express = require('express')
const app = express()
const port = 3333

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
  let r_body = req.body;
  let r_headers = req.headers;
  console.log("GET", { r_body, r_headers });
})

app.post('/', (req, res) => {
  res.send('OK')
  let r_body = req.body;
  let r_headers = req.headers;
  console.log("POST", { r_body, r_headers });
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
