/**
 * Heap visualization helpers.
 *
 * The worker emits each variable's `value` as a JSON string holding either an
 * InlineValue (primitive), a HeapRef (containers / user-class instances), or a
 * TruncatedValue (depth/items limit hit at a deep nested level — should not
 * appear at the top level of a variable but we still handle it defensively).
 */

import type {
	HeapEntry,
	HeapObject,
	HeapRef,
	InlineValue,
	TruncatedValue
} from '$lib/shared/python/debug/types';

/** Parsed top-level variable value (what we got after JSON.parse) */
export type ParsedVariableValue = InlineValue | HeapRef | TruncatedValue;

/**
 * Parse a `DebugVariable.value` JSON string back into its structured form.
 * Returns `null` when the string is not valid JSON or doesn't match the
 * expected shape — the caller should then fall back to displaying the raw
 * value string.
 */
export function parseVariableValue(raw: string): ParsedVariableValue | null {
	try {
		const parsed = JSON.parse(raw) as unknown;
		if (
			parsed &&
			typeof parsed === 'object' &&
			'type' in parsed &&
			typeof (parsed as { type: unknown }).type === 'string'
		) {
			return parsed as ParsedVariableValue;
		}
		return null;
	} catch {
		return null;
	}
}

/** Type guard: parsed variable value is a HeapRef */
export function isHeapRef(value: ParsedVariableValue): value is HeapRef {
	return value.type === 'ref';
}

/** Type guard: parsed variable value is a TruncatedValue */
export function isTruncated(value: ParsedVariableValue): value is TruncatedValue {
	return value.type === 'truncated';
}

/** Type guard: HeapEntry value is a HeapRef */
export function isEntryRef(entry: HeapEntry): entry is HeapEntry & { value: HeapRef } {
	return entry.value.type === 'ref';
}

/**
 * Short, stable, human-friendly id for display (e.g. `#a3f2`).
 * Hashes the full Python id() string into a 4-char base36 suffix so two
 * different objects within a snapshot get visually distinguishable labels
 * without leaking the actual memory address.
 *
 * Uses the LOW bits of the hash so neighboring ids (e.g. successive memory
 * addresses) produce different short labels — high bits of the hash barely
 * change for tiny input differences.
 */
export function shortHeapId(id: string): string {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) | 0;
	}
	const padded = (hash >>> 0).toString(36).padStart(4, '0');
	return `#${padded.slice(-4)}`;
}

/**
 * Pick a stable Tailwind color class pair (text, bg) for a heap object id.
 * Used to color matching arrows + cards consistently across the diagram.
 */
const HEAP_COLOR_PALETTE = [
	{
		stroke: 'stroke-blue-500',
		text: 'text-blue-700',
		bg: 'bg-blue-100',
		dark: 'dark:bg-blue-900/30 dark:text-blue-300'
	},
	{
		stroke: 'stroke-emerald-500',
		text: 'text-emerald-700',
		bg: 'bg-emerald-100',
		dark: 'dark:bg-emerald-900/30 dark:text-emerald-300'
	},
	{
		stroke: 'stroke-amber-500',
		text: 'text-amber-700',
		bg: 'bg-amber-100',
		dark: 'dark:bg-amber-900/30 dark:text-amber-300'
	},
	{
		stroke: 'stroke-rose-500',
		text: 'text-rose-700',
		bg: 'bg-rose-100',
		dark: 'dark:bg-rose-900/30 dark:text-rose-300'
	},
	{
		stroke: 'stroke-violet-500',
		text: 'text-violet-700',
		bg: 'bg-violet-100',
		dark: 'dark:bg-violet-900/30 dark:text-violet-300'
	},
	{
		stroke: 'stroke-cyan-500',
		text: 'text-cyan-700',
		bg: 'bg-cyan-100',
		dark: 'dark:bg-cyan-900/30 dark:text-cyan-300'
	},
	{
		stroke: 'stroke-pink-500',
		text: 'text-pink-700',
		bg: 'bg-pink-100',
		dark: 'dark:bg-pink-900/30 dark:text-pink-300'
	},
	{
		stroke: 'stroke-lime-600',
		text: 'text-lime-700',
		bg: 'bg-lime-100',
		dark: 'dark:bg-lime-900/30 dark:text-lime-300'
	}
] as const;

export type HeapColor = (typeof HEAP_COLOR_PALETTE)[number];

export function colorForHeapId(id: string): HeapColor {
	let hash = 0;
	for (let i = 0; i < id.length; i++) {
		hash = (hash * 31 + id.charCodeAt(i)) | 0;
	}
	const index = (hash >>> 0) % HEAP_COLOR_PALETTE.length;
	return HEAP_COLOR_PALETTE[index];
}

/**
 * Pretty-print an InlineValue or TruncatedValue for compact rendering inside
 * a frame row or heap entry.
 */
export function formatInline(value: InlineValue | TruncatedValue): string {
	if (value.type === 'truncated') {
		return value.value === 'depth' ? '…' : `… (${value.value})`;
	}
	if (value.type === 'NoneType') return 'None';
	return value.value;
}

/**
 * Display label for a HeapObject's collection-style header
 * (e.g. "list[3]", "dict[2]", "Point").
 */
export function heapTypeLabel(obj: HeapObject): string {
	if (obj.type.startsWith('instance:')) {
		return obj.type.slice('instance:'.length);
	}
	return `${obj.type}[${obj.length}]`;
}
