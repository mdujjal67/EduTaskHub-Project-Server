const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
app.use(cors());
app.use(express.json());



app.get('/', (req, res) => {
  res.send('EduTaskHub Server is running')
})

app.listen(port, () => {
  console.log(`EduTaskHub is running on port ${port}`)
})