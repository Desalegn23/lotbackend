import express from 'express';
import cors from 'cors';
import dotenv from 'dotenv';
import swaggerJsdoc from 'swagger-jsdoc';
import swaggerUi from 'swagger-ui-express';
import apiRoutes from './routes/index.js';
import { sendError } from './utils/response.js';
import { NotificationService } from './services/notificationService.js';
import { SchedulerService } from './services/schedulerService.js';
dotenv.config();
NotificationService.initialize();
SchedulerService.initialize();
const app = express();
const PORT = process.env.PORT || 5000;
// Swagger definition
const swaggerOptions = {
    definition: {
        openapi: '3.0.0',
        info: {
            title: 'Lottery Backend API',
            version: '1.0.0',
            description: 'API documentation for the Lottery/Raffle platform MVP',
        },
        servers: [
            {
                // url: `http://localhost:${PORT}`,
                url: `https://lotbackend-arib.onrender.com`,
            },
        ],
    },
    apis: ['./src/routes/*.ts', './src/controllers/*.ts'], // Path to the API docs
};
const swaggerSpec = swaggerJsdoc(swaggerOptions);
app.use(cors());
app.use(express.json());
// Swagger UI
app.use('/api-docs', swaggerUi.serve, swaggerUi.setup(swaggerSpec));
// API Routes
app.use('/api', apiRoutes);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Lottery Backend MVP is running' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    sendError(res, 500, 'Internal Server Error');
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
export default app;
//# sourceMappingURL=index.js.map