/**
 * Bloc ```figure — défauts écran / PDF corrigés le 2026-10-03 (branche fix/figures-pdf)
 *
 * 1. `forme="croix"` (et cercle, carré) : l'écran dessinait toujours un rond plein.
 * 2. PDF : un objet qui dépasse de la `fenetre:` sortait du cadre (écran : découpé).
 * 3. `texte(…, "n⃗")` (flèche combinante U+20D7) : deux carrés vides au PDF.
 * 5. Nom de point `Ω` refusé par le DSL.
 * Spécification : `docs/archive/wip/figures-pdf-progress.md`.
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { figureToSvg } from '../../utils/figure-svg';
import { generateFigureTypst } from '../../generators/figure-typst';

function sceneOf(source: string) {
	const node = parseFigureContent(source);
	expect(node.errors).toEqual([]);
	const result = buildFigureScene(node);
	expect(result.errors).toEqual([]);
	return { node, scene: result.scene! };
}

/** `box(… clip: true …)` du PDF, parenthèses équilibrées (chaînes sans parenthèse ici) */
function clippedPart(typst: string): string {
	const start = typst.lastIndexOf('box(', typst.indexOf('clip: true'));
	expect(start).toBeGreaterThan(-1);
	let depth = 0;
	for (let i = start + 3; i < typst.length; i++) {
		if (typst[i] === '(') depth++;
		else if (typst[i] === ')' && --depth === 0) return typst.slice(start, i + 1);
	}
	throw new Error('boîte découpée non fermée');
}

