/**
 * Les étapes de résolution sont-elles AFFICHABLES ?
 *
 * ⚠️ Ce test tourne dans un vrai Chromium, et c'est la raison d'être du
 * suffixe. Les renderers de `pedagogical-solve` produisent du
 * `\begin{aligned}…\end{aligned}` et du `\textcolor{blue}{…}` — deux
 * constructions qu'aucun test serveur ne peut valider, puisque c'est MathLive
 * qui les rend. « Calculé juste » n'a jamais voulu dire « visible ».
 *
 * ⚠️ **Et surtout : la longueur du markup ne prouve RIEN.** Mesuré —
 * `convertLatexToMarkup('')` rend déjà 79 caractères, et `\pasunecommande{3}`
 * en rend 279. MathLive n'échoue pas, il compose une boîte d'erreur. Le seul
 * signal exploitable est la classe `ML__error` qu'il pose dessus.
 */

import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive';
import { solveSteps, answerOf } from '../solve-steps';

/** Le marqueur que MathLive pose sur ce qu'il n'a pas su composer. */
const ERROR_MARKER = 'ML__error';

function markupOf(latex: string): string {
	return convertLatexToMarkup(latex, { defaultMode: 'inline-math' });
}

describe('le marqueur d’erreur de MathLive', () => {
	// Sans ce test, les trois suivants pourraient passer sur n'importe quoi.
	it('apparaît sur une commande que MathLive ne connaît pas', () => {
		expect(markupOf('\\pasunecommande{3}')).toContain(ERROR_MARKER);
		expect(markupOf('\\begin{inconnu} x \\end{inconnu}')).toContain(ERROR_MARKER);
	});

	it('n’apparaît pas sur ce que les renderers produisent vraiment', () => {
		expect(markupOf('\\begin{aligned} 3x &= 9 \\\\ x &= 3 \\end{aligned}')).not.toContain(
			ERROR_MARKER
		);
		expect(markupOf('3x + 5 \\textcolor{blue}{- 5} = 14')).not.toContain(ERROR_MARKER);
	});
});

describe('chaque étape se compose sans erreur', () => {
	it('premier degré : les blocs alignés et colorés passent', () => {
		const steps = solveSteps('3x+5=14')!;

		// L'étape 2 porte un `\begin{aligned}` ET un `\textcolor{blue}` : si ce
		// décor disparaissait, le test ne garderait plus rien.
		const decorated = steps.filter((s) => {
			const latex = s.expressionLatex ?? '';
			return latex.includes('\\begin{aligned}') && latex.includes('\\textcolor');
		});
		expect(decorated.length).toBeGreaterThan(0);

		for (const step of steps) {
			if (step.expressionLatex === undefined) continue;
			expect(markupOf(step.expressionLatex)).not.toContain(ERROR_MARKER);
		}
	});

	it('second degré : discriminant, radicaux et ensemble de solutions passent', () => {
		const steps = solveSteps('x^2-3x+1=0')!;

		const latex = steps.map((s) => s.expressionLatex ?? '').join(' ');
		expect(latex).toContain('\\Delta');
		expect(latex).toContain('\\sqrt{5}');

		for (const step of steps) {
			if (step.expressionLatex === undefined) continue;
			expect(markupOf(step.expressionLatex)).not.toContain(ERROR_MARKER);
		}
	});

	it('la réponse que porte la ligne se compose aussi', () => {
		for (const equation of ['3x+5=14', 'x^2=4', 'x^2+1=0']) {
			// ⚠️ On appelle `answerOf`, on ne le réimplémente pas : un test qui
			// refait le calcul de la fonction qu'il prétend garder reste vert
			// quand cette fonction change, pendant que la ligne affiche
			// autre chose.
			expect(markupOf(answerOf(solveSteps(equation)!))).not.toContain(ERROR_MARKER);
		}
	});
});
