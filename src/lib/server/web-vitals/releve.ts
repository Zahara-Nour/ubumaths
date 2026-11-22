/**
 * Relevé des mesures de performance (table `web_vital_samples`) : 75ᵉ centile par
 * indicateur, pour tout le site et par page.
 *
 * Sert `GET /api/web-vitals/releve`, que lit le relevé mensuel de GitHub
 * (`scripts/releve-web-vitals.ts`). Décision du 2026-11-21 : GitHub ne reçoit pas de
 * clé de la base, seulement un jeton dédié qui n'ouvre que cette route, et la route ne
 * rend que des résultats calculés, jamais les lignes : le nombre de mesures, et le p75
 * à partir de `MIN_P75_COUNT` mesures.
 *
 * Le calcul se fait ici et non en base : pas de fonction SQL de plus tant que le
 * volume reste petit (quelques milliers de lignes par mois). Au-delà de
 * `MAX_RELEVE_ROWS`, la lecture s'arrête et le relevé le dit (`truncated`).
 */

import { createHash, timingSafeEqual } from 'node:crypto';
import { z } from 'zod';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import {
	isMeasuredRoute,
	SAMPLE_METRICS,
	type SampleMetric
} from '#lib/utils/web-vitals-mesures.ts';

// Types

/** Ce que le relevé lit d'une ligne : ni date, ni identifiant, ni type d'appareil */
export interface ReleveRow {
	route: string;
	metric: string;
	value: number;
}

export interface MetricSummary {
	count: number;
	/** Absent sous `MIN_P75_COUNT` mesures : un centile de si peu serait la mesure elle-même */
	p75?: number;
}

export type MetricSummaries = Partial<Record<SampleMetric, MetricSummary>>;

export interface WebVitalsReleve {
	days: number;
	/** Nombre de mesures (lignes) de la période */
	total: number;
	/** Vrai si la lecture s'est arrêtée au plafond : le relevé porte sur un échantillon */
	truncated: boolean;
	global: MetricSummaries;
	/** Pages les plus mesurées d'abord */
	routes: { route: string; metrics: MetricSummaries }[];
}

// Constantes

/** La table garde 90 jours */
export const MAX_RELEVE_DAYS = 90;
const DEFAULT_RELEVE_DAYS = 28;
/** En dessous, seul le nombre de mesures est rendu, pas le p75 */
export const MIN_P75_COUNT = 5;
/** Lignes par lecture (plafond de PostgREST : `max_rows = 1000`) */
export const RELEVE_PAGE_SIZE = 1000;
/** Lignes lues au plus pour un relevé (100 lectures) */
export const MAX_RELEVE_ROWS = 100_000;

export const releveQuerySchema = z.object({
	days: z.coerce.number().int().min(1).max(MAX_RELEVE_DAYS).default(DEFAULT_RELEVE_DAYS)
});

// Functions

function isSampleMetric(metric: string): metric is SampleMetric {
	return (SAMPLE_METRICS as readonly string[]).includes(metric);
}

/**
 * 75ᵉ centile avec interpolation entre les deux mesures voisines (même définition que
 * `percentile_cont(0.75)` de Postgres). `undefined` sans mesure.
 */
export function percentile75(values: readonly number[]): number | undefined {
	if (values.length === 0) return undefined;
	const sorted = [...values].sort((a, b) => a - b);
	const position = 0.75 * (sorted.length - 1);
	const below = Math.floor(position);
	const above = Math.min(below + 1, sorted.length - 1);
	return sorted[below] + (position - below) * (sorted[above] - sorted[below]);
}

/** Millisecondes entières ; CLS au millième */
function roundP75(metric: SampleMetric, value: number): number {
	return metric === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
}

function summarizeMetrics(valuesByMetric: Map<SampleMetric, number[]>): MetricSummaries {
	const summaries: MetricSummaries = {};
	for (const metric of SAMPLE_METRICS) {
		const values = valuesByMetric.get(metric);
		const p75 = values ? percentile75(values) : undefined;
		if (!values || p75 === undefined) continue;
		summaries[metric] =
			values.length < MIN_P75_COUNT
				? { count: values.length }
				: { count: values.length, p75: roundP75(metric, p75) };
	}
	return summaries;
}

