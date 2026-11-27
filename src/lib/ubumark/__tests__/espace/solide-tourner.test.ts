/**
 * Bloc ```solide : figure que l'on peut tourner (`tourner: oui`) — chantier
 * `solides-3d`, lot 2 (ADR 0045) : la clé, la scène tournée, son cadre fixe
 */
import { describe, expect, it } from 'vitest';
import { generateEspaceTypst } from '#lib/ubumark/generators/espace-typst.ts';
import { parseEspaceContent } from '#lib/ubumark/parser/espace-parser.ts';
import type { SolideSpec } from '#lib/ubumark/types/espace.ts';
import {
	buildSolideScene,
	labelBox,
	solideLabel,
	type SolideScene
} from '#lib/ubumark/utils/espace-solides.ts';
import { VUE_DE_DEPART, turnVue, type EspaceVue } from '#lib/ubumark/utils/espace-vue.ts';

const PAVE = ['forme: pave 4 2 3', 'sommets: A B C D E F G H'];

const read = (...lines: string[]) => parseEspaceContent(lines.join('\n'), 'solide');
const spec = (...lines: string[]) => {
	const node = read(...lines);
	expect(node.errors).toEqual([]);
	return node.spec as SolideSpec;
};

/** Tous les points dessinés d'une scène, boîtes des étiquettes comprises */
const drawn = (scene: SolideScene) => [
	...scene.lines.flatMap((l) => l.points),
	...scene.fills.flat(),
	...scene.dots,
	...scene.vertices,
	...scene.points,
	...scene.labels.flatMap(labelBox),
	...scene.arrows.flatMap((a) => [...a.shaft, ...a.head])
];

/** Une vue droite tournée (hors du passage depuis la cavalière) */
const turned = (dyaw: number, dpitch: number): EspaceVue =>
	turnVue({ ...VUE_DE_DEPART, oblique: 0 }, dyaw, dpitch);

/** Une grille de vues droites : un tour complet, du dessous au dessus */
const GRID: EspaceVue[] = [];
for (let yaw = -180; yaw < 180; yaw += 20) {
	for (let pitch = -100; pitch <= 100; pitch += 25) {
		GRID.push(turned((yaw * Math.PI) / 180, (pitch * Math.PI) / 180));
	}
}

const FORMS = [
	['forme: cube 3', 'sommets: A B C D E F G H'],
	['forme: pave 6 2 1', 'sommets: A B C D E F G H'],
	['forme: pave 1 5 2', 'sommets: A B C D E F G H'],
	['forme: prisme triangle 4 3 5', 'sommets: A B C D E F'],
	['forme: prisme triangle-rectangle 3 4 6', 'sommets: A B C D E F'],
	['forme: pyramide carree 4 6', 'sommets: S A B C D'],
	['forme: pyramide rectangle 4 2 3', 'sommets: S A B C D'],
	['forme: pyramide triangle 4 3', 'sommets: S A B C']
];

