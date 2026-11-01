/**
 * Page d'une ville du Royaume (chantier cartes-site, phase 0 validée le 2026-11-01) :
 * ville connue → ses données ; adresse inconnue → 404.
 */
import { describe, expect, it } from 'vitest';
import { isHttpError } from '@sveltejs/kit';
import { load } from '../+page';
import { CITIES } from '$lib/kingdom-tour/cities';

type LoadEvent = Parameters<typeof load>[0];

function event(ville: string): LoadEvent {
	return { params: { ville } } as LoadEvent;
}

describe('/royaume/[ville] : load', () => {
	it.each(CITIES.map((c) => c.slug))('%s : la ville et sa description pour Google', (slug) => {
		const data = load(event(slug));
		expect(data).toMatchObject({ city: { slug } });
		expect(data?.description.length).toBeGreaterThan(50);
		expect(data?.description.length).toBeLessThanOrEqual(160);
	});

	it.each(['varsovie', 'SANDOMIR', 'sandomir-', '../shtam', 'x'.repeat(300)])(
		'adresse inconnue « %s » → 404',
		(ville) => {
			try {
				load(event(ville));
				expect.unreachable('le load devait lever une 404');
			} catch (err) {
				expect(isHttpError(err) && err.status).toBe(404);
			}
		}
	);
});
