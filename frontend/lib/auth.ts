import { NextAuthOptions } from "next-auth";
import GoogleProvider from "next-auth/providers/google";
import dbConnect from "@/lib/mongodb";
import User from "@/models/User";
import { ADMIN_EMAILS } from "@/lib/admin";



export const authOptions: NextAuthOptions = {
    providers: [
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID || "",
            clientSecret: process.env.GOOGLE_CLIENT_SECRET || "",
        }),
    ],
    callbacks: {
        async signIn({ user, account, profile }) {
            await dbConnect();

            const email = user.email?.toLowerCase();
            if (!email) return false;

            try {
                // Check if user exists
                let dbUser = await User.findOne({ email });

                const adminEmails = ADMIN_EMAILS;

                const isAdmin = adminEmails.includes(email);

                if (!dbUser) {
                    // Create new user
                    const generatedName = user.name || email.split('@')[0];
                    dbUser = await User.create({
                        email,
                        name: generatedName,
                        image: user.image || "",
                        role: isAdmin ? 'admin' : 'user',
                        blocked: false
                    });
                } else {
                    // Check if blocked
                    if (dbUser.blocked) {
                        return false; // Deny access
                    }
                }

                return true;
            } catch (error) {
                console.error("Error in signIn callback:", error);
                return false;
            }
        },
        async session({ session, token }) {
            if (session.user && token.sub) {
                session.user.email = token.email;
                if (token.role) {
                    (session.user as any).role = token.role;
                }
                if (token.id) {
                    (session.user as any).id = token.id;
                }
                if (token.name) {
                    session.user.name = token.name;
                }
            }
            return session;
        },
        async jwt({ token, user }) {
            // Initial sign in
            if (user) {
                token.email = user.email;
            }

            // Fetch latest user data from DB to ensure role/blocked status is current
            if (token.email) {
                await dbConnect();
                const dbUser = await User.findOne({ email: token.email.toLowerCase() }).select('_id role blocked name').lean();
                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                    token.blocked = dbUser.blocked;
                    token.name = dbUser.name;
                }
            }
            return token;
        },
    },
    pages: {
        signIn: "/admin/login", // We might want a generic login page later, but reusing this for now
        error: "/admin/login",
    },
    session: {
        strategy: "jwt",
        maxAge: 30 * 24 * 60 * 60, // 30 days
    },
    secret: process.env.NEXTAUTH_SECRET,
    debug: process.env.NODE_ENV === "development",
};
