const express = require('express');
const cors = require('cors');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const app = express();
const jwt = require('jsonwebtoken'); //for jwt setup
const cookieParser = require('cookie-parser'); //for cookie parser
require('dotenv').config()
const port = process.env.PORT || 5000;

// middleware
const corsOptions = {
  origin: ['http://localhost:5173',
    'https://edutaskhub-80dcb.web.app',
    'https://edutaskhub-80dcb.firebaseapp.com'
  ],
  credentials: true,
  optionSuccessStatus: 200,
}
app.use(cors(corsOptions));
app.use(express.json());
app.use(cookieParser());

// --------------------------MongoDB Start-------------------------------

const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.7tyfnet.mongodb.net/?retryWrites=true&w=majority&appName=Cluster0`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});


//-------- customized middleware------------
const logger = async (req, res, next) => {
  console.log('user > url called:', req.method, req.host, req.url);
  next()
};

// const verifyToken = async (req, res, next) => {   
//   const token = req?.cookies?.token;
//   console.log('value of token in middleware:', token)

//   if (!token) {      //if no token return with error
//     return res.status(401).send({ message: 'unauthorized access' })
//   }

//   jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, (err, decoded) => {    // token verify
//     // error
//     if (err) {
//       console.log(err);
//       return res.status(401).send({ message: 'unauthorized access' })
//     }
//     // if token is valid then it would be decoded
//     console.log('value in the token:', decoded)
//     req.user = decoded
//     next();
//     // now go to any api and use condition (like booking) where you want to check the owner is the real owner to receive the data
//   })

// }


const cookieOption = {
  httpOnly: true,
  secure: process.env.NODE_ENV === 'production' ? true : false,
  sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'strict',
};


async function run() {
  try {
    const featuresCollection = client.db('EduTaskHub').collection('features');
    const assignmentCollection = client.db('EduTaskHub').collection('createdAssignments');
    const submittedAssignmentCollection = client.db('EduTaskHub').collection('submittedAssignments');
    const subscribeCollection = client.db('EduTaskHub').collection('subscribers');


    // -------------auth related api--------------
    app.post('/jwt', async (req, res) => {
      const user = req.body;
      console.log(user);
      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1h' }); //token generate

      // the commented code would work only localhost but bellow codes would work with production and localhost also.
      res.cookie('token', token, cookieOption)
        .send({ success: true })
    })

    // clear cookie after logout
    app.post("/logout", async (req, res) => {
      const user = req.body;
      console.log("logging out", user);
      res
        .clearCookie("token", { ...cookieOption, maxAge: 0 })
        .send({ success: true });
    });




    // ----------------services related api -------------------

    // read and get all features data
    app.get('/features', async (req, res) => {
      const cursor = featuresCollection.find();   //In one line: const result = await featuresCollection.find().toArray()
      const result = await cursor.toArray();
      res.send(result);
    });


    // read and get specific data
    app.get('/createdAssignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await assignmentCollection.findOne(query);
      res.send(result);
    });


    // subscribe data receive from client side visitor
    app.post('/subscriber', async (req, res) => {
      const subscriber = req.body
      console.log(subscriber)
      const result = await subscribeCollection.insertOne(subscriber)
      res.send(result)
    });


    app.get('/subscriber', async (req, res) => {
      console.log(req.query.email, req.user);

      // check if the token owner is the right owner to receive data
      console.log('token owner info', req.user)
      // if (req.user.email !== req.query.email) {
      //   return res.status(403).send({ message: 'forbidden access' })
      // }

      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await subscribeCollection.find(query).toArray()
      res.send(result)
    })


    // get submitted assignment data from client side & send to database
    app.post('/submittedAssignments', async (req, res) => {
      const submittedAssignment = req.body
      console.log(submittedAssignment)
      const result = await submittedAssignmentCollection.insertOne(submittedAssignment)
      res.send(result)
    });



    // read all pending assignment data for pending assignment page
    app.get('/submittedAssignments', async (req, res) => {
      const result = await submittedAssignmentCollection.find().toArray()
      res.send(result)
    });



    // for only my submitted assignment data
    app.get('/submittedAssignments', async (req, res) => {
      console.log(req.query.email, req.user);

      // check if the token owner is the right owner to receive data
      console.log('token owner info', req.user)
      if (req.user.email !== req.query.email) {
        return res.status(403).send({ message: 'forbidden access' })
      }

      let query = {}
      if (req.query?.email) {
        query = { email: req.query.email }
      }
      const result = await submittedAssignmentCollection.find(query).toArray()
      res.send(result)
    })



    // read and get specific submitted data
    app.get('/submittedAssignments/:id', async (req, res) => {
      const id = req.params.id;
      const query = { _id: new ObjectId(id) }
      const result = await submittedAssignmentCollection.findOne(query);
      res.send(result);
    });



    // get posted assignment data from client side & send to database
    app.post('/createdAssignments', async (req, res) => {
      const createdAssignment = req.body
      console.log(createdAssignment)
      const result = await assignmentCollection.insertOne(createdAssignment)
      res.send(result)
    });



    // read all create assignment data
    app.get('/createdAssignments', async (req, res) => {
      const result = await assignmentCollection.find().toArray()
      console.log(result)
      res.send(result)
    });



    // delete a assignment data
    app.delete('/createdAssignments/:id', async (req, res) => {
      const id = req.params.id
      const query = { _id: new ObjectId(id) }
      const result = await assignmentCollection.deleteOne(query)
      res.send(result)
    });



    // for update data
    app.put('/createdAssignments/:id', async (req, res) => {
      const id = req.params.id;
      const filter = { _id: new ObjectId(id) }
      const updatedAssignment = req.body;
      console.log(updatedAssignment);
      const updateDoc = {
        $set: {
          title: updatedAssignment.title,
          date: updatedAssignment.date,
          description: updatedAssignment.description,
          marks: updatedAssignment.marks,
          level: updatedAssignment.level,
          imageURL: updatedAssignment.imageURL
        }
      };
      const result = await assignmentCollection.updateOne(filter, updateDoc)
      res.send(result)
    })


    // Connect the client to the server	(optional starting in v4.7)
    // await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

// -----------------------------MongoDB End-----------------------------




app.get('/', (req, res) => {
  res.send('EduTaskHub Server is running')
})

app.listen(port, () => {
  console.log(`EduTaskHub is running on port ${port}`)
})