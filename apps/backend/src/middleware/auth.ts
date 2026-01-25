import { Request, Response, NextFunction } from 'express';
import { clerkClient } from '@clerk/clerk-sdk-node';
import { prisma } from '../lib/prisma';

export interface AuthRequest extends Request {
  userId?: string;
  user?: {
    id: string;
    email: string;
    clerkId: string;
    profession?: string | null;
    licenseNumber?: string | null;
    annualCeuRequirement?: number | null;
  };
}

export const authenticate = async (
  req: AuthRequest,
  res: Response,
  next: NextFunction
): Promise<void> => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.log('❌ No authorization header');
      res.status(401).json({ success: false, error: 'Unauthorized - No token provided' });
      return;
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify token with Clerk
    const clerkSecretKey = process.env.CLERK_SECRET_KEY;
    if (!clerkSecretKey) {
      console.error('❌ CLERK_SECRET_KEY not configured');
      res.status(500).json({ success: false, error: 'Server configuration error' });
      return;
    }

    try {
      // Verify the JWT token with Clerk
      const verified = await clerkClient.verifyToken(token, {
        secretKey: clerkSecretKey,
      });

      const clerkUserId = verified.sub;

      if (!clerkUserId) {
        console.log('❌ No userId in token');
        res.status(401).json({ success: false, error: 'Invalid token' });
        return;
      }

      // Get user from database
      const user = await prisma.user.findUnique({
        where: { clerkId: clerkUserId },
      });

      if (!user) {
        console.log('❌ User not found in database:', clerkUserId);
        res.status(401).json({ success: false, error: 'User not found' });
        return;
      }

      // Attach BOTH userId and user to request for compatibility
      req.userId = user.id;  // ← Add this for your existing code
      req.user = {
        id: user.id,
        email: user.email,
        clerkId: user.clerkId,
        profession: user.profession,
        licenseNumber: user.licenseNumber,
        annualCeuRequirement: user.annualCeuRequirement,
      };

      console.log('✅ User authenticated:', user.email);
      next();
    } catch (error: any) {
      console.error('❌ Token verification failed:', error.message);
      res.status(401).json({ success: false, error: 'Invalid or expired token' });
      return;
    }
  } catch (error: any) {
    console.error('❌ Authentication error:', error);
    res.status(500).json({ success: false, error: 'Authentication error' });
    return;
  }
};

// Export as both names for compatibility
export const requireAuth = authenticate;