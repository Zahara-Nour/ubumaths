/**
 * Droite graduée : une étiquette de grand nombre (6 700 000, CM2-129) tient en entier dans son
 * cadre (`docs/wip/questions-cm2-progress.md` § 12 : le cadre de 60 px coupait « 6 700 0 »)
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

describe('Droite graduée — étiquettes longues', () => {
	it('« 99 000 000 » : le nombre dessiné est moins large que son cadre', async () => {
		const screen = await render(NumberLine, {
			props: {
				node: node(
					'start: 99000000',
					'end: 100000000',
					'step: 100000',
					'major: 5',
					'labels: 99000000, 99500000'
				)
			}
		});
		const root = screen.container;
		const fields = () => [...root.querySelectorAll('.number-line-label math-field')];
		await expect.poll(() => fields().length).toBe(2);
		for (const field of fields()) {
			const cadre = field.closest('foreignObject');
			if (!cadre) throw new Error('étiquette hors de son cadre');
			await expect.poll(() => field.getBoundingClientRect().width).toBeGreaterThan(0);
			expect(field.getBoundingClientRect().width).toBeLessThanOrEqual(
				cadre.getBoundingClientRect().width
			);
		}
	});
});
