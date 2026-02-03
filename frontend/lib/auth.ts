import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";

// Automatically detect the correct URL for both local and production
const getBaseUrl = () => {
    // For production (Render, Vercel, etc.)
    if (process.env.NEXTAUTH_URL) {
        return process.env.NEXTAUTH_URL;
    }

    // For Vercel deployments
    if (process.env.VERCEL_URL) {
        return `https://${process.env.VERCEL_URL}`;
    }

    // For local development
    return "http://localhost:3000";
};

export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            // Allow multiple admin emails
            const allowedEmails = [
                "Ganesh404veer@gmail.com",
                "neerajkushwaha0401@gmail.com"
            ];

            if (user.email && allowedEmails.some(email => email.toLowerCase() === user.email?.toLowerCase())) {
                return true;
            }

            // Deny access for any other email
            return false;
        },
        async session({ session, token }) {
            // Add user info to session
            if (session.user) {
                session.user.email = token.email;
            }
            return session;
        },
        async jwt({ token, user }) {
            if (user) {
                token.email = user.email;
            }
            return token;
        },
    },
    pages: {
        signIn: "/admin/login",
        error: "/admin/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development", // Enable debug logs in development
};
