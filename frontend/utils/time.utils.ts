export const addMinutesToDate = (date: Date, minutes: number): Date => {
    return new Date(date.getTime() + minutes * 60000);
};

export const isOverlapping = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return start2 < end1 && end2 > start1;
};

/** Format ISO date string to 12-hour time (e.g. "10:00 AM") */
export const formatTime12h = (isoString: string): string => {
    try {
        const date = new Date(isoString);
        const h = date.getHours();
        const m = date.getMinutes();
        const hour12 = h % 12 || 12;
        const ampm = h < 12 ? 'AM' : 'PM';
        return `${hour12}:${String(m).padStart(2, '0')} ${ampm}`;
    } catch {
        return isoString;
    }
};

/** Escape regex metacharacters to prevent ReDoS injection */
export const escapeRegex = (str: string): string => {
    return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
};

// Salon timezone offset — TODO: Move to SaloonConfig for dynamic configuration
export const SALON_TIMEZONE_OFFSET = "+05:30";
