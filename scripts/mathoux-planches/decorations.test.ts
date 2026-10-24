/**
 * Planche des décorations de panse (lot B des accessoires des Mathoux) : propositions de dessins à
 * faire choisir par David, posées sur le vrai rendu de MathouAvatar.
 *
 * Ne tourne qu'à la demande : `PLANCHE=1 pnpm test:server scripts/mathoux-planches/decorations.test.ts`
 * écrit `planche-decorations.json` (les SVG, à mettre en page) dans le dossier donné par
 * `PLANCHE_OUT`. Les dessins retenus passeront ensuite dans `mathou-dessin.ts`.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import MathouAvatar from '$lib/components/mathoux/MathouAvatar.svelte';
import {
	MATHOU_RACES,
	CHAT_NOIR,
	type MathouPattern,
	type MathouStage
} from '$lib/components/mathoux/mathou-races';
import { pearGeometry } from '$lib/components/mathoux/mathou-dessin';

// Types
interface Decoration {
	id: string;
	name: string;
	/** Dessin dans un repère centré, rayon utile ≈ 10 */
	svg: string;
}

interface Placement {
	x: number;
	y: number;
	/** Échelle du repère de la décoration */
	k: number;
}

// Constantes
const INK = CHAT_NOIR.noir;
const RED = CHAT_NOIR.rouge;
const CREAM = CHAT_NOIR.creme;
const GOLD = 'hsl(44, 85%, 58%)';
const W = 'stroke-width="1.6"';

const r1 = (n: number): number => Math.round(n * 10) / 10;

function starPath(r: number, inner: number): string {
	const pts: string[] = [];
	for (let i = 0; i < 10; i++) {
		const a = -Math.PI / 2 + (i * Math.PI) / 5;
		const rr = i % 2 === 0 ? r : r * inner;
		pts.push(`${r1(rr * Math.cos(a))} ${r1(rr * Math.sin(a))}`);
	}
	return `M${pts.join('L')}Z`;
}

/** Spirale d'Archimède partant du centre : la gidouille du Père Ubu */
function spiral(turns: number, r: number): string {
	let d = 'M0 0';
	const steps = turns * 24;
	for (let i = 1; i <= steps; i++) {
		const a = (i / 24) * 2 * Math.PI;
		const rr = (r * i) / steps;
		d += `L${r1(rr * Math.cos(a))} ${r1(rr * Math.sin(a))}`;
	}
	return d;
}

/** Cercle festonné (rosette) */
function scallops(n: number, r: number, bump: number): string {
	let d = '';
	for (let i = 0; i <= n; i++) {
		const a = (i / n) * 2 * Math.PI;
		const x = r1(r * Math.cos(a));
		const y = r1(r * Math.sin(a));
		d += i === 0 ? `M${x} ${y}` : `A${bump} ${bump} 0 0 1 ${x} ${y}`;
	}
	return d + 'Z';
}

const SHIELD = 'M-9 -10H9V0C9 6 4 9.5 0 11.5C-4 9.5 -9 6 -9 0Z';
const HEART = 'M0 9C-13 0 -10 -11 0 -5C10 -11 13 0 0 9Z';

