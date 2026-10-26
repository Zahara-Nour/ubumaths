/**
 * AnswerEditor — carte « Case N : choix » (chantier figure-et-choix, PR 1b)
 * =========================================================================
 *
 * Phase 0 validée par David le 2026-10-26 :
 * - une case qui correspond à un bloc ```choix de l'énoncé a sa carte : choix
 *   modifiables, bonne(s) réponse(s) cochée(s), « Plusieurs bonnes réponses »,
 *   « Mélanger les choix » ; chaque modification réécrit le bloc dans l'énoncé ;
 * - la bonne réponse est portée par la case (`"1"`, `"0;2"`) ;
 * - « Ajouter une case choix » et « Vrai / Faux » ajoutent un bloc en fin
 *   d'énoncé ; sa case est la dernière ;
 * - réponse calculée : champ de texte, « Cocher à la main » revient aux ronds ;
 * - bloc mal écrit : messages, champ de texte seul, bloc jamais réécrit.
 */

import { page, userEvent } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AnswerEditorChoiceHarness from './AnswerEditorChoiceHarness.svelte';

interface HarnessState {
	statement: string;
	answers: string[];
}

function readState(): HarnessState {
	const text = page.getByTestId('state').element().textContent ?? '{}';
	return JSON.parse(text) as HarnessState;
}

const OUI_NON = 'Sont-ils alignés ?\n\n```choix\nmelanger: non\n- Oui\n- Non\n```';

describe('AnswerEditor — case choix lue dans l’énoncé', () => {
	it('carte « Case 2 : choix » après une case formule ; cocher B → "1"', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: `$x = ?$\n\n${OUI_NON}`, initialAnswers: ['3', ''] }
		});
		await expect.element(page.getByText('Case 2 : choix')).toBeVisible();
		await expect.element(page.getByText('Coche la bonne réponse.')).toBeVisible();
		await page.getByRole('radio', { name: 'Choix B : bonne réponse' }).click();
		expect(readState().answers).toEqual(['3', '1']);
	});

	it('modifier un choix réécrit le bloc, le texte tapé garde ses espaces', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: OUI_NON, initialAnswers: ['0'] }
		});
		const choiceB = page.getByRole('textbox', { name: 'Choix B' });
		await userEvent.clear(choiceB);
		await userEvent.type(choiceB, 'Non, pas du tout');
		expect(readState().statement).toBe(
			'Sont-ils alignés ?\n\n```choix\nmelanger: non\n- Oui\n- Non, pas du tout\n```'
		);
	});

	it('ajouter un choix, puis supprimer A : la bonne réponse suit son choix', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: OUI_NON, initialAnswers: ['1'] }
		});
		await page.getByRole('button', { name: 'Ajouter un choix' }).click();
		await userEvent.type(page.getByRole('textbox', { name: 'Choix C' }), 'Peut-être');
		await page.getByRole('button', { name: 'Supprimer le choix A' }).click();
		const state = readState();
		expect(state.statement).toContain('```choix\nmelanger: non\n- Non\n- Peut-être\n```');
		expect(state.answers).toEqual(['0']);
	});

	it('« Plusieurs bonnes réponses » : cases à cocher, "0;2" ; décoché → la première', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: '```choix\n- $2$\n- $3$\n- $4$\n```', initialAnswers: ['0'] }
		});
		await page.getByText('Plusieurs bonnes réponses').click();
		expect(readState().statement).toBe('```choix\nplusieurs: oui\n- $2$\n- $3$\n- $4$\n```');
		await page.getByRole('checkbox', { name: 'Choix C : bonne réponse' }).click();
		expect(readState().answers).toEqual(['0;2']);
		await page.getByText('Plusieurs bonnes réponses').click();
		expect(readState()).toEqual({
			statement: '```choix\n- $2$\n- $3$\n- $4$\n```',
			answers: ['0']
		});
	});

	it('« Mélanger les choix » décoché → melanger: non', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: '```choix\n- a\n- b\n```', initialAnswers: ['0'] }
		});
		await page.getByText('Mélanger les choix').click();
		expect(readState().statement).toBe('```choix\nmelanger: non\n- a\n- b\n```');
	});
});

describe('AnswerEditor — ajouter une case choix en fin d’énoncé', () => {
	it('« Vrai / Faux » : bloc melanger: non, case dernière, rien coché', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: 'On a $x = ?$.', initialAnswers: ['2'] }
		});
		await page.getByRole('button', { name: 'Vrai / Faux' }).click();
		expect(readState()).toEqual({
			statement: 'On a $x = ?$.\n\n```choix\nmelanger: non\n- Vrai\n- Faux\n```',
			answers: ['2', '']
		});
		await expect.element(page.getByText('Case 2 : choix')).toBeVisible();
	});

	it('« Ajouter une case choix » sur un énoncé sans case : la case amorcée devient la case choix', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: 'Quelle figure ?', initialAnswers: [''] }
		});
		await page.getByRole('button', { name: 'Ajouter une case choix' }).click();
		expect(readState()).toEqual({
			statement: 'Quelle figure ?\n\n```choix\n-\n-\n```',
			answers: ['']
		});
		await expect.element(page.getByText('Case 1 : choix')).toBeVisible();
	});
});

describe('AnswerEditor — case ajoutée quand la liste est plus longue que les cases', () => {
	it('la nouvelle case n’hérite pas de la réponse d’un ancien trou', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: 'Sans case.', initialAnswers: ['7', '8'] }
		});
		await page.getByRole('button', { name: 'Ajouter une case choix' }).click();
		expect(readState().answers).toEqual(['', '8']);
	});
});

describe('AnswerEditor — réponse calculée, bloc mal écrit', () => {
	it('réponse {{eval:…}} : champ de texte ; « Cocher à la main » revient aux ronds', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: OUI_NON, initialAnswers: ['{{eval:{{a}}>2}}'] }
		});
		await expect
			.element(page.getByRole('textbox', { name: 'Bonne réponse (réponse calculée)' }))
			.toHaveValue('{{eval:{{a}}>2}}');
		await page.getByRole('button', { name: 'Cocher à la main' }).click();
		await expect
			.element(page.getByRole('radio', { name: 'Choix A : bonne réponse' }))
			.toBeVisible();
		expect(readState().answers).toEqual(['']);
	});

	it('« Réponse calculée » amorce {{eval:}}', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: OUI_NON, initialAnswers: ['0'] }
		});
		await page.getByRole('button', { name: 'Réponse calculée' }).click();
		expect(readState().answers).toEqual(['{{eval:}}']);
	});

	it('bloc mal écrit : messages, champ de texte, aucun choix modifiable', async () => {
		const statement = '```choix\nordre: non\n- a\n- b\n```';
		await render(AnswerEditorChoiceHarness, {
			props: { initialStatement: statement, initialAnswers: ['0'] }
		});
		await expect.element(page.getByText(/réglage « ordre » inconnu/)).toBeVisible();
		await expect.element(page.getByRole('textbox', { name: 'Bonne réponse' })).toHaveValue('0');
		await expect.element(page.getByRole('textbox', { name: 'Choix A' })).not.toBeInTheDocument();
		expect(readState().statement).toBe(statement);
	});
});
