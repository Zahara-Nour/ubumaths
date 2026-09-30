/**
 * Que faire d'une URL `/automaths/test?…` ?
 *
 * - `assignment=<id>` : une évaluation assignée ; sa forme et son temps viennent
 *   du serveur, le `mode` de l'URL est ignoré (B15).
 * - `categories=<…>` sans `mode` : lien de série partagé → choix de la forme (C19).
 * - `categories=<…>&mode=<…>` : comme avant (panier).
 *
 * Les catégories sont validées (mêmes bornes que l'enregistrement d'une série) :
 * un lien abîmé donne un message, jamais un plantage.
 */

import type { CartItem } from '$lib/stores/questionCart.svelte';
import type { TestMode } from '$lib/types/test';
import { parseCategoriesParam } from '$lib/validation/series';

export type TestLaunch =
	| { kind: 'assignment'; assignmentId: string }
	| { kind: 'choose-form'; categories: CartItem[] }
	| { kind: 'start'; mode: TestMode; categories: CartItem[]; timeLimit?: number }
	| { kind: 'error'; message: string };

const TEST_MODES: readonly TestMode[] = ['display', 'interactive', 'course', 'flash'];

/** Temps limite d'une Course aux nombres lu dans l'URL (secondes, 1 s à 1 h) */
const MAX_TIME_LIMIT_SECONDS = 3600;

function isTestMode(value: string): value is TestMode {
	return (TEST_MODES as readonly string[]).includes(value);
}

export function resolveTestLaunch(searchParams: URLSearchParams): TestLaunch {
	const assignmentId = searchParams.get('assignment');
	if (assignmentId) {
		return { kind: 'assignment', assignmentId };
	}

	const categories = parseCategoriesParam(searchParams.get('categories'));
	if (!categories.success) {
		return { kind: 'error', message: categories.error };
	}

	const modeParam = searchParams.get('mode');
	if (modeParam === null || modeParam === '') {
		return { kind: 'choose-form', categories: categories.data };
	}
	if (!isTestMode(modeParam)) {
		return { kind: 'error', message: 'Forme de série inconnue' };
	}

	const timeParam = searchParams.get('time');
	const time = timeParam === null ? NaN : Number.parseInt(timeParam, 10);
	const timeLimit =
		Number.isInteger(time) && time > 0 && time <= MAX_TIME_LIMIT_SECONDS ? time : undefined;

	return { kind: 'start', mode: modeParam, categories: categories.data, timeLimit };
}
