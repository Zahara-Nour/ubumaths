/**
 * Réception des mesures de performance des visiteurs (table `web_vital_samples`).
 *
 * Anonymat : la table est écrite sans compte, sans adresse IP et sans adresse réelle
 * de page. Sa contrainte sur `route` n'est qu'un filet (un jeton écrit en minuscules a
 * la forme d'un segment de route) : la garantie est `KNOWN_ROUTES`, la liste des pages
 * du site. Une route qui n'y figure pas n'est jamais écrite.
 *
 * Risque résiduel : qui lit la base (admin, serveur) peut retrouver l'ordre d'écriture
 * des lignes (ordre physique, numéro de transaction) malgré l'heure arrondie.
 *
 * Le serveur n'a le droit d'insérer que `route`, `metric`, `value` et `device_type` :
 * la date (arrondie à l'heure) et l'identifiant de ligne sont fixés par la base.
 */

import { createHash } from 'node:crypto';
import { z } from 'zod';
import { createServiceRoleClient } from '#lib/server/serviceRoleClient.ts';
import {
	isMeasuredRoute,
	isPlausibleValue,
	MAX_ROUTE_LENGTH,
	MAX_SAMPLES_PER_BATCH,
	SAMPLE_DEVICE_TYPES,
	SAMPLE_METRICS,
	type SampleDeviceType,
	type WebVitalSample
} from '#lib/utils/web-vitals-mesures.ts';

// Constantes

/** Fichiers de page du site : seules les clés servent, aucune page n'est chargée */
const PAGE_FILES = import.meta.glob('/src/routes/**/+page*.svelte');

/** Enveloppe d'un envoi ; chaque mesure est validée à part (`keepValidSamples`) */
export const webVitalsBatchSchema = z.object({
	device_type: z.enum(SAMPLE_DEVICE_TYPES),
	samples: z.array(z.unknown()).min(1).max(MAX_SAMPLES_PER_BATCH)
});

const sampleSchema = z
	.object({
		route: z.string().min(1).max(MAX_ROUTE_LENGTH),
		metric: z.enum(SAMPLE_METRICS),
		value: z.number().min(0)
	})
	.refine((sample) => isPlausibleValue(sample.metric, sample.value));

// Functions

/** `/src/routes/(public)/cours/[token]/+page.svelte` → `/(public)/cours/[token]` */
export function routeIdFromPageFile(file: string): string {
	const routeId = file.replace(/^\/src\/routes/, '').replace(/\/\+page(@[^/]*)?\.svelte$/, '');
	return routeId === '' ? '/' : routeId;
}

/** Identifiants de route de toutes les pages du site */
export const KNOWN_ROUTES: ReadonlySet<string> = new Set(
	Object.keys(PAGE_FILES).map(routeIdFromPageFile)
);

/**
 * Mesures à écrire : bien formées, dans les bornes, d'une page du site qui est
 * comptée (ni admin ni `/dev`). Les autres sont écartées une à une : une valeur
 * absurde ne fait pas perdre le reste de l'envoi.
 */
export function keepValidSamples(
	rawSamples: readonly unknown[],
	knownRoutes: ReadonlySet<string> = KNOWN_ROUTES
): WebVitalSample[] {
	const kept: WebVitalSample[] = [];
	for (const raw of rawSamples) {
		const parsed = sampleSchema.safeParse(raw);
		if (!parsed.success) continue;
		const { route, metric, value } = parsed.data;
		if (!knownRoutes.has(route) || !isMeasuredRoute(route)) continue;
		kept.push({ route, metric, value });
	}
	return kept;
}

/**
 * Ce qui compte pour un visiteur dans le compteur de débit : l'adresse IPv4 entière,
 * ou le préfixe /64 d'une adresse IPv6 (un abonné dispose de tout un /64 : compter
 * par adresse ne limiterait rien).
 */
export function rateLimitSubject(clientAddress: string): string {
	const address = clientAddress.toLowerCase();
	const mapped = address.match(/^::ffff:(\d+\.\d+\.\d+\.\d+)$/);
	if (mapped) return mapped[1];
	if (!address.includes(':')) return address;

	const [head, tail] = address.split('::');
	const headGroups = head ? head.split(':') : [];
	const tailGroups = tail ? tail.split(':') : [];
	const missing = Math.max(8 - headGroups.length - tailGroups.length, 0);
	const groups =
		tail === undefined
			? headGroups
			: [...headGroups, ...Array<string>(missing).fill('0'), ...tailGroups];
	return groups
		.slice(0, 4)
		.map((group) => group.replace(/^0+(?=.)/, ''))
		.join(':');
}

/**
 * Clé du compteur de débit : une empreinte de l'adresse du visiteur, pas l'adresse en
 * clair. C'est un pseudonyme (une empreinte d'IPv4 se retrouve par essais), gardé dans
 * `rate_limits` jusqu'à la purge quotidienne ; il n'est jamais écrit à côté d'une mesure.
 */
export function rateLimitKey(clientAddress: string): string {
	const subject = rateLimitSubject(clientAddress);
	return `web-vitals:${createHash('sha256').update(subject).digest('hex').slice(0, 32)}`;
}

/** Écrit une ligne par mesure. Rend l'erreur de la base, `null` si tout est écrit. */
export async function storeSamples(
	samples: readonly WebVitalSample[],
	deviceType: SampleDeviceType
): Promise<{ code?: string; message: string } | null> {
	const rows = samples.map(({ route, metric, value }) => ({
		route,
		metric,
		value,
		device_type: deviceType
	}));
	// Pas de `.select()` : rien à relire, et un refus de droit rend une erreur (42501)
	const { error } = await createServiceRoleClient().from('web_vital_samples').insert(rows);
	return error ? { code: error.code, message: error.message } : null;
}
