import axios from 'axios'
import { createClient } from 'redis';
import logger from './logger.js'

// Create Redis client :
const redisClient = createClient();
const defaultExpiration = process.env.DEFAULT_EXPIRATION ?? 3600
redisClient
  .connect()
  .then(() => logger.log(`Connected to Redis!`))
  .catch((err) => logger.error(`Error connecting to Redis : ${err}`));

export async function setOrGetCachedData(key, apiParam, expiry = defaultExpiration) {
    const { url, config } = apiParam;
    try {
        logger.log(`Inside setOrGetCachedData - Starting operation 😀 (for key: ${key}) ...`);


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
    } 
    // finally {
    //     if (redisClient.isOpen)  await redisClient.quit();
    // }
}


export class ApiResponse {
  constructor(res) {
    this.res = res;
  }

  static {
    logger.log(`Static class ${ApiResponse.name} instantiated.`);
  }

  static success(res, statusCode, message, data = [], errorMetaData = null) {
    const instance = new ApiResponse(res);
    return instance.#successResponse(statusCode, message, data, errorMetaData);
  }

  static error(res, statusCode, message, errorMetaData = { code: null, message: null }) {
    const instance = new ApiResponse(res);
    return instance.#errorResponse(statusCode, message, errorMetaData);
  }

  #successResponse(statusCode, msg, dataObj, errObj) {
    // Enforce the structure of errorMetaData
    let validatedErrorMetaData = null;
    if (!!errObj) { // if errObj is not null
      const { code: errCode , message: errMessage } = errObj;
      validatedErrorMetaData = {
          code: errCode ?? "",
          message: errMessage ?? msg
      };
    }

    const response = {
      success: true,
      message: msg,
      data: dataObj,
      errorMetaData: !errObj ? errObj : validatedErrorMetaData,
    };

    return this.res.status(statusCode).json(response);
  }

  #errorResponse(statusCode, msg, errObj) {
    const { code: errCode, message: errMessage } = errObj;

    const response = {
      success: false,
      message: msg,
      data: null,
      errorMetaData: {
        code: errCode ?? `${statusCode}`,
        message: errMessage ?? `${msg}`,
      },
    };

    return this.res.status(statusCode).json(response);  
  }
}