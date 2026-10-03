/**
 * FillBlanksInput — cases dans une formule avec `\vec` (2026-10-03)
 *
 * Le parseur ne lit pas `\vec` ni `\overrightarrow` : la formule était rendue
 * statique et l'élève ne voyait aucune case (A-01 géométrie repérée,
 * `$\vec{n}\begin{pmatrix}?\\?\end{pmatrix}$`).
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

type PromptField = HTMLElement & { getPrompts?: () => string[] };

let mains: HTMLElement[] = [];
function mainElement(): HTMLElement {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function promptsShown(container: HTMLElement): number {
	return [...container.querySelectorAll<PromptField>('math-field')].reduce(
		(n, mf) => n + (mf.getPrompts?.().length ?? 0),
		0
	);
}

describe('FillBlanksInput — cases à côté de \\vec / \\overrightarrow', () => {
	it('les deux coordonnées de $\\vec{n}$ sont saisissables (formule en ligne)', async () => {
		const blanks: InstanceBlank[] = [
			{ type: 'math', expectedAnswer: '2' },
			{ type: 'math', expectedAnswer: '-3' }
		];
		const statement = [
			'Donne les coordonnées du vecteur normal.',
			'',
			'Réponse : $\\vec{n}\\begin{pmatrix}\\placeholder[0]{}\\\\\\placeholder[1]{}\\end{pmatrix}$'
		].join('\n') as ResolvedMarkdown;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement, blanks, validationResults: [] }
		});
		await expect.poll(() => promptsShown(screen.container)).toBe(2);
	});

	it('la case après un produit scalaire \\overrightarrow est saisissable (formule seule)', async () => {
		const blanks: InstanceBlank[] = [{ type: 'math', expectedAnswer: '5' }];
		const statement =
			'$\\overrightarrow{AB}\\cdot\\overrightarrow{AC}=\\placeholder[0]{}$' as ResolvedMarkdown;
		const screen = await render(FillBlanksInput, {
			target: mainElement(),
			props: { statement, blanks, validationResults: [] }
		});
		await expect.poll(() => promptsShown(screen.container)).toBe(1);
	});
});
