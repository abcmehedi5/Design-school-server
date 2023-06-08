const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
// middleware
app.use(cors());
app.use(express.json());

const verifyJWT = (req, res, next) => {
  const authorization = req.headers.authorization;
  if (!authorization) {
    return res
      .status(401)
      .send({ error: true, message: "unauthorized access" });
  }

  const token = authorization.split(" ")[1];
  jwt.verify(token, process.env.JWT_SECRET, (err, decoded) => {
    if (err) {
      return res
        .status(401)
        .send({ error: true, message: "unauthorized access" });
    }
    req.decoded = decoded;
    next();
  });
};

const uri = `mongodb+srv://${process.env.MONGODB_USER}:${process.env.MONGODB_PASS}@cluster0.13ytubh.mongodb.net/?retryWrites=true&w=majority`;

// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, {
  serverApi: {
    version: ServerApiVersion.v1,
    strict: true,
    deprecationErrors: true,
  },
});

async function run() {
  try {
    // Connect the client to the server	(optional starting in v4.7)
    await client.connect();
    // Send a ping to confirm a successful connection
    await client.db("admin").command({ ping: 1 });
    const db = client.db("design-school");
    const userCollection = db.collection("users");

    // design school api start ------------------------------

    app.post("/jwt", (req, res) => {
      const user = req.body;
      const token = jwt.sign(user, process.env.JWT_SECRET, { expiresIn: "1d" });
      res.send({ token });
    });

    app.post("/users", async (req, res) => {
      const userData = req.body;
      console.log(userData);
      try {
        const result = await userCollection.insertOne(userData);
        res.status(200).json({
          error: false,
          data: result,
          message: "user create successfull",
        });
      } catch (error) {
        res.status(500).json({ error: true, message: error.message });
      }
    });

    //  all users

    app.get("/users", verifyJWT, async (req, res) => {
      const userData = req.body;
      console.log(userData);
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: true, message: error.message });
      }
    });

    // user roll update

    app.put("/users/:id", async (req, res) => {
      const data = req.body.data;
      const id = req.params.id;
      console.log(id, data);
      try {
        const filter = {
          _id: new ObjectId(id),
        };
        const options = { upsert: true };

        const updateDoc = {
          $set: {
            status: data,
          },
        };

        const result = await userCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        res
          .status(200)
          .json({ data: result, message: "role update successfull" });
      } catch (error) {
        res.status(500).json({ error: true, message: error.message });
      }
    });

    // design school api end ------------------------------

    console.log(
      "Pinged your deployment. You successfully connected to MongoDB!"
    );
  } finally {
    // Ensures that the client will close when you finish/error
    // await client.close();
  }
}
run().catch(console.dir);

app.get("/", (req, res) => {
  res.send("design-school server running");
});

app.listen(PORT, () => {
  console.log(`Design-School server is running ${PORT}`);
});