describe('1. forme des points à l’écran (alignée sur le PDF)', () => {
	const FORMES = [
		['point', 'dot'],
		['croix', 'cross'],
		['cercle', 'circle'],
		['carre', 'square']
	] as const;

	it.each(FORMES)('`forme="%s"` → forme `%s` à l’écran', (forme, shape) => {
		const { scene } = sceneOf(
			`fenetre: 0 ; 4 ; 0 ; 3\n---\nA = point(1, 1)\nmontre(A, forme="${forme}")`
		);
		const dots = figureToSvg(scene, 'moyenne').shapes.filter((s) => s.kind === 'dot');
		expect(dots).toHaveLength(1);
		expect(dots[0]).toMatchObject({ shape });
	});

	it('forme inconnue → erreur située (rond à l’écran, rien au PDF auparavant)', () => {
		const node = parseFigureContent(
			`fenetre: 0 ; 4 ; 0 ; 3\n---\nA = point(1, 1)\nmontre(A, forme="triangle")`
		);
		const result = buildFigureScene(node);
		expect(result.scene).toBeNull();
		expect(result.errors[0].message).toMatch(/forme/);
	});

	it('PDF inchangé : croix = deux traits', () => {
		const { node } = sceneOf(
			`fenetre: 0 ; 4 ; 0 ; 3\n---\nA = point(1, 1)\nmontre(A, forme="croix")`
		);
		const typst = generateFigureTypst(node);
		const point = typst.slice(typst.indexOf('// element pt_'));
		expect(point.match(/^\s+line\(/gm)?.length).toBeGreaterThanOrEqual(2);
	});
});

describe('2. PDF : objets découpés à la fenêtre', () => {
	const DEBORD = `fenetre: -3 ; 3 ; -2 ; 2
axes: oui
grille: oui
---
B = point(-1, 0)
c = cercle(B, rayon=2.5)
P = point(-4, -1.5)
Q = point(2, 1.8)
s = segment(P, Q)
texte(2, -1, "u")`;

	it('cercle et segment dans une boîte découpée aux dimensions de la fenêtre', () => {
		const { node } = sceneOf(DEBORD);
		const typst = generateFigureTypst(node);
		const clipped = clippedPart(typst);
		expect(clipped).toMatch(/circle\(\(-1, 0\), radius: 2\.5/);
		expect(clipped).toMatch(/line\(\(-4, -1\.5\), \(2, 1\.8\)/);
		// moyenne : 6,5 cm de large, 6,5 × 4 / 6 cm de haut
		expect(typst).toMatch(/box\(width: 6\.5cm, height: 4\.333cm, clip: true/);
	});

	it('repère, noms de points et textes HORS de la boîte (jamais coupés)', () => {
		const { node } = sceneOf(DEBORD);
		const typst = generateFigureTypst(node);
		const clipped = clippedPart(typst);
		expect(clipped).not.toContain('// axes');
		expect(clipped).not.toContain('// graduations');
		expect(clipped).not.toContain('"italic"');
		expect(clipped).not.toContain('"u"');
		expect(typst).toContain('"u"');
		expect(typst).toContain('text(style: "italic", "B")');
	});

	it('nom d’un point HORS de la fenêtre : omis (l’écran le découpe)', () => {
		const { node } = sceneOf(DEBORD);
		const typst = generateFigureTypst(node);
		expect(typst).not.toContain('text(style: "italic", "P")');
		expect(typst).toContain('text(style: "italic", "Q")');
	});

	it('sans repère aussi (l’écran découpe toujours à la fenêtre)', () => {
		const { node } = sceneOf(
			`fenetre: -3 ; 3 ; -2 ; 2\n---\nB = point(-1, 0)\nc = cercle(B, rayon=2.5)`
		);
		expect(clippedPart(generateFigureTypst(node))).toContain('circle(');
	});

	it('mêmes objets annotés que l’écran (`// element <id>`)', () => {
		const { node, scene } = sceneOf(DEBORD);
		const typst = generateFigureTypst(node);
		const pdf = new Set([...typst.matchAll(/\/\/ element (\S+)/g)].map((m) => m[1]));
		const screen = new Set(figureToSvg(scene, 'moyenne').shapes.map((s) => s.elementId));
		expect(pdf).toEqual(screen);
	});
});

describe('3. texte avec flèche combinante', () => {
	it('`n⃗` → vecteur en mode math au PDF (`arrow(n)`), plus de caractère combinant', () => {
		const { node } = sceneOf(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "n⃗")`);
		const typst = generateFigureTypst(node);
		expect(typst).toContain('$arrow(n)$');
		expect(typst).not.toContain('⃗');
	});

	it('texte mixte : `u⃗ et AB` → texte + vecteur + texte', () => {
		const { node } = sceneOf(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "vecteur u⃗ ici")`);
		const typst = generateFigureTypst(node);
		expect(typst).toContain('[#"vecteur "$arrow(u)$#" ici"]');
	});

	it('texte sans caractère combinant : chaîne inchangée', () => {
		const { node } = sceneOf(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "a $ b")`);
		expect(generateFigureTypst(node)).toContain('"a $ b"');
	});

	it('écran : texte découpé en morceaux, la lettre accentuée à part (police sans flèche combinante)', () => {
		const { scene } = sceneOf(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "vecteur n⃗")`);
		const label = figureToSvg(scene, 'moyenne').shapes.find((s) => s.kind === 'label');
		expect(label).toMatchObject({
			text: 'vecteur n⃗',
			runs: [
				{ kind: 'text', text: 'vecteur ' },
				{ kind: 'accent', base: 'n', accent: 'arrow' }
			]
		});
	});

	it('écran : texte sans accent combinant, pas de morceaux', () => {
		const { scene } = sceneOf(`fenetre: 0 ; 4 ; 0 ; 3\n---\ntexte(2, 1, "AB")`);
		const label = figureToSvg(scene, 'moyenne').shapes.find((s) => s.kind === 'label');
		expect(label).not.toHaveProperty('runs');
	});
});

describe('5. nom de point grec', () => {
	it('`Ω = point(0, 1)` : figure dessinée, nom « Ω » à l’écran et au PDF', () => {
		const { node, scene } = sceneOf(
			`fenetre: -2 ; 2 ; -1 ; 2\n---\nΩ = point(0, 1)\nc = cercle(Ω, rayon=1)`
		);
		const label = figureToSvg(scene, 'moyenne').shapes.find((s) => s.kind === 'label');
		expect(label).toMatchObject({ text: 'Ω', italic: true });
		expect(generateFigureTypst(node)).toContain('text(style: "italic", "Ω")');
	});
});
