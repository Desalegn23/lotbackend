"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const express_1 = __importDefault(require("express"));
const cors_1 = __importDefault(require("cors"));
const dotenv_1 = __importDefault(require("dotenv"));
const swagger_jsdoc_1 = __importDefault(require("swagger-jsdoc"));
const swagger_ui_express_1 = __importDefault(require("swagger-ui-express"));
const index_js_1 = __importDefault(require("./routes/index.js"));
const response_js_1 = require("./utils/response.js");
dotenv_1.default.config();
const app = (0, express_1.default)();
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
const swaggerSpec = (0, swagger_jsdoc_1.default)(swaggerOptions);
app.use((0, cors_1.default)());
app.use(express_1.default.json());
// Swagger UI
app.use('/api-docs', swagger_ui_express_1.default.serve, swagger_ui_express_1.default.setup(swaggerSpec));
// API Routes
app.use('/api', index_js_1.default);
// Health check
app.get('/health', (req, res) => {
    res.json({ status: 'OK', message: 'Lottery Backend MVP is running' });
});
// Error handling middleware
app.use((err, req, res, next) => {
    console.error(err.stack);
    (0, response_js_1.sendError)(res, 500, 'Internal Server Error');
});
app.listen(PORT, () => {
    console.log(`Server is running on port ${PORT}`);
});
exports.default = app;
//# sourceMappingURL=index.js.map