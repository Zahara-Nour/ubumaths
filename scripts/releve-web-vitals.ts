/**
 * Relevé mensuel des Core Web Vitals de production (Speed Insights).
 *
 * Pourquoi ce script existe
 * -------------------------
 * Le 2026-10-11, Speed Insights montrait un FCP p75 de 3,4 s sur l'accueil pour
 * un TTFB de 0,5 s : 94 chunks JS préchargés volaient la bande passante aux CSS
 * (#1073). Personne ne l'avait vu, faute de regarder. Ce script relève chaque
 * mois les vraies mesures des visiteurs et les classe selon les seuils de
 * Google, pour qu'une dégradation se voie sans aller la chercher.
 *
 * Il ne diagnostique rien : une page au rouge se diagnostique à la main (agent
 * `vercel:performance-optimizer`, cf. docs/pratiques/core-web-vitals.md).
 *
 * Mensuel et non hebdomadaire : ~150 mesures par mois, un relevé plus serré ne
 * serait que du bruit.
 *
 * Usage :
 *   npx tsx scripts/releve-web-vitals.ts [jours]        (défaut : 28)
 * Lit `VERCEL_BIN` (défaut `vercel`) ; en CI, `VERCEL_TOKEN`, `VERCEL_ORG_ID` et
 * `VERCEL_PROJECT_ID` désignent le projet. Écrit le rapport Markdown sur la
 * sortie standard ; code 2 si une requête échoue (aucun rapport partiel).
 */
import { execFileSync } from 'node:child_process';

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

export interface RouteRow {
	route: string;
	count: number;
	values: Partial<Record<Vital, number>>;
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

/** Pages à regarder : p75 « mauvais » sur au moins un indicateur, échantillon suffisant. */
export function poorRoutes(rows: RouteRow[]): RouteRow[] {
	return rows.filter(
		(row) =>
			row.count >= MIN_SAMPLE &&
			VITALS.some((v) => {
				const value = row.values[v];
				return value !== undefined && rate(v, value) === 'poor';
			})
	);
}

export function renderReport(input: {
	days: number;
	total: number;
	global: Partial<Record<Vital, number>>;
	routes: RouteRow[];
}): string {
	const { days, total, global, routes } = input;
	const lines: string[] = [];
	lines.push(`Mesures réelles des visiteurs (Speed Insights, production, ${days} j, 75ᵉ centile).`);
	lines.push(`**${total} mesures** au total.`);
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
		lines.push(`### 🔴 À regarder (${MIN_SAMPLE}+ mesures et un indicateur au rouge)`);
		for (const row of alerts) lines.push(`- \`${row.route}\` (${row.count} mesures)`);
	} else {
		lines.push(`### Aucune page au rouge parmi celles qui ont ${MIN_SAMPLE}+ mesures`);
	}
	lines.push('');
	lines.push(`### Par page (les ${ROUTE_LIMIT} plus visitées)`);
	lines.push('');
	lines.push('| Page | Mesures | LCP | INP | CLS | FCP | TTFB |');
	lines.push('|---|---|---|---|---|---|---|');
	for (const row of routes) {
		const sample = row.count < MIN_SAMPLE ? `${row.count} ⚠️` : String(row.count);
		const cells = VITALS.map((v) => cell(v, row.values[v])).join(' | ');
		lines.push(`| \`${row.route}\` | ${sample} | ${cells} |`);
	}
	lines.push('');
	lines.push(
		`⚠️ = moins de ${MIN_SAMPLE} mesures : p75 peu fiable. Diagnostic d'une page au rouge : ` +
			'`docs/pratiques/core-web-vitals.md`.'
	);
	return lines.join('\n');
}

// --- Requêtes Speed Insights -------------------------------------------------

type MetricRow = Record<string, string | number | null>;

function queryMetric(
	metric: string,
	aggregation: string,
	days: number,
	groupBy?: string
): MetricRow[] {
	const args = ['metrics', metric, '--prod', '-s', `${days}d`, '-a', aggregation, '--json'];
	if (groupBy) args.push('--group-by', groupBy, '-l', String(ROUTE_LIMIT));
	const env = { ...process.env };
	const orgId = env.VERCEL_ORG_ID;
	if (orgId) args.push('--scope', orgId);
	if (env.VERCEL_PROJECT_ID) args.push('--project', env.VERCEL_PROJECT_ID);
	if (env.VERCEL_TOKEN) args.push('--token', env.VERCEL_TOKEN);
	const output = execFileSync(env.VERCEL_BIN ?? 'vercel', args, {
		encoding: 'utf-8',
		stdio: ['ignore', 'pipe', 'pipe']
	});
	const parsed: unknown = JSON.parse(output.slice(output.indexOf('{')));
	if (typeof parsed !== 'object' || parsed === null || !('summary' in parsed)) {
		throw new Error(`réponse inattendue pour ${metric}`);
	}
	const summary = (parsed as { summary: unknown }).summary;
	if (!Array.isArray(summary)) throw new Error(`summary absent pour ${metric}`);
	return summary.filter((row): row is MetricRow => typeof row === 'object' && row !== null);
}

function numberAt(row: MetricRow, key: string): number | undefined {
	const value = row[key];
	return typeof value === 'number' ? value : undefined;
}

function main(): void {
	const days = Number(process.argv[2] ?? 28);
	const key = (v: Vital, agg: string) => `vercel_speed_insights_${v}_${agg}`;

	const global: Partial<Record<Vital, number>> = {};
	const byRoute = new Map<string, RouteRow>();

	try {
		const totalRows = queryMetric('vercel.speed_insights.lcp_ms', 'count', days);
		const total = numberAt(totalRows[0] ?? {}, key('lcp_ms', 'count')) ?? 0;

		for (const row of queryMetric('vercel.speed_insights.lcp_ms', 'count', days, 'route')) {
			const route = String(row.route ?? '?');
			byRoute.set(route, { route, count: numberAt(row, key('lcp_ms', 'count')) ?? 0, values: {} });
		}
		for (const v of VITALS) {
			const value = numberAt(
				queryMetric(`vercel.speed_insights.${v}`, 'p75', days)[0] ?? {},
				key(v, 'p75')
			);
			if (value !== undefined) global[v] = value;
			for (const row of queryMetric(`vercel.speed_insights.${v}`, 'p75', days, 'route')) {
				const target = byRoute.get(String(row.route ?? '?'));
				const p75 = numberAt(row, key(v, 'p75'));
				if (target && p75 !== undefined) target.values[v] = p75;
			}
		}
		const routes = [...byRoute.values()].sort((a, b) => b.count - a.count);
		console.log(renderReport({ days, total, global, routes }));
	} catch (err) {
		console.error('⛔ Relevé impossible : aucune donnée publiée.');
		console.error(err instanceof Error ? err.message : err);
		process.exit(2);
	}
}

if (import.meta.url === `file://${process.argv[1]}`) main();
