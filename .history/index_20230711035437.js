const express = require('express');
const cors = require('cors');
require('dotenv').config();
const jwt = require('jsonwebtoken');
const port = process.env.PORT || 5000;
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');

const app = express()

// middleware
app.use(cors());
app.use(express.json());


const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.gfg0jvx.mongodb.net/?retryWrites=true&w=majority`;
console.log(uri)
// Create a MongoClient with a MongoClientOptions object to set the Stable API version
const client = new MongoClient(uri, { serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true, } });

//verify token after getting token from local storage
function verifyJWT(req, res, next) {
    const authHeader = req.headers.authorization;
    if (!authHeader) {
        return res.status(401).send({ message: 'unauthorized access' })
    }
    const token = authHeader.split(' ')[1]
    jwt.verify(token, process.env.ACCESS_TOKEN, function (err, decoded) {
        if (err) {
            return res.status(403).send({ message: 'forbidden access' })
        }
        req.decoded = decoded;
        next();
    })

}

async function run() {
    try {
        const appointmentsCollection = client.db('doctorsProject').collection('appointments');
        const bookingsCollection = client.db('doctorsProject').collection('bookings');
        const usersCollection = client.db('doctorsProject').collection('users');

        //make sure you use verifyAdmin after verifyJWT
        const verifyAdmin = async (req, res, next) => {
            const decodedEmail = req.decoded.email;
            const query = { email: decodedEmail }
            const user = await usersCollection.findOne(query);
            if (user?.role !== 'admin') {
                return res.status(403).send({ message: 'Forbidden access' })
            }
            next();
        }

        //in appointmentsCollection have name,slots field need name field only


        //to find available option with available slots
        app.get('/appointments', async (req, res) => {
            const date = req.query.date;
            const email = req.query.email;

            //get available option
            const query = {}
            const options = await appointmentsCollection.find(query).toArray()

            //get booking on specific date for specific email
            const bookingQuery = {
                appointmentDate: date,
                email: email
            }
            const alreadyBooked = await bookingsCollection.find(bookingQuery).toArray()

            options.forEach(option => {
                const optionBooked = alreadyBooked.filter(book => book.treatment === option.name)
                const bookedSlots = optionBooked.map(book => book.slot)
                const remainingSlots = option.slots.filter(slot => !bookedSlots.includes(slot))
                option.slots = remainingSlots;
            })

            res.send(options)
        })


        //to get bookings of bookingModal information
        app.get('/bookings', verifyJWT, async (req, res) => {
            const email = req.query.email;
            const decodedEmail = req.decoded.email;

            if (decodedEmail !== email) {
                return res.status(403).send({ message: 'forbidden access' })
            }

            const query = { email: email }
            const bookings = await bookingsCollection.find(query).toArray()
            res.send(bookings)
        })

        //bookingModal information added in database
        app.post('/bookings', async (req, res) => {
            const booking = req.body;
            const query = {
                appointmentDate: booking.appointmentDate,
                treatment: booking.treatment,
                email: booking.email
            }
            const alreadyBooked = await bookingsCollection.find(query).toArray()
            if (alreadyBooked.length) {
                const message = `You already have booking on ${booking.appointmentDate}`
                return res.send({ acknowledged: false, message })
            }
            const result = await bookingsCollection.insertOne(booking)
            res.send(result)
        })

        //give token for a user, at first check that the user have in usersCollection
        app.get('/jwt', async (req, res) => {
            const email = req.query.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query);
            if (user) {
                const token = jwt.sign({ email }, process.env.ACCESS_TOKEN, { expiresIn: '1h' })
                return res.send({ accessToken: token })
            }
            res.status(403).send({ accessToken: '' })
        })


        //get all users from database
        app.get('/users', async (req, res) => {
            const query = {};
            const users = await usersCollection.find(query).toArray();
            res.send(users)
        })

        //from the users list check that the user is admin or not
        app.get('/users/admin/:email', async (req, res) => {
            const email = req.params.email;
            const query = { email: email }
            const user = await usersCollection.findOne(query)
            res.send({ isAdmin: user?.role === 'admin' })
        })

        //store users information from sign up page
        app.post('/users', async (req, res) => {
            const user = req.body;
            const result = await usersCollection.insertOne(user);
            res.send(result)
        })

        //make admin if user's role is admin then user can make admin 
        app.put('/users/admin/:id', verifyJWT, verifyAdmin, async (req, res) => {
            const id = req.params.id;
            const filter = { _id: new ObjectId(id) }
            const options = { upsert: true };
            const updatedDoc = {
                $set: {
                    role: 'admin'
                }
            }
            const result = await usersCollection.updateOne(filter, updatedDoc, options)
            res.send(result)
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