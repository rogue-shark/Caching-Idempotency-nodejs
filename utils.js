import axios from 'axios'
import { createClient } from 'redis';
import logger from './logger.js'

// Create Redis client :
const redisClient = createClient();
const defaultExpiration = process.env.DEFAULT_EXPIRATION ?? 3600

export async function setOrGetCachedData(key, apiParam, expiry = defaultExpiration) {
    const { url, config } = apiParam;
    try {
        logger.log(`Inside setOrGetCachedData - Starting operation 😀 (for key: ${key}) ...`);

        await redisClient.connect();

        const cachedData = await redisClient.get(key);
        if (cachedData) {
            logger.log('Cached Data: Found! 😊');
            
            return JSON.parse(cachedData);
        }

        logger.log('Cached Data: Not Found! 😢');
        logger.log(`Making API call for params: ${JSON.stringify(apiParam)}`);
        const apiRes = await axios.get(url, config);
        const data = apiRes.data;

        if (data.length > 0) {
            await redisClient.setEx(key, expiry, JSON.stringify(data));
            logger.log(`Now data is cached for ${expiry/60}mins! 😊`);
        }

        return data;

    } catch (err) {
        logger.error(`An error occurred during redis operation 💀 - ${err}`);
        throw err;
    } finally {
        if (redisClient.isOpen)  await redisClient.quit();
    }
}