import Stripe from 'stripe';

// Use a dummy key for build time to prevent build failures
// The actual key will be used at runtime from environment variables
const DUMMY_KEY_FOR_BUILD = 'sk_test_dummy_key_for_build_time';

export const stripe = new Stripe(
  process.env.STRIPE_SECRET_KEY_LIVE ?? process.env.STRIPE_SECRET_KEY ?? DUMMY_KEY_FOR_BUILD,
  {
    // https://github.com/stripe/stripe-node#configuration
    // https://stripe.com/docs/api/versioning
    // @ts-expect-error - Stripe API version handling
    apiVersion: null,
    // Register this as an official Stripe plugin.
    // https://stripe.com/docs/building-plugins#setappinfo
    appInfo: {
      name: 'Next.js Subscription Starter',
      version: '0.0.0',
      url: 'https://github.com/vercel/nextjs-subscription-payments'
    }
  }
);
