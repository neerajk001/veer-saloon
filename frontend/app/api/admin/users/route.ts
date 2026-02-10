import { NextResponse } from 'next/server';
import { getServerSession } from 'next-auth';
import { authOptions } from '@/lib/auth';
import dbConnect from '@/lib/mongodb';
import User from '@/models/User';

export const dynamic = 'force-dynamic';

// GET all users
export async function GET(req: Request) {
    try {
        const session = await getServerSession(authOptions);

        // Check if admin
        // Note: You might need to extend the session type to include 'role'
        // For now, let's trust the authOptions callback logic or check email against list
        // Since we added role to session in authOptions, we can check it.
        const isAdmin = (session?.user as any)?.role === 'admin' ||
            ['ganesh404veer@gmail.com', 'neerajkushwaha0401@gmail.com'].includes(session?.user?.email?.toLowerCase() || '');

        if (!session || !isAdmin) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        await dbConnect();
        const users = await User.find({}).sort({ createdAt: -1 });

        return NextResponse.json(users);

    } catch (error) {
        console.error("Error fetching users:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}

// PUT request to update user status (Block/Unblock)
export async function PUT(req: Request) {
    try {
        const session = await getServerSession(authOptions);
        const isAdmin = (session?.user as any)?.role === 'admin' ||
            ['ganesh404veer@gmail.com', 'neerajkushwaha0401@gmail.com'].includes(session?.user?.email?.toLowerCase() || '');

        if (!session || !isAdmin) {
            return NextResponse.json({ message: "Unauthorized" }, { status: 401 });
        }

        const body = await req.json();
        const { userId, blocked } = body;

        if (!userId) {
            return NextResponse.json({ message: "User ID is required" }, { status: 400 });
        }

        await dbConnect();
        const updatedUser = await User.findByIdAndUpdate(
            userId,
            { blocked },
            { new: true }
        );

        if (!updatedUser) {
            return NextResponse.json({ message: "User not found" }, { status: 404 });
        }

        return NextResponse.json({
            message: `User ${blocked ? 'blocked' : 'unblocked'} successfully`,
            user: updatedUser
        });

    } catch (error) {
        console.error("Error updating user:", error);
        return NextResponse.json({ message: "Internal server error" }, { status: 500 });
    }
}
