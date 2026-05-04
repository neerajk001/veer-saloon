// Centralized admin email list — single source of truth
// Override via ADMIN_EMAILS env var (comma-separated)
// NOTE: This file must stay client-safe (no mongoose/DB imports)

export const ADMIN_EMAILS: string[] = (typeof process !== 'undefined' && process.env?.ADMIN_EMAILS)
    ? process.env.ADMIN_EMAILS.split(',').map(e => e.trim().toLowerCase())
    : ['ganesh404veer@gmail.com', 'neerajkushwaha0401@gmail.com'];

export function isAdminEmail(email: string | null | undefined): boolean {
    if (!email) return false;
    return ADMIN_EMAILS.includes(email.toLowerCase());
}
