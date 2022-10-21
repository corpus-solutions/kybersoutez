const express = require('express')
const app = express()
const port = 3333

app.get('/', (req, res) => {
  res.send('Hello World!')
  console.log(req.body);
})

app.listen(port, () => {
  console.log(`Example app listening on port ${port}`)
})
