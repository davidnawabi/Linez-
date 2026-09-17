import type { FastPassRedemption, SubmitReportInput, Subscription, Venue, VenueStatus } from '@linez/shared';
import { supabase } from './supabase';

const apiUrl = process.env.EXPO_PUBLIC_API_URL;

if (!apiUrl) {
  throw new Error('EXPO_PUBLIC_API_URL must be set (see .env.example)');
}

async function authHeaders(): Promise<Record<string, string>> {
  const { data } = await supabase.auth.getSession();
  const token = data.session?.access_token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}

export async function fetchVenues(): Promise<{ venues: Venue[]; statuses: Record<string, VenueStatus> }> {
  const res = await fetch(`${apiUrl}/venues`);
  if (!res.ok) {
    throw new Error(`Failed to load venues (${res.status})`);
  }
  return res.json();
}

export async function submitReport(input: SubmitReportInput): Promise<void> {
  const res = await fetch(`${apiUrl}/reports`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify(input),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to submit report (${res.status})`);
  }
}

export async function fetchSubscription(): Promise<Subscription | null> {
  const res = await fetch(`${apiUrl}/fast-pass/subscription`, { headers: await authHeaders() });
  if (!res.ok) {
    throw new Error(`Failed to load subscription (${res.status})`);
  }
  const body = await res.json();
  return body.subscription;
}

export async function createFastPassCheckout(): Promise<string> {
  const res = await fetch(`${apiUrl}/fast-pass/checkout`, {
    method: 'POST',
    headers: await authHeaders(),
  });
  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to start checkout (${res.status})`);
  }
  const body = await res.json();
  return body.checkoutUrl;
}

export async function requestFastPassRedemption(venueId: string): Promise<FastPassRedemption> {
  const res = await fetch(`${apiUrl}/fast-pass/redemptions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', ...(await authHeaders()) },
    body: JSON.stringify({ venueId }),
  });

  if (!res.ok) {
    const body = await res.json().catch(() => ({}));
    throw new Error(body.error ?? `Failed to get a Fast Pass (${res.status})`);
  }
  const body = await res.json();
  return body.redemption;
}