describe('```solide — tourner:', () => {
	it('sans la clé : spécification inchangée, rien à signaler', () => {
		const node = read(...PAVE);
		expect(node.spec).not.toHaveProperty('rotate');
		expect(node.rotationErrors).toBeUndefined();
	});

	it('tourner: oui allume la rotation ; non l’éteint', () => {
		expect(spec(...PAVE, 'tourner: oui').rotate).toBe(true);
		expect(spec(...PAVE, 'tourner: Oui').rotate).toBe(true);
		expect(spec(...PAVE, 'tourner: non')).not.toHaveProperty('rotate');
		expect(read(...PAVE, 'tourner: non').rotationErrors).toBeUndefined();
	});

	it('autre chose que oui ou non : message pour l’auteur, figure fixe', () => {
		const node = read(...PAVE, 'tourner: 90');
		expect(node.errors).toEqual([]);
		expect(node.spec).not.toBeNull();
		expect(node.spec).not.toHaveProperty('rotate');
		expect(node.rotationErrors).toEqual(['Ligne 3 : tourner « 90 » : oui ou non']);
	});

	// `section:` et `cotes:` tournent depuis le lot 4 (`solide-sections-tourner.test.ts`)
	it.each([['tracer: vecteur AB + AD', 'tracer:']])(
		'avec %s : pas encore, la figure reste fixe et le réglage est gardé',
		(line, key) => {
			const node = read(...PAVE, line, 'tourner: oui');
			expect(node.errors).toEqual([]);
			expect(node.spec).not.toBeNull();
			expect(node.spec).not.toHaveProperty('rotate');
			expect(node.rotationErrors).toHaveLength(1);
			expect(node.rotationErrors?.[0]).toContain('Ligne 4');
			expect(node.rotationErrors?.[0]).toContain(key);
		}
	);

	it('cotes: non ne gêne pas la rotation', () => {
		expect(spec(...PAVE, 'cotes: non', 'tourner: oui').rotate).toBe(true);
	});

	it('bloc faux par ailleurs : ses erreurs seules, comme avant', () => {
		const node = read('forme: pave 4 2', 'tourner: peut-être');
		expect(node.spec).toBeNull();
		expect(node.errors).toHaveLength(1);
		expect(node.rotationErrors).toBeUndefined();
	});

	it('tourner: deux fois : erreur du bloc, comme toute clé répétée', () => {
		expect(read(...PAVE, 'tourner: oui', 'tourner: non').errors).toEqual([
			'Ligne 4 : « tourner » déjà donnée ligne 3'
		]);
	});

	it('PDF : la vue de départ, la même fiche qu’un solide sans la clé', () => {
		const fixed = generateEspaceTypst(read(...PAVE, 'vecteurs: AG'));
		expect(generateEspaceTypst(read(...PAVE, 'vecteurs: AG', 'tourner: oui'))).toBe(fixed);
		expect(generateEspaceTypst(read(...PAVE, 'vecteurs: AG', 'tourner: 90'))).toBe(fixed);
	});

	it('lecteur d’écran : la même description, plus « figure que l’on peut tourner »', () => {
		const fixed = solideLabel(spec(...PAVE, 'vecteurs: AG'));
		const label = solideLabel(spec(...PAVE, 'vecteurs: AG', 'tourner: oui'));
		expect(label).toBe(`${fixed}, figure que l’on peut tourner`);
		expect(label).not.toMatch(/pavé/i);
	});
});

