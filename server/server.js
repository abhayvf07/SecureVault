const mongoose = require('mongoose');
const dotenv = require('dotenv');
const fs = require('fs');
const path = require('path');
const logger = require('./utils/logger');

// Load up our env vars
dotenv.config();

// Crash early if we are missing critical security keys
const requiredEnv = ['MONGO_URI', 'JWT_SECRET'];
if (process.env.NODE_ENV === 'production') {
  requiredEnv.push('CLIENT_URL');
}

const missingEnv = requiredEnv.filter((key) => !process.env[key]);
if (missingEnv.length) {
  logger.error(`Missing required environment variables: ${missingEnv.join(', ')}`);
  process.exit(1);
}

const app = require('./app');

// Create the uploads folder if it doesn't exist yet
const uploadsDir = path.join(__dirname, 'uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
  logger.info('Created uploads directory');
}

const DEFAULT_PORT = 5000;
const initialPort = Number(process.env.PORT) || DEFAULT_PORT;

// Don't search forever if ports are blocked
const MAX_PORT_OFFSET = 20;

// Helper to check if a port is actually available
const listenOnPort = (port) =>
  new Promise((resolve, reject) => {
    const server = app
      .listen(port)
      .once('listening', () => resolve({ server, port }))
      .once('error', (error) => reject(error));
  });

// Connect to the database and start the server
const startServer = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    logger.success(`MongoDB connected: ${mongoose.connection.host}`);

    let port = initialPort;
    
    // Only try up to our maximum offset limit
    while (port <= initialPort + MAX_PORT_OFFSET) {
      try {
        const { server, port: boundPort } = await listenOnPort(port);
        
        logger.success(`Server running in ${process.env.NODE_ENV || 'development'} mode on port ${boundPort}`);
        logger.info(`API:    http://localhost:${boundPort}/api`);
        logger.info(`Health: http://localhost:${boundPort}/api/health`);
        
        // Catch any late errors after the server has already started
        server.on('error', (error) => {
          if (error.code === 'EADDRINUSE') {
            logger.error(`Port ${boundPort} is already in use.`);
          } else {
            logger.error(`Server error: ${error.message}`);
          }
          process.exit(1);
        });
        
        // Success! Stop searching for ports
        break;
        
      } catch (error) {
        // If the port is taken, bump the number and try again
        if (error.code === 'EADDRINUSE') {
          logger.warn(`Port ${port} is in use, trying ${port + 1}...`);
          port += 1;
          continue;
        }
        // If it's a different error, crash loudly
        throw error;
      }
    }

    // If we loop too many times without a successful break, give up
    if (port > initialPort + MAX_PORT_OFFSET) {
      logger.error(`Could not find an available port after ${MAX_PORT_OFFSET} attempts. Exiting.`);
      process.exit(1);
    }

  } catch (error) {
    logger.error(`Failed to start server: ${error.message}`);
    process.exit(1);
  }
};

// Catch random hidden errors so the server doesn't crash silently
process.on('unhandledRejection', (err) => {
  logger.error(`Unhandled Rejection: ${err?.message || String(err)}`);
  process.exit(1);
});

process.on('uncaughtException', (err) => {
  logger.error(`Uncaught Exception: ${err?.message || String(err)}`);
  process.exit(1);
});

startServer();
