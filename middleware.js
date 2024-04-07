import { createClient } from 'redis';
import logger from "./logger.js";
import { ApiResponse } from './utils.js';
import { v1 as uuidv1 } from 'uuid'
import { createHash } from 'node:crypto';

// Create Redis client :
const redisClient = createClient();
redisClient
  .connect()
  .then(() => logger.log(`Connected to Redis!`))
  .catch((err) => logger.error(`Error connecting to Redis : ${err}`));


// Middlewares -------------------
export function validatePostId(req, res, next) {
    const { postId } = req.query
    if (postId === '') {
        logger.log(`Validation failed for query: postId 😢`)
        return ApiResponse.error(res, 400, `Query parameter 'postId' is not a string.`)
    }
    next()
}

//Global middleware for each req - res cycle 
export function apiMonitor(req, res, next) {
    const getCurrentTime = () => {
        const now = new Date();
        const timeString = now.toISOString().replace('T', ' ').replace(/\..+/, ''); // Format: YYYY-MM-DD HH:MM:SS
        return `[${timeString}]`;
    };

    const { method, originalUrl } = req;
    const startTime = Date.now();

    res.on('finish', () => {
        const { statusCode } = res;
        const endTime = Date.now();
        const duration = endTime - startTime;

        // ANSI escape codes for color highlighting
        const yellow = '\x1b[33m'; // Yellow
        const reset = '\x1b[0m'; // Reset color

        console.log(`${getCurrentTime()} ${yellow}${method}${reset} ${originalUrl} ${yellow}${statusCode}${reset} ${duration}ms`);
    });

    next();
}

// Middleware to check idempotency
export async function checkIdempotency(req, res, next) {
    try {  
        const { headers, body, originalUrl, method, ip  } = req
        /*
        to get uuid based timestamp (in ns) --> use uuidv1()
        NOTE: But the chance of idempotency implementation being bypassed increases --
              becuase with increase in accuracy of timestamp generation for each request,
              the chance of it being interpreted as unique request increases (even if it 's not the case).
              So it should depend on the usecase, and demands of the application / service.
        (new Date()).getMilliseconds()
        (new Date()).getSeconds()
       */
       const reqHash = await generateHash(
         JSON.stringify({ ip, originalUrl, method, body }) //TODO + headers ?
       );
       console.log(req.ip)
        const timebasedUuid = (new Date()).getMilliseconds();  //TODO uuidv1() 
        const idempotencyKey =  `sourceDetails-${reqHash}-${timebasedUuid}`; //TODO sourceDetails could include eg: (sourceId / sourceName)
        
        const existingKey = await redisClient.get(idempotencyKey)
        logger.log(existingKey === reqHash)    
        if (existingKey && existingKey === reqHash) {
            logger.log(`Checking idempotency-key (${idempotencyKey}) in cache : Found! 😊 - Result: ${existingKey}`);
            logger.log(`Request has already been processed for the idempotency-key (${idempotencyKey}) 😒`);
            return ApiResponse.error(res, 409, 'Request has already been processed.');
        }
        logger.log(`Checking idempotency-key (${idempotencyKey}) in cache : Not Found! 😕`);
        
        // If idempotency key doesn't exist in Redis, store it for future checks
        const expiryTime = process.env.DEFAULT_EXPIRATION ?? 3600 //default: expire key after 1 hour
        redisClient.setEx(idempotencyKey, expiryTime, reqHash);
        logger.log(`The current idempotency-key ${idempotencyKey}) is cached successfully with value : ${reqHash}`);
            
        next();
    } catch (err) {
        logger.error(`An error occurred during redis operation 💀 - ${err}`);
        throw err;
    }
    // finally {
    //     if (redisClient.isOpen)  await redisClient.quit();
    // }
}


function generateHash(string, algo = 'sha256') {
    const hash = createHash(algo);
    hash.update(string);
    return hash.digest('hex');
}

function verifyHash(string, hashToCompare, algo = 'sha256') {
    const generatedHash = generateHash(string, algo);
    return generatedHash === hashToCompare;
}