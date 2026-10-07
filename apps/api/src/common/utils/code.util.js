"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.formatCode = formatCode;
function formatCode(prefix, num) {
    const padded = num.toString().padStart(6, '0');
    return `${prefix}-${padded}`;
}
