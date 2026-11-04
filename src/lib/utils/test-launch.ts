/**
 * Que faire d'une URL `/automaths/test?…` ?
 *
 * - `assignment=<id>` : une évaluation assignée ; sa forme et son temps viennent
 *   du serveur, le `mode` de l'URL est ignoré (B15).
 * - `modeles=<…>` (ou un ancien `categories=<…>`) sans `mode` : lien de série
 *   partagé → le PANIER, paramètre intact (Q46) ; le panier le relit et dit
 *   s'il est abîmé ou d'une ancienne version.
 * - `modeles=<…>&mode=<…>` : démarrage direct sous cette forme.
 *
 * La composition est validée (mêmes bornes que l'enregistrement d'une série) :
 * un lien abîmé, ou un ancien lien `categories=` (plus relu), donne un message,
 * jamais un plantage.
 */

import type { TestMode } from '$lib/types/test';
import {
	ANCIEN_LIEN_PARAM,
	SERIES_LINK_PARAM,
	hasSeriesLink,
	parseSeriesLink,
	type SeriesItem
} from '$lib/validation/series';

export type TestLaunch =
	| { kind: 'assignment'; assignmentId: string }
	| { kind: 'cart'; href: string }
	| { kind: 'start'; mode: TestMode; lines: SeriesItem[]; timeLimit?: number }
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

	const modeParam = searchParams.get('mode');
	if ((modeParam === null || modeParam === '') && hasSeriesLink(searchParams)) {
		const cart = new URLSearchParams();
		for (const name of [SERIES_LINK_PARAM, ANCIEN_LIEN_PARAM]) {
			const value = searchParams.get(name);
			if (value !== null) cart.set(name, value);
		}
		return { kind: 'cart', href: `/automaths/panier?${cart.toString()}` };
	}

	const series = parseSeriesLink(searchParams);
	if (!series.success) {
		return { kind: 'error', message: series.error };
	}
	if (modeParam === null || modeParam === '') {
		return { kind: 'error', message: 'Forme de série inconnue' };
	}
	if (!isTestMode(modeParam)) {
		return { kind: 'error', message: 'Forme de série inconnue' };
	}

	const timeParam = searchParams.get('time');
	const time = timeParam === null ? NaN : Number.parseInt(timeParam, 10);
	const timeLimit =
		Number.isInteger(time) && time > 0 && time <= MAX_TIME_LIMIT_SECONDS ? time : undefined;

	return { kind: 'start', mode: modeParam, lines: series.lines, timeLimit };
}
