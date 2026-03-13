const winston = require('winston');
require('winston-daily-rotate-file');
const path = require('path');

const logDir = path.join(__dirname, '../logs');

// Define the custom Winston format
const logFormat = winston.format.combine(
    winston.format.timestamp({ format: 'YYYY-MM-DD HH:mm:ss' }),
    winston.format.errors({ stack: true }),
    winston.format.printf((info) => {
        return `[${info.timestamp}] ${info.level.toUpperCase()}: ${info.message} ${info.stack ? '\n' + info.stack : ''}`;
    })
);

// Configure Daily Rotate File Transports
const dailyRotateAppTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'application-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '14d',
    level: 'info' // Logs info, warn, error
});

const dailyRotateErrorTransport = new winston.transports.DailyRotateFile({
    filename: path.join(logDir, 'error-%DATE%.log'),
    datePattern: 'YYYY-MM-DD',
    zippedArchive: true,
    maxSize: '20m',
    maxFiles: '30d',
    level: 'error' // Logs only errors
});

// Create the Logger Instance
const logger = winston.createLogger({
    level: 'info',
    format: logFormat,
    transports: [
        dailyRotateAppTransport,
        dailyRotateErrorTransport,
        new winston.transports.Console({
            format: winston.format.combine(
                winston.format.colorize(),
                winston.format.simple(),
                winston.format.printf((info) => `[${info.timestamp}] ${info.level}: ${info.message}`)
            )
        })
    ]
});

// Stream for Morgan to pipe HTTP request logs into Winston
logger.stream = {
    write: function (message) {
        // Morgan logs come with a trailing newline, so we remove it
        logger.info(message.trim());
    }
};

module.exports = logger;
