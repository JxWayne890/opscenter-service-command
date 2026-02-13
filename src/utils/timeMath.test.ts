import { expect, test, describe } from 'vitest';
import { TimeMath } from './timeMath';

describe('TimeMath Utility', () => {

    test('calculateNetDurationMS should subtract break minutes correctly', () => {
        const start = '2026-01-01T08:00:00Z';
        const end = '2026-01-01T10:00:00Z'; // 2 hours = 120 mins
        const breakMins = 30;

        const expected = (120 - 30) * 60 * 1000;
        const result = TimeMath.calculateNetDurationMS(start, end, breakMins);

        expect(result).toBe(expected);
    });

    test('should handle active entries (no end time)', () => {
        const start = new Date(Date.now() - 60000).toISOString(); // 1 min ago
        const result = TimeMath.calculateNetDurationMS(start, null, 0);

        // Should be approximately 60000ms
        expect(result).toBeGreaterThanOrEqual(59000);
        expect(result).toBeLessThanOrEqual(61000);
    });

    test('msToDecimalHours should convert accurately (base-60)', () => {
        // 1.5 hours = 5400000 ms
        expect(TimeMath.msToDecimalHours(5400000)).toBe(1.5);

        // 53 minutes = 53 * 60 * 1000 = 3180000 ms
        // 53 / 60 = 0.88333...
        expect(TimeMath.msToDecimalHours(3180000)).toBeCloseTo(0.88333, 5);
    });

    test('formatDecimalHours should format correctly', () => {
        expect(TimeMath.formatDecimalHours(1.5)).toBe('1.50h');
        expect(TimeMath.formatDecimalHours(0.88333)).toBe('0.88h');
        expect(TimeMath.formatDecimalHours(0)).toBe('0.00h');
    });

    test('formatMinutes should format correctly', () => {
        expect(TimeMath.formatMinutes(45)).toBe('45m');
        expect(TimeMath.formatMinutes(0)).toBe('0m');
    });

    test('msToHMS should format correctly', () => {
        // 1h 2m 3s = 3600 + 120 + 3 = 3723s = 3723000ms
        expect(TimeMath.msToHMS(3723000)).toBe('01:02:03');
    });

    test('formatDuration should format as Xh Ym', () => {
        // 6 minutes = 360000ms
        expect(TimeMath.formatDuration(360000)).toBe('0h 06m');

        // 1 hour 30 mins = 5400000ms
        expect(TimeMath.formatDuration(5400000)).toBe('1h 30m');

        // 0 ms
        expect(TimeMath.formatDuration(0)).toBe('0h 00m');

        // Rounding up: 59m 59s -> 1h 00m
        const almostHour = (59 * 60 * 1000) + (59 * 1000);
        expect(TimeMath.formatDuration(almostHour)).toBe('1h 00m');
    });

    test('formatCurrency should use USD formatting', () => {
        expect(TimeMath.formatCurrency(25)).toBe('$25.00');
        expect(TimeMath.formatCurrency(1234.567)).toBe('$1,234.57');
    });
});
