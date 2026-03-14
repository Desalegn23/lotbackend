"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.userOnly = exports.agentOnly = exports.adminOnly = exports.authorize = exports.authenticate = void 0;
const jsonwebtoken_1 = __importDefault(require("jsonwebtoken"));
const response_js_1 = require("../utils/response.js");
const client_1 = require("@prisma/client");
const JWT_SECRET = process.env.JWT_SECRET ?? 'fallback_secret';
/**
 * Verify JWT from Authorization header and attach req.user
 */
const authenticate = (req, res, next) => {
    const authHeader = req.headers['authorization'];
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
        return (0, response_js_1.sendError)(res, 401, 'Unauthorized: No token provided');
    }
    const token = authHeader.split(' ')[1];
    if (!token) {
        return (0, response_js_1.sendError)(res, 401, 'Unauthorized: Malformed token');
    }
    try {
        const decoded = jsonwebtoken_1.default.verify(token, JWT_SECRET);
        req.user = { id: decoded.id, role: decoded.role };
        next();
    }
    catch (err) {
        return (0, response_js_1.sendError)(res, 401, 'Unauthorized: Invalid or expired token');
    }
};
exports.authenticate = authenticate;
const authorize = (roles) => {
    return (req, res, next) => {
        const user = req.user;
        if (!user || !roles.includes(user.role)) {
            return (0, response_js_1.sendError)(res, 403, 'Forbidden: You do not have permission');
        }
        next();
    };
};
exports.authorize = authorize;
exports.adminOnly = (0, exports.authorize)([client_1.Role.ADMIN]);
exports.agentOnly = (0, exports.authorize)([client_1.Role.AGENT, client_1.Role.ADMIN]); // admin can also act on agent routes
exports.userOnly = (0, exports.authorize)([client_1.Role.USER, client_1.Role.AGENT, client_1.Role.ADMIN]);
//# sourceMappingURL=auth.js.map