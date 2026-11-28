/**
 * `MathField` : le champ suit la valeur liée, y compris quand elle est vidée (L116).
 */
import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import type { MathfieldElement } from 'mathlive';
import MathField from '../MathField.svelte';

// Functions

function champ(container: HTMLElement): MathfieldElement {
	const el = container.querySelector<MathfieldElement>('math-field');
	if (!el) throw new Error('math-field absent');
	return el;
}

describe('MathField : valeur liée', () => {
	it('une nouvelle valeur remplit le champ', async () => {
		const { container, rerender } = await render(MathField, { props: { value: 'x' } });
		await rerender({ value: 'x+1' });
		expect(champ(container).value).toBe('x+1');
	});

	it('vider la valeur vide le champ', async () => {
		const { container, rerender } = await render(MathField, { props: { value: 'x+1' } });
		expect(champ(container).value).toBe('x+1');
		await rerender({ value: '' });
		expect(champ(container).value).toBe('');
	});

	it('une valeur retirée (undefined) vide aussi le champ', async () => {
		const { container, rerender } = await render(MathField, { props: { value: 'x+1' } });
		await rerender({ value: undefined });
		expect(champ(container).value).toBe('');
	});
});
