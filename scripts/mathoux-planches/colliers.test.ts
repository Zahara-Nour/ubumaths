/**
 * Planche des colliers (lot C des accessoires des Mathoux) : propositions de dessins à faire
 * choisir par David, posées sur le vrai rendu de MathouAvatar.
 *
 * Règle de la fraise (2026-10-25, recommandation acceptée) : chez le grand matou, le collier passe
 * sous la fraise et seul ce qui pend (grelot, médaille, nœud, pointe du foulard) dépasse dessous.
 *
 * Ne tourne qu'à la demande : `PLANCHE=1 pnpm test:server scripts/mathoux-planches/colliers.test.ts`
 * écrit `planche-colliers.json` (les SVG, à mettre en page) dans le dossier donné par
 * `PLANCHE_OUT`. Les dessins retenus passeront ensuite dans `mathou-dessin.ts`.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import MathouAvatar from '$lib/components/mathoux/MathouAvatar.svelte';
import { MATHOU_RACES, CHAT_NOIR, type MathouStage } from '$lib/components/mathoux/mathou-races';
import { pearGeometry } from '$lib/components/mathoux/mathou-dessin';

// Types
/** Où passe le collier sur un stade donné */
interface Neck {
	/** Hauteur des bouts du collier, sur le contour du cou */
	y: number;
	/** Demi-largeur du cou à cette hauteur */
	w: number;
	/** Échelle des pendentifs et des grains (1,7 = matou) */
	s: number;
	/** Hauteur où s'accroche ce qui pend : sous la fraise chez le grand matou */
	hang: number;
	/** Grand matou : la bande est cachée par la fraise */
	underRuff: boolean;
}

interface Collar {
	id: string;
	name: string;
	/** Ce qui fait le tour du cou (passe sous la fraise) */
	band: (n: Neck) => string;
	/** Ce qui pend, dessiné dans un repère dont l'origine est le point d'accroche */
	pendant: string;
}

// Constantes
const INK = CHAT_NOIR.noir;
const RED = CHAT_NOIR.rouge;
const CREAM = CHAT_NOIR.creme;
const GOLD = 'hsl(44, 85%, 58%)';
const LEATHER = 'hsl(25, 45%, 32%)';

/** Mesuré sur le rendu : sous la bouche et les moustaches, là où le corps est le plus étroit */
const NECK_AT: Record<MathouStage, { y: number; w: number }> = {
	chaton: { y: 99, w: 37 },
	matou: { y: 82, w: 24.5 },
	grand_matou: { y: 91, w: 20 }
};

/** Bas de la fraise du grand matou (puffs à `shoulderY + 2 + 1.8`, rayon 6) */
const RUFF_BOTTOM = pearGeometry('grand_matou').shoulderY + 2 + 1.8 + 6;

const r1 = (n: number): number => Math.round(n * 10) / 10;

let renders = 0;

// Functions
function neck(stage: MathouStage): Neck {
	const { y, w } = NECK_AT[stage];
	const s = r1(((w / 24.5) * 0.9 + 0.1) * 1.7);
	const mid = y + 2;
	const underRuff = stage === 'grand_matou';
	return { y, w, s, hang: underRuff ? r1(RUFF_BOTTOM - 1) : mid, underRuff };
}

/** Courbe du collier : des bouts sur le contour, creusée au milieu */
function curve(n: Neck): string {
	return `M${r1(100 - n.w)} ${r1(n.y - 2)}Q100 ${r1(n.y + 6)} ${r1(100 + n.w)} ${r1(n.y - 2)}`;
}

function pointOn(n: Neck, t: number): [number, number] {
	const [x0, y0, x1, y1, x2, y2] = [100 - n.w, n.y - 2, 100, n.y + 6, 100 + n.w, n.y - 2];
	const u = 1 - t;
	return [
		r1(u * u * x0 + 2 * u * t * x1 + t * t * x2),
		r1(u * u * y0 + 2 * u * t * y1 + t * t * y2)
	];
}

/** Bande pleine, cernée d'encre */
function strap(color: string, thick: number): (n: Neck) => string {
	return (n) =>
		`<path d="${curve(n)}" fill="none" stroke="${INK}" stroke-width="${r1(thick * n.s * 0.75 + 2.4)}" stroke-linecap="round"/>` +
		`<path d="${curve(n)}" fill="none" stroke="${color}" stroke-width="${r1(thick * n.s * 0.75)}" stroke-linecap="round"/>`;
}

/** Grains en chapelet le long du cou (perles, maillons) */
function beads(
	count: number,
	draw: (x: number, y: number, n: Neck, i: number) => string
): (n: Neck) => string {
	return (n) => {
		let out = '';
		for (let i = 0; i < count; i++) {
			const [x, y] = pointOn(n, (i + 0.5) / count);
			out += draw(x, y, n, i);
		}
		return out;
	};
}

