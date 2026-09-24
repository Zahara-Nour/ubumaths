/**
 * FillBlanksInput — message propre à chaque trou après correction
 *
 * Le message d'un trou incorrect (unité oubliée, règle du prof…) s'affiche sous
 * l'énoncé, préfixé du numéro du trou. Sans la prop `blankFeedback` (écran de
 * test QuestionCard), rien n'apparaît.
 */

import { page } from '@vitest/browser/context';
import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import FillBlanksInput from '../FillBlanksInput.svelte';
import type { ResolvedMarkdown } from '$lib/ubumark';
import type { InstanceBlank } from '$lib/questions/types';

/** Région des messages par trou (MathLive a ses propres role=status) */
const messagesRegion = () => page.getByRole('status', { name: 'Messages par blanc' });

const MISSING_UNIT = 'N’oublie pas l’unité.';

const twoBlanks: InstanceBlank[] = [
	{ type: 'math', expectedAnswer: '3' },
	{ type: 'math', expectedAnswer: '5\\unit{km}', unit: { expected: true } }
];
const twoBlankStatement =
	'Complète : $\\placeholder[0]{}$ et $\\placeholder[1]{}$' as ResolvedMarkdown;

describe('FillBlanksInput — messages par trou', () => {
	it('affiche le message du trou 2, préfixé de son numéro', async () => {
		render(FillBlanksInput, {
			props: {
				statement: twoBlankStatement,
				blanks: twoBlanks,
				validationResults: [true, false],
				blankFeedback: [undefined, MISSING_UNIT]
			}
		});

		// toHaveTextContent normalise les espaces : l'espace insécable avant « : » devient une espace
		const status = messagesRegion();
		await expect.element(status).toHaveTextContent(`Blanc 2 : ${MISSING_UNIT}`);
		await expect.element(status).not.toHaveTextContent('Blanc 1');
	});

	it('sans blankFeedback (écran de test), aucun message', async () => {
		render(FillBlanksInput, {
			props: {
				statement: twoBlankStatement,
				blanks: twoBlanks,
				validationResults: []
			}
		});

		await expect.element(messagesRegion()).toBeInTheDocument();
		await expect.element(messagesRegion()).not.toHaveTextContent('Blanc');
	});

	it('un seul trou : pas de doublon avec le feedback global de l’écran', async () => {
		render(FillBlanksInput, {
			props: {
				statement: 'Distance : $\\placeholder[0]{}$' as ResolvedMarkdown,
				blanks: [twoBlanks[1]],
				blankFeedback: [MISSING_UNIT]
			}
		});

		await expect.element(messagesRegion()).toBeInTheDocument();
		await expect.element(messagesRegion()).not.toHaveTextContent('Blanc');
	});
});
