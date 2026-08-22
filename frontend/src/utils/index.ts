import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';
import { formatDistanceToNow, format, isToday, isYesterday } from 'date-fns';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

// ── Date formatting ───────────────────────────────────────────────────────────

export function timeAgo(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return formatDistanceToNow(new Date(date), { addSuffix: true });
  } catch {
    return '';
  }
}

export function formatMessageTime(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    const d = new Date(date);
    if (isToday(d)) return format(d, 'h:mm a');
    if (isYesterday(d)) return `Yesterday ${format(d, 'h:mm a')}`;
    return format(d, 'MMM d, h:mm a');
  } catch {
    return '';
  }
}

export function formatDate(date: string | Date | null | undefined): string {
  if (!date) return '';
  try {
    return format(new Date(date), 'MMMM d, yyyy');
  } catch {
    return '';
  }
}

// ── Media upload ──────────────────────────────────────────────────────────
// Uploads a file to the backend's REST /api/upload route (see
// backend/src/routes/upload.ts) and returns the stored URL + media type
// ready to hand to the createPost/createStory GraphQL mutations.
//
// NOTE: this REST endpoint uses local disk storage, which only works
// against the standalone dev/self-hosted backend — it will not persist
// files on the Vercel serverless deployment. See the README's "Known Gaps"
// section for what production needs instead (S3/Cloudinary/etc.).
export interface UploadedMedia {
  url: string;
  type: 'IMAGE' | 'VIDEO' | 'GIF';
  filename: string;
  size: number;
}

function apiBaseUrl(): string {
  // Mirror the derivation in lib/apollo.ts so uploads always hit the same
  // backend the GraphQL client is configured for.
  const isDevServer = import.meta.env.DEV;
  const isLocalhost = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
  const graphqlUrl = isDevServer
    ? 'http://localhost:4000/graphql'
    : (import.meta.env.VITE_GRAPHQL_URL ?? (isLocalhost ? 'http://localhost:4000/graphql' : '/api/graphql'));
  return graphqlUrl.replace(/\/graphql$/, '');
}

export async function uploadMedia(file: File): Promise<UploadedMedia> {
  const token = localStorage.getItem('token');
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${apiBaseUrl()}/api/upload`, {
    method: 'POST',
    headers: token ? { Authorization: `Bearer ${token}` } : undefined,
    body: formData,
  });

  if (!res.ok) {
    const body = await res.json().catch(() => null);
    throw new Error(body?.error ?? `Upload failed (${res.status})`);
  }

  return res.json();
}

// ── Reactions ─────────────────────────────────────────────────────────────────

export const REACTION_EMOJIS: Record<string, string> = {
  LIKE: '👍',
  LOVE: '❤️',
  HAHA: '😂',
  WOW: '😮',
  SAD: '😢',
  ANGRY: '😡',
};

export const REACTION_COLORS: Record<string, string> = {
  LIKE: '#1877F2',
  LOVE: '#F33E58',
  HAHA: '#F7B125',
  WOW: '#F7B125',
  SAD: '#F7B125',
  ANGRY: '#E9710F',
};

// ── Avatar utilities ──────────────────────────────────────────────────────────

const AVATAR_COLORS = [
  '#1877F2', '#E4405F', '#00B27A', '#F7B125', '#A855F7',
  '#EF4444', '#10B981', '#3B82F6', '#8B5CF6', '#EC4899',
];

export function getInitials(name: string): string {
  if (!name?.trim()) return '?';
  return name
    .trim()
    .split(/\s+/)
    .map((n) => n[0])
    .filter(Boolean)
    .join('')
    .toUpperCase()
    .slice(0, 2);
}

export function generateAvatarColor(name: string): string {
  if (!name) return AVATAR_COLORS[0];
  let hash = 0;
  for (let i = 0; i < name.length; i++) {
    hash = name.charCodeAt(i) + ((hash << 5) - hash);
    hash |= 0; // convert to 32-bit int
  }
  return AVATAR_COLORS[Math.abs(hash) % AVATAR_COLORS.length];
}

// ── String helpers ────────────────────────────────────────────────────────────

export function truncate(str: string, length: number): string {
  if (!str || str.length <= length) return str ?? '';
  return `${str.slice(0, length)}…`;
}

/** Escape user input before using in RegExp to prevent ReDoS */
export function escapeRegex(str: string): string {
  return str.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

/** Format a number with locale-aware comma separators */
export function formatCount(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`;
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}K`;
  return n.toLocaleString();
}
