"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const demo_1 = require("../utils/demo");
describe('Demo Utility Tests', () => {
    test('adds 1 + 2 to equal 3', () => {
        expect((0, demo_1.add)(1, 2)).toBe(3);
    });
    test('capitalize should handle empty string', () => {
        expect((0, demo_1.capitalize)('')).toBe('');
    });
    test('capitalize should upper case first letter', () => {
        expect((0, demo_1.capitalize)('hello')).toBe('Hello');
    });
});
