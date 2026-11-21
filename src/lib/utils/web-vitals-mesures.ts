/**
 * Mesures de performance gardées chez nous (table `web_vital_samples`).
 *
 * Partagé entre le navigateur (collecte, envoi) et le serveur (réception) : mêmes
 * indicateurs, mêmes bornes, même règle sur les pages comptées.
 *
 * Anonymat : une mesure porte l'identifiant de route SvelteKit
 * (« /(public)/cours/[token] »), jamais l'adresse réelle de la page, et rien qui
 * désigne le visiteur.
 */

// Types

export type SampleMetric = (typeof SAMPLE_METRICS)[number];
export type SampleDeviceType = (typeof SAMPLE_DEVICE_TYPES)[number];

/** Une mesure telle qu'elle part au serveur */
export interface WebVitalSample {
	route: string;
	metric: SampleMetric;
	value: number;
}

/** Mesures de chargement : une par page ouverte, rattachées à la page d'arrivée */
type LoadMetric = 'LCP' | 'FCP' | 'TTFB';

// Constantes

/** Indicateurs gardés (`FID`, retiré par Google, n'en fait pas partie) */
export const SAMPLE_METRICS = ['LCP', 'FCP', 'TTFB', 'INP', 'CLS'] as const;
export const SAMPLE_DEVICE_TYPES = ['mobile', 'tablet', 'desktop'] as const;

/** Adresse de réception */
export const WEB_VITALS_ENDPOINT = '/api/web-vitals';
/** Mesures par envoi : cinq indicateurs au plus, marge comprise */
export const MAX_SAMPLES_PER_BATCH = 10;
/** Longueur maximale d'un identifiant de route (même borne que la table) */
export const MAX_ROUTE_LENGTH = 200;
/** Durées en millisecondes : dix minutes au plus (même borne que la table) */
export const MAX_DURATION_MS = 600_000;
/** CLS, sans unité (même borne que la table) */
export const MAX_CLS = 100;

/** Écart qui sépare deux rafales de décalages, et durée maximale d'une rafale */
const CLS_BURST_GAP_MS = 1000;
const CLS_BURST_MAX_MS = 5000;

const LOAD_METRICS: readonly LoadMetric[] = ['TTFB', 'FCP', 'LCP'];
/** Segments de route non comptés : pages d'admin et pages `/dev` */
const UNMEASURED_SEGMENTS = new Set(['admin', 'dev']);

// Functions

/**
 * Vrai si les visites de cette route sont comptées : toutes, sauf les pages
 * d'admin et `/dev` (décision du 2026-11-21).
 */
export function isMeasuredRoute(routeId: string | null | undefined): routeId is string {
	if (!routeId) return false;
	return !routeId.split('/').some((segment) => UNMEASURED_SEGMENTS.has(segment));
}

/** Vrai si la valeur est un nombre fini dans les bornes de l'indicateur */
export function isPlausibleValue(metric: SampleMetric, value: number): boolean {
	if (!Number.isFinite(value) || value < 0) return false;
	return value <= (metric === 'CLS' ? MAX_CLS : MAX_DURATION_MS);
}

/**
 * CLS au sens de Google : la pire rafale de décalages, pas leur somme sur toute la
 * visite. Une rafale réunit les décalages séparés de moins d'une seconde, sur cinq
 * secondes au plus. `time` : instant du décalage (ms depuis l'ouverture).
 */
export function createClsTracker() {
	let worst = 0;
	let burst = 0;
	let burstStart = 0;
	let lastShift = Number.NEGATIVE_INFINITY;

	return {
		add(value: number, time: number): void {
			if (time - lastShift < CLS_BURST_GAP_MS && time - burstStart < CLS_BURST_MAX_MS) {
				burst += value;
			} else {
				burst = value;
				burstStart = time;
			}
			lastShift = time;
			worst = Math.max(worst, burst);
		},
		value: (): number => worst
	};
}

/** Millisecondes entières ; CLS au millième */
function roundValue(metric: SampleMetric, value: number): number {
	return metric === 'CLS' ? Math.round(value * 1000) / 1000 : Math.round(value);
}

/**
 * Garde les mesures d'une visite et les remet à `send` à chaque `flush()` (page
 * passée en arrière-plan).
 *
 * - Chargement (TTFB, FCP, LCP) : envoyé une seule fois, sur la page d'arrivée ;
 *   le LCP retenu est le dernier observé avant l'envoi.
 * - CLS : cumul de la visite, rattaché à la page courante ; INP : rattaché à la
 *   page où l'interaction a commencé. Ils repartent s'ils ont grandi (onglet
 *   repris puis quitté de nouveau), jamais à l'identique.
 * - Une mesure hors bornes ou d'une page non comptée est écartée.
 */
export function createSampleCollector(send: (samples: WebVitalSample[]) => void) {
	/** Page d'arrivée (première route notée) et page courante */
	let landingRoute: string | null = null;
	/** Vrai dès la première page notée, même sans route (page d'erreur) */
	let landed = false;
	let currentRoute: string | null = null;

	const load = new Map<LoadMetric, number>();
	let loadSent = false;

	let cls: number | null = null;
	let sentCls = -1;
	let inp: { value: number; route: string | null } | null = null;
	let sentInp = -1;

	function sample(route: string | null, metric: SampleMetric, value: number) {
		if (!isMeasuredRoute(route) || !isPlausibleValue(metric, value)) return null;
		return { route, metric, value: roundValue(metric, value) } satisfies WebVitalSample;
	}

	return {
		/** À chaque page affichée (arrivée et navigations internes) */
		noteRoute(routeId: string | null): void {
			// Arrivée sur une page sans route (404) : son chargement n'est pas reporté
			// sur la page suivante
			if (!landed) {
				landingRoute = routeId;
				landed = true;
			}
			currentRoute = routeId;
		},

		recordLoad(metric: LoadMetric, value: number): void {
			if (!loadSent) load.set(metric, value);
		},

		/** CLS cumulé de la visite */
		recordCls(value: number): void {
			cls = value;
		},

		/** INP de la visite et route où son interaction a commencé */
		recordInp(value: number, routeId: string | null): void {
			inp = { value, route: routeId };
		},

		flush(): void {
			const samples: WebVitalSample[] = [];

			// Tant qu'aucune page n'est notée (page pas encore démarrée), le chargement attend
			if (!loadSent && landed) {
				for (const metric of LOAD_METRICS) {
					const value = load.get(metric);
					const item = value === undefined ? null : sample(landingRoute, metric, value);
					if (item) samples.push(item);
				}
				loadSent = true;
				load.clear();
			}

			if (cls !== null && cls > sentCls) {
				const item = sample(currentRoute, 'CLS', cls);
				if (item) {
					samples.push(item);
					sentCls = cls;
				}
			}

			if (inp !== null && inp.value > sentInp) {
				const item = sample(inp.route, 'INP', inp.value);
				if (item) {
					samples.push(item);
					sentInp = inp.value;
				}
			}

			if (samples.length > 0) send(samples);
		}
	};
}

export type SampleCollector = ReturnType<typeof createSampleCollector>;