function push(target: Map<SampleMetric, number[]>, metric: SampleMetric, value: number): void {
	const values = target.get(metric);
	if (values) values.push(value);
	else target.set(metric, [value]);
}

/** Nombre de mesures de l'indicateur le plus relevé : à peu près le nombre de visites */
function largestCount(metrics: MetricSummaries): number {
	return Math.max(0, ...Object.values(metrics).map((summary) => summary.count));
}

/**
 * Résultats calculés d'un lot de lignes. Rien d'une ligne ne sort tel quel, hors
 * l'identifiant de route de sa page. Une ligne d'un indicateur inconnu ou d'une page
 * non comptée (admin, `/dev`) est écartée : la réception ne les écrit pas, ceci est un filet.
 */
export function summarize(
	rows: readonly ReleveRow[],
	days: number,
	truncated: boolean
): WebVitalsReleve {
	const global = new Map<SampleMetric, number[]>();
	const byRoute = new Map<string, Map<SampleMetric, number[]>>();
	let total = 0;

	for (const { route, metric, value } of rows) {
		if (!isSampleMetric(metric) || !isMeasuredRoute(route) || !Number.isFinite(value)) continue;
		total += 1;
		push(global, metric, value);
		let routeValues = byRoute.get(route);
		if (!routeValues) {
			routeValues = new Map();
			byRoute.set(route, routeValues);
		}
		push(routeValues, metric, value);
	}

	const routes = [...byRoute.entries()]
		.map(([route, values]) => ({ route, metrics: summarizeMetrics(values) }))
		.sort(
			(a, b) => largestCount(b.metrics) - largestCount(a.metrics) || a.route.localeCompare(b.route)
		);

	return { days, total, truncated, global: summarizeMetrics(global), routes };
}

/**
 * Vrai si l'en-tête `Authorization` porte le jeton du relevé. La comparaison se fait
 * sur des empreintes de même longueur, en temps constant : ni la valeur ni la longueur
 * du jeton ne se devinent au temps de réponse.
 */
export function isReleveToken(authorization: string | null, expectedToken: string): boolean {
	const match = /^Bearer\s+(\S+)$/i.exec(authorization ?? '');
	if (!match) return false;
	const digest = (text: string) => createHash('sha256').update(text, 'utf8').digest();
	return timingSafeEqual(digest(match[1]), digest(expectedToken));
}

/**
 * Lit les mesures des `days` derniers jours **entiers** (UTC), page après page. La
 * journée en cours est exclue : le résultat ne change qu'une fois par jour, et appeler
 * la route en boucle ne dit pas à quel moment une mesure est arrivée (l'heure d'une
 * ligne est arrondie exprès, cf. la migration).
 *
 * L'ordre est celui des identifiants de ligne, tirés au hasard : jamais l'ordre
 * d'arrivée (qui dessinerait le parcours d'un visiteur), et une lecture arrêtée au
 * plafond reste un échantillon pris au hasard. Chaque page reprend après le dernier
 * identifiant lu : une ligne écrite pendant la lecture ne décale rien.
 */
export async function readSamples(
	days: number,
	now: Date = new Date()
): Promise<
	{ rows: ReleveRow[]; truncated: boolean } | { error: { code?: string; message: string } }
> {
	const today = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate());
	const since = new Date(today - days * 86_400_000).toISOString();
	const until = new Date(today).toISOString();
	const client = createServiceRoleClient();
	const rows: ReleveRow[] = [];
	let lastId: string | null = null;

	const readPage = (limit: number) => {
		let query = client
			.from('web_vital_samples')
			.select('id, route, metric, value')
			.gte('created_at', since)
			.lt('created_at', until);
		if (lastId !== null) query = query.gt('id', lastId);
		return query.order('id', { ascending: true }).limit(limit);
	};

	while (rows.length < MAX_RELEVE_ROWS) {
		const { data, error } = await readPage(RELEVE_PAGE_SIZE);
		if (error) return { error: { code: error.code, message: error.message } };

		for (const { route, metric, value } of data) rows.push({ route, metric, value });
		if (data.length < RELEVE_PAGE_SIZE) return { rows, truncated: false };
		lastId = data[data.length - 1].id;
	}

	// Plafond atteint : reste-t-il au moins une ligne ?
	const { data: next, error } = await readPage(1);
	if (error) return { error: { code: error.code, message: error.message } };
	return { rows, truncated: next.length > 0 };
}
