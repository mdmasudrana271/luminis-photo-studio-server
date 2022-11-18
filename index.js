const express = require('express');
const cors = require('cors');
const jwt = require('jsonwebtoken');
const { MongoClient, ServerApiVersion, ObjectId } = require('mongodb');
const port = process.env.PORT || 5000;
require('dotenv').config()
const app = express();

// middleware 

app.use(cors())
app.use(express.json())




const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASSWORD}@cluster0.8tifwil.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, { useNewUrlParser: true, useUnifiedTopology: true, serverApi: ServerApiVersion.v1 });


// verify jwt token and handle errors  

function verifyJWT(req, res, next){
    const authHeader = req.headers.authorization;

    if(!authHeader){
        return res.status(401).send({message: 'unauthorized access'});
    }
    const token = authHeader.split(' ')[1];

    jwt.verify(token, process.env.ACCESS_TOKEN_SECRET, function(err, decoded){
        if(err){
            return res.status(403).send({message: 'Forbidden Access'});
        }
        req.decoded = decoded;
        next();
    })
}


async function run(){
    try{

        // collections 

        const serviceCollection = client.db('photography').collection('services')
        const reviewCollection = client.db('photography').collection('reviews')

        // get jwt token from client side

        app.post('/jwt', (req, res) =>{
            const user = req.body;
            const token = jwt.sign(user, process.env.ACCESS_TOKEN_SECRET, { expiresIn: '1d'})
            res.send({token})
        })

        // create api for home page services 

        app.get('/works', async(req, res)=>{
            const query = {}
            const cursor = serviceCollection.find(query)
            const works = await cursor.sort({$natural: -1 }).limit(3).toArray()
            res.send(works)
        })

        // create api for service route services and load all services 

        app.get('/services', async(req, res)=>{
            const query = {}
            const cursor = serviceCollection.find(query)
            const services = await cursor.sort({$natural: -1 }).toArray()
            res.send(services)
        })

        // get single service by id for service details 

        app.get('/services/:id', async(req,res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)};
            const service = await serviceCollection.findOne(query);
            res.send(service)
        })

        // create api for add service 

        app.post('/services',verifyJWT, async(req, res)=>{
            const service = req.body;
            const result = await serviceCollection.insertOne(service)
            res.send(result)
        })

        // add review 

        app.post('/review', async(req, res)=>{
            const review = req.body;
            const result = await reviewCollection.insertOne(review)
            res.send(result)
        })

        // get all review for logedin user by his/her email address

        app.get('/review',verifyJWT, async(req, res)=>{

            const decoded = req.decoded;
            
            if(decoded.email !== req.query.email){
                res.status(403).send({message: 'unauthorized access'})
            }

            const email = req.query.email
            const query = {};
            const cursor = reviewCollection.find(query)
            const result = await cursor.sort({$natural: -1 }).toArray()
            const review = result.filter(item=> item.email === email)
            res.send(review)
        })

        // load all reviews for perticular service by servie id

        app.get('/review/:id', async(req, res)=>{
            const id = req.params.id
            const query = {};
            const cursor = reviewCollection.find(query)
            const result = await cursor.sort({$natural: -1 }).toArray()
            const review = result.filter(item=> item.serviceId === id)
            res.send(review)
        })

        // get perticular review for update 

        app.get('/update/:id', async (req, res) => {
            const id = req.params.id;
            const query = { _id: ObjectId(id) };
            const review = await reviewCollection.findOne(query);
            res.send(review);
        })

        // update review 

        app.put('/update/:id', async (req, res) => {
            const id = req.params.id;
            const filter = { _id: ObjectId(id) };
            const review = req.body;
            const option = {upsert: true};
            const updatedReview = {
                $set: {
                    name: review.name,
                    email: review.email,
                    service: review.service,
                    feedback: review.feedback,
                    photoURL: review.photoURL,
                    time:review.time,
                    serviceId: review.serviceId
                }
            }
            const result = await reviewCollection.updateOne(filter, updatedReview, option);
            res.send(result);
        })


        // delete review by id 

        app.delete('/review/:id',verifyJWT, async(req, res)=>{
            const id = req.params.id;
            const query = {_id: ObjectId(id)}
            const result = await reviewCollection.deleteOne(query)
            res.send(result)
        })
    }
    finally{

    }


}

run().catch(error=> {
    console.log(error.message)
})

app.get('/', (req, res)=>{
    res.send('travel photographer server running')
})

app.listen(port, ()=>{
    console.log(`i am running on port ${port}`)
})