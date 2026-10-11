/**
 * Bloc ```figure — scène (interprétation sans affichage du DSL de geometry-core)
 *
 * Comportements validés le 2026-10-01 : 12 (triangle + `{{c}}`), 13 (liste
 * blanche), 14 (erreur DSL située).
 */
import { describe, it, expect } from 'vitest';
import { parseFigureContent } from '../../parser/figure-parser';
import { buildFigureScene } from '../../utils/figure-scene';
import { resolveMarkdownContent } from '$lib/questions/generator/content-resolver';
import { templateMarkdown } from '$lib/ubumark';

function scene(body: string, header = 'fenetre: -1 ; 8 ; -1 ; 6') {
	return buildFigureScene(parseFigureContent(`${header}\n---\n${body}`));
}

describe('figure — comportement 12 : un script de triangle donne une figure', () => {
	it('triangle rectangle avec codage', () => {
		const result = scene(
			'A = point(0, 0)\nB = point(5, 0)\nC = point(0, 4)\np = polygone(A, B, C)\nangle(B, A, C, marque="carre")'
		);
		expect(result.errors).toEqual([]);
		const types = result.scene!.elements.map((e) => e.type);
		expect(types.filter((t) => t === 'freePoint')).toHaveLength(3);
		expect(types).toContain('polygon');
		expect(types).toContain('angle');
		expect(result.scene!.viewport).toEqual({ xMin: -1, xMax: 8, yMin: -1, yMax: 6 });
	});

	it('`{{c}}` et `{{b}}` remplacés par le vrai `resolveMarkdownContent`', () => {
		const resolved = String(
			resolveMarkdownContent(
				templateMarkdown(
					'```figure\nfenetre: -1 ; 8 ; -1 ; 6\n---\nA = point(0;0)\nB = point({{c}};0)\nC = point(0;{{b}})\np = polygone(A, B, C)\n```'
				),
				[
					{ name: 'c', value: '5' },
					{ name: 'b', value: '2.5' }
				]
			)
		);
		const body = resolved.split('\n').slice(1, -1).join('\n');
		const result = buildFigureScene(parseFigureContent(body));
		expect(result.errors).toEqual([]);
		const B = result.scene!.elements.find((e) => e.label === 'B')!;
		const C = result.scene!.elements.find((e) => e.label === 'C')!;
		expect(result.scene!.positions.get(B.id)).toEqual({ x: 5, y: 0 });
		expect(result.scene!.positions.get(C.id)).toEqual({ x: 0, y: 2.5 });
	});

	it('`;` accepté comme séparateur d’arguments (usage français), pas dans une chaîne', () => {
		const result = scene('A = point(1;2)\ntexte(1, 1, "a ; b")');
		expect(result.errors).toEqual([]);
		const text = result.scene!.elements.find((e) => e.type === 'text')!;
		expect(result.scene!.figure.resolveTemplate(text.id)).toBe('a ; b');
	});

	it('décimal français `2{,}5` (valeur affichée d’une variable) lu 2.5', () => {
		const result = scene('A = point(2{,}5, 1)');
		expect(result.errors).toEqual([]);
		const A = result.scene!.elements.find((e) => e.label === 'A')!;
		expect(result.scene!.positions.get(A.id)).toEqual({ x: 2.5, y: 1 });
	});

	it('types de la liste blanche : segment, droite, demi-droite, vecteur, cercle, arc, codage, texte', () => {
		const result = scene(
			[
				'A = point(0, 0)',
				'B = point(4, 0)',
				'C = point(0, 3)',
				's = segment(A, B)',
				'd = droite(A, C)',
				'r = demidroite(B, C)',
				'v = vecteur(A, B)',
				'c = cercle(A, rayon=2)',
				'a = arc(B, A, C)',
				'm = marque_segment(A, B, 2)',
				'I = milieu(A, B)',
				'texte(1, 1, "AB = 4 cm")'
			].join('\n')
		);
		expect(result.errors).toEqual([]);
		const types = new Set<string>(result.scene!.elements.map((e) => e.type));
		for (const t of [
			'segment',
			'line',
			'ray',
			'vectorByPoints',
			'circleByRadius',
			'arcByPoints',
			'segmentMark',
			'midpoint',
			'text'
		]) {
			expect(types.has(t), t).toBe(true);
		}
	});

	it('aria-label automatique quand la description manque', () => {
		const result = scene('A = point(0, 0)\nB = point(4, 0)\ns = segment(A, B)');
		expect(result.scene!.ariaLabel).toMatch(/Figure/);
		expect(result.scene!.ariaLabel).toMatch(/A/);
	});

	it('point hors fenêtre → avertissement pour le prof', () => {
		const result = scene('A = point(50, 0)');
		expect(result.errors).toEqual([]);
		expect(result.warnings[0].message).toMatch(/A.*hors/);
	});
});

describe('figure — comportement 13 : hors liste blanche → erreur située', () => {
	it.each([
		['courbe("y = x^2")', /courbe/i],
		['image("https://exemple.fr/a.png", 0, 0)', /image/i],
		['s = slider(0, 10)', /curseur/i],
		['curseur(0, 10)', /curseur/i],
		['aire("x^2", 0, 1)', /aire/i],
		['lieu(A, A)', /lieu/i],
		['secteur(A, rayon=1, debut=0, fin=90)', /secteur/i],
		['mtexte(1, 1, "x^2")', /texte/i]
	])('%s', (call, pattern) => {
		const result = scene(`A = point(0, 0)\n${call}`);
		expect(result.scene).toBeNull();
		expect(result.errors).toHaveLength(1);
		expect(result.errors[0].message).toMatch(pattern);
		// Ligne 2 du script = ligne 4 du bloc (fenêtre, ---, A)
		expect(result.errors[0].line).toBe(4);
	});

	it('appel refusé caché dans une boucle ou une macro : situé quand même', () => {
		const result = scene('pour i de 1 a 2:\n    courbe("y = x")');
		expect(result.errors[0].line).toBe(4);
	});

	it('animation (`@pause`, `@instruction`) refusée, située', () => {
		const result = scene('A = point(0, 0)\n@pause');
		expect(result.errors[0].message).toMatch(/animation/i);
		expect(result.errors[0].line).toBe(4);
	});
});

describe('figure — comportement 14 : erreur DSL → message et ligne pour le prof', () => {
	it('erreur d’exécution : résumé (`summary`) et ligne du BLOC', () => {
		const result = scene('A = point(0, 0)\nc = cercle(A, 2)');
		expect(result.scene).toBeNull();
		expect(result.errors[0].line).toBe(4);
		expect(result.errors[0].message).toMatch(
			/^Ligne 4 : `cercle\(\)` ne peut pas être appelé avec 2 arguments/
		);
		// Le message ne répète pas « Ligne 2 » (ligne du script, fausse pour l'auteur)
		expect(result.errors[0].message).not.toMatch(/Ligne 2/);
	});

	it('erreur de syntaxe : ligne du bloc', () => {
		const result = scene('A = point(0, 0)\nB = point(1, ');
		expect(result.scene).toBeNull();
		expect(result.errors[0].line).toBeGreaterThanOrEqual(4);
	});

	it('erreur d’en-tête : pas d’interprétation', () => {
		const result = buildFigureScene(parseFigureContent('---\nA = point(0, 0)'));
		expect(result.scene).toBeNull();
		expect(result.errors[0].message).toMatch(/fen[eê]tre/i);
	});
});
