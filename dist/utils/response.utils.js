export function sendResponse(res, statusCode, success, message, data) {
    const body = { success, message };
    if (data !== undefined)
        body.data = data;
    return res.status(statusCode).json(body);
}
//# sourceMappingURL=response.utils.js.map