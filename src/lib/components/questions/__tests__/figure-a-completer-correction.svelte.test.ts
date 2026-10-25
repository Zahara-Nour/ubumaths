/**
 * Case « figure » dans la copie corrigée (`CorrectionCard`, PR 3)
 * ===========================================================
 *
 * - La page de résultats peut être rechargée : la vue de saisie, qui inscrit
 *   le calcul des positions, n'a pas tourné. La carte le charge avant de juger :
 *   jamais un « faux » en silence (revue de #1775). Ce fichier n'importe PAS
 *   `positions-setup` : il part sans positions inscrites.
 * - La figure montre les droites de l'élève (vertes si juste ; sinon la bonne en
 *   pointillés) ; la consigne seule au-dessus, la figure une seule fois.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

const STATEMENT = [
	'Trace la droite qui passe par les points A et B.',
	'',
	'```figure-a-completer',
	'fenetre: 0 ; 10 ; 0 ; 6',
	'outils: droite',
	'verifier: droite_par A ; B',
	'---',
	'A = point(1, 2)',
	'B = point(7, 2)',
	'C = point(4, 5)',
	'```'
].join('\n');

function instance(): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-cp059',
			title: 'Tracer une droite',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(STATEMENT) }],
			grades: ['CP'],
			theme: 'Test',
			domain: 'Test',
			level: 1
		} as unknown as QuestionTemplate,
		42
	);
	if (!result.success) throw new Error(result.errors.join(' ; '));
	return result.instance;
}

function result(answer: string): TestAnswerResult {
	return {
		index: 0,
		instance: instance(),
		userAnswer: { value: [answer], isCorrect: false, timeSpent: 3, attempts: 1, submittedAt: '' },
		isCorrect: false
	};
}

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

async function show(answer: string) {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return await render(CorrectionCard, { target: main, props: { answerResult: result(answer) } });
}

const front = (c: HTMLElement) => c.querySelector('.flip-front') as HTMLElement;

describe('copie corrigée : case « figure »', () => {
	// Premier test du fichier : aucune position inscrite au départ
	it('juste, positions pas encore inscrites : « Juste », droite verte (jamais faux en silence)', async () => {
		const { container } = await show('droite(1;2;7;2)');
		const recto = front(container);
		await expect
			.poll(
				() => recto.querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind'),
				{
					timeout: 5000
				}
			)
			.toBe('correct');
		await expect
			.poll(() => recto.querySelector('[data-kind="figure"] .droite-juste'), { timeout: 5000 })
			.not.toBeNull();
		expect(recto.querySelector('[data-testid="bonne-droite"]')).toBeNull();
	});

	it('faux : ses droites, la bonne en pointillés, le message du juge', async () => {
		const { container } = await show('droite(1;2;4;5)');
		const recto = front(container);
		await expect
			.poll(() => recto.querySelector('[data-kind="figure"] [data-testid="bonne-droite"]'), {
				timeout: 5000
			})
			.not.toBeNull();
		expect(recto.querySelectorAll('[data-testid="droite-eleve"]')).toHaveLength(1);
		expect(recto.querySelector('.droite-juste')).toBeNull();
		expect(recto.textContent).toContain('Ta droite passe par A et C, pas par B.');
		expect(recto.querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind')).toBe(
			'incorrect'
		);
	});

	it('la consigne seule au-dessus : une seule figure, pas de `droite(…)` en texte', async () => {
		const { container } = await show('droite(1;2;4;5)');
		const recto = front(container);
		await expect
			.poll(() => recto.querySelector('[data-kind="figure"] .figure-a-completer'), {
				timeout: 5000
			})
			.not.toBeNull();
		expect(recto.querySelector('[data-testid="instruction"]')?.textContent).toContain(
			'Trace la droite qui passe par les points A et B.'
		);
		expect(recto.querySelector('[data-testid="statement"]')).toBeNull();
		expect(recto.querySelectorAll('.figure-a-completer')).toHaveLength(1);
		expect(recto.textContent).not.toContain('droite(');
	});
});
