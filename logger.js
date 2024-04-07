// logger.js

class Logger {
    constructor() {
        this.log = this.log.bind(this);
        this.error = this.error.bind(this);
    }

    #getCurrentTime() {
        const now = new Date();
        const timeString = now.toISOString().replace('T', ' ').replace(/\..+/, ''); // Format: YYYY-MM-DD HH:MM:SS
        return `[${timeString}]`;
    }

    log(message) {
        console.log(`${this.#getCurrentTime()} \x1b[32m[SUCCESS]\x1b[0m :`, message);
    }

    error(message) {
        console.error(`${this.#getCurrentTime()} \x1b[31m[ERROR]\x1b[0m :`, message);
    }
}

// Exporting an instance of the logger class
export default new Logger();
