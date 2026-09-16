/**
 * Atelier — la résolution pas à pas
 *
 * Spécification : `docs/wip/atelier-resolution-etapes-phase0.md`.
 *
 * ⚠️ Ce que ces tests gardent avant tout : **le repli**. Quand `pedagogical-solve`
 * ne sait pas traiter l'équation, l'élève doit garder la réponse qu'il avait,
 * jamais un message d'échec. Un repli qui ne se déclenche pas fait disparaître
 * la réponse — c'est la seule façon dont ce lot peut rendre l'atelier pire.
 */

import { describe, expect, it } from 'vitest';
import { solveSteps, answerOf } from '../solve-steps';

describe('solveSteps — cas nominaux', () => {
	it('N1 : une équation du premier degré rend ses étapes, en français accentué', () => {
		const steps = solveSteps('3x+5=14');

		expect(steps).not.toBeNull();
		expect(steps!.length).toBe(4);
		expect(steps![0].title).toBe('Équation du premier degré');
		expect(steps![steps!.length - 1].title).toBe('Solution : x = 3');
	});

	it('N1 bis : chaque étape porte son explication (verbosité détaillée)', () => {
		const steps = solveSteps('3x+5=14');

		// Les étapes de transformation expliquent ce qu'on fait et pourquoi.
		const withExplanation = steps!.filter((s) => s.explanation !== undefined);
		expect(withExplanation.length).toBe(steps!.length);
	});

	it('N2 : une équation du second degré rend de vraies mathématiques', () => {
		const steps = solveSteps('x^2-3x+1=0');

		expect(steps).not.toBeNull();
		expect(steps![0].title).toBe('Équation du second degré');

		const latex = steps!.map((s) => s.expressionLatex ?? '').join(' ');
		// ⚠️ Le formateur de terminal écrivait « sqrt(5) » et « 3/2+{1/2}sqrt(5) ».
		// C'est précisément ce que ce lot fait disparaître.
		expect(latex).not.toContain('sqrt(');
		expect(latex).toContain('\\sqrt{5}');
	});

	it('N3 : une équation sans solution réelle le dit', () => {
		const steps = solveSteps('x^2+1=0');

		expect(steps).not.toBeNull();
		const last = steps![steps!.length - 1];
		expect(last.title).toBe('Pas de solution réelle');
		expect(last.expressionLatex).toBe('S = \\emptyset');
	});
});

describe('solveSteps — le renderer suit le degré', () => {
	/**
	 * ⚠️ **Le mauvais renderer ne lève AUCUNE erreur : il ment.** Mesuré — une
	 * équation du premier degré rendue par `QuadraticEquationRenderer` s'annonce
	 * « Équation du second degré », et son étape 2 affiche l'équation de départ
	 * au lieu de la soustraction. Sans ce test, l'inversion passerait la CI.
	 */
	it('une équation du premier degré n’est jamais titrée « second degré »', () => {
		const titles = solveSteps('2x-7=3x+1')!.map((s) => s.title);
		expect(titles).not.toContain('Équation du second degré');
		expect(titles[0]).toBe('Équation du premier degré');
	});

	it('une équation du second degré n’est jamais titrée « premier degré »', () => {
		const titles = solveSteps('x^2=4')!.map((s) => s.title);
		expect(titles).not.toContain('Équation du premier degré');
		expect(titles[0]).toBe('Équation du second degré');
	});
});

describe('solveSteps — les replis', () => {
	it('L1 : un degré 3 se replie', () => {
		expect(solveSteps('x^3-x=0')).toBeNull();
	});

	it('L2 : une équation non polynomiale se replie', () => {
		expect(solveSteps('sin(x)=0')).toBeNull();
	});

	it('L3 : une équation à paramètre se replie', () => {
		// Le cas que l'atelier rencontre tout le temps (`k(x) = bx`) : mathAST
		// jette une `Error` nue, « cannot detect a single variable ».
		expect(solveSteps('b*x+5=14')).toBeNull();
	});

	it('L5 : une liste d’étapes qui ne conclut pas se replie', () => {
		// Mesuré : `0x=5` rend UNE étape (« Équation du premier degré ») et
		// `x=x` s'arrête sur « On soustrait x aux deux membres ». Montrer ça à
		// l'élève serait pire que la sortie actuelle, qui conclut.
		expect(solveSteps('0x=5')).toBeNull();
		expect(solveSteps('x=x')).toBeNull();
	});

	it('E1 : une entrée illisible se replie au lieu de jeter', () => {
		expect(solveSteps('n’importe quoi')).toBeNull();
		expect(solveSteps('')).toBeNull();
	});

	it('E2 : ce qui n’est pas une équation se replie', () => {
		// `x^2-4` n'a pas de signe égal : ce n'est pas une relation.
		expect(solveSteps('x^2-4')).toBeNull();
	});
});

describe('answerOf — la réponse que garde la ligne', () => {
	/**
	 * La ligne d'historique montre la réponse ; les étapes se déplient sous elle
	 * (décision Q1). La réponse est lue sur la DERNIÈRE ÉTAPE, jamais dans la
	 * sortie texte du moteur — c'est la règle de `render.ts`, mesures à l'appui.
	 */
	it('rend la solution d’une équation du premier degré', () => {
		expect(answerOf(solveSteps('3x+5=14')!)).toBe('x = 3');
	});

	it('rend l’ensemble des solutions d’une équation du second degré', () => {
		expect(answerOf(solveSteps('x^2=4')!)).toBe('S = \\left\\{ -2 \\,;\\, 2 \\right\\}');
	});

	it('rend l’ensemble vide quand il n’y a pas de solution réelle', () => {
		expect(answerOf(solveSteps('x^2+1=0')!)).toBe('S = \\emptyset');
	});
});
