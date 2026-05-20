const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { MongoClient, ServerApiVersion } = require('mongodb');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
dotenv.config();

const app = express();
const port = process.env.PORT || 8000;

app.use(cors());
app.use(express.json());

// test route
app.get('/', (req, res) => {
  res.send('FurEver Home API running');
});

const uri = process.env.MONGODB_URI;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

async function run() {
  try {
    // Connect the client to the server
    await client.connect();
    // Send a ping to confirm a successful connection
    // await client.db("admin").command({ ping: 1 });
    
    const db = client.db('fureverdb');
    const petsCollection = db.collection('pets');

    app.get('/pets', async(req,res)=>{
      const {courseId} = req.params;
      const result = await petsCollection.find().toArray();
      res.send(result);
    })

    app.get('/pets/:petId', async(req,res)=>{
      const petId = req.params.petId;
      const query = { _id: petId };
      const result = await petsCollection.findOne(query);
      res.send(result);
    })


    console.log("Pinged your deployment. You successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}
run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});