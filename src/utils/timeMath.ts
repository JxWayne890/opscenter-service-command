/**
 * TimeMath Utility
 * 
 * CORE RULES:
 * 1) 60 minutes = 1 hour.
 * 2) 3,600,000 milliseconds = 1 hour.
 * 3) Net Duration = (Clock Out - Clock In) - Break.
 * 4) Perform all subtractions in canonical units (ms) before converting to decimal hours.
 */

export const TimeMath = {
    // Canonical constants
    MS_PER_HOUR: 3600000,
    MS_PER_MINUTE: 60000,
    MS_PER_SECOND: 1000,

    /**
     * Calculates net duration in milliseconds
     */
    calculateNetDurationMS(clockIn: string | Date, clockOut: string | Date | null, breakMinutes: number = 0): number {
        const start = new Date(clockIn).getTime();
        const end = clockOut ? new Date(clockOut).getTime() : Date.now();
        const totalDuration = end - start;
        const breakDuration = (breakMinutes || 0) * this.MS_PER_MINUTE;

        // Ensure we don't return negative duration
        return Math.max(0, totalDuration - breakDuration);
    },

    /**
     * Converts milliseconds to decimal hours (base-60)
     */
    msToDecimalHours(ms: number): number {
        return ms / this.MS_PER_HOUR;
    },

    /**
     * Converts minutes to decimal hours (base-60)
     */
    minutesToDecimalHours(minutes: number): number {
        return minutes / 60;
    },

    /**
     * Formats decimal hours for display (e.g. "0.88h")
     */
    formatDecimalHours(hours: number, precision: number = 2): string {
        return hours.toFixed(precision) + 'h';
    },

    /**
     * Formats minutes for display (e.g. "53m")
     */
    formatMinutes(minutes: number): string {
        if (!minutes || minutes === 0) return '0m';
        return `${Math.round(minutes)}m`;
    },

    /**
     * Formats currency consistently
     */
    formatCurrency(amount: number): string {
        return new Intl.NumberFormat('en-US', {
            style: 'currency',
            currency: 'USD',
            minimumFractionDigits: 2,
            maximumFractionDigits: 2
        }).format(amount);
    },

    /**
     * Converts milliseconds to HH:MM:SS format
     */
    msToHMS(ms: number): string {
        const totalSeconds = Math.floor(ms / 1000);
        const h = Math.floor(totalSeconds / 3600).toString().padStart(2, '0');
        const m = Math.floor((totalSeconds % 3600) / 60).toString().padStart(2, '0');
        const s = (totalSeconds % 60).toString().padStart(2, '0');
        return `${h}:${m}:${s}`;
    },

    /**
     * Formats milliseconds into "Xh Ym" format (e.g. "0h 06m")
     */
    formatDuration(ms: number): string {
        // Ensure non-negative
        const safeMS = Math.max(0, ms);
        const h = Math.floor(safeMS / this.MS_PER_HOUR);
        const m = Math.round((safeMS % this.MS_PER_HOUR) / this.MS_PER_MINUTE);

        // Handle rounding edge case (e.g. 59m 59s -> 60m should be 1h 0m)
        if (m === 60) {
            return `${h + 1}h 00m`;
        }

        return `${h}h ${m.toString().padStart(2, '0')}m`;
    }
};
