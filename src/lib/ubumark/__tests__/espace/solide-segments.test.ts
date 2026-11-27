/**
 * Bloc ```solide : segments donnés (`segments:`) et angles droits codés
 * (`angles-droits:`) — outil n° 72 de `docs/wip/outils-manquants.md`, phase 0
 * dans `docs/wip/solide-segments-progress.md` (« je te suis », 2026-11-28)
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { EspaceNode, SolideSpec } from '#lib/ubumark/types/espace.ts';
import type { EspacePoint } from '#lib/ubumark/utils/espace-scene.ts';
import {
	buildSolideScene,
	solideLabel,
	type SolideLine
} from '#lib/ubumark/utils/espace-solides.ts';
import { turnVue, VUE_DE_DEPART } from '#lib/ubumark/utils/espace-vue.ts';

const CUBE = ['forme: cube 5', 'sommets: A B C D E F G H'];
/** Indices des sommets du cube (ordre de `sommets:`) */
const A = 0;
const E = 4;
const G = 6;

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};
const errors = (...lines: string[]) => read(...lines).errors;

const distance = (p: EspacePoint, q: EspacePoint) => Math.hypot(p.x - q.x, p.y - q.y);
/** Les morceaux se suivent bout à bout, du point `from` au point `to` */
const expectFromTo = (pieces: SolideLine[], from: EspacePoint, to: EspacePoint) => {
	expect(distance(pieces[0].points[0], from)).toBeLessThan(1e-9);
	expect(distance(pieces[pieces.length - 1].points[1], to)).toBeLessThan(1e-9);
	pieces.slice(1).forEach((piece, i) => {
		expect(distance(pieces[i].points[1], piece.points[0])).toBeLessThan(1e-9);
	});
};

/** Le point est-il sur le segment [a, b] (au centième de millimètre) ? */
const onSegment = (p: EspacePoint, a: EspacePoint, b: EspacePoint) =>
	Math.abs(distance(a, p) + distance(p, b) - distance(a, b)) < 1e-6;
/** Les morceaux dessinés sur le segment [a, b], dans l'ordre */
const piecesOn = (pieces: SolideLine[], a: EspacePoint, b: EspacePoint) =>
	pieces.filter((piece) => piece.points.every((p) => onSegment(p, a, b)));
/** Les morceaux sur aucun des segments donnés : les côtés des carrés d'angles droits */
const squarePieces = (pieces: SolideLine[], segments: [EspacePoint, EspacePoint][]) =>
	pieces.filter(
		(piece) => !segments.some(([a, b]) => piece.points.every((p) => onSegment(p, a, b)))
	);

describe('segments: et angles-droits: — lecture', () => {
	it('lit les segments (crochets facultatifs) et les angles droits', () => {
		const s = spec(...CUBE, 'segments: [EG], AG', 'angles-droits: AEG');
		expect(s.segments).toEqual([
			{ from: E, to: G },
			{ from: A, to: G }
		]);
		expect(s.rightAngles).toEqual([{ from: A, at: E, to: G }]);
	});

	it('sans ces lignes, la description reste celle d’avant (pas de clé vide)', () => {
		const s = spec(...CUBE);
		expect('segments' in s).toBe(false);
		expect('rightAngles' in s).toBe(false);
		expect('segments' in buildSolideScene(s)).toBe(false);
	});

	it('prend un point déclaré comme bout : la demi-diagonale d’une pyramide', () => {
		const s = spec(
			'forme: pyramide carree 4 3',
			'sommets: S A B C D',
			'points: O centre ABCD',
			'segments: [SO], [OA]',
			'angles-droits: SOA'
		);
		// S = 0, A = 1, O = 5 (après les cinq sommets)
		expect(s.segments).toEqual([
			{ from: 0, to: 5 },
			{ from: 5, to: 1 }
		]);
		expect(s.rightAngles).toEqual([{ from: 0, at: 5, to: 1 }]);
	});

	it.each([
		[['segments: [AI]'], 'aucun point ne s’appelle I'],
		[['segments: [AE]'], '[AE] est une arête : marquer: arete AE'],
		[['segments: [AG], [GA]'], '[GA] deux fois'],
		[['segments: [AGE]'], 'un segment se désigne par deux points'],
		[['segments: AB, AC, AF, AG, AH, BD, BE'], 'au plus 6 segments'],
		[['angles-droits: AEB'], 'l’angle AEB n’est pas droit'],
		[['angles-droits: AE'], 'un angle se désigne par trois points'],
		[['angles-droits: AEG, GEA'], 'GEA deux fois'],
		[['segments: [AG]', 'tracer: vecteur AB'], 'segments: ne va pas encore avec tracer:'],
		[
			['angles-droits: AEG', 'section: parallele dessus 2'],
			'angles-droits: ne va pas encore avec section:'
		]
	])('refuse %j avec une phrase', (extra, message) => {
		expect(errors(...CUBE, ...extra).join('\n')).toContain(message);
	});

	it('polyèdres seulement, sommets nommés', () => {
		expect(errors('forme: cylindre 2 5', 'sommets: O O’', 'segments: [OO’]').join('\n')).toContain(
			'polyèdres seulement'
		);
		expect(errors('forme: cube 5', 'segments: [AG]').join('\n')).toContain(
			'nomme les sommets (sommets:) pour dessiner des segments'
		);
	});
});

