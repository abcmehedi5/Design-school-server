const express = require("express");
const app = express();
const PORT = process.env.PORT || 5000;
const jwt = require("jsonwebtoken");
const cors = require("cors");
// const stripe = require('stripe')(process.env.PAYMENT_SECRET_KEY)
const stripe = require('stripe')('sk_test_51NH4qAG6MyH1bNR3kUQIXDCyOWS5eanGqqB8tbRYusGqq3hloKgzhpDxmWEnbRQEQHu5jfHPzROEun70rrckh1fO00aFp2l4gy')

const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();
// middleware
app.use(cors());
app.use(express.json());

// varify jwt start -----------------------------

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
// varify jwt start -----------------------------

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
    const classCollection = db.collection("classes");
    const cartsCollection = db.collection("carts");
    const feedbackCollection = db.collection("feedback");
    const paymentCollection = db.collection("payment");

    //verify admin  middleware

    const verifyAdmin = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.status !== "admin") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };
    //verify instractor  middleware

    const verifyInstractor = async (req, res, next) => {
      const email = req.decoded.email;
      const query = { email: email };
      const user = await userCollection.findOne(query);
      if (user.status !== "instractor") {
        return res
          .status(403)
          .send({ error: true, message: "forbidden message" });
      }
      next();
    };

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

    app.get("/users", verifyJWT, verifyAdmin, async (req, res) => {
      const userData = req.body;
      console.log(userData);
      try {
        const result = await userCollection.find().toArray();
        res.send(result);
      } catch (error) {
        res.status(500).json({ error: true, message: error.message });
      }
    });

    // check admin
    app.get("/users/admin/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ admin: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { admin: user?.status == "admin" };
      res.send(result);
    });

    // check instractor
    app.get("/users/instractor/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      if (req.decoded.email !== email) {
        res.send({ instractor: false });
      }
      const query = { email: email };
      const user = await userCollection.findOne(query);
      const result = { instractor: user?.status == "instractor" };
      res.send(result);
    });

    // user roll update user, admin , instractor

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

    // all instractor
    app.get("/allInstractor", async (req, res) => {
      const query = {
        status: "instractor",
      };
      const result = await userCollection.find(query).toArray();
      res.send(result);
    });

    // add class api .......
    app.post("/addClass", async (req, res) => {
      const data = req.body;
      try {
        const result = classCollection.insertOne(data);
        res.status(200).json({
          error: false,
          data: result,
          message: "class added successfull",
        });
      } catch (error) {
        res.status(200).json({ error: true, message: error });
      }
    });

    // my classes api
    app.get("/classes", verifyJWT, async (req, res) => {
      const email = req.query.email;
      const filter = {
        instructorEmail: email,
      };

      try {
        const result = await classCollection.find(filter).toArray();
        console.log(result);
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // manage classes
    app.get("/allClasses", verifyJWT, verifyAdmin, async (req, res) => {
      try {
        const result = await classCollection.find().toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });

    // only approved classes
    app.get("/approvedClasses", async (req, res) => {
      try {
        const filter = {
          status: "approved",
        };
        const result = await classCollection.find(filter).toArray();
        res.send(result);
      } catch (error) {
        console.log(error);
      }
    });
    // update status classes

    app.put("/classes/:id", async (req, res) => {
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

        const result = await classCollection.updateOne(
          filter,
          updateDoc,
          options
        );

        res
          .status(200)
          .json({ data: result, message: "status update successfull" });
      } catch (error) {
        res.status(500).json({ error: true, message: error.message });
      }
    });

    // carts api

    app.get("/carts", async (req, res) => {
      const email = req.query.email;
      const filter = {
        email: email,
      };
      const result = await cartsCollection.find(filter).toArray();
      res.send(result);
    });

    app.post("/carts", async (req, res) => {
      const data = req.body;
      const result = await cartsCollection.insertOne(data);
      res.status(200).json({ data: result, message: "selected successfull" });
    });
    // delete carts

    app.delete("/carts/:id", async (req, res) => {
      const id = req.params.id;
      const query = {
        _id: new ObjectId(id),
      };
      const result = await cartsCollection.deleteOne(query);
      res.send(result);
    });

    // send instructor message why not approved courses

    app.post("/feedback", async (req, res) => {
      const data = req.body;
      console.log(data);
      const result = await feedbackCollection.insertOne(data);
      res.send(result);
    });
    app.get("/feedback", async (req, res) => {
      const email = req.query.email;
      const filter = {
        instructorEmail: email,
      };
      const result = await feedbackCollection.find(filter).toArray();
      res.send(result);
    });


    
    
    
    // payment method start -------------------------------------------------------->>>>
    
      // create payment intent
      app.post('/create-payment-intent', verifyJWT, async (req, res) => {
        const { price } = req.body;
        const amount = parseInt(price * 100);
        const paymentIntent = await stripe.paymentIntents.create({
          amount: amount,
          currency: 'usd',
          payment_method_types: ['card']
        });
  
        res.send({
          clientSecret: paymentIntent.client_secret
        })
      })
  
  
      // payment related api
      app.post('/payments', verifyJWT, async (req, res) => {
        const payment = req.body;
        const insertResult = await paymentCollection.insertOne(payment);
  
        const query = { _id: { $in: payment.classesId.map(id => new ObjectId(id)) } }
        const deleteResult = await cartsCollection.deleteMany(query)
        // Increment the "Enroll" field by 1 for each class
        // const updateQuery = { _id: { $in: payment.classesId.map(id => new ObjectId(id)) } };
        // const updateOperation = { $inc: { enroll: 1 } };
        // const updateResult = await classCollection.updateMany(updateQuery, updateOperation);
        // console.log(updateQuery,updateResult);
        // res.send({ insertResult, deleteResult,updateResult });
      })
    
    
    
    
    // payment method end -------------------------------------------------------->>>>


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
