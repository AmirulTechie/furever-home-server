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

const verifyToken = async (req, res, next) => {
  const token = req.headers.authorization?.split(" ")[1];
  if (!token) return res.status(401).json({ error: "Login required" });

  try {
    // fetch the JWKS (public keys) from better-auth
    const jwksRes = await fetch("http://localhost:3000/api/auth/jwks");
    const { keys } = await jwksRes.json();

    // import the public key
    const publicKey = await crypto.subtle.importKey(
      "jwk",
      keys[0],
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    // split the token
    const [headerB64, payloadB64, sigB64] = token.split(".");

    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);

    // decode base64url signature
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify("Ed25519", publicKey, sig, data);
    if (!valid) return res.status(401).json({ error: "Invalid token" });

    // decode payload
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64url").toString("utf8")
    );

    req.user = payload;
    next();
  } catch (err) {
    console.log("Auth error:", err.message);
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
    app.post('/pets', verifyToken, async (req, res) => {
    const pet = req.body;
    const result = await petsCollection.insertOne(pet);
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