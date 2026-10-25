/**
 * Planche des lunettes et des chapeaux (lot D des accessoires des Mathoux) : propositions de
 * dessins à faire choisir par David, posées sur le vrai rendu de MathouAvatar.
 *
 * Règles de la phase 0 (2026-10-25) : chez le grand matou, le chapeau remplace la couronne ; en
 * sieste, le bonnet de nuit remplace le chapeau et les lunettes sont retirées (rien à dessiner).
 *
 * Ne tourne qu'à la demande : `PLANCHE=1 pnpm test:server scripts/mathoux-planches/chapeaux-lunettes.test.ts`
 * écrit `planche-chapeaux-lunettes.json` (les SVG, à mettre en page) dans le dossier donné par
 * `PLANCHE_OUT`. Les dessins retenus (catalogue du 2026-10-25) vivent dans
 * `$lib/components/mathoux/mathou-chapeaux-lunettes.ts`.
 */

import { describe, expect, it } from 'vitest';
import { render } from 'svelte/server';
import { writeFileSync } from 'node:fs';
import { join } from 'node:path';
import MathouAvatar from '$lib/components/mathoux/MathouAvatar.svelte';
import {
	MATHOU_RACES,
	CHAT_NOIR,
	getMathouRace,
	type MathouStage
} from '$lib/components/mathoux/mathou-races';
import { dressing, faceDrawing, pearGeometry } from '$lib/components/mathoux/mathou-dessin';
import type { MathouCollarId } from '$lib/mathoux/decorations';

// Types
/**
 * Un accessoire, dessiné dans un repère propre à la tête du matou (demi-largeur de tête 26) :
 * lunettes centrées entre les yeux (yeux en x = ±10,9), chapeau posé au sommet de la tête.
 * `u` ramène les épaisseurs de trait à l'écran : 1 / échelle du stade.
 */
interface Piece {
	id: string;
	name: string;
	draw: (u: number) => string;
}

interface Model {
	id: string;
	name: string;
	slot: 'lunettes' | 'chapeau';
	variants: [Piece, Piece];
}

// Constantes
const INK = CHAT_NOIR.noir;
const RED = CHAT_NOIR.rouge;
const CREAM = CHAT_NOIR.creme;
const GOLD = 'hsl(44, 85%, 58%)';
const LEATHER = 'hsl(25, 45%, 32%)';
/** Noir de chapeau : un ton au-dessus de l'encre, pour que le contour se lise sur un chat noir */
const HAT_BLACK = 'hsl(220, 18%, 22%)';
const STRAW = 'hsl(38, 62%, 60%)';
const STRAW_LIGHT = 'hsl(40, 70%, 72%)';
/** Écart des yeux du matou (`hw * 0.42`) */
const EX = 10.9;

const r1 = (n: number): number => Math.round(n * 10) / 10;

let renders = 0;

// Functions
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

function star(x: number, y: number, r: number): string {
	const q = r * 0.32;
	return `M${x} ${r1(y - r)}Q${r1(x + q)} ${r1(y - q)} ${r1(x + r)} ${y}Q${r1(x + q)} ${r1(y + q)} ${x} ${r1(y + r)}Q${r1(x - q)} ${r1(y + q)} ${r1(x - r)} ${y}Q${r1(x - q)} ${r1(y - q)} ${x} ${r1(y - r)}Z`;
}

/** Monture : un trait d'encre ; en couleur, la couleur cernée d'encre */
function rim(shape: (attrs: string) => string, color: string, u: number): string {
	if (color === INK) return shape(`fill="none" stroke="${INK}" stroke-width="${r1(1.9 * u)}"`);
	return (
		shape(`fill="none" stroke="${INK}" stroke-width="${r1(2.8 * u)}"`) +
		shape(`fill="none" stroke="${color}" stroke-width="${r1(1.5 * u)}"`)
	);
}

