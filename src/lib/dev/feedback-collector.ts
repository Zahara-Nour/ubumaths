/**
 * Erreurs de console gardées pour le bouton « signaler » (serveur de dev)
 * =======================================================================
 *
 * Démarré par `hooks.client.ts` en dev seulement : garde les dernières erreurs
 * vues depuis le chargement (console.error, erreurs non rattrapées, promesses
 * rejetées), que le bouton joint au retour.
 */

import {
	MAX_ERRORS,
	MAX_ERROR_MESSAGE,
	type FeedbackError,
	type FeedbackErrorType
} from './feedback.ts';

// Types (tampon)

export interface ErrorBuffer {
	push: (type: FeedbackErrorType, values: unknown[]) => void;
	snapshot: () => { errors: FeedbackError[]; dropped: number };
}

// Types

/** Ce que le collecteur touche dans le navigateur (remplaçable dans les tests). */
export interface CollectorTarget {
	console: { error: (...values: unknown[]) => void };
	addEventListener: (type: string, listener: (event: never) => void) => void;
}

// Constantes

/**
 * Nom de la propriété de `window` qui porte le tampon : une réévaluation du module
 * (rechargement à chaud) retrouve le même tampon au lieu d'envelopper la console deux fois.
 * Sert aussi de marqueur à la garde de CI « Bouton signaler absent du build ».
 */
export const BUFFER_KEY = '__devFeedbackBuffer';

/** Bornes de la description d'un objet passé à la console (jamais sérialisé en entier). */
const MAX_DEPTH = 3;
const MAX_ENTRIES = 20;

// Functions

/** Copie bornée d'une valeur : profondeur et nombre d'entrées plafonnés. */
function summarize(value: unknown, depth: number, seen: WeakSet<object>): unknown {
	if (typeof value === 'string') return value.slice(0, MAX_ERROR_MESSAGE);
	if (typeof value === 'bigint' || typeof value === 'symbol') return String(value);
	if (typeof value === 'function') return '[fonction]';
	if (value === null || typeof value !== 'object') return value;
	if (value instanceof Error) return `${value.name}: ${value.message}`;
	if (seen.has(value)) return '[cycle]';
	if (depth >= MAX_DEPTH) return '[…]';
	seen.add(value);
	if (Array.isArray(value)) {
		const items = value.slice(0, MAX_ENTRIES).map((item) => summarize(item, depth + 1, seen));
		if (value.length > MAX_ENTRIES) items.push(`[… ${value.length - MAX_ENTRIES} de plus]`);
		return items;
	}
	const summary: Record<string, unknown> = {};
	const keys = Object.keys(value);
	for (const key of keys.slice(0, MAX_ENTRIES))
		summary[key] = summarize((value as Record<string, unknown>)[key], depth + 1, seen);
	if (keys.length > MAX_ENTRIES) summary['…'] = `${keys.length - MAX_ENTRIES} clés de plus`;
	return summary;
}

/** Texte d'une valeur passée à la console ; ne lève jamais, ne sérialise jamais un gros objet en entier. */
export function describeValue(value: unknown): string {
	try {
		if (typeof value === 'string') return value.slice(0, MAX_ERROR_MESSAGE);
		if (value instanceof Error) {
			const head = `${value.name}: ${value.message}`;
			const stack = typeof value.stack === 'string' ? value.stack : '';
			const text = stack.startsWith(head) ? stack : stack ? `${head}\n${stack}` : head;
			return text.slice(0, MAX_ERROR_MESSAGE);
		}
		if (value === undefined) return 'undefined';
		return JSON.stringify(summarize(value, 0, new WeakSet())).slice(0, MAX_ERROR_MESSAGE);
	} catch {
		return '[valeur illisible]';
	}
}

/** Les `MAX_ERRORS` dernières erreurs, et le compte de celles qui ont été écartées. */
export function createErrorBuffer(now: () => Date = () => new Date()): ErrorBuffer {
	const errors: FeedbackError[] = [];
	let dropped = 0;
	return {
		push(type, values) {
			const message = values.map(describeValue).join(' ').slice(0, MAX_ERROR_MESSAGE);
			errors.push({ type, message, at: now().toISOString() });
			if (errors.length > MAX_ERRORS) {
				errors.shift();
				dropped++;
			}
		},
		snapshot() {
			return { errors: errors.map((error) => ({ ...error })), dropped };
		}
	};
}

/**
 * Branche le tampon sur une console et une fenêtre : `console.error` garde son
 * comportement (l'original est appelé avec les mêmes arguments, même si le
 * tampon échoue), les erreurs non rattrapées et les promesses rejetées sont notées.
 */
export function installCollector(target: CollectorTarget, buffer: ErrorBuffer): void {
	const original = target.console.error.bind(target.console);
	target.console.error = (...values: unknown[]) => {
		try {
			buffer.push('console', values);
		} catch {
			// Le tampon ne doit jamais casser la console de l'appli
		}
		original(...values);
	};
	target.addEventListener('error', (event: { error?: unknown; message?: unknown }) => {
		buffer.push('error', [event.error ?? event.message]);
	});
	target.addEventListener('unhandledrejection', (event: { reason?: unknown }) => {
		buffer.push('unhandledrejection', [event.reason]);
	});
}

/** Le tampon de la page, s'il a été démarré. */
function pageBuffer(): ErrorBuffer | undefined {
	if (typeof window === 'undefined') return undefined;
	return (window as unknown as Record<string, ErrorBuffer | undefined>)[BUFFER_KEY];
}

/** Commence à garder les erreurs de la page (une seule fois par page, dans le navigateur). */
export function startCollectingErrors(): void {
	if (typeof window === 'undefined' || pageBuffer()) return;
	const buffer = createErrorBuffer();
	(window as unknown as Record<string, ErrorBuffer>)[BUFFER_KEY] = buffer;
	installCollector(window as unknown as CollectorTarget, buffer);
}

/** Les erreurs gardées depuis le chargement. */
export function collectedErrors(): { errors: FeedbackError[]; dropped: number } {
	return pageBuffer()?.snapshot() ?? { errors: [], dropped: 0 };
}
