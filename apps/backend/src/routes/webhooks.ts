import { Router, Request, Response } from 'express';
import { Webhook } from 'svix';
import { prisma } from '../lib/prisma';

export const webhookRoutes = Router();

// Clerk webhook handler for user sync
webhookRoutes.post('/clerk', async (req: Request, res: Response): Promise<void> => {
  try {
    const WEBHOOK_SECRET = process.env.CLERK_WEBHOOK_SECRET;

    if (!WEBHOOK_SECRET) {
      res.status(500).json({ error: 'Webhook secret not configured' });
      return;
    }

    // Get the headers
    const svix_id = req.headers['svix-id'] as string;
    const svix_timestamp = req.headers['svix-timestamp'] as string;
    const svix_signature = req.headers['svix-signature'] as string;

    if (!svix_id || !svix_timestamp || !svix_signature) {
      res.status(400).json({ error: 'Missing svix headers' });
      return;
    }

    // Get the body
    const payload = req.body.toString('utf8'); // ✅ Correct - Buffer to string

    // Create a new Svix instance with your webhook secret
    const wh = new Webhook(WEBHOOK_SECRET);

    let evt: any;

    // Verify the payload
    try {
      evt = wh.verify(payload, {
        'svix-id': svix_id,
        'svix-timestamp': svix_timestamp,
        'svix-signature': svix_signature,
      }) as any;
    } catch (err) {
      res.status(400).json({ error: 'Invalid webhook signature' });
      return;
    }

    // Handle the webhook
    const eventType = evt.type;

    if (eventType === 'user.created' || eventType === 'user.updated') {
      const { id, email_addresses } = evt.data;

      // Create or update user in database
      await prisma.user.upsert({
        where: { clerkId: id },
        update: {
          email: email_addresses[0]?.email_address || '',
        },
        create: {
          email: email_addresses[0]?.email_address || '',
          clerkId: id,
        },
      });
    }

    res.status(200).json({ received: true });
  } catch (error) {
    console.error('Webhook error:', error);
    res.status(500).json({ error: 'Webhook processing failed' });
  }
});
