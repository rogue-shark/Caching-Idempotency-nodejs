import express, { response } from 'express';
import mongoose from 'mongoose';
import 'dotenv/config';
import { validatePostId, apiMonitor, checkIdempotency } from './middleware.js';
import logger from './logger.js'
import { setOrGetCachedData, ApiResponse } from './utils.js';
import User from './models/user.js'

const app = express();
const port = process.env.PORT ?? 8080

app.use(apiMonitor) //As global middleware 
app.use(express.json()); // Middleware to parse JSON bodies

app.get('/', (req, res) => res.send(`<h1>👋🌍</h1>`))

app.get('/health', (req, res) => {
    const resp = {
        status: 'OK',
        message: 'Server is up and running! 🔥'
    }
    logger.log(JSON.stringify(resp))
    res.status(200).json(resp)
})

app.get('/random', validatePostId, async ( req, res) => {
    try {
        const { postId } = req.query
        logger.log(`Incoming query param from request: ${JSON.stringify(req.query)}`)
    
        const apiCallParams = {
            url: 'https://jsonplaceholder.typicode.com/comments',
            config: {params: { postId }}
        }
        const keyName = postId ? `comments?${postId}` : 'comments'
        const cachedData = await setOrGetCachedData(keyName, apiCallParams)

        res.json(cachedData)
    } catch (err) {
        logger.error(`An error occured while processing request: ${err}`)
        res.status(500).send(`Oops! An error occured. 😵`)
    }
})

// Route to create a new user
app.post('/users', checkIdempotency, async (req, res) => {
    try {
      logger.log(`Incoming body param from request: ${JSON.stringify(req.body)}`) 
      const { username, email } = req.body;
  
      const existingUser = await User.find({ email })
      logger.log(`Checking if user with same email already exists - result: ${existingUser} `)
      if (existingUser.length > 0) {
       return ApiResponse.success(res, 200, 'A user with same emailId already exists.', [], {code: 409 })
      }
      // Create a new user instance
      const newUser = new User({ username, email });
      // Save the user to the database
      await newUser.save();

      ApiResponse.success(res, 201, 'User successfully created!', newUser)
    } catch (err) {
      logger.error(`An error occurred while creating user: ${err}`);
      return ApiResponse.error(res, 500, 'Oops! Something went wrong.');
    }
  });


const CYAN = `\x1b[96m`
mongoose.connect(process.env.MONGO_URI ?? 'mongodb://127.0.0.1:27017/test')  //default: localhost test DB
  .then(() => {
    logger.log('Connected to mongoDB successfully 🥳!');
    app.listen(port, () => console.log(`Listening to port: ${CYAN}http://localhost:${port}`))
  })
  .catch(err => logger.error(`An error occured while connecting to mongoDB: ${err}`))