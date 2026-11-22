/**
 * Relevé mensuel des Core Web Vitals de production (nos propres mesures).
 *
 * Pourquoi ce script existe
 * -------------------------
 * Le 2026-10-11, le FCP p75 de l'accueil était de 3,4 s pour un TTFB de 0,5 s :
 * 94 chunks JS préchargés volaient la bande passante aux CSS (#1073). Personne ne
 * l'avait vu, faute de regarder. Ce script relève chaque mois les vraies mesures des
 * visiteurs et les classe selon les seuils de Google, pour qu'une dégradation se voie
 * sans aller la chercher.
 *
 * Source : la table `web_vital_samples` (chantier `amelioration`, 2026-11-21 ; Vercel
 * a rendu payant le détail de Speed Insights). Le script ne lit pas la base : il
 * appelle `GET /api/web-vitals/releve`, qui ne rend que des résultats calculés (p75
 * et nombre de mesures par page), avec un jeton qui n'ouvre que cette route.
 *
 * Il ne diagnostique rien : une page au rouge se diagnostique à la main (agent
 * `vercel:performance-optimizer`, cf. docs/pratiques/core-web-vitals.md).
 *
 * Usage :
 *   npx tsx scripts/releve-web-vitals.ts [jours]        (défaut : 28, au plus 90)
 * Lit `WEB_VITALS_RELEVE_TOKEN` (obligatoire) et `WEB_VITALS_RELEVE_URL` (défaut : le
 * site de production). Écrit le rapport Markdown sur la sortie standard ; code 2 si la
 * requête échoue (aucun rapport partiel).
 */
import { z } from 'zod';

export type Vital = 'lcp_ms' | 'inp_ms' | 'cls' | 'fcp_ms' | 'ttfb_ms';
export type Rating = 'good' | 'needs-improvement' | 'poor';

/** Seuils de Google (p75) : « bon » jusqu'à `good`, « mauvais » au-delà de `poor`. */
export const THRESHOLDS: Record<Vital, { good: number; poor: number; label: string }> = {
	lcp_ms: { good: 2500, poor: 4000, label: 'LCP' },
	inp_ms: { good: 200, poor: 500, label: 'INP' },
	cls: { good: 0.1, poor: 0.25, label: 'CLS' },
	fcp_ms: { good: 1800, poor: 3000, label: 'FCP' },
	ttfb_ms: { good: 800, poor: 1800, label: 'TTFB' }
};

export const VITALS: Vital[] = ['lcp_ms', 'inp_ms', 'cls', 'fcp_ms', 'ttfb_ms'];

/** En dessous, le p75 d'une page repose sur trop peu de visites pour conclure. */
export const MIN_SAMPLE = 10;

const ROUTE_LIMIT = 20;

/** Adresse canonique : `chiph.re` redirige, et le jeton ne suit aucune redirection */
const DEFAULT_URL = 'https://www.chiph.re';

export interface RouteRow {
	route: string;
	/** Mesures de l'indicateur le plus relevé : à peu près le nombre de visites */
	count: number;
	values: Partial<Record<Vital, number>>;
	/** Nombre de mesures de chaque indicateur */
	counts: Partial<Record<Vital, number>>;
}

export function rate(vital: Vital, value: number): Rating {
	const t = THRESHOLDS[vital];
	if (value <= t.good) return 'good';
	if (value <= t.poor) return 'needs-improvement';
	return 'poor';
}

const ICON: Record<Rating, string> = { good: '🟢', 'needs-improvement': '🟠', poor: '🔴' };

export function formatValue(vital: Vital, value: number): string {
	if (vital === 'cls') return value.toFixed(3).replace('.', ',');
	if (value >= 1000) return `${(value / 1000).toFixed(1).replace('.', ',')} s`;
	return `${Math.round(value)} ms`;
}

function cell(vital: Vital, value: number | undefined): string {
	if (value === undefined) return '—';
	return `${ICON[rate(vital, value)]} ${formatValue(vital, value)}`;
}

/**
 * Pages à regarder : p75 « mauvais » sur au moins un indicateur qui a, lui, assez de
 * mesures (une page très visitée peut n'avoir que trois INP).
 */
export function poorRoutes(rows: RouteRow[]): RouteRow[] {
	return rows.filter((row) =>
		VITALS.some((v) => {
			const value = row.values[v];
			return value !== undefined && (row.counts[v] ?? 0) >= MIN_SAMPLE && rate(v, value) === 'poor';
		})
	);
}

