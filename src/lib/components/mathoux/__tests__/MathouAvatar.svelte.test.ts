/**
 * MathouAvatar — dessin SVG d'un Mathou : nom accessible, sieste, silhouette, ids uniques.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MathouAvatar from '../MathouAvatar.svelte';
import {
	MATHOU_RACES,
	MATHOU_RACE_COUNT,
	MATHOU_STAGES,
	normalizeRaceIndex
} from '../mathou-races';
import { pearGeometry } from '../mathou-dessin';
import { MATHOU_COLLAR_IDS, MATHOU_DECORATION_IDS } from '$lib/mathoux/decorations';

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

	it('aucune gidouille sur la panse : chaque race, chaque stade, en sieste et en silhouette', async () => {
		const cases = [
			...MATHOU_STAGES.flatMap((stage) =>
				MATHOU_RACES.map((_, raceIndex) => ({ raceIndex, stage, asleep: false, silhouette: false }))
			),
			...MATHOU_STAGES.map((stage) => ({ raceIndex: 4, stage, asleep: true, silhouette: false })),
			...MATHOU_STAGES.map((stage) => ({ raceIndex: 4, stage, asleep: false, silhouette: true }))
		];
		for (const props of cases) {
			const { container } = await render(MathouAvatar, { ...props, label: 'x' });
			const svg = svgOf(container);
			const where = `${MATHOU_RACES[props.raceIndex].name}, ${props.stage}`;
			expect(svg.querySelector('[data-part="gidouille"]'), where).toBeNull();
			// la gidouille en pointillé de la silhouette
			expect(svg.querySelector('[stroke-dasharray="2 5"]'), where).toBeNull();
		}
	});

	it('le Al Jabr Oriental a les yeux vairons, bleu et cuivre ; les autres races deux yeux pareils', async () => {
		for (let i = 0; i < MATHOU_RACE_COUNT; i++) {
			const race = MATHOU_RACES[i];
			const { container } = await render(MathouAvatar, {
				raceIndex: i,
				stage: 'matou',
				label: 'x'
			});
			const irises = [
				...svgOf(container).querySelectorAll('[data-part="yeux"] > path[data-part="iris"]')
			].map((el) => el.getAttribute('fill'));
			expect(irises.length, race.name).toBe(2);
			if (race.name === 'le Al Jabr Oriental') {
				expect(race.pattern).toBe('arabesque');
				expect(irises[0], race.name).not.toBe(irises[1]);
				expect(irises, race.name).toEqual([race.eyes, race.eyesRight]);
			} else {
				expect(irises[0], race.name).toBe(irises[1]);
			}
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

describe('MathouAvatar — décoration de panse', () => {
	const raceOf = (pattern: string): number => MATHOU_RACES.findIndex((r) => r.pattern === pattern);

	function decorationOf(container: HTMLElement): SVGGElement | null {
		return container.querySelector('[data-part="decoration"]');
	}

	it('aucune décoration par défaut', async () => {
		const { container } = await render(MathouAvatar, { raceIndex: 0, stage: 'matou', label: 'M' });
		expect(decorationOf(container)).toBeNull();
	});

	it('chacune des six se dessine sur la panse, à chaque stade', async () => {
		for (const id of MATHOU_DECORATION_IDS) {
			for (const stage of MATHOU_STAGES) {
				const { container } = await render(MathouAvatar, {
					raceIndex: 0,
					stage,
					label: 'M',
					decoration: id
				});
				const deco = decorationOf(container);
				expect(deco?.getAttribute('data-decoration')).toBe(id);
				expect(deco?.children.length).toBeGreaterThan(0);
				// Au milieu, entre les épaules et le bas de la panse
				const geo = pearGeometry(stage);
				const [, x, y] =
					/translate\(([\d.]+) ([\d.]+)\)/.exec(deco?.getAttribute('transform') ?? '') ?? [];
				expect(Number(x)).toBe(100);
				expect(Number(y)).toBeGreaterThan(geo.shoulderY);
				expect(Number(y)).toBeLessThan(geo.stage.bot);
			}
		}
	});

	it('posée sur le corps, après son contour et avant les yeux', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'matou',
			label: 'M',
			decoration: 'cockade'
		});
		const mathou = container.querySelector('[data-part="mathou"]');
		const deco = decorationOf(container);
		expect(deco?.closest('[data-part="mathou"]')).toBe(mathou);
		const eyes = container.querySelector('[data-part="yeux"]');
		expect(eyes && deco && deco.compareDocumentPosition(eyes)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});

	it('la sieste la garde, la silhouette n’en a pas', async () => {
		const asleep = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'matou',
			asleep: true,
			label: 'M',
			decoration: 'medal'
		});
		expect(decorationOf(asleep.container)?.getAttribute('data-decoration')).toBe('medal');

		const shadow = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'chaton',
			silhouette: true,
			label: 'M',
			decoration: 'medal'
		});
		expect(decorationOf(shadow.container)).toBeNull();
	});

	it('races à motif : par-dessus, au même endroit ; le Lunaire, plus petite (creux du croissant)', async () => {
		const transformOf = async (pattern: string): Promise<string | null | undefined> => {
			const { container } = await render(MathouAvatar, {
				raceIndex: raceOf(pattern),
				stage: 'matou',
				label: 'M',
				decoration: 'heart'
			});
			return decorationOf(container)?.getAttribute('transform');
		};
		const plain = await transformOf('uni');
		for (const pattern of ['smoking', 'marbre', 'arlequin']) {
			expect(await transformOf(pattern)).toBe(plain);
		}
		const parse = (t: string | null | undefined): number[] =>
			(/translate\(([\d.]+) ([\d.]+)\) scale\(([\d.]+)\)/.exec(t ?? '') ?? []).slice(1).map(Number);
		const [, , plainK] = parse(plain);
		const [, , lunarK] = parse(await transformOf('plastron'));
		expect(lunarK).toBeLessThan(plainK);
	});
});

describe('MathouAvatar — collier', () => {
	const collarOf = (container: HTMLElement): SVGGElement | null =>
		container.querySelector('[data-part="collier"]');
	const hangingOf = (container: HTMLElement): SVGGElement | null =>
		container.querySelector('[data-part="collier-pendentif"]');
	const hangY = (g: Element | null | undefined): number =>
		Number(/translate\(100 ([\d.]+)\)/.exec(g?.getAttribute('transform') ?? '')?.[1]);

	it('aucun collier par défaut', async () => {
		const { container } = await render(MathouAvatar, { raceIndex: 0, stage: 'matou', label: 'M' });
		expect(collarOf(container)).toBeNull();
		expect(hangingOf(container)).toBeNull();
	});

	it('chacun des quatre se dessine au cou, à chaque stade, avec ce qui pend', async () => {
		for (const id of MATHOU_COLLAR_IDS) {
			for (const stage of MATHOU_STAGES) {
				const { container } = await render(MathouAvatar, {
					raceIndex: 0,
					stage,
					label: 'M',
					collar: id
				});
				const collar = collarOf(container);
				expect(collar?.getAttribute('data-collar')).toBe(id);
				expect(collar?.children.length).toBeGreaterThan(0);
				const pendant = hangingOf(container);
				expect(pendant?.children.length).toBeGreaterThan(0);
				// Au cou : sous la tête, bien au-dessus du bas de la panse
				const geo = pearGeometry(stage);
				expect(hangY(pendant)).toBeGreaterThan(geo.shoulderY);
				expect(hangY(pendant)).toBeLessThan(geo.waistY);
			}
		}
	});

	it('posé sur le corps, après son contour et avant les yeux', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'matou',
			label: 'M',
			collar: 'leather'
		});
		const collar = collarOf(container);
		expect(collar?.closest('[data-part="mathou"]')).toBe(
			container.querySelector('[data-part="mathou"]')
		);
		const eyes = container.querySelector('[data-part="yeux"]');
		expect(eyes && collar && collar.compareDocumentPosition(eyes)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
	});

	it('règle de la fraise : la bande passe dessous, ce qui pend dépasse sous elle', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'grand_matou',
			label: 'M',
			collar: 'bell'
		});
		const collar = collarOf(container);
		const ruff = container.querySelector('[data-part="collerette"]');
		const pendant = hangingOf(container);
		// La bande avant la fraise (dessous), le pendentif après (dessus)
		expect(collar && ruff && collar.compareDocumentPosition(ruff)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		expect(ruff && pendant && ruff.compareDocumentPosition(pendant)).toBe(
			Node.DOCUMENT_POSITION_FOLLOWING
		);
		// Accroché au bas des godrons
		const puffs = [...(ruff?.querySelectorAll('circle') ?? [])];
		const ruffBottom = Math.max(
			...puffs.map((c) => Number(c.getAttribute('cy')) + Number(c.getAttribute('r')))
		);
		expect(hangY(pendant)).toBeGreaterThan(ruffBottom - 2);
	});

	it('se cumule avec la décoration de panse ; ce qui pend passe devant elle', async () => {
		for (const stage of MATHOU_STAGES) {
			const { container } = await render(MathouAvatar, {
				raceIndex: 0,
				stage,
				label: 'M',
				decoration: 'cockade',
				collar: 'bell'
			});
			const collar = collarOf(container);
			const deco = container.querySelector('[data-part="decoration"]');
			const pendant = hangingOf(container);
			expect(collar?.getAttribute('data-collar')).toBe('bell');
			expect(deco?.getAttribute('data-decoration')).toBe('cockade');
			// Ordre de dessin : la bande, la décoration de panse, puis ce qui pend
			expect(collar && deco && collar.compareDocumentPosition(deco)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
			expect(deco && pendant && deco.compareDocumentPosition(pendant)).toBe(
				Node.DOCUMENT_POSITION_FOLLOWING
			);
		}
	});

	it('la sieste le garde, la silhouette n’en a pas', async () => {
		for (const stage of MATHOU_STAGES) {
			const asleep = await render(MathouAvatar, {
				raceIndex: 0,
				stage,
				asleep: true,
				label: 'M',
				collar: 'order_chain'
			});
			expect(collarOf(asleep.container)?.getAttribute('data-collar')).toBe('order_chain');
		}

		const shadow = await render(MathouAvatar, {
			raceIndex: 0,
			stage: 'grand_matou',
			silhouette: true,
			label: 'M',
			collar: 'order_chain'
		});
		expect(collarOf(shadow.container)).toBeNull();
		expect(hangingOf(shadow.container)).toBeNull();
	});
});

describe('MathouAvatar — animations', () => {
	it('au repos : animé par défaut, pas avec animated={false}, jamais en silhouette', async () => {
		const anime = async (props: Record<string, unknown>) => {
			const { container } = await render(MathouAvatar, {
				raceIndex: 0,
				stage: 'matou',
				label: 'x',
				...props
			});
			return svgOf(container).classList.contains('anime');
		};
		expect(await anime({})).toBe(true);
		expect(await anime({ animated: false })).toBe(false);
		expect(await anime({ silhouette: true })).toBe(false);
	});

	it('sans réaction : ni confettis, ni ondes, ni restes de sieste', async () => {
		const { container } = await render(MathouAvatar, { raceIndex: 0, stage: 'matou', label: 'x' });
		const svg = svgOf(container);
		for (const part of ['.confetto', '.etincelle', '.onde', '.bonnet-part', '.lune-part']) {
			expect(svg.querySelector(part)).toBeNull();
		}
	});

	it('naissance : auréole qui s’allume, deux ondes, confettis et étoiles', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 4,
			stage: 'chaton',
			label: 'x',
			reaction: 'apparition'
		});
		const svg = svgOf(container);
		expect(svg.querySelector('.reaction')?.getAttribute('data-reaction')).toBe('apparition');
		expect(svg.querySelector('.aureole-naissance')).not.toBeNull();
		expect(svg.querySelectorAll('.onde')).toHaveLength(2);
		expect(svg.querySelectorAll('.confetto').length).toBeGreaterThan(0);
		expect(svg.querySelectorAll('.etincelle').length).toBeGreaterThan(0);
	});

	it('croissance : transformation, auréole, ondes et confettis, sans étoiles', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 1,
			stage: 'matou',
			label: 'x',
			reaction: 'bond',
			growFrom: 'chaton'
		});
		const svg = svgOf(container);
		expect(svg.querySelector('.reaction')?.getAttribute('data-morph')).toBe('true');
		expect(svg.querySelectorAll('.onde')).toHaveLength(2);
		expect(svg.querySelectorAll('.confetto').length).toBeGreaterThan(0);
		expect(svg.querySelector('.etincelle')).toBeNull();
	});

	it('croissance : le corps part du stade d’avant, passe entre les deux, finit au nouveau', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 1,
			stage: 'matou',
			label: 'x',
			reaction: 'bond',
			growFrom: 'chaton'
		});
		const body = () =>
			svgOf(container).querySelector('clipPath[id$="mathou-corps"] path')?.getAttribute('d');
		const from = pearGeometry('chaton').body;
		const to = pearGeometry('matou').body;
		expect(body()).toBe(from);
		await expect.poll(() => body() !== from && body() !== to, { timeout: 2000 }).toBe(true);
		await expect.poll(body, { timeout: 3000 }).toBe(to);
	});

	it('croissance avec « réduire les animations » : directement le nouveau stade', async () => {
		const real = window.matchMedia;
		window.matchMedia = ((query: string) => ({
			...real.call(window, query),
			matches: query.includes('reduce')
		})) as typeof window.matchMedia;
		try {
			const { container } = await render(MathouAvatar, {
				raceIndex: 1,
				stage: 'matou',
				label: 'x',
				reaction: 'bond',
				growFrom: 'chaton'
			});
			const body = svgOf(container).querySelector('clipPath[id$="mathou-corps"] path');
			await expect
				.poll(() => body?.getAttribute('d'), { timeout: 200 })
				.toBe(pearGeometry('matou').body);
		} finally {
			window.matchMedia = real;
		}
	});

	it('vers le grand matou : couronne et fraise arrivent à la fin de la transformation', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 5,
			stage: 'grand_matou',
			label: 'x',
			reaction: 'bond',
			growFrom: 'matou'
		});
		const svg = svgOf(container);
		await expect
			.poll(() => svg.querySelector('[data-part="couronne"]'), { timeout: 3000 })
			.not.toBeNull();
		expect(svg.querySelector('[data-part="collerette"]')).not.toBeNull();
	});

	it('bond sans stade d’avant (étoile) : pas de transformation, pas de fête', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 1,
			stage: 'matou',
			label: 'x',
			reaction: 'bond'
		});
		const svg = svgOf(container);
		expect(svg.querySelector('.reaction')?.getAttribute('data-reaction')).toBe('bond');
		expect(svg.querySelector('.reaction')?.hasAttribute('data-morph')).toBe(false);
		expect(svg.querySelector('.confetto')).toBeNull();
	});

	it('réveil : éveillé, avec la lune, le bonnet, les « Zzz » et les yeux clos qui s’en vont', async () => {
		const { container } = await render(MathouAvatar, {
			raceIndex: 9,
			stage: 'matou',
			label: 'x',
			reaction: 'reveil'
		});
		const svg = svgOf(container);
		expect(svg.hasAttribute('data-asleep')).toBe(false);
		expect(svg.querySelector('[data-part="yeux"] ellipse')).not.toBeNull();
		for (const part of ['.lune-part', '.bonnet-part', '.zzz-part', '.yeux-clos', '.revient']) {
			expect(svg.querySelector(part)).not.toBeNull();
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

	it('noms validés par David (2026-10-18), dans l’ordre des branches', async () => {
		expect(MATHOU_RACES[0].name).toBe('le Noir de Nombrilie');
		expect(MATHOU_RACES[4].name).toBe('le Al Jabr Oriental');
		expect(MATHOU_RACES[5].name).toBe('le Chartreux de Yoyolande');
		expect(MATHOU_RACES[18].name).toBe('le Tigré de Glitchistan');
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