describe('segments: et angles-droits: — dessin', () => {
	const s = spec(...CUBE, 'segments: [EG], [AG]', 'angles-droits: AEG');

	it('trace chaque segment d’un bout à l’autre, en tirets là où le cube passe devant', () => {
		const scene = buildSolideScene(s);
		const pieces = scene.segments ?? [];
		const v = scene.vertices;
		const eg = piecesOn(pieces, v[E], v[G]);
		const ag = piecesOn(pieces, v[A], v[G]);
		const square = squarePieces(pieces, [
			[v[E], v[G]],
			[v[A], v[G]]
		]);
		expect(eg.length + ag.length + square.length).toBe(pieces.length);
		// [EG] est sur la face du dessus, vue : en plein
		expectFromTo(eg, scene.vertices[E], scene.vertices[G]);
		expect(eg.every((p) => !p.dashed)).toBe(true);
		// [AG] traverse le cube : au moins un morceau en tirets
		expectFromTo(ag, scene.vertices[A], scene.vertices[G]);
		expect(ag.some((p) => p.dashed)).toBe(true);
		expect(square.length).toBeGreaterThanOrEqual(2);
	});

	it('code l’angle droit par un petit carré au sommet E, fermé sur ses deux côtés', () => {
		const scene = buildSolideScene(s);
		const v = scene.vertices;
		const square = squarePieces(scene.segments ?? [], [
			[v[E], v[G]],
			[v[A], v[G]]
		]);
		const corner = v[E];
		// Les deux côtés se suivent : p1 → coin opposé à E → p3
		const p1 = square[0].points[0];
		const p3 = square[square.length - 1].points[1];
		// Le coin opposé : le point du tracé le plus loin de E
		const p2 = square
			.flatMap((piece) => piece.points)
			.reduce((best, p) => (distance(p, corner) > distance(best, corner) ? p : best));
		// Un parallélogramme (le carré en perspective) : E + coin = p1 + p3
		expect(
			distance({ x: corner.x + p2.x, y: corner.y + p2.y }, { x: p1.x + p3.x, y: p1.y + p3.y })
		).toBeLessThan(1e-9);
		// p1 sur [EA], p3 sur [EG], tout près de E (petit carré)
		const near = (p: EspacePoint) => distance(p, corner);
		expect(near(p1)).toBeGreaterThan(0.1);
		expect(near(p1)).toBeLessThan(0.6);
		expect(near(p3)).toBeLessThan(0.6);
	});

	it('met en tirets le carré d’un angle droit caché (pied de la hauteur d’une pyramide)', () => {
		const scene = buildSolideScene(
			spec(
				'forme: pyramide carree 4 3',
				'sommets: S A B C D',
				'points: O centre ABCD',
				'segments: [SO], [OA]',
				'angles-droits: SOA'
			)
		);
		const pieces = scene.segments ?? [];
		const [s, o, a] = [scene.vertices[0], scene.points[0], scene.vertices[1]];
		const so = piecesOn(pieces, s, o);
		const oa = piecesOn(pieces, o, a);
		const square = squarePieces(pieces, [
			[s, o],
			[o, a]
		]);
		expect(square.length).toBeGreaterThanOrEqual(2);
		expect(so.every((p) => p.dashed)).toBe(true);
		expect(oa.every((p) => p.dashed)).toBe(true);
		expect(square.every((p) => p.dashed)).toBe(true);
	});

	it('suit la figure qui tourne', () => {
		const vue = turnVue({ ...VUE_DE_DEPART, oblique: 0 }, 0.6, 0.3);
		const scene = buildSolideScene({ ...s, rotate: true }, vue);
		const pieces = scene.segments ?? [];
		const v = scene.vertices;
		expectFromTo(piecesOn(pieces, v[E], v[G]), v[E], v[G]);
		expectFromTo(piecesOn(pieces, v[A], v[G]), v[A], v[G]);
	});

	it('cachees: non : tout en trait plein', () => {
		const scene = buildSolideScene(spec(...CUBE, 'cachees: non', 'segments: [AG]'));
		expect((scene.segments ?? []).every((p) => !p.dashed)).toBe(true);
	});

	it('se lit au lecteur d’écran, sans longueur', () => {
		const label = solideLabel(s);
		expect(label).toContain('segment [EG]');
		expect(label).toContain('segment [AG]');
		expect(label).toContain('angle droit en E');
	});

	it('se dessine en bleu sur la fiche PDF, un trait par morceau', () => {
		const node = read(...CUBE, 'segments: [EG], [AG]', 'angles-droits: AEG') as EspaceNode;
		const typst = generateEspaceTypst(node);
		const blue = typst.match(/paint: rgb\(37, 99, 235\)[^)]*\)/g) ?? [];
		expect(blue).toHaveLength(buildSolideScene(s).segments?.length ?? -1);
		// [AG] traverse le cube : des morceaux bleus en tirets, d'autres en plein ([EG])
		expect(blue.some((stroke) => stroke.includes('dash:'))).toBe(true);
		expect(blue.some((stroke) => !stroke.includes('dash:'))).toBe(true);
	});

	it('cachees: non : aucun trait bleu en tirets sur la fiche PDF', () => {
		const node = read(...CUBE, 'cachees: non', 'segments: [AG]') as EspaceNode;
		const blue = generateEspaceTypst(node).match(/paint: rgb\(37, 99, 235\)[^)]*\)/g) ?? [];
		expect(blue.length).toBeGreaterThan(0);
		expect(blue.some((stroke) => stroke.includes('dash:'))).toBe(false);
	});
});
