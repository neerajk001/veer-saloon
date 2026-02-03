export const addMinutesToDate = (date: Date, minutes: number): Date => {
    return new Date(date.getTime() + minutes * 60000);
};

export const isOverlapping = (start1: Date, end1: Date, start2: Date, end2: Date): boolean => {
    return start2 < end1 && end2 > start1;
};