const BELL =
	`<path d="M-1.6 -0.4H1.6" stroke="${INK}" stroke-width="1.4" stroke-linecap="round"/>` +
	`<circle cy="4.6" r="4.6" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/>` +
	`<path d="M-3.4 4.4H3.4" stroke="${INK}" stroke-width="0.9"/>` +
	`<path d="M0 5.6V9" stroke="${INK}" stroke-width="1.2" stroke-linecap="round"/>` +
	`<circle cy="5.6" r="1" fill="${INK}"/>`;

const BOW =
	`<path d="M0 3L-8 -1.5V8.5Z M0 3L8 -1.5V8.5Z" fill="${RED}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
	`<rect x="-2.2" y="0.2" width="4.4" height="5.6" rx="1.2" fill="${RED}" stroke="${INK}" stroke-width="1.4"/>`;

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

const PASSOIRE_HOLES = [
	[0, 0],
	[-2.6, -1.5],
	[2.6, -1.5],
	[-2.6, 1.5],
	[2.6, 1.5],
	[0, -3],
	[0, 3]
]
	.map(([x, y]) => `<circle cx="${x}" cy="${r1(y + 6)}" r="0.85" fill="${INK}"/>`)
	.join('');

const COLLARS: Collar[] = [
	{
		id: 'grelot-a',
		name: 'Ruban rouge à grelot',
		band: strap(RED, 4),
		pendant: BELL
	},
	{
		id: 'grelot-b',
		name: 'Ruban crème à grelot',
		band: strap(CREAM, 4),
		pendant: BELL
	},
	{
		id: 'cuir-a',
		name: 'Collier de cuir, médaille d’or',
		band: (n) =>
			strap(LEATHER, 4.6)(n) +
			beads(6, (x, y) => `<circle cx="${x}" cy="${y}" r="1.3" fill="${GOLD}"/>`)(n),
		pendant:
			`<circle cy="-0.2" r="1.6" fill="none" stroke="${INK}" stroke-width="1.2"/>` +
			`<circle cy="5.4" r="4.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/>` +
			`<circle cy="5.4" r="2.6" fill="none" stroke="${INK}" stroke-width="0.7"/>`
	},
	{
		id: 'cuir-b',
		name: 'Collier de cuir, plaque à la gidouille',
		band: strap(LEATHER, 4.6),
		pendant:
			`<circle cy="-0.2" r="1.6" fill="none" stroke="${INK}" stroke-width="1.2"/>` +
			`<circle cy="5.6" r="4.8" fill="${CREAM}" stroke="${INK}" stroke-width="1.4"/>` +
			`<path d="${spiral(2, 3.4)}" transform="translate(0 5.6)" fill="none" stroke="${INK}" stroke-width="1" stroke-linecap="round"/>`
	},
	{
		id: 'noeud-a',
		name: 'Nœud papillon rouge',
		band: strap(INK, 1.6),
		pendant: BOW
	},
	{
		id: 'noeud-b',
		name: 'Nœud papillon rouge à pois crème',
		band: strap(INK, 1.6),
		pendant:
			BOW +
			[
				[-5, 1.6],
				[-5.6, 5.4],
				[5, 1.6],
				[5.6, 5.4]
			]
				.map(([x, y]) => `<circle cx="${x}" cy="${y}" r="0.9" fill="${CREAM}"/>`)
				.join('')
	},
	{
		id: 'foulard-a',
		name: 'Foulard rouge',
		band: strap(RED, 4.4),
		pendant: `<path d="M-7.5 -1Q0 2 7.5 -1L0 11Z" fill="${RED}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>`
	},
	{
		id: 'foulard-b',
		name: 'Foulard crème bordé de rouge',
		band: strap(CREAM, 4.4),
		pendant:
			`<path d="M-7.5 -1Q0 2 7.5 -1L0 11Z" fill="${RED}" stroke="${INK}" stroke-width="1.4" stroke-linejoin="round"/>` +
			`<path d="M-4.6 1.2Q0 2.8 4.6 1.2L0 7.6Z" fill="${CREAM}"/>`
	},
	{
		id: 'perles-a',
		name: 'Collier de perles',
		band: beads(
			9,
			(x, y, n) =>
				`<circle cx="${x}" cy="${y}" r="${r1(2.3 * n.s * 0.75)}" fill="${CREAM}" stroke="${INK}" stroke-width="1.1"/>`
		),
		pendant: ''
	},
	{
		id: 'perles-b',
		name: 'Collier de perles, goutte rouge',
		band: beads(
			9,
			(x, y, n) =>
				`<circle cx="${x}" cy="${y}" r="${r1(2.3 * n.s * 0.75)}" fill="${CREAM}" stroke="${INK}" stroke-width="1.1"/>`
		),
		pendant: `<path d="M0 0.6C-3.6 5 -3.6 9.4 0 9.4C3.6 9.4 3.6 5 0 0.6Z" fill="${RED}" stroke="${INK}" stroke-width="1.3" stroke-linejoin="round"/>`
	},
	{
		id: 'ordre-a',
		name: 'Chaîne de l’Ordre de la Grande Passoire',
		band: beads(
			10,
			(x, y, n) =>
				`<circle cx="${x}" cy="${y}" r="${r1(1.9 * n.s * 0.75)}" fill="none" stroke="${INK}" stroke-width="2.6"/><circle cx="${x}" cy="${y}" r="${r1(1.9 * n.s * 0.75)}" fill="none" stroke="${GOLD}" stroke-width="1.3"/>`
		),
		pendant:
			`<circle cy="6" r="5.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/>` + PASSOIRE_HOLES
	},
	{
		id: 'ordre-b',
		name: 'Collier de l’Ordre, plaques rouge et or',
		band: beads(8, (x, y, n, i) => {
			const h = r1(2.6 * n.s * 0.75);
			return `<rect x="${r1(x - h)}" y="${r1(y - h * 0.8)}" width="${r1(2 * h)}" height="${r1(1.6 * h)}" rx="0.8" fill="${i % 2 === 0 ? GOLD : RED}" stroke="${INK}" stroke-width="1.1"/>`;
		}),
		pendant:
			`<circle cy="6" r="5.4" fill="${GOLD}" stroke="${INK}" stroke-width="1.4"/>` + PASSOIRE_HOLES
	}
];

