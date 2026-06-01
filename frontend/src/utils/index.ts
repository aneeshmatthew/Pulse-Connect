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