/** Verre teinté clair : on voit l'œil au travers, et la forme du verre se lit sur un chat noir */
function tint(shape: (attrs: string) => string): string {
	return shape(`fill="${CREAM}" fill-opacity="0.3" stroke="none"`);
}

function line(d: string, color: string, width: number, u: number): string {
	return `<path d="${d}" fill="none" stroke="${color}" stroke-width="${r1(width * u)}" stroke-linecap="round"/>`;
}

// --- Lunettes ---

function roundGlasses(color: string): (u: number) => string {
	return (u) => {
		let out = '';
		for (const x of [-EX, EX]) {
			const c = (a: string): string => `<circle cx="${x}" cy="0" r="7.2" ${a}/>`;
			out += tint(c) + rim(c, color, u);
		}
		const bridge = (a: string): string => `<path d="M-3.7 -1.2Q0 -4 3.7 -1.2" ${a}/>`;
		const arms = (a: string): string => `<path d="M-18.1 -1.5L-24 -3M18.1 -1.5L24 -3" ${a}/>`;
		return out + rim(bridge, color, u) + rim(arms, color, u);
	};
}

function monocle(color: string, cord: string, chain: boolean): (u: number) => string {
	return (u) => {
		const c = (a: string): string => `<circle cx="${EX}" cy="0" r="7.6" ${a}/>`;
		const cordPath = `M${r1(EX + 5.4)} 5.4Q${r1(EX + 10)} 16 ${r1(EX + 3)} 27`;
		const cordLine = chain
			? `<path d="${cordPath}" fill="none" stroke="${cord}" stroke-width="${r1(1.6 * u)}" stroke-dasharray="${r1(1.6 * u)} ${r1(1.1 * u)}"/>`
			: line(cordPath, cord, 1.4, u);
		return cordLine + tint(c) + rim(c, color, u);
	};
}

function sunglasses(lens: string): (u: number) => string {
	return (u) => {
		let out = '';
		for (const x of [-EX, EX]) {
			out +=
				`<rect x="${r1(x - 7.4)}" y="-5.6" width="14.8" height="10.6" rx="3.6" fill="${lens}" stroke="${INK}" stroke-width="${r1(1.9 * u)}"/>` +
				line(`M${r1(x - 4)} -2.4L${r1(x - 1.6)} -3.8`, CREAM, 1.3, u);
		}
		return out + line('M-3.6 -2.6Q0 -4.2 3.6 -2.6M-18.4 -2L-24 -3.2M18.4 -2L24 -3.2', INK, 1.9, u);
	};
}

function heartGlasses(u: number): string {
	let out = '';
	for (const x of [-EX, EX]) {
		out +=
			`<path d="M${x} 6.4C${r1(x - 10)} -0.6 ${r1(x - 6.6)} -9 ${x} -4.2C${r1(x + 6.6)} -9 ${r1(x + 10)} -0.6 ${x} 6.4Z" fill="${RED}" fill-opacity="0.85" stroke="${INK}" stroke-width="${r1(1.9 * u)}"/>` +
			line(`M${r1(x - 5.2)} -3L${r1(x - 3.4)} -4.6`, CREAM, 1.2, u);
	}
	return out + line('M-3 -2.8Q0 -4.4 3 -2.8M-17.6 -2L-24 -3.2M17.6 -2L24 -3.2', INK, 1.9, u);
}

function pinceNez(color: string, cord: string): (u: number) => string {
	return (u) => {
		let out = line(`M${r1(-EX - 5.8)} 2Q${r1(-EX - 10)} 14 ${r1(-EX - 4)} 25`, cord, 1.3, u);
		for (const x of [-EX, EX]) {
			const e = (a: string): string => `<ellipse cx="${x}" cy="1.2" rx="5.8" ry="5" ${a}/>`;
			out += tint(e) + rim(e, color, u);
		}
		const spring = (a: string): string => `<path d="M-5.1 0.4Q0 -5.6 5.1 0.4" ${a}/>`;
		return out + rim(spring, color, u);
	};
}

