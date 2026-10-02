/**
 * Aperçu admin d'une question : un onglet par rendu élève RÉEL (décision Q61,
 * 2026-10-01). Flash-card (FlashSeries / révisions), Entraînement
 * (TestInteractive puis carte de correction de fin de série), En classe
 * (ClassroomSeries : projection sans retournement, verso de la grille).
 *
 * Page de PROF : un bloc ```courbe mal écrit montre son message détaillé
 * dans chaque onglet (Q48), sans changer le défaut élève des composants.
 *
 * Rendu dans <main> : décor réel de l'application.
 */

import { describe, it, expect, afterEach, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { flushSync, tick } from 'svelte';
import QuestionPreviewTabs from '../QuestionPreviewTabs.svelte';
import FlashSeries from '$lib/components/test/FlashSeries.svelte';
import type { QuestionInstance } from '$lib/questions/types';
import { resolvedMarkdown } from '$lib/ubumark';

const COURBE_EN_ERREUR = ['```courbe', 'x: -4 ; 6', 'y: -8 ; 12', 'f(x) = 2*(x+1', '```'].join(
	'\n'
);

/** QCM : deux choix, le bon est « 4 » (index 1, ordre conservé) */
function qcm(statement = 'Combien font 2 + 2 ?'): QuestionInstance {
	return {
		templateId: 'tpl-qcm',
		statement: resolvedMarkdown(statement),
		grades: ['6'],
		theme: 'Entiers',
		domain: 'Calcul',
		level: 1,
		generatedAt: new Date().toISOString(),
		choices: [
			{ content: resolvedMarkdown('3'), isCorrect: false },
			{ content: resolvedMarkdown('4'), isCorrect: true }
		],
		shuffledChoices: [
			{ content: resolvedMarkdown('3'), originalIndex: 0 },
			{ content: resolvedMarkdown('4'), originalIndex: 1 }
		],
		correctChoiceIndex: '1',
		correction: { steps: [resolvedMarkdown('Correction détaillée')] }
	} as QuestionInstance;
}

function courseCard(): QuestionInstance {
	return {
		templateId: 'tpl-cours',
		statement: resolvedMarkdown('Définition de la médiane'),
		grades: ['6'],
		theme: 'Statistiques',
		domain: 'Données',
		level: 1,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown('Valeur qui partage la série en deux')] },
		options: { courseCard: true }
	} as QuestionInstance;
}

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

async function open(instance: QuestionInstance) {
	const result = await render(QuestionPreviewTabs, {
		target: mainElement(),
		props: { instance }
	});
	flushSync();
	await tick();
	return result;
}

function findButton(root: HTMLElement, label: string): HTMLButtonElement | undefined {
	return [...root.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) =>
			candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label
	);
}

async function clickButton(root: HTMLElement, label: string) {
	const button = findButton(root, label);
	if (!button) throw new Error(`Bouton « ${label} » introuvable`);
	button.click();
	flushSync();
	await tick();
}

