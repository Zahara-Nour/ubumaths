/**
 * Bloc ```schema-barres — la scène (comportements 1 à 6 et 8 : échelle commune,
 * pointillés, accolades, colonne des noms)
 */

import { describe, expect, it } from 'vitest';
import { parseSchemaBarresContent } from '$lib/ubumark/parser/schema-barres-parser';
import {
	SCHEMA_BARRES_DRAW_WIDTH,
	SCHEMA_BARRES_FONT_SIZE,
	SCHEMA_BARRES_MIN_DRAW_WIDTH,
	SCHEMA_BARRES_MIN_FONT_PX,
	SCHEMA_BARRES_PX_PER_UNIT,
	buildSchemaBarresScene,
	schemaBarresDrawWidth,
	schemaBarresLabel
} from '$lib/ubumark/utils/schema-barres-scene';

function scene(...lines: string[]) {
	const node = parseSchemaBarresContent(lines.join('\n'));
	expect(node.errors).toEqual([]);
	if (node.spec === null) throw new Error('spec attendue');
	return { spec: node.spec, scene: buildSchemaBarresScene(node.spec) };
}

describe('scène du schéma en barres', () => {
	it('3. échelle commune : la plus longue barre occupe toute la largeur de dessin', () => {
		const { scene: s } = scene('A : ? (4) ; 7 (2)', 'B : ? (3)');
		const first = s.rects.slice(0, 2);
		expect(first[0].x + first[0].width + first[1].width - first[0].x).toBeCloseTo(
			SCHEMA_BARRES_DRAW_WIDTH
		);
	});

	it('3. une unité a la même largeur sur toutes les barres (pointillés compris)', () => {
		const { scene: s } = scene('A : ? (4) ; -5 (2)', 'B : ? (3)', 'C : ? ; ?');
		const unit = s.rects[0].width / 4;
		expect(s.rects[1].width).toBeCloseTo(2 * unit); // la partie manquante compte dans l'échelle
		expect(s.rects[2].width).toBeCloseTo(3 * unit);
		expect(s.rects[3].width).toBeCloseTo(unit);
		expect(s.rects[4].width).toBeCloseTo(unit);
	});

	it('1. barres alignées à gauche, l’une sous l’autre, dans l’ordre', () => {
		const { scene: s } = scene('A : ? (4)', 'B : ? (2)', 'C : ?');
		const starts = [s.rects[0], s.rects[1], s.rects[2]];
		expect(new Set(starts.map((r) => r.x)).size).toBe(1);
		expect(starts[0].y).toBeLessThan(starts[1].y);
		expect(starts[1].y).toBeLessThan(starts[2].y);
		expect(starts[0].y + starts[0].height).toBeLessThan(starts[1].y);
	});

	it('2. segments consécutifs, sans trou, étiquette au centre', () => {
		const { scene: s } = scene('A : ? (2) ; 70 (1)');
		expect(s.rects[1].x).toBeCloseTo(s.rects[0].x + s.rects[0].width);
		const label = s.texts.find((t) => t.text === '70');
		expect(label?.anchor).toBe('middle');
		expect(label?.x).toBeCloseTo(s.rects[1].x + s.rects[1].width / 2);
		expect(label?.y).toBeCloseTo(s.rects[1].y + s.rects[1].height / 2);
	});

	it('4. partie manquante : rectangle en pointillés, étiquette sans le signe', () => {
		const { scene: s } = scene('A : ? (2) ; -80 (1,5)');
		expect(s.rects.map((r) => r.dashed)).toEqual([false, true]);
		expect(s.texts.some((t) => t.text === '80')).toBe(true);
		expect(s.texts.some((t) => t.text === '-80')).toBe(false);
	});

	it('1. colonne des noms alignée à droite, avant les barres ; absente sans nom', () => {
		const { scene: named } = scene('Or : ? (4)', 'Argent : ? (4)');
		const names = named.texts.filter((t) => t.kind === 'name');
		expect(names.map((t) => t.text)).toEqual(['Or', 'Argent']);
		expect(names.every((t) => t.anchor === 'end')).toBe(true);
		expect(new Set(names.map((t) => t.x)).size).toBe(1);
		expect(names[0].x).toBeLessThan(named.rects[0].x);
		const { scene: anonymous } = scene(': ? ; ?');
		expect(anonymous.texts.some((t) => t.kind === 'name')).toBe(false);
		expect(anonymous.rects[0].x).toBeLessThan(named.rects[0].x);
	});

	it('5. accolade sous la barre, du début à la fin du dernier segment plein', () => {
		const { scene: s } = scene('A : P (3) ; -A (2) = 9 €');
		expect(s.braces).toHaveLength(1);
		const brace = s.braces[0];
		expect(brace.orientation).toBe('horizontal');
		const xs = brace.points.map((p) => p.x);
		expect(Math.min(...xs)).toBeCloseTo(s.rects[0].x);
		expect(Math.max(...xs)).toBeCloseTo(s.rects[0].x + s.rects[0].width);
		expect(Math.min(...brace.points.map((p) => p.y))).toBeGreaterThan(
			s.rects[0].y + s.rects[0].height
		);
		const text = s.texts.find((t) => t.kind === 'brace');
		expect(text?.text).toBe('9 €');
		expect(text?.y).toBeGreaterThan(Math.max(...brace.points.map((p) => p.y)));
	});

	it('5. l’accolade d’une barre ne chevauche pas la barre suivante', () => {
		const { scene: s } = scene('A : ? (2) = 5', 'B : ? (2)');
		const braceBottom = Math.max(...s.braces[0].points.map((p) => p.y));
		const text = s.texts.find((t) => t.kind === 'brace');
		expect(text && text.y).toBeGreaterThan(braceBottom);
		expect(s.rects[1].y).toBeGreaterThan((text?.y ?? 0) + 8);
	});

	it('6. accolade verticale à droite, de la première à la dernière barre', () => {
		const { scene: s } = scene('A : ? (4)', 'B : ? (2)', 'total : 320 €');
		const vertical = s.braces.find((b) => b.orientation === 'vertical');
		expect(vertical).toBeDefined();
		const ys = vertical?.points.map((p) => p.y) ?? [];
		expect(Math.min(...ys)).toBeCloseTo(s.rects[0].y);
		expect(Math.max(...ys)).toBeCloseTo(s.rects[1].y + s.rects[1].height);
		const rightEnd = Math.max(...s.rects.map((r) => r.x + r.width));
		expect(Math.min(...(vertical?.points.map((p) => p.x) ?? []))).toBeGreaterThan(rightEnd);
		const text = s.texts.find((t) => t.kind === 'total');
		expect(text?.text).toBe('320 €');
		expect(text?.anchor).toBe('start');
		expect(text?.x).toBeGreaterThan(Math.max(...(vertical?.points.map((p) => p.x) ?? [])));
	});

	it('sans total ni `=` : aucune accolade', () => {
		expect(scene('A : ?').scene.braces).toEqual([]);
	});

	it('tout tient dans la scène (textes et accolades compris)', () => {
		const { scene: s } = scene(
			'Pastèques : P (3) ; P (3) ; A (2) = 9 € le tout',
			'Ananas : A (2) = 1',
			'total : 100 €'
		);
		for (const r of s.rects) {
			expect(r.x).toBeGreaterThanOrEqual(0);
			expect(r.x + r.width).toBeLessThanOrEqual(s.width);
			expect(r.y + r.height).toBeLessThanOrEqual(s.height);
		}
		for (const t of s.texts) {
			const from =
				t.anchor === 'middle' ? t.x - t.width / 2 : t.anchor === 'end' ? t.x - t.width : t.x;
			expect(from).toBeGreaterThanOrEqual(0);
			expect(from + t.width).toBeLessThanOrEqual(s.width + 1e-6);
			expect(t.y).toBeLessThanOrEqual(s.height);
		}
		for (const b of s.braces) {
			for (const p of b.points) {
				expect(p.x).toBeLessThanOrEqual(s.width);
				expect(p.y).toBeLessThanOrEqual(s.height);
			}
		}
	});

	it('8. nom accessible : « Schéma en barres » puis les noms, jamais les étiquettes', () => {
		const { spec } = scene('Or : ? (4) ; 70 (2)', 'Argent : ? (4)', 'Bronze : ?', 'total : 320 €');
		expect(schemaBarresLabel(spec)).toBe('Schéma en barres : Or, Argent, Bronze');
		expect(schemaBarresLabel(scene(': ? ; 7').spec)).toBe('Schéma en barres');
	});
});