function spiralGlasses(color: string): (u: number) => string {
	return (u) => {
		let out = '';
		for (const x of [-EX, EX]) {
			const c = (a: string): string => `<circle cx="${x}" cy="0" r="7.2" ${a}/>`;
			out +=
				c(`fill="${CREAM}" stroke="none"`) +
				`<path d="${spiral(2.5, 5.8)}" transform="translate(${x} 0)" fill="none" stroke="${color}" stroke-width="${r1(1.1 * u)}" stroke-linecap="round"/>` +
				rim(c, color, u);
		}
		const bridge = (a: string): string => `<path d="M-3.7 -1.2Q0 -4 3.7 -1.2" ${a}/>`;
		const arms = (a: string): string => `<path d="M-18.1 -1.5L-24 -3M18.1 -1.5L24 -3" ${a}/>`;
		return out + rim(bridge, color, u) + rim(arms, color, u);
	};
}

// --- Chapeaux (le bord du chapeau centré en y = -1, juste au-dessus des sourcils du chaton) ---

function outline(u: number): string {
	return `stroke="${INK}" stroke-width="${r1(2.4 * u)}" stroke-linejoin="round"`;
}

function topHat(color: string, gidouille: boolean): (u: number) => string {
	return (u) =>
		`<ellipse cy="-1" rx="20" ry="4" fill="${color}" ${outline(u)}/>` +
		`<path d="M-11 0L-12.5 -30Q0 -33 12.5 -30L11 0Q0 3 -11 0Z" fill="${color}" ${outline(u)}/>` +
		line('M-12.3 -29.6Q0 -27 12.3 -29.6', INK, 1.2, u) +
		`<path d="M-11.3 -4.6L-11.8 -11.4Q0 -9 11.8 -11.4L11.3 -4.6Q0 -2.2 -11.3 -4.6Z" fill="${RED}" stroke="${INK}" stroke-width="${r1(1.4 * u)}"/>` +
		(gidouille
			? `<path d="${spiral(2, 5.6)}" transform="translate(0 -20.5)" fill="none" stroke="${CREAM}" stroke-width="${r1(1.6 * u)}" stroke-linecap="round"/>`
			: '');
}

function bowler(color: string, band: string): (u: number) => string {
	return (u) =>
		`<ellipse cy="0" rx="18.5" ry="3.6" fill="${color}" ${outline(u)}/>` +
		`<path d="M-13 0C-13.5 -25 13.5 -25 13 0Q0 2.6 -13 0Z" fill="${color}" ${outline(u)}/>` +
		`<path d="M-13 -1.4L-12.8 -6Q0 -3.8 12.8 -6L13 -1.4Q0 1 -13 -1.4Z" fill="${band}" stroke="${INK}" stroke-width="${r1(1.4 * u)}"/>` +
		line('M-6 -15Q-4 -17.5 -1 -18.2', CREAM, 1.4, u);
}

function beret(color: string): (u: number) => string {
	return (u) =>
		line('M4 -13.5Q4.4 -17.5 7 -19.4', INK, 2.4, u) +
		`<ellipse cx="2" cy="-7" rx="19" ry="7.6" transform="rotate(-8 2 -7)" fill="${color}" ${outline(u)}/>` +
		`<path d="M-14.5 -2Q0 2 14.5 -2L14.5 1Q0 5 -14.5 1Z" fill="${color}" ${outline(u)}/>` +
		line('M-9 -10Q-4 -12.6 2 -12.6', CREAM, 1.3, u);
}

