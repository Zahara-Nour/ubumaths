/**
 * FillBlanksInput — matrice à trous (2026-10-05)
 *
 * `$A^2=\begin{pmatrix}?&?\\?&?\end{pmatrix}$` générait ses cases, mais l'élève
 * n'en voyait AUCUNE : la recherche des cases ne parcourait pas les lignes d'un
 * nœud `matrix`, la formule était rendue statique. Saisie RÉELLE dans chaque case.
 *
 * Rendu dans <main> : décor réel de l'application.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { userEvent } from 'vitest/browser';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import { templateMarkdown } from '$lib/ubumark';
import type { QuestionTemplate } from '$lib/questions/types';
import type { MathfieldElement } from 'mathlive';

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

function template(statement: string, answers: string[]): QuestionTemplate {
	return {
		id: 'matrice-trous',
		title: 'Matrice à trous',
		status: 'draft',
		variations: [
			{
				statement: templateMarkdown(statement),
				blanks: answers.map((expectedAnswer) => ({ expectedAnswer }))
			}
		],
		grades: ['T_EXP'],
		theme: 'Graphes et matrices',
		domain: 'Matrices',
		level: 1
	};
}

function mathFields(container: HTMLElement): MathfieldElement[] {
	return [...container.querySelectorAll<MathfieldElement>('math-field')];
}

function promptsShown(container: HTMLElement): string[] {
	return mathFields(container).flatMap((mf) => mf.getPrompts?.() ?? []);
}

async function renderGenerated(statement: string, answers: string[]) {
	const result = generateInstance(template(statement, answers), 1);
	if (!result.success) throw new Error(result.errors.join('; '));
	const values: string[] = [];
	const screen = await render(FillBlanksInput, {
		target: mainElement(),
		props: {
			statement: result.instance.statement,
			blanks: result.instance.blanks ?? [],
			values,
			validationResults: []
		}
	});
	return { screen, values };
}

async function focus(field: HTMLElement) {
	await expect
		.poll(() => {
			field.focus();
			return document.activeElement === field;
		})
		.toBe(true);
}

describe('FillBlanksInput — matrice à trous', () => {
	it('2 × 2 : les quatre cases sont affichées et saisissables', async () => {
		const { screen, values } = await renderGenerated(
			'$A^2=\\begin{pmatrix}?&?\\\\?&?\\end{pmatrix}$',
			['7', '10', '15', '22']
		);
		await expect.poll(() => promptsShown(screen.container)).toEqual(['0', '1', '2', '3']);

		// Comme l'élève : focus (curseur dans la 1re case), frappe, Tab vers la suivante
		const [field] = mathFields(screen.container);
		await focus(field);
		await userEvent.keyboard('7{Tab}10{Tab}15{Tab}-22');
		await expect
			.poll(() => ['0', '1', '2', '3'].map((id) => field.getPromptValue(id)))
			.toEqual(['7', '10', '15', '-22']);
		await expect.poll(() => values).toEqual(['7', '10', '15', '-22']);
	});

	it('3 × 3 avec coefficients connus : seules les cases', async () => {
		const { screen } = await renderGenerated(
			'$M=\\begin{pmatrix}0&?&1\\\\1&0&?\\\\?&1&0\\end{pmatrix}$',
			['1', '1', '1']
		);
		await expect.poll(() => promptsShown(screen.container)).toEqual(['0', '1', '2']);
		const [field] = mathFields(screen.container);
		await focus(field);
		await userEvent.keyboard('1{Tab}1{Tab}1');
		await expect.poll(() => field.getPromptValue('2')).toBe('1');
	});

	it('colonne seule, sans \\vec : deux cases', async () => {
		const { screen } = await renderGenerated('$AX=\\begin{pmatrix}?\\\\?\\end{pmatrix}$', [
			'1',
			'2'
		]);
		await expect.poll(() => promptsShown(screen.container)).toEqual(['0', '1']);
	});
});
