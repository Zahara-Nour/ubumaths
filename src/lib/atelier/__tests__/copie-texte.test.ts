/**
 * Le texte lisible que copie le bouton « Copier » d'une ligne de Calcul.
 *
 * Phase 0 `docs/archive/wip/atelier-copier-phase0.md` : on convertit le LaTeX de la
 * ligne (propre partout), pas son texte (souvent la sortie du terminal), ni par
 * MathLive (`(1)/(2)`, `k m`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk, type Entry } from '../desk.svelte';
import { commandCatalog } from '../commands';
import { WebReplEngine } from '$lib/mathAST/cli/web/web-repl-engine';
import { answerToCopy, readableText } from '../copy-text';

// =============================================================================
// La conversion
// =============================================================================

describe('le LaTeX d’une réponse devient un texte lisible', () => {
	it.each([
		['\\dfrac{1}{2}', '1/2'],
		['2 \\sqrt{2}', '2√2'],
		['\\dfrac{\\pi}{3}', 'π/3'],
		['12{,}3~\\mathrm{km}', '12,3 km'],
		['2{,}5~\\mathrm{h} = 150~\\mathrm{min}', '2,5 h = 150 min'],
		['-\\dfrac{1}{4}', '−1/4'],
		['S = \\left\\{ 2 \\,;\\, 3 \\right\\}', 'S = {2 ; 3}'],
		['S = ]-\\infty ; -2[ \\cup ]2 ; +\\infty[', 'S = ]−∞ ; −2[ ∪ ]2 ; +∞['],
		['2 x \\sin\\left( x \\right) + x^2 \\cos\\left( x \\right)', '2x sin(x) + x² cos(x)'],
		['2 x^2 + 5 x - 3', '2x² + 5x − 3'],
		['\\left( x - 2 \\right) \\left( x + 2 \\right)', '(x − 2)(x + 2)'],
		['D = [1 ; +\\infty[', 'D = [1 ; +∞['],
		[
			'\\lim\\limits_{x\\to +\\infty} \\left( 1 + \\dfrac{1}{x} \\right)^x = \\exponentialE',
			'lim x→+∞ (1 + 1/x)ˣ = e'
		],
		[
			'f^{-1}\\left( x \\right) = \\dfrac{x - 3}{2},\\quad f^{-1} : \\mathbb{R} \\to \\mathbb{R}',
			'f⁻¹(x) = (x − 3)/2, f⁻¹ : ℝ → ℝ'
		],
		["f'(x) = 2 x - 3", 'f′(x) = 2x − 3'],
		['2 \\imaginaryI', '2i'],
		['\\approx 2{,}8284', '≈ 2,8284'],
		['\\exponentialE^{2 x}', 'e²ˣ'],
		['\\exponentialE^{-x}', 'e⁻ˣ'],
		['\\dfrac{x^2 - 1}{x - 1}', '(x² − 1)/(x − 1)'],
		['x^{\\frac{1}{2}}', 'x^(1/2)'],
		['\\sqrt{x + 1}', '√(x + 1)'],
		['3 \\times 10^{20}', '3 × 10²⁰'],
		['u_{n+1} = 2 u_{n}', 'uₙ₊₁ = 2uₙ'],
		['P(X \\leq 3) \\approx 0{,}6496', 'P(X ≤ 3) ≈ 0,6496'],
		['\\ln\\left( x \\right)', 'ln(x)'],
		['\\left| x - 1 \\right|', '|x − 1|'],
		['\\dfrac{1}{3} x^3 + C', '(1/3)x³ + C'],
		['x = -2 \\text{ ou } x = 2', 'x = −2 ou x = 2'],
		// Revue : un dénominateur produit, une racine ambiguë (sorties réelles)
		['\\dfrac{1}{2 \\sqrt{x}}', '1/(2√x)'],
		['\\dfrac{-2}{4 x^2}', '−2/(4x²)'],
		['-\\dfrac{3}{2 x^3}', '−3/(2x³)'],
		['\\sqrt{x} + \\dfrac{x}{2 \\sqrt{x}}', '√x + x/(2√x)'],
		["f'(x) = -\\dfrac{1}{2 \\sqrt{x}^3}", 'f′(x) = −1/(2(√x)³)'],
		['x^2 + 2 \\sqrt{2} x + 2', 'x² + 2√2·x + 2'],
		['\\sqrt{2 x}', '√(2x)'],
		['\\sqrt{x}^2', '(√x)²'],
		['\\sqrt{x^2}', '√(x²)'],
		['\\dfrac{1}{x^2}', '1/x²'],
		['\\dfrac{1}{\\sqrt{x}}', '1/√x']
	])('%s → %s', (latex, text) => {
		expect(readableText(latex)).toBe(text);
	});

	it.each(['\\begin{array}{c} x \\end{array}', '\\htmlStyle{color:red}{x}', '\\frac{1}'])(
		'ce qu’elle ne sait pas écrire : null (le LaTeX sera copié) — %s',
		(latex) => {
			expect(readableText(latex)).toBeNull();
		}
	);
});

// =============================================================================
// Ce que copie une ligne
// =============================================================================

function lineOf(input: string): Entry {
	const desk = new CalcDesk(new Atelier(), new WebReplEngine());
	desk.submit(input);
	const entry = desk.entries.at(-1);
	if (entry === undefined) throw new Error(`aucune ligne pour ${input}`);
	return entry;
}

describe('ce que copie une ligne : la réponse seule', () => {
	it('le texte lisible, et le LaTeX pour le menu', () => {
		expect(answerToCopy(lineOf('.développer (2x-1)(x+3)'), false)).toEqual({
			text: '2x² + 5x − 3',
			latex: '2 x^2 + 5 x - 3'
		});
	});

	it('pas la trace du moteur : .résoudre copie S = {2 ; 3}', () => {
		expect(answerToCopy(lineOf('.résoudre x^2-5x+6=0'), false)?.text).toBe('S = {2 ; 3}');
	});

	it('la valeur approchée quand le bouton ≈ a basculé ; le « = » de tête tombe', () => {
		expect(answerToCopy(lineOf('1/3+1/6'), true)?.text).toBe('0,5');
		expect(answerToCopy(lineOf('1/7'), true)?.text).toBe('≈ 0,1429');
	});

	it('une ligne sans formule (.stats) : son texte, sans LaTeX', () => {
		const desk = new CalcDesk(new Atelier(), new WebReplEngine());
		desk.submit('L = 1;2;3;4');
		desk.submit('.stats L');
		const copied = answerToCopy(desk.entries.at(-1)!, false);

		expect(copied?.text).toContain('Moyenne = 2,5');
		expect(copied?.latex).toBeUndefined();
	});

	it('rien sur un refus, ni sur une définition', () => {
		expect(answerToCopy(lineOf('.résoudre'), false)).toBeNull();
		expect(answerToCopy(lineOf('f(x) = x^2'), false)).toBeNull();
	});

	it('l’exemple de chaque commande du catalogue se copie en texte, sans repli LaTeX', () => {
		const engine = new WebReplEngine();
		const examples = commandCatalog(engine).flatMap((c) => c.example ?? []);
		const unreadable = examples.flatMap((example) => {
			const desk = new CalcDesk(new Atelier(), new WebReplEngine());
			for (const [name, definition] of [
				['L', '1;2;3;4;5;6'],
				['M', '1/6;1/6;1/6;1/6;1/6;1/6']
			]) {
				desk.atelier.create({ kind: 'list', name, definition });
			}
			desk.submit(example);
			const entry = desk.entries.at(-1);
			if (entry?.latex === undefined || entry.failed) return [];
			return readableText(entry.latex) === null ? [`${example} : ${entry.latex}`] : [];
		});
		expect(examples.length).toBeGreaterThan(20);
		expect(unreadable).toEqual([]);
	});
});
