/**
 * `.résoudre` sur une inéquation — suite du lot « résolution pas à pas ».
 *
 * ⚠️ **Le trou que ce lot comble est TOTAL.** Mesuré avant le lot : une
 * inéquation dans l'atelier ne rendait pas une erreur, pas un message — une
 * ligne entièrement vide. Le moteur n'a rien pour les inéquations, alors que
 * `pedagogical-solve` les traite aux trois paliers (linéaire, second degré,
 * rationnel).
 */

import { describe, it, expect } from 'vitest';
import { solveSteps } from '../solve-steps';

describe('inéquations du premier degré', () => {
	it('N1 : la ligne porte la forme résolue, pas le bloc de calcul', () => {
		const solved = solveSteps('2x+1<7');

		expect(solved).not.toBeNull();
		// ⚠️ La dernière étape d'une inéquation linéaire n'est PAS une étape de
		// conclusion : c'est la division, dont le LaTeX est un `\begin{aligned}`
		// de deux lignes. L'afficher comme « la réponse » mettrait un bloc de
		// calcul là où l'élève attend `x < 3`. La réponse se lit donc sur
		// l'arbre `after`, pas sur le rendu.
		expect(solved!.answer).toBe('x < 3');
	});

	it('N2 : le changement de sens est appliqué ET expliqué', () => {
		const solved = solveSteps('-2x>=6');

		expect(solved!.answer).toBe('x \\leqslant -3');
		const titres = solved!.steps.map((s) => s.title).join(' ');
		expect(titres).toContain('changement de sens');
	});
});

describe('inéquations du second degré et rationnelles', () => {
	it('N3 : un ensemble de solutions, pas une transformation', () => {
		const solved = solveSteps('x^2-4>=0');

		expect(solved).not.toBeNull();
		// Ici la dernière étape EST une conclusion : son rendu porte l'ensemble.
		expect(solved!.answer).toBe('S = ]-\\infty ; -2] \\cup [2 ; +\\infty[');
	});

	it('N4 : une inéquation sans solution le dit', () => {
		expect(solveSteps('x^2+1<0')!.answer).toBe('S = \\emptyset');
	});

	it('N5 : une inéquation rationnelle est traitée', () => {
		const solved = solveSteps('(x-1)/(x+2)>0');

		expect(solved).not.toBeNull();
		// ⚠️ `equationType` vaut ici `rational` — une troisième valeur que la
		// garde du lot précédent rejetait.
		expect(solved!.answer).toBe('S = ]-\\infty ; -2[ \\cup ]1 ; +\\infty[');
	});
});

describe('le tableau de signes', () => {
	/**
	 * ⚠️ **Le tableau de signes ne s'affiche NULLE PART dans l'application.**
	 * Les renderers le produisent en `\begin{array}{|c|ccc|}` avec des
	 * `\hline` — MathLive ne compose pas cet environnement, et aucun composant
	 * du dépôt ne sait le faire autrement. Mesuré : `quadratic-sign-table` et
	 * `rational-sign-table` rendent tous deux une boîte d'erreur.
	 *
	 * Trois issues étaient possibles : se replier (l'élève n'a plus RIEN, le
	 * moteur ne rendant rien non plus sur une inéquation) ; afficher la boîte
	 * cassée ; ou garder l'étape sans son LaTeX. C'est la troisième, parce que
	 * le titre et l'explication se suffisent — « On dresse le tableau de
	 * signes » + « le polynôme est du signe de a à l'extérieur des racines… ».
	 * Le raisonnement reste continu, et la réponse arrive.
	 */
	it('une inéquation du second degré à deux racines est traitée', () => {
		const solved = solveSteps('x^2-3x+2>0');

		expect(solved).not.toBeNull();
		expect(solved!.answer).toBe('S = ]-\\infty ; 1[ \\cup ]2 ; +\\infty[');
	});

	it('l’étape du tableau garde son titre et son explication, sans son LaTeX', () => {
		const solved = solveSteps('x^2-3x+2>0')!;
		const table = solved.steps.find((s) => s.rule === 'quadratic-sign-table');

		expect(table).toBeDefined();
		expect(table!.title).toContain('tableau de signes');
		expect(table!.explanation).toBeDefined();
		// ⚠️ C'est CE champ qui rendait une boîte d'erreur à l'écran.
		expect(table!.expressionLatex).toBeUndefined();
	});

	it('idem pour une inéquation rationnelle', () => {
		const solved = solveSteps('(x-1)/(x+2)>0')!;
		const table = solved.steps.find((s) => s.rule === 'rational-sign-table');

		expect(table).toBeDefined();
		expect(table!.title).toContain('tableau de signes');
		expect(table!.expressionLatex).toBeUndefined();
	});

	it('les autres étapes gardent le leur', () => {
		const solved = solveSteps('x^2-3x+2>0')!;
		const withLatex = solved.steps.filter((s) => s.expressionLatex !== undefined);

		// Seule l'étape du tableau est privée de son rendu.
		expect(withLatex.length).toBe(solved.steps.length - 1);
	});
});

describe('les cas où le module se trompe', () => {
	/**
	 * ⚠️ **`inequality-conclude-truth` annonce une contradiction dès qu'il
	 * n'arrive pas à évaluer la comparaison.** Mesuré :
	 *
	 *   `0x<5`  → « contradiction : S = ∅ »   alors que 0 < 5 est TOUJOURS vrai
	 *   `b*x<6` → « contradiction : S = ∅ »   alors qu'on ne peut pas conclure
	 *
	 * On ne lui fait donc confiance que lorsque les deux membres de sa
	 * conclusion sont des NOMBRES — le seul cas où sa comparaison est
	 * vérifiable. Le défaut lui-même est versé au lot mathAST.
	 */
	it('une conclusion « toujours vraie / jamais vraie » non vérifiable se replie', () => {
		expect(solveSteps('0x<5')).toBeNull();
		expect(solveSteps('b*x<6')).toBeNull();
	});

	it('on se replie sur TOUTES ses conclusions, même celles qui sont justes', () => {
		// `x<x` (→ 0 < 0, S = ∅) et `2<7` (→ S = ℝ) sont justes. On se replie
		// quand même, pour deux raisons :
		//   • on ne peut pas distinguer ses conclusions justes des fausses sans
		//     refaire son travail ;
		//   • là où il a raison, la réponse est dans le TITRE (« S = ℝ ») et non
		//     dans le LaTeX rendu, qui vaut `2 < 7` — la forme réduite, pas
		//     l'ensemble des solutions. La ligne n'aurait rien de juste à
		//     montrer, et fabriquer « S = ℝ » nous-mêmes serait inventer du
		//     contenu mathématique.
		// Ce sont des saisies dégénérées ; les vraies inéquations passent.
		expect(solveSteps('x<x')).toBeNull();
		expect(solveSteps('2<7')).toBeNull();
	});
});

describe('les replis des inéquations', () => {
	it('un degré 3 se replie', () => {
		expect(solveSteps('x^3-x>0')).toBeNull();
	});

	it('une inéquation non polynomiale se replie', () => {
		expect(solveSteps('sin(x)<0')).toBeNull();
	});
});