function tab(root: HTMLElement, label: string): HTMLElement {
	const found = [...root.querySelectorAll<HTMLElement>('[role="tab"]')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	if (!found) throw new Error(`Onglet « ${label} » introuvable`);
	return found;
}

async function selectTab(root: HTMLElement, label: string) {
	tab(root, label).click();
	flushSync();
	await tick();
}

/** Panneau de l'onglet actif */
function activePanel(root: HTMLElement): HTMLElement {
	const panel = root.querySelector<HTMLElement>('[role="tabpanel"][data-state="active"]');
	if (!panel) throw new Error('Aucun panneau actif');
	return panel;
}

describe('QuestionPreviewTabs — onglets', () => {
	it('trois onglets, Entraînement par défaut pour une question à saisie', async () => {
		const { container } = await open(qcm());
		const labels = [...container.querySelectorAll('[role="tab"]')].map((t) =>
			t.textContent?.trim()
		);
		expect(labels).toEqual(['Flash-card', 'Entraînement', 'En classe']);
		expect(tab(container, 'Entraînement').getAttribute('aria-selected')).toBe('true');
	});

	it('carte de cours : Flash-card par défaut', async () => {
		const { container } = await open(courseCard());
		expect(tab(container, 'Flash-card').getAttribute('aria-selected')).toBe('true');
	});

	it('Entraînement : saisie + Valider, puis carte de correction, puis Recommencer', async () => {
		const { container } = await open(qcm());
		const panel = activePanel(container);
		// QuestionCard interactive : choix cliquables, bouton Valider, pas de retournement
		expect(panel.querySelectorAll('.choice-button').length).toBe(2);
		expect(findButton(panel, 'Valider')).toBeDefined();
		expect(findButton(panel, 'Voir la correction')).toBeUndefined();

		panel.querySelectorAll<HTMLButtonElement>('.choice-button')[0].click();
		flushSync();
		await clickButton(panel, 'Valider');

		// Carte de correction de fin de série (CorrectionCard)
		await vi.waitFor(() => {
			expect(findButton(activePanel(container), 'Voir la correction')).toBeDefined();
		});
		expect(activePanel(container).querySelector('.choice-button')).toBeNull();

		await clickButton(activePanel(container), 'Recommencer');
		const again = activePanel(container);
		expect(again.querySelectorAll('.choice-button').length).toBe(2);
		expect(findButton(again, 'Voir la correction')).toBeUndefined();
	});

	it('Flash-card : carte non interactive, retournable', async () => {
		const { container } = await open(qcm());
		await selectTab(container, 'Flash-card');
		const panel = activePanel(container);
		expect(findButton(panel, 'Voir la correction')).toBeDefined();
		expect(findButton(panel, 'Valider')).toBeUndefined();
	});

	it('En classe : pas de retournement, un bouton montre le verso', async () => {
		const { container } = await open(qcm());
		await selectTab(container, 'En classe');
		const panel = activePanel(container);
		expect(findButton(panel, 'Voir la correction')).toBeUndefined();
		expect(findButton(panel, 'Valider')).toBeUndefined();
		expect(panel.querySelector('.flip-card-inner.flipped')).toBeNull();

		await clickButton(panel, 'Voir le verso');
		expect(activePanel(container).querySelector('.flip-card-inner.flipped')).not.toBeNull();
		expect(findButton(activePanel(container), 'Voir le recto')).toBeDefined();
	});

	it('En classe : texte agrandi comme la projection (--font-scale 2), tuile du verso non', async () => {
		const { container } = await open(qcm());
		const fontSize = () =>
			parseFloat(
				getComputedStyle(
					activePanel(container).querySelector('.question-display-wrapper') as HTMLElement
				).fontSize
			);
		await selectTab(container, 'Flash-card');
		const base = fontSize();
		expect(base).toBeGreaterThan(0);

		await selectTab(container, 'En classe');
		expect(fontSize()).toBeCloseTo(base * 2, 1);

		await clickButton(activePanel(container), 'Voir le verso');
		expect(fontSize()).toBeCloseTo(base, 1);
	});

	it("changer d'onglet ne remplace pas l'instance", async () => {
		const { container } = await open(qcm('Énoncé unique'));
		for (const label of ['Flash-card', 'En classe', 'Entraînement']) {
			await selectTab(container, label);
			expect(activePanel(container).textContent).toContain('Énoncé unique');
		}
	});
});

describe('QuestionPreviewTabs — erreurs d’auteur (Q48)', () => {
	it('un bloc courbe mal écrit montre « Ligne » dans chaque onglet', async () => {
		const { container } = await open(qcm(`Lire la figure.\n\n${COURBE_EN_ERREUR}`));
		for (const label of ['Flash-card', 'Entraînement', 'En classe']) {
			await selectTab(container, label);
			const text = activePanel(container).textContent ?? '';
			expect(text, label).toContain('Ligne 3');
			expect(text, label).not.toContain('Figure indisponible');
		}
	});

	it('la carte de correction (Entraînement) montre aussi le message détaillé', async () => {
		const { container } = await open(qcm(`Lire la figure.\n\n${COURBE_EN_ERREUR}`));
		const panel = activePanel(container);
		panel.querySelectorAll<HTMLButtonElement>('.choice-button')[1].click();
		flushSync();
		await clickButton(panel, 'Valider');
		await vi.waitFor(() => {
			expect(findButton(activePanel(container), 'Voir la correction')).toBeDefined();
		});
		// QCM : l'énoncé est affiché au recto de la carte de correction (lot 2)
		const text = activePanel(container).textContent ?? '';
		expect(text).toContain('Ligne 3');
		expect(text).not.toContain('Figure indisponible');
	});

	it('côté élève (FlashSeries) : toujours « Figure indisponible »', async () => {
		const { container } = await render(FlashSeries, {
			target: mainElement(),
			props: {
				instances: [qcm(`Lire la figure.\n\n${COURBE_EN_ERREUR}`)],
				isLoggedIn: true,
				onComplete: vi.fn(),
				onRestart: vi.fn(),
				onBack: vi.fn()
			}
		});
		flushSync();
		await tick();
		expect(container.textContent).toContain('Figure indisponible');
		expect(container.textContent).not.toContain('Ligne 3');
	});
});