function bicorne(color: string, cockade: 'rouge' | 'gidouille'): (u: number) => string {
	return (u) =>
		`<path d="M-27 1Q-17 -2 -11 -17Q0 -30 11 -17Q17 -2 27 1Q0 -6 -27 1Z" fill="${color}" ${outline(u)}/>` +
		line('M-24.5 -0.6Q0 -6.4 24.5 -0.6', GOLD, 1.8, u) +
		(cockade === 'rouge'
			? `<circle cy="-14" r="5.5" fill="${RED}" stroke="${INK}" stroke-width="${r1(1.4 * u)}"/>` +
				`<circle cy="-14" r="2.8" fill="${CREAM}"/><circle cy="-14" r="1.1" fill="${RED}"/>`
			: `<circle cy="-14" r="5.5" fill="${GOLD}" stroke="${INK}" stroke-width="${r1(1.4 * u)}"/>` +
				`<path d="${spiral(2, 3.6)}" transform="translate(0 -14)" fill="none" stroke="${INK}" stroke-width="${r1(0.9 * u)}" stroke-linecap="round"/>`);
}

function wizardHat(
	color: string,
	deco: 'etoiles' | 'lune',
	decoColor: string
): (u: number) => string {
	return (u) => {
		const thin = `stroke="${INK}" stroke-width="${r1(1 * u)}"`;
		const ornaments =
			deco === 'etoiles'
				? [star(-4, -9, 3.2), star(4.6, -16, 2.6), star(2.2, -4.2, 2)]
						.map((d) => `<path d="${d}" fill="${decoColor}" ${thin}/>`)
						.join('')
				: `<path d="M1.5 -18A6 6 0 1 0 6.5 -8A4.6 4.6 0 1 1 1.5 -18Z" fill="${decoColor}" ${thin}/>` +
					`<path d="${star(-5, -6, 2.2)}" fill="${decoColor}" ${thin}/>`;
		return (
			`<ellipse cy="-1" rx="20" ry="4" fill="${color}" ${outline(u)}/>` +
			`<path d="M-14 0Q-4 -14 2 -31Q4 -34.5 8.5 -33.5Q5 -29.5 4 -24Q7 -12 14 0Q0 3 -14 0Z" fill="${color}" ${outline(u)}/>` +
			ornaments
		);
	};
}

function boater(band: string): (u: number) => string {
	return (u) =>
		`<ellipse cy="0" rx="22" ry="4.2" fill="${STRAW}" ${outline(u)}/>` +
		line('M-19 0.6L-16.5 2.2M-14 2.6L-11.8 3.6M14 2.6L11.8 3.6M19 0.6L16.5 2.2', INK, 0.8, u) +
		`<path d="M-12 0V-11Q0 -13.5 12 -11V0Q0 2.5 -12 0Z" fill="${STRAW}" ${outline(u)}/>` +
		`<ellipse cy="-11.2" rx="12" ry="2.4" fill="${STRAW_LIGHT}" ${outline(u)}/>` +
		`<path d="M-12 -1.4V-5.6Q0 -3.4 12 -5.6V-1.4Q0 0.8 -12 -1.4Z" fill="${band}" stroke="${INK}" stroke-width="${r1(1.4 * u)}"/>`;
}

