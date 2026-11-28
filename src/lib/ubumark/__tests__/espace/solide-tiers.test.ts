/**
 * Bloc ```solide : point placé sur un segment par une fraction
 * (`points: M tel que AM = 1/3 AB`) et graduations d'un segment (`graduer: AB 3`)
 * — outil n° 65 de `docs/wip/outils-manquants.md`, phase 0 dans
 * `docs/wip/outil-espace-progress.md` (« je te suis », 2026-11-28)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { EspaceNode, SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	solideLabel,
	solidePoints3,
	type Point3
} from '#lib/ubumark/utils/espace-solides.ts';
import { turnVue, VUE_DE_DEPART } from '#lib/ubumark/utils/espace-vue.ts';

// Cube : A 0, B 1, C 2, D 3, E 4, F 5, G 6, H 7 ; les points déclarés à partir de 8
const CUBE = ['forme: cube 6', 'sommets: A B C D E F G H'];
const A = 0;
const B = 1;
const E = 4;
const G = 6;
const H = 7;

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors.join('\n');
const at3 = (s: SolideSpec) => solidePoints3(s.form, s.dims, s.points);
const between3 = (p: Point3, q: Point3, t: number): Point3 => ({
	x: p.x + (q.x - p.x) * t,
	y: p.y + (q.y - p.y) * t,
	z: p.z + (q.z - p.z) * t
});
const close3 = (p: Point3, q: Point3) => Math.hypot(p.x - q.x, p.y - q.y, p.z - q.z) < 1e-9;
const between = (p: EspacePoint, q: EspacePoint, t: number): EspacePoint => ({
	x: p.x + (q.x - p.x) * t,
	y: p.y + (q.y - p.y) * t
});
const distance = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y);

describe('points: M tel que AM = 1/3 AB — lecture', () => {
	it('déclare le point au tiers de [AB], en partant de A', () => {
		const s = spec(...CUBE, 'points: M tel que AM = 1/3 AB');
		expect(s.points[0]).toEqual({
			name: 'M',
			of: [],
			label: 'tel que AM = un tiers de AB',
			along: { from: A, to: B, ratio: [1, 3] }
		});
		const at = at3(s);
		expect(close3(at[8], between3(at[A], at[B], 1 / 3))).toBe(true);
	});

	it.each([
		['N tel que EN = 2/3 EH', E, H, [2, 3], 'deux tiers de EH', 2 / 3],
		['P tel que AP = 3/4 AG', A, G, [3, 4], 'trois quarts de AG', 3 / 4],
		['Q tel que AQ = 2/5 AB', A, B, [2, 5], 'deux cinquièmes de AB', 2 / 5],
		['R tel que AR = 1/2 AB', A, B, [1, 2], 'la moitié de AB', 1 / 2],
		// Une fraction non réduite est réduite
		['S tel que AS = 2/4 AB', A, B, [1, 2], 'la moitié de AB', 1 / 2],
		['T tel que AT = 7/10 AB', A, B, [7, 10], 'sept dixièmes de AB', 7 / 10],
		// Espaces facultatives autour de =, crochets permis autour du segment
		['U tel que AU=1/3 [AB]', A, B, [1, 3], 'un tiers de AB', 1 / 3]
	])('%s', (item, from, to, ratio, words, t) => {
		const s = spec(...CUBE, `points: ${item}`);
		const point = s.points[0];
		expect(point.along).toEqual({ from, to, ratio });
		expect(point.label).toContain(words);
		const at = at3(s);
		expect(close3(at[8], between3(at[from], at[to], t))).toBe(true);
	});

	it('prend un point déjà déclaré comme bout du segment', () => {
		const s = spec(...CUBE, 'points: I milieu AE, J tel que IJ = 1/3 IG');
		expect(s.points[1].along).toEqual({ from: 8, to: G, ratio: [1, 3] });
		const at = at3(s);
		expect(close3(at[9], between3(at[8], at[G], 1 / 3))).toBe(true);
	});

	it('sert ensuite comme un autre point (milieu, vecteur, geste)', () => {
		const s = spec(...CUBE, 'points: M tel que AM = 1/3 AB, K milieu MG', 'vecteurs: u = MG');
		expect(s.points[1].of).toEqual([8, G]);
		expect(s.vectors[0]).toMatchObject({ from: 8, to: G });
		const geste = spec(...CUBE, 'points: M tel que AM = 2/3 AB', 'tracer: vecteur AM');
		expect(geste.task).toBeDefined();
	});

	it.each([
		['M tel que AM = 3/2 AB', 'entre 0 et 1'],
		['M tel que AM = 0/3 AB', 'entre 0 et 1'],
		['M tel que AM = 3/3 AB', 'entre 0 et 1'],
		['M tel que AM = 1/12 AB', 'au plus 10'],
		['M tel que BM = 1/3 AB', 'AM = 1/3 AB'],
		['M tel que AN = 1/3 AB', 'AM = 1/3 AB'],
		['M tel que AM = 1/3 AZ', 'aucun point ne s’appelle Z'],
		['M tel que AM = 1/3 AA', 'deux points distincts'],
		['M tel que AM = 1/3 ABC', 'deux points'],
		['M tel que AM = 0,5 AB', 'une fraction'],
		['M tel que AM AB', 'ex. M tel que AM = 1/3 AB']
	])('refuse « %s » avec une phrase', (item, message) => {
		expect(errors(...CUBE, `points: ${item}`)).toContain(message);
	});

	it('se lit au lecteur d’écran', () => {
		expect(solideLabel(spec(...CUBE, 'points: M tel que AM = 1/3 AB'))).toContain(
			'point M tel que AM = un tiers de AB'
		);
	});

	it('se dessine d’un point et de son nom, au tiers de [AB]', () => {
		const scene = buildSolideScene(spec(...CUBE, 'points: M tel que AM = 1/3 AB'));
		const v = scene.vertices;
		expect(distance(scene.points[0], between(v[A], v[B], 1 / 3))).toBeLessThan(1e-9);
		expect(scene.labels.some((l) => l.text === 'M')).toBe(true);
	});
});

describe('graduer: AB 3 — lecture', () => {
	it('lit les arêtes graduées et le nombre de parts', () => {
		const s = spec(...CUBE, 'graduer: AB 3, [EH] 4');
		expect(s.graduations).toEqual([
			{ from: A, to: B, parts: 3 },
			{ from: E, to: H, parts: 4 }
		]);
	});

	it('sans la ligne, la description reste celle d’avant (pas de clé vide)', () => {
		expect(spec(...CUBE)).not.toHaveProperty('graduations');
	});

	it('gradue un segment de segments:', () => {
		const s = spec(...CUBE, 'segments: [AG]', 'graduer: AG 3');
		expect(s.graduations).toEqual([{ from: A, to: G, parts: 3 }]);
	});

	it.each([
		['graduer: AG 3', 'n’est ni une arête ni un segment de segments:'],
		['graduer: AB 1', 'de 2 à 10 parts'],
		['graduer: AB 11', 'de 2 à 10 parts'],
		['graduer: AB', 'ex. graduer: AB 3'],
		['graduer: AB trois', 'ex. graduer: AB 3'],
		['graduer: AZ 3', 'aucun point ne s’appelle Z'],
		['graduer: AB 3, BA 4', 'deux fois'],
		['graduer: AB 2, BC 2, CD 2, DA 2, AE 2', 'au plus 4']
	])('refuse « %s » avec une phrase', (line, message) => {
		expect(errors(...CUBE, line)).toContain(message);
	});

	it('polyèdres seulement, sommets nommés', () => {
		expect(errors('forme: cylindre 2 5', 'sommets: O O’', 'graduer: OO’ 3')).toContain(
			'polyèdres seulement'
		);
		expect(errors('forme: cube 5', 'graduer: AB 3')).toContain(
			'nomme les sommets (sommets:) pour graduer un segment'
		);
	});

	it('se lit au lecteur d’écran', () => {
		const label = solideLabel(spec(...CUBE, 'segments: [AG]', 'graduer: AB 3, AG 4'));
		expect(label).toContain('[AB] partagé en 3 parts égales');
		expect(label).toContain('[AG] partagé en 4 parts égales');
	});
});

describe('graduer: AB 3 — dessin', () => {
	/** Les petits traits : un par graduation intérieure, coupant le segment à angle droit */
	const expectTicks = (
		ticks: [EspacePoint, EspacePoint][],
		from: EspacePoint,
		to: EspacePoint,
		parts: number
	) => {
		expect(ticks).toHaveLength(parts - 1);
		const along = { x: to.x - from.x, y: to.y - from.y };
		const length = Math.hypot(along.x, along.y);
		ticks.forEach(([p, q], i) => {
			// Le milieu du trait est sur la graduation
			const middle = between(p, q, 1 / 2);
			expect(distance(middle, between(from, to, (i + 1) / parts))).toBeLessThan(1e-9);
			// Perpendiculaire au segment, court
			const dot = ((q.x - p.x) * along.x + (q.y - p.y) * along.y) / length;
			expect(Math.abs(dot)).toBeLessThan(1e-9);
			expect(distance(p, q)).toBeGreaterThan(0.08);
			expect(distance(p, q)).toBeLessThan(0.3);
		});
	};

	it('pose un petit trait à chaque tiers de [AB]', () => {
		const scene = buildSolideScene(spec(...CUBE, 'graduer: AB 3'));
		const v = scene.vertices;
		expectTicks(scene.ticks ?? [], v[A], v[B], 3);
	});

	it('gradue un segment donné et une arête cachée', () => {
		const scene = buildSolideScene(spec(...CUBE, 'segments: [AG]', 'graduer: AG 4, DH 2'));
		const v = scene.vertices;
		const ticks = scene.ticks ?? [];
		expectTicks(ticks.slice(0, 3), v[A], v[G], 4);
		expectTicks(ticks.slice(3), v[3], v[H], 2);
	});

	it('suit la figure qui tourne', () => {
		const vue = turnVue({ ...VUE_DE_DEPART, oblique: 0 }, 0.6, 0.3);
		const scene = buildSolideScene({ ...spec(...CUBE, 'graduer: AB 3'), rotate: true }, vue);
		const v = scene.vertices;
		expectTicks(scene.ticks ?? [], v[A], v[B], 3);
	});

	it('se dessine sur la fiche PDF, un trait par graduation', () => {
		const node = read(...CUBE, 'graduer: AB 3, EH 4') as EspaceNode;
		const typst = generateEspaceTypst(node);
		// Les graduations : des traits noirs à bouts droits (les arêtes ont des bouts ronds)
		const ticks = typst.match(/cap: "butt"/g) ?? [];
		expect(ticks).toHaveLength(5);
	});
});
