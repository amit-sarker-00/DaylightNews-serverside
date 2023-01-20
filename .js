
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.vd49rqv.mongodb.net/?retryWrites=true&w=majority`;

// get all news 
app.get('/news', async (req, res) => {
    const result = await allNewsCollection.find({}).toArray()
    res.send(result)
})
// get search news
app.get("/searchNews", async (req, res) => {
    let query = {};
    const search = req.query.search;

    if (search.length) {
        query = {
            $text: {
                $search: search,
            },
        };
    }
    const result = await allNewsCollection.find(query).toArray()
    res.send(result)
});

// get news for voting 
app.get('/newsForVoting', async (req, res) => {
    const news = await allNewsCollection.find({}).sort({ _id: -1 }).limit(7).toArray()
    res.send(news)
})
// voting get data 

// vote put here 
app.put('/votingNews', async (req, res) => {
    const { id } = req.query
    const filter = { _id: ObjectId(id) }
    const voteData = req.body

    const options = { upsert: true }

    const updateDoc = {
        $set: {
            vote: {
                Yes: voteData.Yes.Yes,
                No: voteData.No.No,
                No_Opinion: voteData.No_Opinion.No_Opinion
            }
        }
    }
    const result = await allNewsCollection.updateOne(filter, updateDoc, options)
    res.send(result)
})