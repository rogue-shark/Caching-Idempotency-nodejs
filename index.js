import express, { response } from 'express';
import 'dotenv/config';
import { validatePostId, apiMonitor } from './middleware.js';
import logger from './logger.js'
import { setOrGetCachedData } from './utils.js';

const app = express();
const port = process.env.PORT ?? 8080

app.use(apiMonitor) //As global middleware 

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
        logger.log(`query param from request: ${JSON.stringify(req.query)}`)
    
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


const CYAN = `\x1b[96m`
app.listen(port, () => console.log(`Listening to port: ${CYAN}http://localhost:${port}`));