/**
 * Copie corrigée d'une case « figure » quand le calcul des positions ne se
 * charge pas (réseau, version déployée entre-temps ; revue de #1782) : jamais
 * une carte bloquée ni un verdict inventé — la bonne droite seule, libellée.
 */
import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

vi.mock('$lib/questions/construction/positions', async (importOriginal) => ({
	...(await importOriginal<typeof import('$lib/questions/construction/positions')>()),
	loadConstructionPositions: () => Promise.reject(new Error('chunk introuvable'))
}));

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

describe('copie corrigée : positions impossibles à charger', () => {
	it('la bonne droite seule, « réponse attendue », sans verdict ni réponse jugée', async () => {
		const { container } = await show('droite(1;2;7;2)');
		const recto = front(container);
		await expect
			.poll(() => recto.querySelector('[data-kind="figure"] [data-testid="bonne-droite"]'), {
				timeout: 5000
			})
			.not.toBeNull();
		expect(recto.querySelector('[data-testid="figure-chargement"]')).toBeNull();
		expect(recto.querySelector('[data-testid="global-verdict"]')).toBeNull();
		expect(recto.querySelectorAll('[data-testid="droite-eleve"]')).toHaveLength(0);
		expect(recto.querySelector('[data-kind="figure"]')?.textContent).toContain('réponse attendue');
	});
});