const MODELS: Model[] = [
	{
		id: 'rondes',
		name: 'Lunettes rondes',
		slot: 'lunettes',
		variants: [
			{ id: 'rondes-a', name: 'Monture noire', draw: roundGlasses(INK) },
			{ id: 'rondes-b', name: 'Monture dorée', draw: roundGlasses(GOLD) }
		]
	},
	{
		id: 'monocle',
		name: 'Monocle',
		slot: 'lunettes',
		variants: [
			{ id: 'monocle-a', name: 'Monocle d’or à chaînette', draw: monocle(GOLD, GOLD, true) },
			{ id: 'monocle-b', name: 'Monocle noir à ruban rouge', draw: monocle(INK, RED, false) }
		]
	},
	{
		id: 'pince-nez',
		name: 'Pince-nez',
		slot: 'lunettes',
		variants: [
			{ id: 'pince-nez-a', name: 'Pince-nez doré, cordon noir', draw: pinceNez(GOLD, INK) },
			{ id: 'pince-nez-b', name: 'Pince-nez noir, cordon rouge', draw: pinceNez(INK, RED) }
		]
	},
	{
		id: 'soleil',
		name: 'Lunettes de soleil',
		slot: 'lunettes',
		variants: [
			{ id: 'soleil-a', name: 'Verres noirs', draw: sunglasses(INK) },
			{ id: 'soleil-b', name: 'Verres en cœur rouges', draw: heartGlasses }
		]
	},
	{
		id: 'gidouille',
		name: 'Lunettes à gidouille',
		slot: 'lunettes',
		variants: [
			{ id: 'gidouille-a', name: 'Spirales noires', draw: spiralGlasses(INK) },
			{ id: 'gidouille-b', name: 'Spirales rouges', draw: spiralGlasses(RED) }
		]
	},
	{
		id: 'haut-de-forme',
		name: 'Haut-de-forme',
		slot: 'chapeau',
		variants: [
			{ id: 'haut-de-forme-a', name: 'Noir à ruban rouge', draw: topHat(HAT_BLACK, false) },
			{ id: 'haut-de-forme-b', name: 'Noir, à la gidouille', draw: topHat(HAT_BLACK, true) }
		]
	},
	{
		id: 'melon',
		name: 'Chapeau melon',
		slot: 'chapeau',
		variants: [
			{ id: 'melon-a', name: 'Melon noir, ruban rouge', draw: bowler(HAT_BLACK, RED) },
			{ id: 'melon-b', name: 'Melon brun, ruban crème', draw: bowler(LEATHER, CREAM) }
		]
	},
	{
		id: 'beret',
		name: 'Béret',
		slot: 'chapeau',
		variants: [
			{ id: 'beret-a', name: 'Béret rouge', draw: beret(RED) },
			{ id: 'beret-b', name: 'Béret noir', draw: beret(HAT_BLACK) }
		]
	},
	{
		id: 'canotier',
		name: 'Canotier',
		slot: 'chapeau',
		variants: [
			{ id: 'canotier-a', name: 'Ruban rouge', draw: boater(RED) },
			{ id: 'canotier-b', name: 'Ruban noir', draw: boater(HAT_BLACK) }
		]
	},
	{
		id: 'bicorne',
		name: 'Bicorne',
		slot: 'chapeau',
		variants: [
			{ id: 'bicorne-a', name: 'Noir, cocarde rouge', draw: bicorne(HAT_BLACK, 'rouge') },
			{ id: 'bicorne-b', name: 'Rouge, cocarde à la gidouille', draw: bicorne(RED, 'gidouille') }
		]
	},
	{
		id: 'pointu',
		name: 'Chapeau pointu',
		slot: 'chapeau',
		variants: [
			{ id: 'pointu-a', name: 'Rouge étoilé d’or', draw: wizardHat(RED, 'etoiles', GOLD) },
			{ id: 'pointu-b', name: 'Noir à la lune d’or', draw: wizardHat(HAT_BLACK, 'lune', GOLD) }
		]
	}
];

const PIECES = new Map(MODELS.flatMap((m) => m.variants).map((p) => [p.id, p]));

function piece(id: string): Piece {
	const p = PIECES.get(id);
	if (!p) throw new Error(`pas de pièce ${id}`);
	return p;
}

function raceIndexOf(pattern: string): number {
	const i = MATHOU_RACES.findIndex((r) => r.pattern === pattern);
	if (i < 0) throw new Error(`pas de race au motif ${pattern}`);
	return i;
}

/** Un accessoire sur un stade : lunettes entre les yeux, chapeau au sommet de la tête */
function placed(p: Piece, slot: Model['slot'], stage: MathouStage): string {
	const g = pearGeometry(stage);
	const k = g.stage.hw / 26;
	// Chapeau borné : énorme sur la grosse tête du chaton, minuscule sur le grand matou sinon
	const s = slot === 'chapeau' ? Math.min(Math.max(k, 0.92), 1.35) : k;
	const y = slot === 'chapeau' ? g.stage.top : g.hy;
	return `<g data-part="${slot}" transform="translate(100 ${y}) scale(${r1(s * 100) / 100})">${p.draw(1 / s)}</g>`;
}

