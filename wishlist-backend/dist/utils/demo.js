"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.capitalize = exports.add = void 0;
const add = (a, b) => {
    return a + b;
};
exports.add = add;
const capitalize = (str) => {
    if (!str)
        return '';
    return str.charAt(0).toUpperCase() + str.slice(1);
};
exports.capitalize = capitalize;
