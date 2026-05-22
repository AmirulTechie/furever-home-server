const dns = require('dns');
dns.setDefaultResultOrder('ipv4first');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const dotenv = require('dotenv');
const express = require('express');
const cors = require('cors');
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
    const jwksRes = await fetch("http://localhost:3000/api/auth/jwks");
    const { keys } = await jwksRes.json();

    const publicKey = await crypto.subtle.importKey(
      "jwk",
      keys[0],
      { name: "Ed25519" },
      false,
      ["verify"]
    );

    const [headerB64, payloadB64, sigB64] = token.split(".");
    const data = new TextEncoder().encode(`${headerB64}.${payloadB64}`);
    const sig = Uint8Array.from(
      atob(sigB64.replace(/-/g, "+").replace(/_/g, "/")),
      (c) => c.charCodeAt(0)
    );

    const valid = await crypto.subtle.verify("Ed25519", publicKey, sig, data);
    if (!valid) return res.status(401).json({ error: "Invalid token" });

    const payload = JSON.parse(Buffer.from(payloadB64, "base64url").toString("utf8"));
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
    const adoptionRequestsCollection = db.collection('adoptionRequests');

    app.get('/pets', async (req, res) => {
      const { search, species } = req.query;
      const query = {};
      if (search) query.petName = { $regex: search, $options: 'i' };
      if (species && species !== 'All') query.species = { $in: [species] };
      const result = await petsCollection.find(query).toArray();
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

    app.patch('/pets/:petId', verifyToken, async (req, res) => {
      const petId = req.params.petId;
      if (!ObjectId.isValid(petId)) return res.status(400).json({ error: "Invalid ID" });
      const updates = req.body;
      delete updates._id;
      const result = await petsCollection.updateOne(
        { _id: new ObjectId(petId) },
        { $set: updates }
      );
      res.send(result);
    });

    app.delete('/pets/:petId', verifyToken, async (req, res) => {
      const petId = req.params.petId;
      if (!ObjectId.isValid(petId)) return res.status(400).json({ error: "Invalid ID" });
      const result = await petsCollection.deleteOne({ _id: new ObjectId(petId) });
      res.send(result);
    });

    app.get('/my-pets', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: "Email required" });
      const result = await petsCollection.find({ ownerEmail: email }).toArray();
      res.send(result);
    });


    app.post('/adoption-requests', verifyToken, async (req, res) => {
      const request = {
        ...req.body,
        status: "pending",
        createdAt: new Date(),
      };
      const result = await adoptionRequestsCollection.insertOne(request);
      res.send(result);
    });

    app.get('/adoption-requests', verifyToken, async (req, res) => {
      const { email } = req.query;
      if (!email) return res.status(400).json({ error: "Email required" });
      const result = await adoptionRequestsCollection
        .find({ requesterEmail: email })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.get('/adoption-requests/pet/:petId', verifyToken, async (req, res) => {
      const { petId } = req.params;
      const result = await adoptionRequestsCollection
        .find({ petId })
        .sort({ createdAt: -1 })
        .toArray();
      res.send(result);
    });

    app.patch('/adoption-requests/:reqId/status', verifyToken, async (req, res) => {
      const { reqId } = req.params;
      const { status, petId } = req.body;

      if (!ObjectId.isValid(reqId)) return res.status(400).json({ error: "Invalid ID" });

      await adoptionRequestsCollection.updateOne(
        { _id: new ObjectId(reqId) },
        { $set: { status } }
      );

      if (status === "approved" && petId) {
        await petsCollection.updateOne(
          { _id: new ObjectId(petId) },
          { $set: { status: "adopted" } }
        );
        await adoptionRequestsCollection.updateMany(
          { petId, _id: { $ne: new ObjectId(reqId) }, status: "pending" },
          { $set: { status: "rejected" } }
        );
      }

      res.send({ success: true });
    });

    app.delete('/adoption-requests/:reqId', verifyToken, async (req, res) => {
      const { reqId } = req.params;
      if (!ObjectId.isValid(reqId)) return res.status(400).json({ error: "Invalid ID" });
      const result = await adoptionRequestsCollection.deleteOne({ _id: new ObjectId(reqId) });
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