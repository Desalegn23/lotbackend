export const sendResponse = (res, status, data, message) => {
    return res.status(status).json({
        success: status >= 200 && status < 300,
        data,
        message
    });
};
export const sendError = (res, status, message) => {
    return res.status(status).json({
        success: false,
        message
    });
};
//# sourceMappingURL=response.js.map