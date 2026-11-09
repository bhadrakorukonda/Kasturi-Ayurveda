import express, { Router } from 'express';
import { handleWebhook } from '../controllers/payment.controller';

const router = Router();

// express.raw on THIS route only: the signature is an HMAC of the exact
// bytes Razorpay sent, so the body must not be JSON-parsed first. This
// router is mounted in app.ts before the global express.json(), and only
// when PAYMENTS_ENABLED=true (otherwise the route 404s).
router.post('/webhook', express.raw({ type: 'application/json', limit: '100kb' }), handleWebhook);

export default router;
