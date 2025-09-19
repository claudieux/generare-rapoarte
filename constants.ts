
export const MONTHS = [
    'January', 'February', 'March', 'April', 'May', 'June',
    'July', 'August', 'September', 'October', 'November', 'December'
];

export const YEARS = Array.from({ length: 10 }, (_, i) => new Date().getFullYear() - 5 + i);
