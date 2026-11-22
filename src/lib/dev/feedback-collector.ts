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

// Types

export interface ErrorBuffer {
	push: (type: FeedbackErrorType, values: unknown[]) => void;
	snapshot: () => { errors: FeedbackError[]; dropped: number };
}

// Variables

const buffer = createErrorBuffer();
let started = false;

// Functions

/** Texte d'une valeur passée à la console ; ne lève jamais. */
export function describeValue(value: unknown): string {
	if (typeof value === 'string') return value;
	if (value instanceof Error) {
		const head = `${value.name}: ${value.message}`;
		return value.stack && !value.stack.startsWith(head)
			? `${head}\n${value.stack}`
			: (value.stack ?? head);
	}
	try {
		return JSON.stringify(value) ?? String(value);
	} catch {
		try {
			return String(value);
		} catch {
			return '[valeur illisible]';
		}
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

/** Commence à garder les erreurs de la page (une seule fois, dans le navigateur). */
export function startCollectingErrors(): void {
	if (started || typeof window === 'undefined') return;
	started = true;

	const original = console.error.bind(console);
	console.error = (...values: unknown[]) => {
		buffer.push('console', values);
		original(...values);
	};
	window.addEventListener('error', (event) => {
		buffer.push('error', [event.error ?? event.message]);
	});
	window.addEventListener('unhandledrejection', (event) => {
		buffer.push('unhandledrejection', [event.reason]);
	});
}

/** Les erreurs gardées depuis le chargement. */
export function collectedErrors(): { errors: FeedbackError[]; dropped: number } {
	return buffer.snapshot();
}