export function renderReport(input: {
	days: number;
	total: number;
	global: Partial<Record<Vital, number>>;
	routes: RouteRow[];
	truncated?: boolean;
}): string {
	const { days, total, global, routes, truncated } = input;
	const lines: string[] = [];
	lines.push(`Mesures réelles des visiteurs (nos mesures, production, ${days} j, 75ᵉ centile).`);
	lines.push(`**${total} mesures** au total.`);
	if (truncated) {
		lines.push(
			'⚠️ Trop de lignes pour tout lire : ce relevé porte sur un échantillon pris au hasard.'
		);
	}
	lines.push('');
	lines.push('| Indicateur | p75 | Seuils Google (bon / mauvais) |');
	lines.push('|---|---|---|');
	for (const v of VITALS) {
		const t = THRESHOLDS[v];
		lines.push(
			`| ${t.label} | ${cell(v, global[v])} | ≤ ${formatValue(v, t.good)} / > ${formatValue(v, t.poor)} |`
		);
	}
	lines.push('');
	const alerts = poorRoutes(routes);
	if (alerts.length > 0) {
		lines.push(`### 🔴 À regarder (un indicateur au rouge sur ${MIN_SAMPLE}+ mesures)`);
		for (const row of alerts) lines.push(`- \`${row.route}\` (${row.count} mesures)`);
	} else {
		lines.push(`### Aucune page au rouge parmi celles qui ont ${MIN_SAMPLE}+ mesures`);
	}
	lines.push('');
	lines.push(`### Par page (les ${ROUTE_LIMIT} plus mesurées)`);
	lines.push('');
	lines.push('| Page | Mesures | LCP | INP | CLS | FCP | TTFB |');
	lines.push('|---|---|---|---|---|---|---|');
	for (const row of routes.slice(0, ROUTE_LIMIT)) {
		const sample = row.count < MIN_SAMPLE ? `${row.count} ⚠️` : String(row.count);
		const cells = VITALS.map((v) => cell(v, row.values[v])).join(' | ');
		lines.push(`| \`${row.route}\` | ${sample} | ${cells} |`);
	}
	lines.push('');
	lines.push(
		`« Mesures » = celles de l'indicateur le plus relevé de la page (à peu près ses visites). ` +
			`⚠️ = moins de ${MIN_SAMPLE} : p75 peu fiable. Diagnostic d'une page au rouge : ` +
			'`docs/pratiques/core-web-vitals.md`.'
	);
	return lines.join('\n');
}

// --- Lecture du relevé calculé par le site --------------------------------------

const METRIC_KEYS = {
	LCP: 'lcp_ms',
	INP: 'inp_ms',
	CLS: 'cls',
	FCP: 'fcp_ms',
	TTFB: 'ttfb_ms'
} as const;

/** Sous cinq mesures, le site ne rend que leur nombre */
const summarySchema = z.object({
	count: z.number().int().min(1),
	p75: z.number().min(0).optional()
});

/** Même forme que la contrainte de la table : rien qui puisse casser le Markdown du rapport */
const ROUTE_PATTERN =
	/^\/$|^(\/([a-z0-9-]+|\([a-z0-9-]+\)|\[{1,2}(\.\.\.)?[A-Za-z0-9_]+(=[A-Za-z0-9_]+)?\]{1,2}))+$/;
const metricsSchema = z.object({
	LCP: summarySchema.optional(),
	INP: summarySchema.optional(),
	CLS: summarySchema.optional(),
	FCP: summarySchema.optional(),
	TTFB: summarySchema.optional()
});

/** Réponse de `GET /api/web-vitals/releve` */
export const releveSchema = z.object({
	days: z.number().int().min(1),
	total: z.number().int().min(0),
	truncated: z.boolean(),
	global: metricsSchema,
	routes: z
		.array(
			z.object({ route: z.string().min(1).max(200).regex(ROUTE_PATTERN), metrics: metricsSchema })
		)
		.max(5000)
});

type Metrics = z.infer<typeof metricsSchema>;

function split(metrics: Metrics): Pick<RouteRow, 'values' | 'counts' | 'count'> {
	const values: RouteRow['values'] = {};
	const counts: RouteRow['counts'] = {};
	let count = 0;
	for (const [metric, vital] of Object.entries(METRIC_KEYS) as [keyof Metrics, Vital][]) {
		const summary = metrics[metric];
		if (!summary) continue;
		if (summary.p75 !== undefined) values[vital] = summary.p75;
		counts[vital] = summary.count;
		count = Math.max(count, summary.count);
	}
	return { values, counts, count };
}

/** Réponse du site → ce qu'attend `renderReport` */
export function toReportInput(
	releve: z.infer<typeof releveSchema>
): Parameters<typeof renderReport>[0] {
	return {
		days: releve.days,
		total: releve.total,
		truncated: releve.truncated,
		global: split(releve.global).values,
		routes: releve.routes
			.map(({ route, metrics }) => ({ route, ...split(metrics) }))
			.sort((a, b) => b.count - a.count)
	};
}

async function main(): Promise<void> {
	const days = Number(process.argv[2] ?? 28);
	const token = process.env.WEB_VITALS_RELEVE_TOKEN;
	const base = process.env.WEB_VITALS_RELEVE_URL ?? DEFAULT_URL;

	try {
		if (!Number.isInteger(days) || days < 1 || days > 90) {
			throw new Error('nombre de jours attendu : un entier de 1 à 90');
		}
		if (!token) throw new Error('WEB_VITALS_RELEVE_TOKEN absent');

		const response = await fetch(new URL(`/api/web-vitals/releve?days=${days}`, base), {
			headers: { authorization: `Bearer ${token}` },
			redirect: 'error',
			signal: AbortSignal.timeout(60_000)
		});
		// Le corps d'une réponse en erreur n'est pas recopié : seul le statut sort
		if (!response.ok) throw new Error(`le site a répondu ${response.status}`);
		const releve = releveSchema.parse(await response.json());
		console.log(renderReport(toReportInput(releve)));
	} catch (err) {
		console.error('⛔ Relevé impossible : aucune donnée publiée.');
		console.error(err instanceof Error ? err.message : err);
		process.exit(2);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) void main();
