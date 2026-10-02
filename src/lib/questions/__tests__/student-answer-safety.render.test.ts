/**
 * Réponse d'élève neutralisée, vérifiée sur la SORTIE réelle de MathLive
 * =====================================================================
 *
 * Audit de la PR #643 : `\style` (alias de `\htmlStyle`) et `\bbox` laissaient
 * passer du CSS (calque plein écran, image espion) chez le professeur. On rend
 * la réponse neutralisée avec MathLive et on vérifie l'absence de lien, d'URL, de
 * positionnement et d'attribut de données.
 */
import { describe, it, expect } from 'vitest';
import { convertLatexToMarkup } from 'mathlive/ssr';
import { neutralizeStudentLatex } from '../student-answer-safety';

const CHARGES = [
	String.raw`\style{position:fixed;top:0;left:0;width:100vw;height:100vh;background:url(https://evil.example/x.png)}{x}`,
	String.raw`\htmlStyle{position:fixed}{x}`,
	String.raw`\bbox[background:url(https://e.x/b);position:fixed]{x}`,
	String.raw`\textcolor{url(https://e.x)}{x}`,
	String.raw`\colorbox{url(https://e.x)}{x}`,
	String.raw`\href{https://evil.example}{clic}`,
	String.raw`\htmlData{onclick=alert(1)}{x}`,
	String.raw`\rule{999em}{999em}`,
	String.raw`\kern{-999em}x`,
	String.raw`\raisebox{-999em}{x}`
];

describe('réponse élève neutralisée rendue par MathLive', () => {
	it.each(CHARGES)('%s : ni lien, ni URL, ni positionnement, ni attribut', (charge) => {
		const html = convertLatexToMarkup(neutralizeStudentLatex(charge), { defaultMode: 'math' });
		expect(html).not.toMatch(/position\s*:/i);
		expect(html).not.toMatch(/url\(/i);
		expect(html).not.toMatch(/href/i);
		expect(html).not.toMatch(/<a[\s>]/i);
		expect(html).not.toMatch(/data-(?!ML)/);
		expect(html).not.toMatch(/999em/);
	});

	it('une réponse ordinaire reste rendue', () => {
		const html = convertLatexToMarkup(neutralizeStudentLatex(String.raw`\dfrac{3}{4}+0{,}5`), {
			defaultMode: 'math'
		});
		expect(html).toContain('3');
		expect(html).toContain('4');
	});
});
