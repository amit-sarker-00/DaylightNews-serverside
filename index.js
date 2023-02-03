const express = require("express");
const cors = require("cors");
const SSLCommerzPayment = require("sslcommerz-lts");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");
require("dotenv").config();


const app = express();
const port = process.env.PORT || 8000;

const store_id = process.env.STORE_ID;
const store_passwd = process.env.STORE_PASSWD;
const is_live = false;


app.use(cors());
app.use(express.json());

// Decode JWT
function verifyJWT (req, res, next)
{
  const authHeader = req.headers.authorization;

  if (!authHeader)
  {
    return res.status(401).send({ message: "unauthorized access" });
  }
  const token = authHeader.split(" ")[ 1 ];

  jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function (err, decoded)
  {
    if (err)
    {
      return res.status(403).send({ message: "Forbidden access" });
    }
    // console.log(decoded);
    req.decoded = decoded;
    next();
  });
}

//MongoDb Add
// const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.teba24n.mongodb.net/?retryWrites=true&w=majority`;

const uri = `mongodb+srv://${ process.env.DB_USER }:${ process.env.DB_PASSWORD }@cluster0.vd49rqv.mongodb.net/?retryWrites=true&w=majority`;

const client = new MongoClient(uri, {
  useNewUrlParser: true,
  useUnifiedTopology: true,
  serverApi: ServerApiVersion.v1,
})

