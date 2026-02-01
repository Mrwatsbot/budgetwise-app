import { Configuration, PlaidApi, PlaidEnvironments } from 'plaid';

function createPlaidClient(): PlaidApi {
  const clientId = process.env.PLAID_CLIENT_ID?.trim();
  const secret = process.env.PLAID_SECRET?.trim();
  const env = (process.env.PLAID_ENV || 'sandbox').trim();

  if (!clientId || !secret) {
    console.error('Missing Plaid credentials. Set PLAID_CLIENT_ID and PLAID_SECRET in environment variables.');
    // Return a client that will fail gracefully at call time rather than crashing at import time
  }

  const configuration = new Configuration({
    basePath: PlaidEnvironments[env as keyof typeof PlaidEnvironments] || PlaidEnvironments.sandbox,
    baseOptions: {
      headers: {
        'PLAID-CLIENT-ID': clientId || '',
        'PLAID-SECRET': secret || '',
      },
    },
  });

  return new PlaidApi(configuration);
}

export const plaidClient = createPlaidClient();