describe('```solide — scène tournée', () => {
	const pave = spec(
		...PAVE,
		'points: I milieu AE, O centre ABCDEFGH',
		'vecteurs: AG, u = AI',
		'marquer: face BCGF, arete AE, sommet H',
		'tourner: oui'
	);

	it.each(FORMS)('%s : à la vue de départ, le dessin fixe, déplacé en bloc', (...lines) => {
		const s = spec(...lines, 'tourner: oui');
		const fixed = buildSolideScene(s);
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		const dx = rest.vertices[0].x - fixed.vertices[0].x;
		const dy = rest.vertices[0].y - fixed.vertices[0].y;
		const moved = (p: { x: number; y: number }) => ({ x: p.x - dx, y: p.y - dy });
		const close = (a: { x: number; y: number }[], b: { x: number; y: number }[]) => {
			expect(a).toHaveLength(b.length);
			a.forEach((p, i) => {
				expect(moved(p).x).toBeCloseTo(b[i].x, 9);
				expect(moved(p).y).toBeCloseTo(b[i].y, 9);
			});
		};
		close(rest.vertices, fixed.vertices);
		close(
			rest.lines.flatMap((l) => l.points),
			fixed.lines.flatMap((l) => l.points)
		);
		expect(rest.lines.map((l) => [l.dashed, l.thick])).toEqual(
			fixed.lines.map((l) => [l.dashed, l.thick])
		);
		close(
			rest.labels.map((l) => l.at),
			fixed.labels.map((l) => l.at)
		);
		expect(rest.labels.map((l) => l.text)).toEqual(fixed.labels.map((l) => l.text));
	});

	it('le dessin fixe d’un bloc avec la clé est celui du bloc sans la clé', () => {
		expect(buildSolideScene(spec(...PAVE, 'tourner: oui'))).toEqual(
			buildSolideScene(spec(...PAVE))
		);
	});

	it.each(FORMS)('%s : cadre fixe, tout le dessin dedans à chaque angle', (...lines) => {
		const s = spec(...lines, 'tourner: oui');
		const rest = buildSolideScene(s, VUE_DE_DEPART);
		for (const vue of [VUE_DE_DEPART, ...GRID]) {
			const scene = buildSolideScene(s, vue);
			expect(scene.width).toBe(rest.width);
			expect(scene.height).toBe(rest.height);
			for (const p of drawn(scene)) {
				expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
			}
		}
	});

	it('points, vecteurs et marques : dans le cadre à chaque angle', () => {
		const rest = buildSolideScene(pave, VUE_DE_DEPART);
		for (const vue of GRID) {
			const scene = buildSolideScene(pave, vue);
			expect(scene.width).toBe(rest.width);
			for (const p of drawn(scene)) {
				expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
			}
		}
	});

	it('pivot fixe : le centre du pavé reste au même endroit du cadre', () => {
		const at = (vue: EspaceVue) => buildSolideScene(pave, vue).points[1];
		const rest = at(VUE_DE_DEPART);
		for (const vue of [...GRID, { yaw: 0.4, pitch: 0.2, oblique: 0.5 }]) {
			expect(at(vue).x).toBeCloseTo(rest.x, 9);
			expect(at(vue).y).toBeCloseTo(rest.y, 9);
		}
	});

	it('échelle fixe : une arête vue de face garde sa longueur du dessin fixe', () => {
		const fixed = buildSolideScene(pave);
		const length = (scene: SolideScene, a: number, b: number) =>
			Math.hypot(
				scene.vertices[a].x - scene.vertices[b].x,
				scene.vertices[a].y - scene.vertices[b].y
			);
		// [AE] est verticale : un tour autour de la verticale ne la raccourcit pas
		const around = buildSolideScene(pave, {
			yaw: 1,
			pitch: -Math.asin((0.5 * Math.SQRT1_2) / Math.cos(Math.asin(0.5 * Math.SQRT1_2))),
			oblique: 0
		});
		expect(length(around, 0, 4)).toBeCloseTo(length(fixed, 0, 4), 9);
	});

	it('les étiquettes et les marques suivent : mêmes noms, même nombre de traits', () => {
		const rest = buildSolideScene(pave, VUE_DE_DEPART);
		for (const vue of GRID) {
			const scene = buildSolideScene(pave, vue);
			expect(scene.labels.map((l) => l.text).sort()).toEqual(rest.labels.map((l) => l.text).sort());
			expect(scene.lines).toHaveLength(rest.lines.length);
			expect(scene.lines.filter((l) => l.thick)).toHaveLength(1);
			expect(scene.fills).toHaveLength(1);
			expect(scene.arrows).toHaveLength(rest.arrows.length);
		}
	});

	it('vu de derrière, les arêtes cachées ne sont plus les mêmes', () => {
		const s = spec(...PAVE, 'tourner: oui');
		expect(buildSolideScene(s, VUE_DE_DEPART).lines.filter((l) => l.dashed)).toHaveLength(3);
		const behind = buildSolideScene(s, turned(Math.PI, 0));
		expect(behind.lines.filter((l) => l.dashed)).toHaveLength(3);
		// Les trois arêtes cachées partent d'un sommet de devant (A ou B), plus de D
		const hiddenVertex = (scene: SolideScene) => {
			const ends = scene.lines.filter((l) => l.dashed).flatMap((l) => l.points);
			return scene.vertices.findIndex(
				(v) => ends.filter((p) => Math.hypot(p.x - v.x, p.y - v.y) < 1e-9).length === 3
			);
		};
		expect(hiddenVertex(buildSolideScene(s, VUE_DE_DEPART))).toBe(3);
		expect([0, 1]).toContain(hiddenVertex(behind));
	});

	it('cachees: non : tout en trait plein à chaque angle', () => {
		const s = spec(...PAVE, 'cachees: non', 'tourner: oui');
		for (const vue of GRID) {
			expect(buildSolideScene(s, vue).lines.some((l) => l.dashed)).toBe(false);
		}
	});

	it('vecteur vu par le bout : pas de flèche folle', () => {
		// [AD] est une fuyante : vue de face en vue droite, elle se réduit à un point
		const s = spec(...PAVE, 'vecteurs: u = AD', 'tourner: oui');
		const facing = {
			yaw: -Math.asin(0.5 * Math.SQRT1_2),
			pitch: -Math.asin((0.5 * Math.SQRT1_2) / Math.cos(Math.asin(0.5 * Math.SQRT1_2))),
			oblique: 0
		};
		for (const p of drawn(buildSolideScene(s, facing))) {
			expect(Number.isFinite(p.x) && Number.isFinite(p.y)).toBe(true);
		}
	});
});