const DECORATIONS: Decoration[] = [
	{
		id: 'coeur-a',
		name: 'Cœur rouge',
		svg: `<path d="${HEART}" fill="${RED}" stroke="${INK}" ${W} stroke-linejoin="round"/>`
	},
	{
		id: 'coeur-b',
		name: 'Cœur crème liseré rouge',
		svg:
			`<path d="${HEART}" fill="${RED}" stroke="${INK}" ${W} stroke-linejoin="round"/>` +
			`<path d="M0 4.6C-7.4 -0.6 -5.6 -7 0 -2.4C5.6 -7 7.4 -0.6 0 4.6Z" fill="${CREAM}"/>`
	},
	{
		id: 'etoile-a',
		name: 'Étoile d’or',
		svg: `<path d="${starPath(11, 0.45)}" fill="${GOLD}" stroke="${INK}" ${W} stroke-linejoin="round"/>`
	},
	{
		id: 'etoile-b',
		name: 'Étoile rouge sur pastille crème',
		svg:
			`<circle r="10.5" fill="${CREAM}" stroke="${INK}" ${W}/>` +
			`<path d="${starPath(8, 0.45)}" fill="${RED}" stroke="${INK}" stroke-width="1.1" stroke-linejoin="round"/>`
	},
	{
		id: 'gidouille-a',
		name: 'Petite gidouille sur pastille crème',
		svg:
			`<circle r="10" fill="${CREAM}" stroke="${INK}" ${W}/>` +
			`<path d="${spiral(3, 7.6)}" fill="none" stroke="${INK}" stroke-width="1.5" stroke-linecap="round"/>`
	},
	{
		id: 'gidouille-b',
		name: 'Petite gidouille d’or, spirale rouge',
		svg:
			`<circle r="10" fill="${GOLD}" stroke="${INK}" ${W}/>` +
			`<path d="${spiral(3, 7.6)}" fill="none" stroke="${RED}" stroke-width="1.8" stroke-linecap="round"/>`
	},
	{
		id: 'cocarde-a',
		name: 'Cocarde à rubans',
		svg:
			`<path d="M-3 4L-7 15L-4 13.5L-2.5 16.5L0 5Z M3 4L7 15L4 13.5L2.5 16.5L0 5Z" fill="${RED}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
			`<path d="${scallops(14, 10, 2.4)}" fill="${RED}" stroke="${INK}" ${W}/>` +
			`<circle r="6.4" fill="${CREAM}" stroke="${INK}" stroke-width="1.2"/>` +
			`<circle r="3" fill="${INK}"/>`
	},
	{
		id: 'cocarde-b',
		name: 'Cocarde sans rubans',
		svg:
			`<path d="${scallops(14, 10.5, 2.5)}" fill="${RED}" stroke="${INK}" ${W}/>` +
			`<circle r="6.8" fill="${CREAM}" stroke="${INK}" stroke-width="1.2"/>` +
			`<circle r="3.2" fill="${RED}" stroke="${INK}" stroke-width="1.2"/>`
	},
	{
		id: 'medaille-a',
		name: 'Médaille de la Grande Passoire, à ruban',
		svg:
			`<path d="M-6 -15H6L4 -3H-4Z" fill="${RED}" stroke="${INK}" stroke-width="1.2" stroke-linejoin="round"/>` +
			`<path d="M-1.6 -15H1.6L1.1 -3H-1.1Z" fill="${CREAM}"/>` +
			`<circle cy="4" r="8.5" fill="${GOLD}" stroke="${INK}" ${W}/>` +
			[
				[0, 4],
				[-3.6, 2],
				[3.6, 2],
				[-3.6, 6],
				[3.6, 6],
				[0, 0.2],
				[0, 7.8]
			]
				.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${INK}"/>`)
				.join('')
	},
	{
		id: 'medaille-b',
		name: 'Médaille de la Grande Passoire, sans ruban',
		svg:
			`<circle r="10" fill="${GOLD}" stroke="${INK}" ${W}/>` +
			`<circle r="7.2" fill="none" stroke="${INK}" stroke-width="0.9"/>` +
			[
				[0, 0],
				[-3.5, -2],
				[3.5, -2],
				[-3.5, 2],
				[3.5, 2],
				[0, -4],
				[0, 4]
			]
				.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="1.1" fill="${INK}"/>`)
				.join('')
	},
	{
		id: 'blason-a',
		name: 'Blason rouge au chevron d’or',
		svg:
			`<path d="${SHIELD}" fill="${RED}" stroke="${INK}" ${W} stroke-linejoin="round"/>` +
			`<path d="M-8.4 4L0 -4L8.4 4V8.2L0 0L-8.4 8.2Z" fill="${GOLD}" stroke="${INK}" stroke-width="1" stroke-linejoin="round"/>`
	},
	{
		id: 'blason-b',
		name: 'Blason parti rouge et or, à la gidouille',
		svg:
			`<path d="${SHIELD}" fill="${GOLD}" stroke="${INK}" ${W} stroke-linejoin="round"/>` +
			`<path d="M-9 -10H0V11.5C-4 9.5 -9 6 -9 0Z" fill="${RED}"/>` +
			`<path d="${SHIELD}" fill="none" stroke="${INK}" ${W} stroke-linejoin="round"/>` +
			`<path d="${spiral(2, 4.6)}" transform="translate(0 0.5)" fill="none" stroke="${INK}" stroke-width="1.3" stroke-linecap="round"/>`
	}
];

let renders = 0;

// Functions
function raceIndexOf(pattern: MathouPattern): number {
	const i = MATHOU_RACES.findIndex((r) => r.pattern === pattern);
	if (i < 0) throw new Error(`pas de race au motif ${pattern}`);
	return i;
}

/** Au milieu de la panse, un peu au-dessus du plus large ; taille selon la panse */
function bellyPlacement(stage: MathouStage): Placement {
	const g = pearGeometry(stage);
	const s = g.stage.bw / 64;
	return { x: 100, y: r1(g.waistY - 8 * s), k: r1(1.7 * s * 100) / 100 };
}

function place(deco: Decoration, p: Placement): string {
	return `<g transform="translate(${p.x} ${p.y}) scale(${p.k})">${deco.svg}</g>`;
}

/** Rendu serveur de l'avatar, `extra` glissé juste après le contour du corps */
function avatar(
	raceIndex: number,
	stage: MathouStage,
	extra: string,
	options: { asleep?: boolean; under?: string } = {}
): string {
	const { body } = render(MathouAvatar, {
		props: { raceIndex, stage, asleep: options.asleep, animated: false, size: 160, label: 'Mathou' }
	});
	const g = pearGeometry(stage);
	const marker = `d="${g.body}" fill="none"`;
	const at = body.indexOf(marker);
	if (at < 0) throw new Error('contour du corps introuvable dans le rendu');
	const end = body.indexOf('>', at) + 1;
	const closing = body.startsWith('</path>', end) ? end + '</path>'.length : end;
	const under = options.under ?? '';
	// Ce qui va sous le contour (pastille d'un motif écarté) passe avant lui
	const start = body.lastIndexOf('<path', at);
	return (body.slice(0, start) + under + body.slice(start, closing) + extra + body.slice(closing))
		.replace(/<!--[^]*?-->/g, '')
		.replaceAll('s1-mathou', `m${++renders}-mathou`);
}

describe.skipIf(!process.env.PLANCHE)('planche des décorations de panse', () => {
	it('écrit les SVG', () => {
		const out = process.env.PLANCHE_OUT ?? '.';
		const stages: MathouStage[] = ['chaton', 'matou', 'grand_matou'];
		const showcase = [raceIndexOf('uni'), raceIndexOf('tigre'), raceIndexOf('bicolore')];

		// 1. Chaque décoration, trois stades sur trois pelages (noir, roux tigré, blanc et noir)
		const decorations = DECORATIONS.map((deco) => ({
			id: deco.id,
			name: deco.name,
			alone: `<svg viewBox="-17 -19 34 38" width="68" height="76">${deco.svg}</svg>`,
			cats: stages.map((stage, i) =>
				avatar(showcase[i], stage, place(deco, bellyPlacement(stage)))
			),
			asleep: avatar(raceIndexOf('uni'), 'matou', place(deco, bellyPlacement('matou')), {
				asleep: true
			})
		}));

		// 2. Les races dont la panse porte déjà le motif, avec une décoration de test
		const probe = DECORATIONS.find((d) => d.id === 'cocarde-b');
		if (!probe) throw new Error('cocarde-b manquante');
		const races: { race: string; options: { id: string; name: string; svg: string }[] }[] = [];
		for (const pattern of ['smoking', 'marbre', 'arlequin'] as const) {
			const ri = raceIndexOf(pattern);
			const p = bellyPlacement('matou');
			const clearing = `<circle cx="${p.x}" cy="${p.y}" r="${r1(14 * p.k)}" fill="${MATHOU_RACES[ri].primary}"/>`;
			races.push({
				race: MATHOU_RACES[ri].name,
				options: [
					{
						id: `${pattern}-dessus`,
						name: 'Par-dessus le motif',
						svg: avatar(ri, 'matou', place(probe, p))
					},
					{
						id: `${pattern}-ecarte`,
						name: 'Motif écarté autour (pastille de pelage)',
						svg: avatar(ri, 'matou', place(probe, p), { under: clearing })
					}
				]
			});
		}
		const lunar = raceIndexOf('plastron');
		const lg = pearGeometry('matou');
		const s = lg.stage.bw / 64;
		const gr = lg.stage.moon;
		const k = bellyPlacement('matou').k;
		races.push({
			race: MATHOU_RACES[lunar].name,
			options: [
				{
					id: 'lunaire-croissant',
					name: 'Dans le creux du croissant',
					svg: avatar(
						lunar,
						'matou',
						place(probe, { x: 100, y: r1(lg.waistY - 4 - gr * 0.12), k: k * 0.9 })
					)
				},
				{
					id: 'lunaire-cou',
					name: 'Au cou, sous le menton',
					svg: avatar(
						lunar,
						'matou',
						place(probe, { x: 100, y: r1(lg.shoulderY + 12 * s), k: k * 0.7 })
					)
				},
				{
					id: 'lunaire-front',
					name: 'Au front',
					svg: avatar(
						lunar,
						'matou',
						place(probe, { x: 100, y: r1(lg.stage.top + (lg.hy - lg.stage.top) * 0.3), k: k * 0.5 })
					)
				},
				{ id: 'lunaire-aucune', name: 'Pas de décoration', svg: avatar(lunar, 'matou', '') }
			]
		});

		expect(races).toHaveLength(4);
		writeFileSync(
			join(out, 'planche-decorations.json'),
			JSON.stringify({ decorations, races }, null, 1)
		);
	});
});
