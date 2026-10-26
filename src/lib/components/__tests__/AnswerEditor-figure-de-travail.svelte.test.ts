/**
 * AnswerEditor — carte « Figure de travail — non notée » (chantier figure-et-choix, lot 2)
 * =======================================================================================
 *
 * Décision de David (2026-10-26, `docs/wip/figure-et-choix-progress.md` § 2.9, Q3) :
 * une carte en lecture seule, sans numéro de case, avec son outil ; ses erreurs
 * (`verifier:`, outil inconnu) y sont dites ; aucun champ de réponse attendue.
 */

import { page } from 'vitest/browser';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import AnswerEditorChoiceHarness from './AnswerEditorChoiceHarness.svelte';

// Constantes
const WORK = (...header: string[]) =>
	[
		'```figure-de-travail',
		'fenetre: 0 ; 10 ; 0 ; 6',
		...header,
		'---',
		'A = point(2, 3)',
		'B = point(8, 5)',
		'```'
	].join('\n');
const OUI_NON = '```choix\nmelanger: non\n- Oui\n- Non\n```';

// Tests
describe('AnswerEditor — figure de travail', () => {
	it('carte en lecture seule, outil dit, aucun champ ; la case choix garde « Case 2 »', async () => {
		const { container } = await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: `Alignés ?\n\n${WORK('outils: droite')}\n\n${OUI_NON}`,
				initialAnswers: ['', '1']
			}
		});
		const card = page.getByTestId('carte-figure-de-travail');
		await expect.element(card).toBeVisible();
		await expect.element(card).toHaveTextContent('Figure de travail — non notée');
		await expect.element(card).toHaveTextContent('Outil : droite');
		expect(card.element().querySelector('input, textarea, math-field')).toBeNull();
		expect(container.textContent).not.toContain('Trou #1');
		await expect.element(page.getByText('Case 2 : choix')).toBeVisible();
	});

	it('verifier: écrit : l’erreur est sur la carte', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: `${WORK('verifier: droite_par A ; B')}\n\n${OUI_NON}`,
				initialAnswers: ['', '1']
			}
		});
		await expect
			.element(page.getByTestId('carte-figure-de-travail'))
			.toHaveTextContent('une figure de travail n’est pas notée : pas de verifier:');
	});

	it('outil inconnu : l’erreur est sur la carte', async () => {
		await render(AnswerEditorChoiceHarness, {
			props: {
				initialStatement: `${WORK('outils: compas')}\n\n${OUI_NON}`,
				initialAnswers: ['', '1']
			}
		});
		await expect
			.element(page.getByTestId('carte-figure-de-travail'))
			.toHaveTextContent('outil « compas » inconnu');
	});
});