describe('```solide — noms tenus pendant la rotation', () => {
	const pave = spec(
		...PAVE,
		'points: I milieu AE, O centre ABCDEFGH',
		'vecteurs: AG, u = AI',
		'tourner: oui'
	);

	it('dessin fixe : aucune place de nom rendue (scène inchangée)', () => {
		expect(buildSolideScene(pave)).not.toHaveProperty('labelOffsets');
	});

	it('figure à tourner : une place par nom, par rapport à son point', () => {
		const rest = buildSolideScene(pave, VUE_DE_DEPART);
		expect(rest.labelOffsets).toHaveLength(rest.labels.length);
		// Les huit premiers noms sont ceux des sommets, dans l'ordre
		rest.vertices.forEach((p, i) => {
			expect(rest.labels[i].at.x - p.x).toBeCloseTo(rest.labelOffsets?.[i].x ?? NaN, 9);
			expect(rest.labels[i].at.y - p.y).toBeCloseTo(rest.labelOffsets?.[i].y ?? NaN, 9);
		});
	});

	it('places tenues : chaque nom garde sa place par rapport à son point, à chaque angle', () => {
		const held = buildSolideScene(pave, VUE_DE_DEPART).labelOffsets;
		for (const vue of GRID) {
			const scene = buildSolideScene(pave, vue, held);
			expect(scene.labelOffsets).toHaveLength(held?.length ?? -1);
			scene.labelOffsets?.forEach((offset, i) => {
				expect(offset.x).toBeCloseTo(held?.[i].x ?? NaN, 9);
				expect(offset.y).toBeCloseTo(held?.[i].y ?? NaN, 9);
			});
			scene.vertices.forEach((p, i) => {
				expect(scene.labels[i].at.x - p.x).toBeCloseTo(held?.[i].x ?? NaN, 9);
				expect(scene.labels[i].at.y - p.y).toBeCloseTo(held?.[i].y ?? NaN, 9);
			});
			expect(scene.labels.map((l) => l.text)).toEqual(
				buildSolideScene(pave, VUE_DE_DEPART).labels.map((l) => l.text)
			);
		}
	});

	it('places tenues : tout reste dans le cadre à chaque angle', () => {
		const held = buildSolideScene(pave, VUE_DE_DEPART).labelOffsets;
		for (const vue of GRID) {
			const scene = buildSolideScene(pave, vue, held);
			for (const p of drawn(scene)) {
				expect(p.x).toBeGreaterThanOrEqual(-1e-9);
				expect(p.y).toBeGreaterThanOrEqual(-1e-9);
				expect(p.x).toBeLessThanOrEqual(scene.width + 1e-9);
				expect(p.y).toBeLessThanOrEqual(scene.height + 1e-9);
			}
		}
	});

	it('la petite flèche d’un nom de vecteur suit le nom tenu', () => {
		const held = buildSolideScene(pave, VUE_DE_DEPART).labelOffsets;
		const vue = turned(1, 0.4);
		const scene = buildSolideScene(pave, vue, held);
		const name = scene.labels.find((l) => l.text === 'u');
		const small = scene.arrows.find((a) => a.small);
		expect(name).toBeDefined();
		expect(small).toBeDefined();
		const middleX = ((small?.shaft[0].x ?? NaN) + (small?.head[0].x ?? NaN)) / 2;
		expect(middleX).toBeCloseTo(name?.at.x ?? NaN, 9);
	});

	it('à l’arrêt : les places rendues, redonnées telles quelles, redonnent la même scène', () => {
		const vue = turned(2, -0.6);
		const settled = buildSolideScene(pave, vue);
		expect(buildSolideScene(pave, vue, settled.labelOffsets)).toEqual(settled);
	});

	it('places d’un autre bloc (pas le même nombre de noms) : placement habituel', () => {
		const vue = turned(2, -0.6);
		expect(buildSolideScene(pave, vue, [{ x: 0, y: 0 }])).toEqual(buildSolideScene(pave, vue));
	});
});
