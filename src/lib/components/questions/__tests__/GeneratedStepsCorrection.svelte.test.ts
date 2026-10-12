/**
 * V25 : titres et explications des étapes pédagogiques portent leurs formules
 * entre `$…$`. `GeneratedStepsCorrection` les rend en maths (`<math-span>`,
 * via `InlineMarkdown`) : plus de LaTeX brut affiché en texte.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import GeneratedStepsCorrection from '../GeneratedStepsCorrection.svelte';
import type { RenderedStep } from '$lib/mathAST/common/step-renderer-base';

const steps: RenderedStep[] = [
	{
		id: 1,
		rule: 'choose-u-dv',
		title: 'Choix : $u = 2 x$, $dv = \\exponentialE^{3 x}$',
		explanation: "On pose $u = 2 x$, d'où $v = \\dfrac{1}{3} \\exponentialE^{3 x}$.",
		expressionLatex: '\\int 2 x \\exponentialE^{3 x}\\,dx'
	}
];

/** Le texte visible d'un élément, formules retirées */
function proseOf(el: Element): string {
	const clone = el.cloneNode(true) as Element;
	for (const math of clone.querySelectorAll('math-span')) math.remove();
	return clone.textContent ?? '';
}

/** Le LaTeX des formules rendues dans un élément, dans l'ordre */
function formulasOf(el: Element): string[] {
	return [...el.querySelectorAll('math-span')].map((m) => m.textContent ?? '');
}

describe('GeneratedStepsCorrection — les maths de la prose', () => {
	it('l’explication est rendue en maths, sans LaTeX visible', async () => {
		const screen = await render(GeneratedStepsCorrection, { props: { steps } });
		const explanation = screen.container.querySelector('.step-explanation');
		if (!explanation) throw new Error('pas d’explication');

		await expect.poll(() => formulasOf(explanation).length).toBe(2);
		expect(formulasOf(explanation)[1]).toContain('\\dfrac{1}{3}');
		const prose = proseOf(explanation);
		expect(prose).toContain('On pose');
		expect(prose).toContain("d'où");
		expect(prose).not.toMatch(/[$\\^{}]/);
	});

	it('le titre aussi', async () => {
		const screen = await render(GeneratedStepsCorrection, { props: { steps } });
		const title = screen.container.querySelector('.step-title');
		if (!title) throw new Error('pas de titre');

		await expect.poll(() => formulasOf(title).length).toBe(2);
		expect(proseOf(title)).toContain('Choix :');
		expect(proseOf(title)).not.toMatch(/[$\\^{}]/);
	});

	it('un titre sans maths reste du texte', async () => {
		const screen = await render(GeneratedStepsCorrection, {
			props: { steps: [{ id: 2, rule: 'identify-parts', title: 'Intégration par parties' }] }
		});
		const title = screen.container.querySelector('.step-title');

		await expect.poll(() => title?.textContent?.trim()).toBe('Intégration par parties');
		expect(title?.querySelectorAll('math-span').length).toBe(0);
	});
});
