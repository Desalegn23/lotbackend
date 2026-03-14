"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendError = exports.sendResponse = void 0;
const sendResponse = (res, status, data, message) => {
    return res.status(status).json({
        success: status >= 200 && status < 300,
        data,
        message
    });
};
exports.sendResponse = sendResponse;
const sendError = (res, status, message) => {
    return res.status(status).json({
        success: false,
        message
    });
};
exports.sendError = sendError;
//# sourceMappingURL=response.js.map