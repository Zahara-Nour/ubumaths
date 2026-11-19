/**
 * Calcul centré (`array{rcl}`) affiché en lecture : fractions au grand format
 *
 * Un `array` met ses cellules en style texte : un calcul écrit avant le correctif
 * (ni `\displaystyle`, ni écart entre les lignes) avait des fractions réduites sur
 * certaines lignes seulement. L'énoncé et la messagerie (mode restreint) le
 * réécrivent à l'affichage, sans toucher au contenu stocké.
 */
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import MarkdownRenderer from '../MarkdownRenderer.svelte';

const ANCIEN = '$$\\begin{array}{rcl}A&=&\\frac{1}{2}\\\\&=&0.5\\end{array}$$\n\n$$\\frac{1}{2}$$';

/** Formules centrées rendues (<math-div>), dans l'ordre. */
async function formules(restricted: boolean): Promise<Element[]> {
	// eslint-disable-next-line @typescript-eslint/no-explicit-any
	const screen = await render(MarkdownRenderer as any, {
		props: { content: ANCIEN, restricted }
	});
	const el = screen.container;
	await expect.poll(() => el.querySelectorAll('math-div').length).toBe(2);
	return [...el.querySelectorAll('math-div')];
}

/** Hauteur rendue de la première fraction d'une formule. */
async function hauteurFraction(formule: Element): Promise<number> {
	await expect.poll(() => formule.shadowRoot?.querySelector('.ML__mfrac')).toBeTruthy();
	const fraction = formule.shadowRoot?.querySelector('.ML__mfrac');
	return fraction?.getBoundingClientRect().height ?? 0;
}

describe('calcul centré écrit avant le correctif, affiché au grand format', () => {
	it.each([false, true])(
		'restreint : %s — membres en \\displaystyle, lignes espacées',
		async (r) => {
			const [calcul] = await formules(r);
			expect(calcul.textContent).toBe(
				'\\begin{array}{rcl}\\displaystyle A&=&\\displaystyle \\frac{1}{2}' +
					'\\\\[6pt]&=&\\displaystyle 0{,}5\\end{array}'
			);
		}
	);

	it('la fraction du calcul a la taille d’une fraction seule', async () => {
		const [calcul, seule] = await formules(false);
		expect(await hauteurFraction(calcul)).toBeCloseTo(await hauteurFraction(seule), 0);
	});
});