function raceIndexOf(pattern: string): number {
	const i = MATHOU_RACES.findIndex((r) => r.pattern === pattern);
	if (i < 0) throw new Error(`pas de race au motif ${pattern}`);
	return i;
}

/** Le collier sur un stade : la bande, puis ce qui pend à son point d'accroche */
function parts(collar: Collar, stage: MathouStage): { band: string; pendant: string } {
	const n = neck(stage);
	const pendant = collar.pendant
		? `<g transform="translate(100 ${n.hang}) scale(${n.s})">${collar.pendant}</g>`
		: '';
	return { band: collar.band(n), pendant };
}

/**
 * Rendu serveur de l'avatar avec le collier : la bande juste après le contour du corps (sous la
 * fraise), ce qui pend après la fraise s'il y en a une, sinon avec la bande.
 */
function avatar(
	raceIndex: number,
	stage: MathouStage,
	collar: Collar | null,
	asleep = false
): string {
	const { body } = render(MathouAvatar, {
		props: { raceIndex, stage, asleep, animated: false, size: 160, label: 'Mathou' }
	});
	const { band, pendant } = collar ? parts(collar, stage) : { band: '', pendant: '' };
	const g = pearGeometry(stage);
	const marker = `d="${g.body}" fill="none"`;
	const at = body.indexOf(marker);
	if (at < 0) throw new Error('contour du corps introuvable dans le rendu');
	const end = body.indexOf('>', at) + 1;
	const closing = body.startsWith('</path>', end) ? end + '</path>'.length : end;
	let out = body.slice(0, closing) + band + body.slice(closing);
	const ruff = out.indexOf('data-part="collerette"');
	if (ruff >= 0) {
		const ruffEnd = out.indexOf('</g>', ruff) + '</g>'.length;
		out = out.slice(0, ruffEnd) + pendant + out.slice(ruffEnd);
	} else {
		out = out.slice(0, closing + band.length) + pendant + out.slice(closing + band.length);
	}
	return out.replace(/<!--[^]*?-->/g, '').replaceAll('s1-mathou', `m${++renders}-mathou`);
}

describe.skipIf(!process.env.PLANCHE)('planche des colliers', () => {
	it('écrit les SVG', () => {
		const out = process.env.PLANCHE_OUT ?? '.';
		const stages: MathouStage[] = ['chaton', 'matou', 'grand_matou'];
		const showcase = [raceIndexOf('uni'), raceIndexOf('tigre'), raceIndexOf('bicolore')];

		// 1. Chaque collier : trois stades sur trois pelages, le grand matou à la fraise, la sieste
		const collars = COLLARS.map((collar) => ({
			id: collar.id,
			name: collar.name,
			cats: stages.map((stage, i) => avatar(showcase[i], stage, collar)),
			asleep: avatar(raceIndexOf('uni'), 'grand_matou', collar, true)
		}));

		// 2. Toutes les races en matou, avec un collier de test : rien ne doit jurer au cou
		const probe = COLLARS.find((c) => c.id === 'cuir-a');
		if (!probe) throw new Error('cuir-a manquant');
		const races = MATHOU_RACES.map((race, i) => ({
			name: race.name,
			svg: avatar(i, 'matou', probe)
		}));

		expect(collars).toHaveLength(12);
		writeFileSync(join(out, 'planche-colliers.json'), JSON.stringify({ collars, races }, null, 1));
	});
});
