import { createClient } from 'redis';
import logger from "./logger.js";

// Create Redis client :
const redisClient = createClient();
// Middlewares -------------------
export function validatePostId(req, res, next) {
    const { postId } = req.query
    if (postId === '') {
        logger.log(`Validation failed for query: postId 😢`)
        return res.status(400).json({ 'Validation Error': `Query parameter 'postId' is not a string.` })
    }
    next()
}

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
        await redisClient.connect();
    
        const idempotencyKey = req.headers['idempotency-key'];
        
        if (!idempotencyKey) {
            logger.log(`idempotency-key in header (${idempotencyKey}): Not Found! 😕`);
            return res.status(400).json({ error: 'Idempotency key is required' });
        }
        
        logger.log(`idempotency-key in header (${idempotencyKey}): Found! 😊`);
        const keyExists = await redisClient.get(idempotencyKey)
    
        if (keyExists) {
            logger.log(`Request has already been processed for the idempotency-key (${idempotencyKey}) 😕`);
            return res.status(409).json({ error: 'Request has already been processed' });
        }
    
        // If idempotency key doesn't exist in Redis, store it for future checks
        const expiryTime = process.env.DEFAULT_EXPIRATION ?? 3600 //default: expire key after 1 hour
        redisClient.setEx(idempotencyKey, expiryTime, 'processed');
        logger.log(`The current idempotency-key ${idempotencyKey}) is cached successfully! 😊`);
            
        next();
    } catch (error) {
        logger.error(`An error occurred during redis operation 💀 - ${err}`);
        throw err;
    } finally {
        if (redisClient.isOpen)  await redisClient.quit();
    }
}