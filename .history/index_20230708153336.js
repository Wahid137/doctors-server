const express = require('express');
const cors = require('cors');
require('dotenv').config();
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion } = require('mongodb');

const app = express()

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gfg0jvx.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

async function run() {
    try {
        const appointmentsCollection = client.db('doctorsProject').collection('appointments');
        const bookingsCollection = client.db('doctorsProject').collection('bookings');

        app.get('/appointments', async (req, res) => {
            const query = {}
            const options = await appointmentsCollection.find(query).toArray()
            res.send(options)
        })

        app.post('/booking', async (req, res) => {
            const booking = req.body;
            const result = await bookingsCollection.insertOne(booking)
        })

    } finally {

    }
}
run().catch(console.dir);


app.get('/', async (req, res) => {
    res.send('doctors portal server is running')
})

app.listen(port, () => {
    console.log(`Doctors portal running on ${port}`)
})