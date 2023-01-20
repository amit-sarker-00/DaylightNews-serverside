const express = require("express");
const cors = require("cors");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Decode JWT
function verifyJWT(req, res, next) {
  const authHeader = req.headers.authorization;

  if (!authHeader) {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[1];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded) {
    if (err) {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

//MongoDb Add
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.teba24n.mongodb.net/?retryWrites=true&w=majority`;
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vd49rqv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
});

// Connect to MongoDb
async function run() {
  try {
    const usersCollection = client.db("DaylightNews").collection("users");
    const writersCollection = client.db("DaylightNews").collection("writers");
    const allNewsCollection = client.db("DaylightNews").collection("news");
    const commentsCollection = client.db("DaylightNews").collection("comments");
    const likesCollection = client.db("DaylightNews").collection("likes");
    const votingNewsCollection = client
      .db("DaylightNews")
      .collection("votingNews");

    // Verify Admin
    const verifyAdmin = async (req, res, next) => {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin") {
        return res.status(403).send({ message: "forbidden access" });
      }
      // console.log("Admin true");
      next();
    };

    // Save user email & generate JWT
    app.put("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      // console.log(result);
      res.send({ result, token });
    });

    // Get All User
    app.get("/users", async (req, res) => {
      const users = await usersCollection
        .find({
          role: { $ne: "admin" },
        })
        .toArray();
      res.send(users);
    });

    // Get A Single User
    app.get("/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // delet a user
    app.delete("/users/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    // update a user
    app.patch("/user/:email", async (req, res) => {
      const email = req.params.email;
      const user = req.body;

      const filter = { email: email };
      const options = { upsert: true };
      const updateDoc = {
        $set: user,
      };
      const result = await usersCollection.updateOne(
        filter,
        updateDoc,
        options
      );

      const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: "1d",
      });
      res.send({ result, token });
    });

    // post a writers
    app.post("/writers", async (req, res) => {
      const writer = req.body;
      const result = await writersCollection.insertOne(writer);
      res.send(result);
    });
    // get writers
    app.get("/writers", async (req, res) => {
      const writers = await writersCollection.find({}).toArray();
      res.send(writers);
    });

    // update writer
    app.patch("/writers/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const shop = req.body;
      const query = {
        email: email,
      };
      const options = { upsert: true };
      const updateDoc = {
        $set: shop,
      };
      const result = await writersCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });
    //deleter a writer by id
    app.delete("/writers/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await writersCollection.deleteOne(query);
      res.send(result);
    });
    // post a news
    app.post("/news", verifyJWT, async (req, res) => {
      const news = req.body;
      const result = await allNewsCollection.insertOne(news);
      res.send(result);
    });
    // get all news
    app.get("/news", async (req, res) => {
      const news = await allNewsCollection.find({}).toArray();
      res.send(news);
    });

    // get news for voting
    app.get("/newsForVoting", async (req, res) => {
      const news = await allNewsCollection
        .find({})
        .sort({ _id: -1 })
        .limit(7)
        .toArray();

      res.send(news);
    });
    // voting get data
    app.get("/votingNews", async (req, res) => {
      const data = await votingNewsCollection.find({}).toArray();
      res.send(data);
    });
    // vote put here
    app.put("/votingNews", async (req, res) => {
      const { id } = req.query;
      const filter = { _id: ObjectId(id) };
      const voteData = req.body;

      const options = { upsert: true };

      const updateDoc = {
        $set: {
          vote: {
            Yes: voteData.Yes.Yes,
            No: voteData.No.No,
            No_Opinion: voteData.No_Opinion.No_Opinion,
          },
        },
      };
      const result = await allNewsCollection.updateOne(
        filter,
        updateDoc,
        options
      );
      res.send(result);
    });

    // get news by category
    app.get("/news/:category", async (req, res) => {
      const category = req.params.category;
      const query = { category: category };
      const news = await allNewsCollection.find(query).toArray();
      res.send(news);
    });
    // get news by writer email
    app.get("/news/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      console.log(email);
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail) {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        email,
      };
      const news = await allNewsCollection.find(query).toArray();
      res.send(news);
    });
    // get a single news
    app.get("/news/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const news = await allNewsCollection.findOne(query);
      res.send(news);
    });

    // update a news
    app.patch("/news/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const news = req.body;
      const query = { _id: ObjectId(id) };
      const options = { upsert: true };
      const updateDoc = {
        $set: news,
      };
      const result = await allNewsCollection.updateOne(
        query,
        updateDoc,
        options
      );
      res.send(result);
    });

    // delete a news
    app.delete("/news/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allNewsCollection.deleteOne(query);
      res.send(result);
    });

    // post a comment
    app.post("/comments", verifyJWT, async (req, res) => {
      const comment = req.body;
      const result = await commentsCollection.insertOne(comment);
      res.send(result);
    });

    // get all comments
    app.get("/comments", verifyJWT, async (req, res) => {
      const comments = await commentsCollection.find({}).toArray();
      res.send(comments);
    });

    // get comments by news id
    app.get("/comments/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { newsId: id };
      const comments = await commentsCollection.find(query).toArray();
      res.send(comments);
    });

    // delete a comment
    app.delete("/comments/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await commentsCollection.deleteOne(query);
      res.send(result);
    });

    // get all comments by user email
    app.get("/comments/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const comments = await commentsCollection.find(query).toArray();
      res.send(comments);
    });

    // post a like
    app.post("/likes", verifyJWT, async (req, res) => {
      const like = req.body;
      const result = await likesCollection.insertOne(like);
      res.send(result);
    });

    // get all likes
    app.get("/likes", verifyJWT, async (req, res) => {
      const likes = await likesCollection.find({}).toArray();
      res.send(likes);
    });
    // get likes by news id
    app.get("/likes/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { newsId: id };
      const likes = await likesCollection.find(query).toArray();
      res.send(likes);
    });
    // remove a like
    app.delete("/likes/:id", verifyJWT, async (req, res) => {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await likesCollection.deleteOne(query);
      res.send(result);
    });
    // get all likes by user email
    app.get("/likes/user/:email", verifyJWT, async (req, res) => {
      const email = req.params.email;
      const query = { email: email };
      const likes = await likesCollection.find(query).toArray();
      res.send(likes);
    });
  } catch (error) {
    console.log(error);
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) => {
  res.send("News Portal Server is running...");
});

app.listen(port, () => {
  console.log(`Server is running...on ${port}`);
});
