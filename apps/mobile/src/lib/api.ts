import type { SubmitReportInput, Venue, VenueStatus } from '@linez/shared';
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
