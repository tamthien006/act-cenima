import dotenv from 'dotenv';
import express from 'express';
import morgan from 'morgan';
import cors from 'cors';
import colors from 'colors';
import helmet from 'helmet';
import rateLimit from 'express-rate-limit';
import mongoSanitize from 'express-mongo-sanitize';
import xss from 'xss-clean';
import hpp from 'hpp';
import path from 'path';
import { fileURLToPath } from 'url';
import swaggerUi from 'swagger-ui-express';
import swaggerSpec from './config/swagger.js';
import connectDB from './config/db.js';
import { notFound, errorHandler } from './middleware/errorMiddleware.js';
import authRouter from './routes/auth.route.js';

// Get __dirname equivalent in ES modules
const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Load environment variables
dotenv.config();

// Initialize Express app
const app = express();

// Connect to MongoDB
connectDB();

// Environment variables
const PORT = process.env.PORT || 5000;
const NODE_ENV = process.env.NODE_ENV || 'development';


// Set security HTTP headers
app.use(helmet());

// Development logging
if (NODE_ENV === 'development') {
  app.use(morgan('dev'));
}

// Enable CORS
app.use(cors());

// Limit requests from same API
const limiter = rateLimit({
  max: 100, // 100 requests per windowMs
  windowMs: 60 * 60 * 1000, // 1 hour
  message: 'Too many requests from this IP, please try again in an hour!'
});
app.use('/api', limiter);

// Body parser, reading data from body into req.body
app.use(express.json({ limit: '10kb' }));
app.use(express.urlencoded({ extended: true, limit: '10kb' }));

// Data sanitization against NoSQL query injection
app.use(mongoSanitize());

// Data sanitization against XSS
app.use(xss());

// Prevent parameter pollution
app.use(hpp({
  whitelist: [
    'duration', 'ratingsQuantity', 'ratingsAverage', 'maxGroupSize', 'difficulty', 'price'
  ]
}));

// Serve static files
app.use(express.static(path.join(__dirname, 'public')));

// API Documentation
app.use('/api/v1/docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec, {
  explorer: true,
  customCss: '.swagger-ui .topbar { display: none }',
  customSiteTitle: 'Movie Ticket API Documentation',
  customfavIcon: '/favicon.ico'
}));

// Test middleware
app.use((req, res, next) => {
  req.requestTime = new Date().toISOString();
  next();
});

// Import and use route handlers
import userRoutes from './routes/userRoutes.js';
import movieRoutes from './routes/movieRoutes.js';

// API Routes
app.use('/api/v1/users', userRoutes);
app.use('/api/v1/movies', movieRoutes);

// Other routes will be added as they are implemented
// import cinemaRoutes from './routes/cinemaRoutes.js';
// import roomRoutes from './routes/roomRoutes.js';
// import scheduleRoutes from './routes/scheduleRoutes.js';
// import ticketRoutes from './routes/ticketRoutes.js';
// import paymentRoutes from './routes/paymentRoutes.js';
// import promotionRoutes from './routes/promotionRoutes.js';
// import comboRoutes from './routes/comboRoutes.js';
// import reviewRoutes from './routes/reviewRoutes.js';
// import dashboardRoutes from './routes/dashboardRoutes.js';

// app.use('/api/v1/cinemas', cinemaRoutes);
// app.use('/api/v1/rooms', roomRoutes);
// app.use('/api/v1/schedules', scheduleRoutes);
// app.use('/api/v1/tickets', ticketRoutes);
// app.use('/api/v1/payments', paymentRoutes);
// app.use('/api/v1/promotions', promotionRoutes);
// app.use('/api/v1/combos', comboRoutes);
// app.use('/api/v1/reviews', reviewRoutes);
// app.use('/api/v1/dashboard', dashboardRoutes);

// Health check endpoint
app.get('/api/v1/health', (req, res) => {
  res.status(200).json({
    status: 'success',
    message: 'API is running',
    timestamp: req.requestTime,
    environment: NODE_ENV,
    version: '1.0.0'
  });
});

// Handle 404 - Not Found
app.all('*', (req, res, next) => {
  res.status(404).json({
    status: 'fail',
    message: `Can't find ${req.originalUrl} on this server!`
  });
});

// Global error handling middleware
app.use(errorHandler);

// Start server
const server = app.listen(PORT, () => {
  console.log(colors.yellow.bold(`\n  Server running in ${NODE_ENV} mode on port ${PORT}\n`));
  console.log(colors.cyan(`  API Documentation: http://localhost:${PORT}/api/v1/docs`));
});

// Handle unhandled promise rejections
process.on('unhandledRejection', (err) => {
  console.log('UNHANDLED REJECTION! Shutting down...');
  console.log(err.name, err.message);
  server.close(() => {
    process.exit(1);
  });
  server.close(() => process.exit(1));
});
