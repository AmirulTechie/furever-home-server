const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
const jwt = require("jsonwebtoken");
dotenv.config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

const uri = process.env.MONGODB_URI;

const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  }
});

const logger = (req, res, next) => {
  console.log(req.params, "from logger");
  next();
};

const verifyToken = (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Login required" });
  try {
    req.user = jwt.verify(token, process.env.BETTER_AUTH_SECRET);
    next();
  } catch {
    return res.status(401).json({ error: "Invalid token" });
  }
};

app.get('/', (req, res) => {
  res.send('FurEver Home API running');
});

async function run() {
  try {
    await client.connect();

    const db = client.db('fureverdb');
    const petsCollection = db.collection('pets');

    app.get('/pets', async (req, res) => {
      const cursor = petsCollection.find();
      const result = await cursor.toArray();
      res.send(result);
    });

    app.get('/pets/:petId', verifyToken, logger, async (req, res) => {
      const petId = req.params.petId;
      if (!ObjectId.isValid(petId)) return res.status(400).json({ error: "Invalid ID" });
      const result = await petsCollection.findOne({ _id: new ObjectId(petId) });
      res.send(result);
    });

    console.log("Successfully connected to MongoDB!");
  } catch (error) {
    console.error("Database connection error:", error);
  }
}

run().catch(console.dir);

app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});