/**
 * Rendu serveur de l'avatar avec ses accessoires : lunettes et chapeau après les moustaches
 * (par-dessus les oreilles) ; chez le grand matou, le chapeau prend la place de la couronne.
 */
function avatar(
	raceIndex: number,
	stage: MathouStage,
	glasses: Piece | null,
	hat: Piece | null,
	collar: MathouCollarId | null = null
): string {
	const { body } = render(MathouAvatar, {
		props: { raceIndex, stage, collar, animated: false, size: 160, label: 'Mathou' }
	});
	const g = pearGeometry(stage);
	const face = faceDrawing(
		g,
		dressing(getMathouRace(raceIndex), g),
		stage === 'grand_matou' ? 'proud' : 'open'
	);
	const marker = `d="${face.innerWhiskers || face.whiskers}"`;
	const at = body.indexOf(marker);
	if (at < 0) throw new Error('moustaches introuvables dans le rendu');
	const end = body.indexOf('>', at) + 1;
	const closing = body.startsWith('</path>', end) ? end + '</path>'.length : end;

	let out = body;
	let hatSvg = hat ? placed(hat, 'chapeau', stage) : '';
	const crown = out.indexOf('<g data-part="couronne"');
	if (hat && crown >= 0) {
		const crownEnd = out.indexOf('</g>', crown) + '</g>'.length;
		out = out.slice(0, crown) + hatSvg + out.slice(crownEnd);
		hatSvg = '';
	}
	const glassesSvg = glasses ? placed(glasses, 'lunettes', stage) : '';
	out = out.slice(0, closing) + glassesSvg + hatSvg + out.slice(closing);
	return out.replace(/<!--[^]*?-->/g, '').replaceAll('s1-mathou', `m${++renders}-mathou`);
}

describe.skipIf(!process.env.PLANCHE)('planche des lunettes et des chapeaux', () => {
	it('écrit les SVG', () => {
		const out = process.env.PLANCHE_OUT ?? '.';
		const stages: MathouStage[] = ['chaton', 'matou', 'grand_matou'];
		const showcase = [raceIndexOf('uni'), raceIndexOf('tigre'), raceIndexOf('bicolore')];

		// 1. Chaque modèle, en A et B : trois stades sur trois pelages
		const models = MODELS.map((m) => ({
			id: m.id,
			name: m.name,
			slot: m.slot,
			variants: m.variants.map((p) => ({
				id: p.id,
				name: p.name,
				cats: stages.map((stage, i) =>
					m.slot === 'lunettes'
						? avatar(showcase[i], stage, p, null)
						: avatar(showcase[i], stage, null, p)
				)
			}))
		}));

		// 2. Tout ensemble : lunettes, chapeau et collier se portent en même temps
		const outfits = [
			{ glasses: 'rondes-a', hat: 'haut-de-forme-a', collar: 'bow_tie' as const },
			{ glasses: 'monocle-a', hat: 'melon-a', collar: 'order_chain' as const },
			{ glasses: 'soleil-b', hat: 'beret-a', collar: 'bell' as const }
		].map((o, n) => ({
			name: `${piece(o.glasses).name} · ${piece(o.hat).name}`,
			cats: stages.map((stage, i) =>
				avatar(showcase[(i + n) % 3], stage, piece(o.glasses), piece(o.hat), o.collar)
			)
		}));

		// 3. Toutes les races en matou, lunettes rondes et melon : rien ne doit jurer sur la tête
		const races = MATHOU_RACES.map((race, i) => ({
			name: race.name,
			svg: avatar(i, 'matou', piece('rondes-a'), piece('melon-a'))
		}));

		expect(models).toHaveLength(11);
		writeFileSync(
			join(out, 'planche-chapeaux-lunettes.json'),
			JSON.stringify({ models, outfits, races }, null, 1)
		);
	});
});
