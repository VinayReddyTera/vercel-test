require('dotenv').config();
const express = require('express');
const bodyParser = require('body-parser');
const cors = require("cors");
const helmet = require('helmet');
const path = require('path');

const app = express();

/* ======================================================
   SECURITY HEADERS
====================================================== */
app.use(helmet.frameguard({ action: 'deny' }));
app.use((req, res, next) => {
    res.setHeader("Content-Security-Policy", "frame-ancestors 'none'");
    next();
});

/* ======================================================
   CORS — whitelist your frontend origin via .env
   Set ALLOWED_ORIGIN=https://yourdomain.com in .env
   Falls back to localhost:4200 for local dev
====================================================== */
// app.use(cors({
//   origin: process.env.ALLOWED_ORIGIN || 'http://localhost:4200' || 'http://localhost:8000',
//   methods: ['GET', 'POST', 'PUT', 'DELETE'],
//   allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization'],
//   credentials: true
// }));

app.use(cors({
    origin: '*',
    methods: ['GET', 'POST', 'PUT', 'DELETE'],
    allowedHeaders: ['Origin', 'X-Requested-With', 'Content-Type', 'Accept', 'Authorization']
}));

/* ======================================================
   BODY PARSING & COMPRESSION
====================================================== */
const compression = require('compression');
const cookieParser = require('cookie-parser');

// Parse incoming cookies into req.cookies
app.use(cookieParser());

// Globally compress responses (gzip/deflate) to dramatically reduce network payload sizes
app.use(compression());

app.use(bodyParser.json());
app.use(express.json());

/* ======================================================
   LOGGING & OBSERVABILITY
====================================================== */
const morgan = require('morgan');
const logger = require('./utilities/logger');

// Record all incoming HTTP REST requests into the Winston application log file
app.use(morgan('combined', { stream: logger.stream }));

/* ======================================================
   DATA SANITIZATION & PARAMETER POLLUTION
====================================================== */
const mongoSanitize = require('express-mongo-sanitize');
const hpp = require('hpp');

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Prevent parameter pollution
app.use(hpp());

/* ======================================================
   RATE LIMITING (DDoS & Brute Force Protection)
====================================================== */
const rateLimit = require('express-rate-limit');

// Strict Limiter for Auth Routes (Login, Register, Forgot Password)
// Allows 15 requests from the same IP every 15 minutes.
const authLimiter = rateLimit({
    windowMs: 15 * 60 * 1000,
    max: 15,
    message: { status: 429, data: 'Too many login attempts from this IP, please try again after 15 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

// General API Limiter (Scraping & Spam Protection)
// Allows 500 requests from the same IP every 10 minutes.
const apiLimiter = rateLimit({
    windowMs: 10 * 60 * 1000,
    max: 500,
    message: { status: 429, data: 'Too many requests from this IP, please try again after 10 minutes.' },
    standardHeaders: true,
    legacyHeaders: false,
});

/* ======================================================
   STATIC FILES (Angular) — serve once, before API routes
====================================================== */
app.use(express.static(path.join(__dirname, '/dist')));

/* ======================================================
   API ROUTES
   Order matters:
   1. Public auth routes (no middleware)
   2. Authenticated user/student routes
   3. Role-protected routes
====================================================== */

/* ======================================================
   SPA FALLBACK — Angular handles all non-API routes
====================================================== */
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '/dist/index.html'));
});

/* ======================================================
   GLOBAL ERROR HANDLER — always last
====================================================== */
app.use((err, req, res, next) => {
    logger.error(`Unhandled execution error: ${err.message}`, { error: err });
    const status = err.status || 500;
    const message = err.message || "Internal server error";
    res.status(status).json({ status, message });
});

/* ======================================================
   SERVER STARTUP WITH DB RETRY
====================================================== */
const port = process.env.PORT || 1204;

async function startServerWithDB(retryCount = 5, delayMs = 3000) {
    try {
        console.log('test')
        // await connectDB();
        app.listen(port, () => {
            console.log(`Server listening on port ${port}`);
        });
    } catch (err) {
        console.error(`MongoDB connection failed: ${err.message}`);
        if (retryCount === 0) {
            console.error('Could not connect to MongoDB after multiple attempts, exiting.');
            process.exit(1);
        } else {
            console.log(`Retrying in ${delayMs / 1000}s... (${retryCount} retries left)`);
            setTimeout(() => startServerWithDB(retryCount - 1, delayMs), delayMs);
        }
    }
}

startServerWithDB();

module.exports = app;