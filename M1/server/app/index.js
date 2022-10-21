const express = require('express')
const app = express()
const port = 3333

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/', (req, res) => {
  res.send('OK')
  let r = req.body;
  console.log({rbo});
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
