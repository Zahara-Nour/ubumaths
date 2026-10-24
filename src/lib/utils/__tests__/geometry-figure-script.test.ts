/**
 * Exécution du script d'une figure stockée : jamais d'exception, une erreur
 * porte sa ligne, et le flocon de Koch (la première figure publique prévue)
 * tient dans le budget.
 */
import { describe, it, expect } from 'vitest';
import { evaluateFigureScript, evaluateStoredFigure } from '../geometry-figure-script';
import { buildKochDsl } from '$lib/components/geometry/koch-dsl';

describe('evaluateFigureScript', () => {
	it('un script correct rend la figure', () => {
		const result = evaluateFigureScript('A = point(0, 0)\nB = point(3, 0)\ns = segment(A, B)');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.figure.getAllElements().length).toBeGreaterThanOrEqual(3);
	});

	it('une erreur rend son numéro de ligne, sans lever', () => {
		const result = evaluateFigureScript('A = point(0, 0)\nB = inconnue(1)');
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.line).toBe(2);
			expect(result.message).toMatch(/^Ligne 2/);
		}
	});

	it('une erreur de syntaxe rend aussi sa ligne', () => {
		const result = evaluateFigureScript('A = point(0, 0)\n\nB = point(1,');
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.line).toBe(3);
	});

	it('des boucles imbriquées démesurées sont arrêtées par le budget', () => {
		const result = evaluateFigureScript(
			'pour i de 1 a 1000:\n    pour j de 1 a 1000:\n        pour k de 1 a 1000:\n            x = 1'
		);
		expect(result.ok).toBe(false);
		if (!result.ok) expect(result.message).toMatch(/budget/i);
	});

	it('le flocon de Koch (4 étapes) tient dans le budget', () => {
		const script = buildKochDsl(4);
		expect(script.length).toBeGreaterThan(70_000);
		expect(evaluateFigureScript(script).ok).toBe(true);
	});
});

describe('evaluateStoredFigure (en-tête + script)', () => {
	it('script nu : figure, sans réglages (affichage historique)', () => {
		const result = evaluateStoredFigure('A = point(0, 0)');
		expect(result.ok).toBe(true);
		if (result.ok) expect(result.display).toBeNull();
	});

	it('script nu en erreur : même message qu’avant', () => {
		const text = 'A = point(0, 0)\nB = inconnue(1)';
		expect(evaluateStoredFigure(text)).toEqual(evaluateFigureScript(text));
	});

	it('en-tête lu : fenêtre, taille, déplaçable, rendu', () => {
		const result = evaluateStoredFigure(
			'fenetre: 0 ; 4 ; 0 ; 3\ntaille: grande\ndeplacable: oui\nrendu: croquis\n---\nA = point(1, 1)'
		);
		expect(result.ok).toBe(true);
		if (!result.ok || !result.display) throw new Error('réglages attendus');
		expect(result.display.header.window).toEqual({ xMin: 0, xMax: 4, yMin: 0, yMax: 3 });
		expect(result.display.header.size).toBe('grande');
		expect(result.display.settings).toEqual({ draggable: true, renderMode: 'rough' });
	});

	it('en-tête sans réglages interactifs : non déplaçable, rendu normal', () => {
		const result = evaluateStoredFigure('taille: petite\n---\nA = point(1, 1)');
		if (!result.ok || !result.display) throw new Error('réglages attendus');
		expect(result.display.settings).toEqual({ draggable: false, renderMode: 'normal' });
	});

	it('erreur d’en-tête : refus avec sa ligne, le script n’est pas exécuté', () => {
		const result = evaluateStoredFigure('taille: petite\nfenetre: 4 ; 0 ; 0 ; 3\n---\nA = point(');
		expect(result).toEqual({
			ok: false,
			message: 'Ligne 2 : fenêtre (x) : la première borne doit être inférieure à la seconde',
			line: 2
		});
	});

	it('erreur de script : ligne comptée depuis le début du texte', () => {
		const result = evaluateStoredFigure(
			'taille: petite\naxes: oui\n---\nA = point(0, 0)\nB = inconnue(1)'
		);
		expect(result.ok).toBe(false);
		if (!result.ok) {
			expect(result.line).toBe(5);
			expect(result.message).toMatch(/^Ligne 5 : /);
		}
	});
});
