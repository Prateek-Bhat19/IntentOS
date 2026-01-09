import { add, capitalize } from '../utils/demo';

describe('Demo Utility Tests', () => {
    test('adds 1 + 2 to equal 3', () => {
        expect(add(1, 2)).toBe(3);
    });

    test('capitalize should handle empty string', () => {
        expect(capitalize('')).toBe('');
    });

    test('capitalize should upper case first letter', () => {
        expect(capitalize('hello')).toBe('Hello');
    });
});