// Connect to MongoDb
async function run ()
{
  try
  {
    const usersCollection = client.db("DaylightNews").collection("users");
    const writersCollection = client.db("DaylightNews").collection("writers");
    const allNewsCollection = client.db("DaylightNews").collection("allNews");
    const commentsCollection = client.db("DaylightNews").collection("comments");
    const reactionsCollection = client.db("DaylightNews").collection("reactions");
    const storiesCollection = client.db("DaylightNews").collection("stories");
    const paymentCollection = client.db("DaylightNews").collection("payment");

    const votingNewsCollection = client
      .db("DaylightNews")
      .collection("votingNews");

    // Verify Admin
    const verifyAdmin = async (req, res, next) =>
    {
      const decodedEmail = req.decoded.email;
      const query = { email: decodedEmail };
      const user = await usersCollection.findOne(query);

      if (user?.role !== "admin")
      {
        return res.status(403).send({ message: "forbidden access" });
      }
      // console.log("Admin true");
      next();
    };

    // Save user email & generate JWT
    app.put("/user/:email", async (req, res) =>
    {
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
    app.get("/users", async (req, res) =>
    {
      const users = await usersCollection
        .find({
          role: { $ne: "admin" },
        })
        .toArray();
      res.send(users);
    });

    // Get A Single User
    app.get("/user/:email", verifyJWT, async (req, res) =>
    {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;

      if (email !== decodedEmail)
      {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = { email: email };
      const user = await usersCollection.findOne(query);
      res.send(user);
    });

    // delet a user
    app.delete("/users/:id", verifyJWT, async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await usersCollection.deleteOne(query);
      res.send(result);
    });
    // update a user
    app.patch("/user/:email", async (req, res) =>
    {
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
    app.post("/writers", async (req, res) =>
    {
      const writer = req.body;
      const result = await writersCollection.insertOne(writer);
      res.send(result);
    });
    // get writers
    app.get("/writers", async (req, res) =>
    {
      const writers = await writersCollection.find({}).toArray();
      res.send(writers);
    });

    // update writer
    app.patch("/writers/:email", verifyJWT, async (req, res) =>
    {
      const email = req.params.email;
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail)
      {
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
    app.delete("/writers/:id", verifyJWT, async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await writersCollection.deleteOne(query);
      res.send(result);
    });
    // post a news
    app.post("/news", verifyJWT, async (req, res) =>
    {
      const news = req.body;
      const result = await allNewsCollection.insertOne(news);
      res.send(result);
    });

    // get categories
    app.get('/categories', async (req, res) =>
    {
      const query = {}
      const categories = await allNewsCollection.find(query).toArray()
      const allCategories = categories?.map(cate => cate.category)
      const category = [ ...new Set(allCategories) ]
      res.send(category)
    })

    app.get('/categoryNews', async (req, res) =>
    {
      const category = req.query.category
      const query = { category: category }
      const categoryNews = await allNewsCollection.find(query).toArray()
      res.send(categoryNews)

    })

    // get all news
    app.get('/news', async (req, res) =>
    {
      const query = {}
      const result = await allNewsCollection.find(query).toArray()
      res.send(result)
    })

    app.get('/bannerNews', async (req, res) =>
    {

      const cursor = allNewsCollection.find({})
        .sort({ _id: -1 })
        .limit(7)
      const result = await cursor.toArray()
      res.send(result)
    })

    app.get('/breakingNews', async (req, res) =>
    {
      const query = { category: 'breaking' }
      const breakingNews = await allNewsCollection.find(query).toArray()
      res.send(breakingNews)
    })

    app.get('/trendingNews', async (req, res) =>
    {
      const query = { category: 'HotNews' }
      const trendingNews = await allNewsCollection.find(query).toArray()
      res.send(trendingNews)
    })

    app.get('/letestNews', async (req, res) =>
    {
      const { letest } = req.query
      if (letest)
      {
        const query = { category: letest }
        const letestNews = await allNewsCollection.find(query).toArray()
        res.send(letestNews)
      }

      else
      {
        const query = { category: 'travel' }
        const letestNews = await allNewsCollection.find(query).toArray()
        res.send(letestNews)
      }
    })





    app.get('/articleNews', async (req, res) =>
    {
      const query = { category: 'article' }
      const articleNews = await allNewsCollection.find(query).toArray()
      res.send(articleNews)
    })

    app.get('/recentlyNews', async (req, res) =>
    {
      const recentlyNews = await allNewsCollection.find({}).sort({ _id: -1 }).limit(15).toArray()
      res.send(recentlyNews)

    })
    app.get('/worldNews', async (req, res) =>
    {
      const query = { category: 'World' }
      const worldNews = await allNewsCollection.find(query).sort({ _id: -1 }).toArray()
      res.send(worldNews)

    })

    app.get('/viralNews', async (req, res) =>
    {
      const query = { category: 'viral' }
      const viralNews = await allNewsCollection.find(query).sort({ _id: -1 }).toArray()
      res.send(viralNews)

    })

    app.get('/environmentNews', async (req, res) =>
    {
      const query = { category: 'EnvironmentNews' }
      const environmentNews = await allNewsCollection.find(query).sort({ _id: -1 }).toArray()
      res.send(environmentNews)

    })
    app.get('/voicesNews', async (req, res) =>
    {
      const query = { category: 'voices' }
      const voicesNews = await allNewsCollection.find(query).sort({ _id: -1 }).toArray()
      res.send(voicesNews)

    })

    app.get('/sportsNews', async (req, res) =>
    {
      const query = { category: 'sports' }
      const sportsNews = await allNewsCollection.find(query).sort({ _id: -1 }).toArray()
      res.send(sportsNews)

    })









    // get a single news
    app.get("/news/:id", async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const news = await allNewsCollection.findOne(query);

      res.send(news);
    });
    // district wise news
    app.get("/district/:district", async (req, res) =>
    {
      const district = req.params.district;
      const query = { district: district };
      const news = await allNewsCollection.find(query).toArray();
      res.send(news);
    });
    // get news for voting
    app.get("/newsForVoting", async (req, res) =>
    {
      const news = await allNewsCollection
        .find({})
        .sort({ _id: -1 })
        .limit(7)
        .toArray();

      res.send(news);
    });
    // get search news
    // app.get("/searchNews", async (req, res) => {
    //   let query = {};
    //   const search = req.query.search;

    //   if (search.length) {
    //     query = {
    //       $text: {
    //         $search: search,
    //       },
    //     };
    //   }
    //   const result = await allNewsCollection.find(query).toArray()
    //   res.send(result)
    // });

    // what is redux?



    // voting get data
    app.get("/votingNews", async (req, res) =>
    {
      const data = await votingNewsCollection.find({}).toArray();
      res.send(data);
    });


    // get stroy 
    app.get('/stories', async (req, res) =>
    {
      const result = await storiesCollection.find({}).toArray()
      res.send(result)
    })

    app.get('/stories/:id', async (req, res) =>
    {
      const { id } = req.params
      const query = { _id: ObjectId(id) }
      const result = await storiesCollection.findOne(query)
      res.send(result)
    })
    // vote put here
    app.put("/votingNews", async (req, res) =>
    {
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
    app.get("/news/:category", async (req, res) =>
    {
      const category = req.params.category;
      const query = { category: category };
      const news = await allNewsCollection.find(query).toArray();
      res.send(news);
    });
    // get news by writer email
    app.get("/news/:email", verifyJWT, async (req, res) =>
    {
      const email = req.params.email;
      console.log(email);
      const decodedEmail = req.decoded.email;
      if (email !== decodedEmail)
      {
        return res.status(403).send({ message: "forbidden access" });
      }
      const query = {
        email,
      };
      const news = await allNewsCollection.find(query).toArray();
      res.send(news);
    });


    // update a news
    app.patch("/news/:id", verifyJWT, async (req, res) =>
    {
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
    app.delete("/news/:id", verifyJWT, async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await allNewsCollection.deleteOne(query);
      res.send(result);
    });

    // post a comment
    app.post("/comments", async (req, res) =>
    {
      const comment = req.body;
      const result = await commentsCollection.insertOne({ comment });
      res.send(result);
    });

    // get all comments
    app.get("/comments", async (req, res) =>
    {
      const comments = await commentsCollection.find({}).toArray();
      res.send(comments);
    });

    // get comments by news id
    app.get("/comment/:id", async (req, res) =>
    {
      const id = req.params.id;
      const query = { "comment._id": id };
      const cursor = commentsCollection.find(query);
      const comments = await cursor.toArray();
      res.send(comments);
    });

    // delete a comment
    app.delete("/comment/:id", verifyJWT, async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await commentsCollection.deleteOne(query);
      res.send(result);
    });

    // get all comments by user email
    app.get("/comments/:email", async (req, res) =>
    {
      const email = req.params.email;
      const query = { "comment.email": email };
      const comments = await commentsCollection.find(query).toArray();
      res.send(comments);
    });

    // post a like
    app.put("/reactions", async (req, res) =>
    {
      const { id } = req.query
      const query = { reactionNewsId: id }
      const reaction = req.body;

      const options = { upsert: true }
      const updateDoc = {
        $set: {
          reactionNewsId: id,
          smileEmoji: reaction?.smileEmoji,
          frownEmoji: reaction?.frownEmoji,
          angryEmoji: reaction?.angryEmoji,
          sunglasEmoji: reaction?.sunglasEmoji,
          naturalEmoji: reaction?.naturalEmoji,
        }
      }

      const result = await reactionsCollection.updateOne(query, updateDoc, options);
      res.send(result);
    });

    // get reactions by news id
    app.get("/reactions/:id", async (req, res) =>
    {
      const id = req.params.id;
      const query = { reactionNewsId: id };
      const reactions = await reactionsCollection.findOne(query)
      res.send(reactions);
    });


    // get all reactions
    app.get("/reactions", verifyJWT, async (req, res) =>
    {
      const reactions = await reactionsCollection.find({}).toArray();
      res.send(reactions);
    });


    // remove a like
    app.delete("/reactions/:id", verifyJWT, async (req, res) =>
    {
      const id = req.params.id;
      const query = { _id: ObjectId(id) };
      const result = await reactionsCollection.deleteOne(query);
      res.send(result);
    });
    // get all reactions by user email
    app.get("/reactions/user/:email", verifyJWT, async (req, res) =>
    {
      const email = req.params.email;
      const query = { email: email };
      const reactions = await reactionsCollection.find(query).toArray();
      res.send(reactions);
    });



// payments 
    
    app.post("/payment", async (req, res) =>
    {
      const payment = req.body;
      console.log(payment);


      const transactionId = new ObjectId().toString();
      const data = {
        total_amount: payment?.amount,
        currency: payment?.currency,
        tran_id: transactionId, // use unique tran_id for each api call
        success_url: `${ process.env.SERVER_URL }/payment/success?transactionId=${ transactionId }`,
        fail_url: `${ process.env.SERVER_URL }/payment/fail?transactionId=${ transactionId }`,
        cancel_url: `${ process.env.SERVER_URL }/payment/cancel`,
        ipn_url: `${ process.env.SERVER_URL }/ipn`,
        shipping_method: "Courier",
        product_name: "Computer.",
        product_category: "Electronic",
        product_profile: "general",
        cus_name: payment.paymentPerson,
        cus_email: payment?.email,
        cus_add1: payment?.address,
        cus_add2: "Dhaka",
        cus_city: "Dhaka",
        cus_state: "Dhaka",
        cus_postcode: "1000",
        cus_country: "Bangladesh",
        cus_phone: "01711111111",
        cus_fax: "01711111111",
        ship_name: "Customer Name",
        ship_add1: "Dhaka",
        ship_add2: "Dhaka",
        ship_city: "Dhaka",
        ship_state: "Dhaka",
        ship_postcode: payment?.zipCode,
        ship_country: "Bangladesh",
      };

      // console.log(data);

      const sslcz = new SSLCommerzPayment(store_id, store_passwd, is_live);
      sslcz.init(data).then((apiResponse) =>
      {
        // Redirect the user to payment gateway
        let GatewayPageURL = apiResponse.GatewayPageURL;
        paymentCollection.insertOne({
          ...payment,
          price: payment?.amount,
          transactionId,
          paid: false,
        });
        console.log(uri)
        res.send({ url: GatewayPageURL });
      });
    });

    app.post("/payment/success", async (req, res) =>
    {
      const { transactionId } = req.query;
      console.log(transactionId);
      if (!transactionId)
      {
        return res.redirect(`${ process.env.CLIENT_URL }/payment/fail`);
      }
      const result = await paymentCollection.updateOne(
        { transactionId },
        { $set: { paid: true, paidAt: new Date() } }
      );
      if (result.modifiedCount > 0)
      {
        res.redirect(
          `${ process.env.CLIENT_URL }/bdPayment/success?transectionId=${ transactionId }`
        );
      }
    });

    app.get("/payment/byTransactionId/:id", async (req, res) =>
    {
      const { id } = req.params;
      console.log(id);
      const result = await paymentCollection.findOne({
        transactionId: id,
      });
      console.log(result);
      res.send(result);
    });

    app.post("/payment/fail", async (req, res) =>
    {
      const { transactionId } = req.query;
      if (!transactionId)
      {
        return res.redirect(`${ process.env.CLIENT_URL }/payment/fail`);
      }
      const result = await paymentCollection.deleteOne({ transactionId });
      if (result.deletedCount)
      {
        res.redirect(`${ process.env.CLIENT_URL }/payment/fail`);
      }
    });



  } catch (error)
  {
    console.log(error);
  }
}

run().catch((err) => console.error(err));

app.get("/", (req, res) =>
{
  res.send("News Portal Server is running...");
});

app.listen(port, () =>
{
  console.log(`Server is running...on ${ port }`);
});
