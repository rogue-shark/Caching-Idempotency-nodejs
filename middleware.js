import logger from "./logger.js";
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

