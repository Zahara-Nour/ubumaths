/**
 * Case à construire dans la copie corrigée (`CorrectionCard`) et au verso
 * ======================================================================
 *
 * Vérification locale du 2026-10-26 : la carte de correction rejouait le bloc
 * (plan vide, réserve active). Elle montre la construction de l'élève,
 * verrouillée et sans réserve, sa valeur et une construction juste (Q8) ; la
 * consigne seule au-dessus, le plan une seule fois.
 */
import { describe, it, expect, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionCard from '../CorrectionCard.svelte';
import ExpectedResultView from '../ExpectedResultView.svelte';
import { buildExpectedResult } from '$lib/questions/expected-result';
import { generateInstance } from '$lib/questions/generator/instance-generator';
import type { QuestionInstance, QuestionTemplate } from '$lib/questions/types';
import type { TestAnswerResult } from '$lib/types/test';
import { templateMarkdown } from '$lib/ubumark';

const MONNAIE = ['Paie le ballon à 35 €.', '', '```monnaie', 'construire: 35', '```'].join('\n');
const COLLECTION = ['Construis 34.', '', '```collection', 'construire: 34', '```'].join('\n');

function instance(statement: string): QuestionInstance {
	const result = generateInstance(
		{
			id: 'test-construire',
			title: 'Construire',
			status: 'draft',
			type: 'fill_in_blanks',
			variations: [{ statement: templateMarkdown(statement) }],
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

function result(statement: string, answer: string, isCorrect: boolean): TestAnswerResult {
	return {
		index: 0,
		instance: instance(statement),
		userAnswer: { value: [answer], isCorrect, timeSpent: 3, attempts: 1, submittedAt: '' },
		isCorrect
	};
}

let mains: HTMLElement[] = [];
afterEach(() => {
	for (const m of mains) m.remove();
	mains = [];
});

function mainElement() {
	const main = document.body.appendChild(document.createElement('main'));
	mains.push(main);
	return main;
}

async function show(statement: string, answer: string, isCorrect: boolean) {
	const { container } = await render(CorrectionCard, {
		target: mainElement(),
		props: { answerResult: result(statement, answer, isCorrect) }
	});
	return container.querySelector('.flip-front') as HTMLElement;
}

const values = (root: Element, selector: string) =>
	[...root.querySelectorAll(`${selector} .monnaie-objet`)].map(
		(g) => g.querySelector('text')?.textContent
	);

describe('copie corrigée : monnaie à construire', () => {
	it('faux : la construction de l’élève verrouillée, sa somme, une construction juste, pas de réserve', async () => {
		const recto = await show(MONNAIE, '32', false);
		await expect.poll(() => recto.querySelector('[data-kind="build"]')).not.toBeNull();
		expect(values(recto, '[data-kind="build"] svg.construire-plan')).toEqual([
			'20 €',
			'10 €',
			'2 €'
		]);
		expect(recto.textContent).toContain('Tu as posé 32 €.');
		expect(values(recto, '[data-kind="build"] .construire-correction')).toEqual([
			'20 €',
			'10 €',
			'5 €'
		]);
		expect(recto.querySelector('button[aria-label^="Ajouter"]')).toBeNull();
		expect(recto.querySelector('[data-testid="global-verdict"]')?.getAttribute('data-kind')).toBe(
			'incorrect'
		);
	});

	it('juste : la construction de l’élève, cadre vert, pas de correction', async () => {
		const recto = await show(MONNAIE, '35', true);
		await expect.poll(() => recto.querySelector('[data-kind="build"]')).not.toBeNull();
		expect(recto.querySelector('[data-kind="build"] .construire-cadre-juste')).not.toBeNull();
		expect(recto.querySelector('.construire-correction')).toBeNull();
		expect(recto.querySelector('button[aria-label^="Ajouter"]')).toBeNull();
	});

	it('la consigne seule au-dessus : un seul plan, pas de « Réponse attendue » en texte', async () => {
		const recto = await show(MONNAIE, '32', false);
		await expect.poll(() => recto.querySelector('[data-kind="build"]')).not.toBeNull();
		expect(recto.querySelector('[data-testid="instruction"]')?.textContent).toContain(
			'Paie le ballon à 35 €.'
		);
		expect(recto.querySelector('[data-testid="statement"]')).toBeNull();
		expect(recto.querySelectorAll('svg.construire-plan')).toHaveLength(1);
		expect(recto.querySelector('[data-kind="expected-only"]')).toBeNull();
	});
});

describe('copie corrigée : collection à construire', () => {
	it('faux : la collection de l’élève, sa valeur, une collection juste, pas de réserve', async () => {
		const recto = await show(COLLECTION, '32', false);
		await expect.poll(() => recto.querySelector('[data-kind="build"]')).not.toBeNull();
		const plan = recto.querySelector('[data-kind="build"] svg.construire-plan')!;
		expect(plan.querySelectorAll('.collection-barre')).toHaveLength(3);
		expect(plan.querySelectorAll('.collection-cube')).toHaveLength(2);
		expect(recto.textContent).toContain('Ta collection vaut 32.');
		expect(recto.querySelector('.construire-correction')).not.toBeNull();
		expect(recto.querySelector('button[aria-label^="Ajouter"]')).toBeNull();
	});
});

describe('verso (sans réponse, R9) : la construction juste seule', () => {
	it('monnaie : 20 + 10 + 5 €, ni plan à remplir ni réserve', async () => {
		const screen = await render(ExpectedResultView, {
			target: mainElement(),
			props: { result: buildExpectedResult(instance(MONNAIE)) }
		});
		const root = screen.container;
		expect(values(root, '[data-kind="build"]')).toEqual(['20 €', '10 €', '5 €']);
		expect(root.querySelector('svg.construire-plan')).toBeNull();
		expect(root.querySelector('button[aria-label^="Ajouter"]')).toBeNull();
	});
});