describe('schéma dans une colonne étroite (téléphone, case choix)', () => {
	const LIGNES = ['Tom : ? (3)', 'Léa : ? (3) ; 20 (1)', 'total : 220'];
	/** Corps du texte à l'écran (px) : le dessin est réduit à la colonne, jamais agrandi */
	function fontPx(spec: Parameters<typeof buildSchemaBarresScene>[0], columnPx: number) {
		const s = buildSchemaBarresScene(spec, {
			drawWidth: schemaBarresDrawWidth(spec, columnPx)
		});
		const shownPx = Math.min(s.width * SCHEMA_BARRES_PX_PER_UNIT, columnPx);
		return (SCHEMA_BARRES_FONT_SIZE * shownPx) / s.width;
	}

	it('la largeur de dessin demandée fixe la plus longue barre, le reste ne bouge pas', () => {
		const { spec, scene: large } = scene(...LIGNES);
		const court = buildSchemaBarresScene(spec, { drawWidth: 200 });
		const tom = court.rects[0];
		const lea = court.rects.slice(1, 3);
		expect(lea[0].width + lea[1].width).toBeCloseTo(200);
		expect(tom.width).toBeCloseTo(lea[0].width); // échelle commune gardée
		expect(court.width).toBeCloseTo(large.width - (SCHEMA_BARRES_DRAW_WIDTH - 200));
		expect(court.height).toBeCloseTo(large.height);
	});

	it('colonne large, ou largeur inconnue (rendu serveur) : barres de pleine longueur', () => {
		const { spec } = scene(...LIGNES);
		expect(schemaBarresDrawWidth(spec, 1100)).toBe(SCHEMA_BARRES_DRAW_WIDTH);
		expect(schemaBarresDrawWidth(spec, 0)).toBe(SCHEMA_BARRES_DRAW_WIDTH);
	});

	it('téléphone (258 px) : barres raccourcies, texte d’au moins 12 px', () => {
		const { spec } = scene(...LIGNES);
		expect(schemaBarresDrawWidth(spec, 258)).toBeLessThan(SCHEMA_BARRES_DRAW_WIDTH);
		expect(fontPx(spec, 258)).toBeGreaterThanOrEqual(SCHEMA_BARRES_MIN_FONT_PX - 0.01);
	});

	it('colonne très étroite : jamais sous la longueur minimale, chaque étiquette tient dans sa part', () => {
		const { spec } = scene('A : 1 234 (1) ; ? (3)', 'B : ? (4)');
		const drawWidth = schemaBarresDrawWidth(spec, 120);
		expect(drawWidth).toBeGreaterThanOrEqual(SCHEMA_BARRES_MIN_DRAW_WIDTH);
		const s = buildSchemaBarresScene(spec, { drawWidth });
		const part = s.rects[0];
		expect(part.width).toBeGreaterThanOrEqual('1 234'.length * 9);
	});
});
