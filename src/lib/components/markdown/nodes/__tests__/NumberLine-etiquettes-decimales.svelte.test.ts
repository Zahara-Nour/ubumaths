/**
 * Droite graduée : une graduation décimale s'écrit avec une virgule en français
 * (`docs/wip/questions-6-progress.md` § 16 : la loupe des centièmes montrait
 * « 1.4 » et « 1.5 »)
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import NumberLine from '../NumberLine.svelte';
import { parseNumberLineContent } from '$lib/ubumark/parser/number-line-parser';

function node(...lines: string[]) {
	const { node, errors } = parseNumberLineContent(lines);
	if (!node) throw new Error(errors.map((e) => e.message).join(' ; '));
	return node;
}

/** Le LaTeX des étiquettes, une fois dessinées */
async function labelsOf(root: Element, count: number): Promise<string[]> {
	const fields = () => [...root.querySelectorAll('.number-line-label math-field')];
	await expect.poll(() => fields().length).toBe(count);
	return fields().map((m) => (m.textContent ?? '').trim());
}

describe('Droite graduée — étiquettes décimales', () => {
	it('loupe de 1,4 à 1,55 : « 1{,}4 » et « 1{,}5 », jamais un point', async () => {
		const screen = await render(NumberLine, {
			props: {
				node: node('start: 1.4', 'end: 1.55', 'step: 0.01', 'major: 10', 'labels: 1.4, 1.5')
			}
		});
		expect(await labelsOf(screen.container, 2)).toEqual(['1{,}4', '1{,}5']);
	});

	it('les entiers et les fractions sont inchangés', async () => {
		const screen = await render(NumberLine, {
			props: { node: node('start: 0', 'end: 1', 'step: 1/2', 'labels: 0, 1/2, 1') }
		});
		expect(await labelsOf(screen.container, 3)).toEqual(['0', '\\dfrac{1}{2}', '1']);
	});

	it('une graduation entière de 5 chiffres est groupée, comme dans le PDF', async () => {
		const screen = await render(NumberLine, {
			props: { node: node('start: 0', 'end: 20000', 'step: 10000', 'labels: 0, 10000, 20000') }
		});
		expect(await labelsOf(screen.container, 3)).toEqual(['0', '10\\,000', '20\\,000']);
	});
});
