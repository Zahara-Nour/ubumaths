/**
 * MathouAvatar — dessin SVG d'un Mathou : nom accessible, sieste, silhouette, ids uniques.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MathouAvatar from '../MathouAvatar.svelte';
import { MATHOU_RACES, MATHOU_RACE_COUNT, normalizeRaceIndex } from '../mathou-races';

function svgOf(container: HTMLElement): SVGSVGElement {
	const svg = container.querySelector('svg');
	if (!svg) throw new Error('aucun <svg> rendu');
	return svg;
}

describe('MathouAvatar', () => {
	it('rend un SVG role="img" avec le nom accessible et la taille demandée', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'matou',
			label: 'le Mathou des Fractions, matou',
			size: 64
		});
		const svg = svgOf(container);
		expect(svg.getAttribute('role')).toBe('img');
		expect(svg.getAttribute('aria-label')).toBe('le Mathou des Fractions, matou');
		expect(svg.getAttribute('width')).toBe('64');
		expect(svg.querySelector('text')).toBeNull();
	});

	it('taille par défaut : 96 px', async () => {
		const { container } = await render(MathouAvatar, { raceIndex: 3, stage: 'chaton', label: 'x' });
		expect(svgOf(container).getAttribute('width')).toBe('96');
	});

	it('éveillé : yeux ouverts, pas de « Zzz »', async () => {
		const { container } = await render(MathouAvatar, { raceIndex: 1, stage: 'matou', label: 'x' });
		const svg = svgOf(container);
		expect(svg.querySelector('[data-part="zzz"]')).toBeNull();
		expect(svg.querySelectorAll('[data-part="yeux"] ellipse').length).toBeGreaterThan(0);
	});

	it('en sieste : « Zzz » dessiné et yeux fermés (aucune pupille)', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 1,
			stage: 'matou',
			asleep: true,
			label: 'le Mathou des Fractions, matou, en sieste'
		});
		const svg = svgOf(container);
		expect(svg.querySelector('[data-part="zzz"]')).not.toBeNull();
		expect(svg.querySelectorAll('[data-part="zzz"] path').length).toBe(3);
		expect(svg.querySelectorAll('[data-part="yeux"] ellipse').length).toBe(0);
		expect(svg.getAttribute('data-asleep')).toBe('true');
	});

	it('silhouette : aucun motif, aucun œil, aucune couleur de race', async () => {
		// Race tigrée rousse : ses couleurs ne doivent apparaître nulle part
		const race = MATHOU_RACES[1];
		const { container } = await render(MathouAvatar, {
			raceIndex: 1,
			stage: 'grand_matou',
			silhouette: true,
			asleep: true,
			label: 'un Mathou à découvrir'
		});
		const svg = svgOf(container);
		expect(svg.querySelector('[data-part="silhouette"]')).not.toBeNull();
		// une silhouette ne fait pas la sieste
		expect(svg.hasAttribute('data-asleep')).toBe(false);
		expect(svg.querySelector('[data-part="motif"]')).toBeNull();
		expect(svg.querySelector('[data-part="yeux"]')).toBeNull();
		expect(svg.querySelector('[data-part="collerette"]')).toBeNull();
		expect(svg.querySelector('[data-part="zzz"]')).toBeNull();
		expect(svg.querySelector('[data-part="couronne"]')).toBeNull();
		expect(svg.querySelector('[data-part="bonnet"]')).toBeNull();
		expect(svg.innerHTML).not.toContain(race.primary);
		expect(svg.innerHTML).not.toContain(race.secondary);
		// l'auréole non plus ne trahit pas la race
		expect(svg.innerHTML).not.toContain(race.halo);
	});

	it('grand matou : porte la collerette, le matou non', async () => {
		const grand = await render(MathouAvatar, { raceIndex: 5, stage: 'grand_matou', label: 'x' });
		expect(svgOf(grand.container).querySelector('[data-part="collerette"]')).not.toBeNull();
		const matou = await render(MathouAvatar, { raceIndex: 5, stage: 'matou', label: 'y' });
		expect(svgOf(matou.container).querySelector('[data-part="collerette"]')).toBeNull();
	});

	it('grand matou éveillé : couronne ; en sieste : bonnet de nuit à la place', async () => {
		const awake = svgOf(
			(await render(MathouAvatar, { raceIndex: 5, stage: 'grand_matou', label: 'x' })).container
		);
		expect(awake.querySelector('[data-part="couronne"]')).not.toBeNull();
		expect(awake.querySelector('[data-part="bonnet"]')).toBeNull();
		const asleep = svgOf(
			(
				await render(MathouAvatar, {
					raceIndex: 5,
					stage: 'grand_matou',
					asleep: true,
					label: 'y'
				})
			).container
		);
		expect(asleep.querySelector('[data-part="couronne"]')).toBeNull();
		expect(asleep.querySelector('[data-part="bonnet"]')).not.toBeNull();
		expect(asleep.querySelector('[data-part="collerette"]')).not.toBeNull();
	});

	it('chaque race dessine son motif, peint de la couleur du motif ; une race unie, aucun', async () => {
		for (let i = 0; i < MATHOU_RACE_COUNT; i++) {
			const race = MATHOU_RACES[i];
			const { container } = await render(MathouAvatar, {
				raceIndex: i,
				stage: 'matou',
				label: 'x'
			});
			const svg = svgOf(container);
			const motif = svg.querySelector('[data-part="motif"]');
			if (!motif) throw new Error(`race ${i} : aucune partie motif`);
			// calques du motif (l'ombre propre, toujours là, est mise à part)
			const layers = [...motif.querySelectorAll('path:not([data-part="ombre"])')];
			if (race.pattern === 'uni') {
				expect(layers, race.name).toEqual([]);
				continue;
			}
			if (race.pattern === 'gidouille') {
				// le motif EST la gidouille : épaisse, de la couleur du motif
				const gid = svg.querySelector('[data-part="gidouille"]');
				expect(gid?.getAttribute('stroke'), race.name).toBe(race.secondary);
				continue;
			}
			expect(layers.length, race.name).toBeGreaterThan(0);
			// couleur du motif : en aplat, en trait, ou via le dégradé du fumé
			const gradientIds = [...svg.querySelectorAll('radialGradient')]
				.filter((grad) =>
					[...grad.querySelectorAll('stop')].some(
						(stop) => stop.getAttribute('stop-color') === race.secondary
					)
				)
				.map((grad) => `url(#${grad.id})`);
			const painted = layers.filter(
				(el) =>
					el.getAttribute('fill') === race.secondary ||
					el.getAttribute('stroke') === race.secondary ||
					gradientIds.includes(el.getAttribute('fill') ?? '')
			);
			expect(painted.length, race.name).toBeGreaterThan(0);
		}
	});

	it('deux instances sur la page : ids distincts, références internes à soi', async () => {
		// Race fumée : clipPaths (carte, corps, yeux) + dégradé, le cas le plus chargé en ids
		const a = await render(MathouAvatar, { raceIndex: 12, stage: 'matou', label: 'a' });
		const b = await render(MathouAvatar, { raceIndex: 12, stage: 'matou', label: 'b' });
		const idsA = [...svgOf(a.container).querySelectorAll('[id]')].map((el) => el.id);
		const idsB = [...svgOf(b.container).querySelectorAll('[id]')].map((el) => el.id);
		expect(idsA.length).toBeGreaterThanOrEqual(3);
		expect(idsA.filter((id) => idsB.includes(id))).toEqual([]);
		// Chaque url(#…) d'une instance pointe vers un id de cette même instance
		const refsA = [...svgOf(a.container).innerHTML.matchAll(/url\(#([^)]+)\)/g)].map((m) => m[1]);
		expect(refsA.length).toBeGreaterThan(0);
		for (const ref of refsA) expect(idsA).toContain(ref);
	});

	it('raceIndex hors bornes : rendu sans erreur, race ramenée par modulo', async () => {
		const expected: [number, number][] = [
			[19, 0],
			[42, 4],
			[-1, 18],
			[3.7, 3],
			[20.7, 1],
			[Number.NaN, 0]
		];
		for (const [raceIndex, index] of expected) {
			const { container } = await render(MathouAvatar, { raceIndex, stage: 'chaton', label: 'x' });
			const svg = svgOf(container);
			expect(svg.innerHTML, String(raceIndex)).toContain(MATHOU_RACES[index].primary);
		}
	});
});

describe('mathou-races', () => {
	it('19 races, couples (couleur, motif) tous distincts', async () => {
		expect(MATHOU_RACE_COUNT).toBe(19);
		const keys = MATHOU_RACES.map((r) => `${r.primary}|${r.secondary}|${r.pattern}`);
		expect(new Set(keys).size).toBe(19);
		// ce qui se voit : pelage + motif, distincts d'une race à l'autre
		expect(new Set(MATHOU_RACES.map((r) => `${r.primary}|${r.pattern}`)).size).toBe(19);
		expect(new Set(MATHOU_RACES.map((r) => r.name)).size).toBe(19);
	});

	it('normalizeRaceIndex : modulo 19, négatifs et NaN gérés', async () => {
		expect(normalizeRaceIndex(0)).toBe(0);
		expect(normalizeRaceIndex(18)).toBe(18);
		expect(normalizeRaceIndex(19)).toBe(0);
		expect(normalizeRaceIndex(42)).toBe(4);
		expect(normalizeRaceIndex(-1)).toBe(18);
		expect(normalizeRaceIndex(3.7)).toBe(3);
		expect(normalizeRaceIndex(Number.NaN)).toBe(0);
		expect(normalizeRaceIndex(Number.POSITIVE_INFINITY)).toBe(0);
	});
});
