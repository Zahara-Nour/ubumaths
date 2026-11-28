/**
 * Forme « En classe » d'une série : page d'attente et réglages (chantier
 * `diaporama-reglages`), projection des questions une à une (UbuSlides),
 * minuteur par modèle, grilles de fin.
 */

import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import { flushSync, tick } from 'svelte';
import ClassroomSeries from '../ClassroomSeries.svelte';
import type { ClassroomItem } from '#lib/types/test.ts';
import type { QuestionInstance } from '#lib/questions/types.ts';
import { resolvedMarkdown } from '#lib/ubumark/index.ts';
import {
	classroomSettings,
	DEFAULT_CLASSROOM_SETTINGS,
	type ClassroomSettings
} from '#lib/stores/classroomSettings.svelte.ts';

const { playChime, unlockChime } = vi.hoisted(() => ({
	playChime: vi.fn(),
	unlockChime: vi.fn()
}));
vi.mock('#lib/utils/chime.ts', () => ({ playChime, unlockChime }));

function makeInstance(statement: string): QuestionInstance {
	return {
		templateId: `tpl-${statement}`,
		statement: resolvedMarkdown(statement),
		grades: ['6'],
		level: 1,
		generatedAt: new Date().toISOString(),
		correction: { steps: [resolvedMarkdown(`Correction de ${statement}`)] }
	} as QuestionInstance;
}

function item(statement: string, delaySeconds: number, templateId: string): ClassroomItem {
	return { instance: makeInstance(statement), delaySeconds, templateId };
}

// Trois questions : A et C du modèle x, B dans y
function threeItems(): ClassroomItem[] {
	return [item('Énoncé A', 10, 'x'), item('Énoncé B', 10, 'y'), item('Énoncé C', 10, 'x')];
}

// Réglages de départ des tests : ceux par défaut, sans plein écran
function useSettings(patch: Partial<ClassroomSettings> = {}) {
	classroomSettings.update({ ...DEFAULT_CLASSROOM_SETTINGS, fullscreenOnStart: false, ...patch });
}

// Ouvre la forme ; par défaut, passe la page d'attente (« C'est parti ! »)
async function open(items: ClassroomItem[], { start = true } = {}) {
	const onBack = vi.fn();
	const onRestart = vi.fn();
	const result = await render(ClassroomSeries, { items, onBack, onRestart });
	flushSync();
	await tick();
	if (start) await startSeries(result.container);
	return { ...result, onBack, onRestart };
}

async function startSeries(container: HTMLElement) {
	click(container, "C'est parti !");
	await tick();
	flushSync();
}

// Avance le temps simulé puis laisse les effets du Deck s'exécuter
function elapse(ms: number) {
	vi.advanceTimersByTime(ms);
	flushSync();
}

function activeSlideText(container: HTMLElement): string {
	return container.querySelector('.slide.active')?.textContent ?? '';
}

function button(container: HTMLElement, label: string): HTMLButtonElement {
	const found = [...container.querySelectorAll<HTMLButtonElement>('button')].find(
		(candidate) =>
			candidate.getAttribute('aria-label') === label || candidate.textContent?.trim() === label
	);
	if (!found) throw new Error(`Bouton « ${label} » introuvable`);
	return found;
}

function click(container: HTMLElement, label: string) {
	button(container, label).click();
	flushSync();
}

function text(container: HTMLElement, testId: string): string {
	return container.querySelector(`[data-testid="${testId}"]`)?.textContent?.trim() ?? '';
}

// Case à cocher (MyCheckbox) retrouvée par le texte de son étiquette
function checkbox(container: HTMLElement, label: string): HTMLButtonElement {
	const found = [...container.querySelectorAll<HTMLLabelElement>('label')].find(
		(candidate) => candidate.textContent?.trim() === label
	);
	const box = found?.htmlFor ? document.getElementById(found.htmlFor) : null;
	if (!(box instanceof HTMLButtonElement)) throw new Error(`Case « ${label} » introuvable`);
	return box;
}

function toggle(container: HTMLElement, label: string) {
	checkbox(container, label).click();
	flushSync();
}

async function pressSpace(container: HTMLElement) {
	container.querySelector<HTMLElement>('.deck-wrapper')?.focus();
	await userEvent.keyboard(' ');
	flushSync();
}

function activeBackIsShown(container: HTMLElement): boolean {
	const back = container.querySelector<HTMLElement>('.slide.active .flip-card-back');
	return back !== null && !back.inert;
}

describe('ClassroomSeries — projection', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('une diapositive par question, la première affichée', async () => {
		const { container } = await open(threeItems());

		expect(container.querySelectorAll('.slide')).toHaveLength(3);
		expect(activeSlideText(container)).toContain('Énoncé A');
	});

	it('ne propose pas de voir la correction pendant la projection', async () => {
		const { container } = await open(threeItems());

		expect(container.querySelector('[aria-label="Voir la correction"]')).toBeNull();
		expect(container.querySelector('.flip-button')).toBeNull();
	});

	it('affiche « Question i / n » et le temps restant en secondes', async () => {
		const { container } = await open(threeItems());

		expect(text(container, 'classroom-position')).toBe('Question 1 / 3');
		expect(text(container, 'classroom-remaining')).toBe('10');

		elapse(3000);
		expect(text(container, 'classroom-remaining')).toBe('7');
	});

	it('chaque question dure le délai de son item', async () => {
		const items = [item('Énoncé A', 4, 'x'), item('Énoncé B', 12, 'y'), item('Énoncé C', 4, 'x')];
		const { container } = await open(items);

		elapse(3999);
		expect(activeSlideText(container)).toContain('Énoncé A');
		elapse(1);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');

		elapse(11_999);
		expect(activeSlideText(container)).toContain('Énoncé B');
		elapse(1);
		expect(activeSlideText(container)).toContain('Énoncé C');
	});

	it('+5 s allonge la question courante et les suivantes du même modèle seulement', async () => {
		const { container } = await open(threeItems());
		elapse(2000);

		click(container, 'Augmenter la durée de 5 secondes');
		// Pas de remise à zéro : 8 s restantes + 5 s
		expect(text(container, 'classroom-remaining')).toBe('13');
		expect(text(container, 'classroom-duration')).toBe('15 s');

		elapse(12_999);
		expect(activeSlideText(container)).toContain('Énoncé A');
		elapse(1);
		// B (modèle y) garde 10 s
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-duration')).toBe('10 s');

		elapse(10_000);
		// C (modèle x) hérite des 15 s
		expect(activeSlideText(container)).toContain('Énoncé C');
		expect(text(container, 'classroom-duration')).toBe('15 s');
		expect(text(container, 'classroom-remaining')).toBe('15');
	});

	it('−5 s raccourcit le modèle, sans descendre sous 5 s', async () => {
		const { container } = await open(threeItems());

		click(container, 'Réduire la durée de 5 secondes');
		expect(text(container, 'classroom-duration')).toBe('5 s');
		// Au plancher, le bouton reste focalisable (un bouton désactivé perdrait le
		// focus et le clavier du diaporama ne répondrait plus) : aria-disabled seulement
		const minus = button(container, 'Réduire la durée de 5 secondes');
		expect(minus.disabled).toBe(false);
		expect(minus.getAttribute('aria-disabled')).toBe('true');

		click(container, 'Réduire la durée de 5 secondes');
		expect(text(container, 'classroom-duration')).toBe('5 s');

		elapse(5000);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-duration')).toBe('10 s');
	});

	it('−5 s quand il reste 3 s ne fait pas sauter la question affichée', async () => {
		const { container } = await open(threeItems());
		elapse(7000);

		click(container, 'Réduire la durée de 5 secondes');
		elapse(200);
		expect(activeSlideText(container)).toContain('Énoncé A');
	});

	it('le bouton pause gèle le minuteur, la reprise repart du temps restant', async () => {
		const { container } = await open(threeItems());
		elapse(4000);

		click(container, 'Mettre en pause');
		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-remaining')).toBe('6');

		click(container, 'Reprendre');
		elapse(6000);
		expect(activeSlideText(container)).toContain('Énoncé B');
	});

	it('Espace met en pause au lieu de passer à la question suivante', async () => {
		const { container } = await open(threeItems());
		const deckElement = container.querySelector<HTMLElement>('.deck-wrapper');
		deckElement?.focus();

		await userEvent.keyboard(' ');
		flushSync();
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(button(container, 'Reprendre')).toBeTruthy();

		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
	});

	it('propose le plein écran et « Quitter » (vers le panier) pendant la projection', async () => {
		const { container } = await open(threeItems());

		expect(button(container, 'Plein écran')).toBeTruthy();
		const quit = [...container.querySelectorAll<HTMLAnchorElement>('a')].find(
			(link) => link.textContent?.trim() === 'Quitter'
		);
		expect(quit?.getAttribute('href')).toBe('/automaths/panier');
	});
});

describe('ClassroomSeries — fin de série', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	async function openFinished() {
		const opened = await open([item('Énoncé A', 5, 'x'), item('Énoncé B', 5, 'y')]);
		elapse(5000);
		elapse(5000);
		await tick();
		return opened;
	}

	it('montre d’abord la grille numérotée des questions, sans correction', async () => {
		const { container } = await openFinished();

		expect(container.querySelector('.slide')).toBeNull();
		const grid = container.querySelector('[data-testid="classroom-questions-grid"]');
		expect(grid).not.toBeNull();
		expect(grid?.textContent).toContain('Question 1');
		expect(grid?.textContent).toContain('Énoncé A');
		expect(grid?.textContent).toContain('Question 2');
		expect(grid?.textContent).toContain('Énoncé B');
		expect(container.querySelector('[data-testid="classroom-corrections-grid"]')).toBeNull();
		expect(container.querySelector('[aria-label="Voir la correction"]')).toBeNull();
	});

	it('va à la grille des corrections puis revient aux questions', async () => {
		const { container } = await openFinished();

		click(container, 'Voir les corrections');
		const corrections = container.querySelector('[data-testid="classroom-corrections-grid"]');
		expect(corrections).not.toBeNull();
		expect(corrections?.textContent).toContain('Question 1');
		expect(corrections?.textContent).toContain('Question 2');
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).toBeNull();

		click(container, 'Voir les questions');
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).not.toBeNull();
		expect(container.querySelector('[data-testid="classroom-corrections-grid"]')).toBeNull();
	});

	it('« Recommencer » appelle onRestart et revient à la page d’attente', async () => {
		const { container, onRestart } = await openFinished();

		click(container, 'Recommencer');
		await tick();
		expect(onRestart).toHaveBeenCalledTimes(1);
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).toBeNull();
		expect(button(container, "C'est parti !")).toBeTruthy();

		await startSeries(container);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-position')).toBe('Question 1 / 2');
	});

	it('« Retour à ma série » appelle onBack', async () => {
		const { container, onBack } = await openFinished();

		click(container, 'Retour à ma série');
		expect(onBack).toHaveBeenCalledTimes(1);
	});

	/**
	 * Correctifs vus en capture (2026-09-30) : la grille des corrections passait
	 * par `CorrectionCard`, qui affiche « undefined » pour une question à trous ;
	 * elle montre désormais le verso de la flash-card. Les deux grilles ont des
	 * cartes de même hauteur (celle des tuiles).
	 */
	it('grille des corrections : la réponse attendue d’une question à trou, jamais « undefined »', async () => {
		const withBlank = item('Calcule 2 × 80.', 5, 'x');
		withBlank.instance.blanks = [
			{ expectedAnswer: '160', expectedAnswerLatex: '160', type: 'math' }
		] as QuestionInstance['blanks'];
		const { container } = await open([withBlank]);
		elapse(5000);
		await tick();

		click(container, 'Voir les corrections');
		const corrections = container.querySelector<HTMLElement>(
			'[data-testid="classroom-corrections-grid"]'
		);
		// Verso = résultat attendu (lot 3, R14)
		const answer = corrections?.querySelector<HTMLElement>(
			'.flip-card-back [data-testid="expected-result"]'
		);
		expect(answer?.querySelector('math-span')?.textContent).toContain('160');
		expect(corrections?.textContent).not.toContain('undefined');
		// Le verso est la face montrée (non inerte)
		expect(corrections?.querySelector<HTMLElement>('.flip-card-back')?.inert).toBe(false);
	});

	it('les cartes des deux grilles ont la même hauteur', async () => {
		const { container } = await openFinished();
		const heights = () =>
			[...container.querySelectorAll<HTMLElement>('.flip-card')].map((card) => card.style.height);

		expect(new Set(heights()).size).toBe(1);
		expect(heights()[0]).not.toBe('');

		click(container, 'Voir les corrections');
		expect(new Set(heights()).size).toBe(1);
		expect(heights()[0]).not.toBe('');
	});
});

describe('ClassroomSeries — page d’attente', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings();
	});
	afterEach(() => {
		vi.useRealTimers();
		vi.restoreAllMocks();
	});

	it('attend « C’est parti ! » : ni diapositive ni chrono avant', async () => {
		const { container } = await open(threeItems(), { start: false });

		expect(container.querySelector('.slide')).toBeNull();
		expect(text(container, 'series-start-summary')).toBe('3 questions · environ 30 s');
		const hints = text(container, 'series-start-hints');
		expect(hints).toContain('Espace');
		expect(hints).toContain('plein écran');

		elapse(60_000);
		expect(container.querySelector('.slide')).toBeNull();

		await startSeries(container);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-position')).toBe('Question 1 / 3');
		expect(text(container, 'classroom-remaining')).toBe('10');
	});

	it('la durée annoncée compte les corrections quand elles sont allumées', async () => {
		useSettings({ correctionAfterEach: true, correctionSeconds: 10 });
		const { container } = await open(threeItems(), { start: false });

		expect(text(container, 'series-start-summary')).toBe('3 questions · environ 1 min');
	});

	it('les réglages de la page d’attente sont gardés', async () => {
		const { container } = await open(threeItems(), { start: false });

		toggle(container, 'Pause à la fin du temps');
		toggle(container, 'Correction après chaque question');
		expect(classroomSettings.settings.pauseAtEnd).toBe(true);
		expect(classroomSettings.settings.correctionAfterEach).toBe(true);
	});

	it('plein écran au lancement si le réglage est allumé', async () => {
		useSettings({ fullscreenOnStart: true });
		const request = vi
			.spyOn(HTMLElement.prototype, 'requestFullscreen')
			.mockResolvedValue(undefined);
		await open(threeItems());

		expect(request).toHaveBeenCalledTimes(1);
	});

	it('plein écran refusé : la série démarre quand même', async () => {
		useSettings({ fullscreenOnStart: true });
		vi.spyOn(HTMLElement.prototype, 'requestFullscreen').mockRejectedValue(new Error('refusé'));
		const { container } = await open(threeItems());
		await tick();

		expect(activeSlideText(container)).toContain('Énoncé A');
		elapse(10_000);
		expect(activeSlideText(container)).toContain('Énoncé B');
	});

	it('pas de plein écran si le réglage est éteint', async () => {
		const request = vi
			.spyOn(HTMLElement.prototype, 'requestFullscreen')
			.mockResolvedValue(undefined);
		await open(threeItems());

		expect(request).not.toHaveBeenCalled();
	});
});

describe('ClassroomSeries — correction après chaque question', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings({ correctionAfterEach: true, correctionSeconds: 10 });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('question, puis sa correction pendant la durée réglée, puis la question suivante', async () => {
		const { container } = await open(threeItems());
		expect(activeBackIsShown(container)).toBe(false);

		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Correction 1 / 3');
		expect(activeSlideText(container)).toContain('Correction de Énoncé A');
		expect(activeBackIsShown(container)).toBe(true);
		expect(text(container, 'classroom-remaining')).toBe('10');

		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(activeBackIsShown(container)).toBe(false);
	});

	it('−5 s / +5 s pendant une correction règlent la durée des corrections', async () => {
		const { container } = await open(threeItems());
		elapse(10_000);

		expect(text(container, 'classroom-duration')).toBe('10 s');
		click(container, 'Augmenter la durée de 5 secondes');
		expect(text(container, 'classroom-duration')).toBe('15 s');
		expect(classroomSettings.settings.correctionSeconds).toBe(15);

		// La question suivante garde sa propre durée
		elapse(15_000);
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');
		expect(text(container, 'classroom-duration')).toBe('10 s');
	});

	it('la dernière correction terminée mène aux grilles de fin', async () => {
		const { container } = await open([item('Énoncé A', 5, 'x')]);
		elapse(5000);
		expect(text(container, 'classroom-position')).toBe('Correction 1 / 1');
		elapse(10_000);
		await tick();

		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).not.toBeNull();
	});
});

describe('ClassroomSeries — pause à la fin du temps', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings({ pauseAtEnd: true });
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('à 0 la question reste, en pause ; Espace passe à la suivante', async () => {
		const { container } = await open(threeItems());

		elapse(10_000);
		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-remaining')).toBe('0');
		expect(container.textContent).toContain('Temps écoulé');

		await pressSpace(container);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(text(container, 'classroom-remaining')).toBe('10');
		elapse(3000);
		expect(text(container, 'classroom-remaining')).toBe('7');
	});

	it('avec la correction : question, pause, puis correction, sans pause après elle', async () => {
		useSettings({ pauseAtEnd: true, correctionAfterEach: true, correctionSeconds: 10 });
		const { container } = await open(threeItems());

		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Question 1 / 3');
		await pressSpace(container);
		expect(text(container, 'classroom-position')).toBe('Correction 1 / 3');

		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');
	});

	it('dernière question en pause : Espace mène aux grilles de fin', async () => {
		const { container } = await open([item('Énoncé A', 5, 'x')]);
		elapse(5000);
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).toBeNull();

		await pressSpace(container);
		await tick();
		expect(container.querySelector('[data-testid="classroom-questions-grid"]')).not.toBeNull();
	});
});

describe('ClassroomSeries — son entre deux questions', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		playChime.mockClear();
		unlockChime.mockClear();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('allumé : débloqué au lancement, un son à chaque nouvelle question, pas à la première', async () => {
		useSettings({ chime: true });
		const { container } = await open(threeItems());
		expect(unlockChime).toHaveBeenCalled();
		expect(playChime).not.toHaveBeenCalled();

		elapse(10_000);
		expect(activeSlideText(container)).toContain('Énoncé B');
		expect(playChime).toHaveBeenCalledTimes(1);
	});

	it('pas de son pour une correction', async () => {
		useSettings({ chime: true, correctionAfterEach: true, correctionSeconds: 10 });
		const { container } = await open(threeItems());

		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Correction 1 / 3');
		expect(playChime).not.toHaveBeenCalled();
		elapse(10_000);
		expect(playChime).toHaveBeenCalledTimes(1);
	});

	it('éteint : aucun son', async () => {
		useSettings({ chime: false });
		await open(threeItems());
		elapse(20_000);

		expect(playChime).not.toHaveBeenCalled();
	});
});

describe('ClassroomSeries — réglages pendant la série', () => {
	beforeEach(() => {
		vi.useFakeTimers({ toFake: ['setTimeout', 'clearTimeout', 'Date'] });
		useSettings();
	});
	afterEach(() => {
		vi.useRealTimers();
	});

	it('ouvrir les réglages met en pause, les fermer reprend', async () => {
		const { container } = await open(threeItems());
		elapse(4000);

		click(container, 'Réglages');
		expect(container.querySelector('[data-testid="classroom-settings-panel"]')).not.toBeNull();
		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');

		click(container, 'Fermer les réglages');
		expect(container.querySelector('[data-testid="classroom-settings-panel"]')).toBeNull();
		elapse(6000);
		expect(activeSlideText(container)).toContain('Énoncé B');
	});

	it('panneau ouvert : Espace et les flèches ne relancent ni ne déplacent le diaporama', async () => {
		const { container } = await open(threeItems());
		elapse(4000);

		click(container, 'Réglages');
		// Le panneau prend le focus : les touches ne vont plus au diaporama
		const panel = container.querySelector('[data-testid="classroom-settings-panel"]');
		expect(panel?.contains(document.activeElement)).toBe(true);
		await userEvent.keyboard(' ');
		flushSync();
		await userEvent.keyboard('{ArrowRight}');
		flushSync();
		elapse(60_000);
		expect(activeSlideText(container)).toContain('Énoncé A');
		expect(text(container, 'classroom-remaining')).toBe('6');
	});

	it('Échap ferme le panneau et reprend', async () => {
		const { container } = await open(threeItems());
		elapse(4000);

		click(container, 'Réglages');
		await userEvent.keyboard('{Escape}');
		flushSync();
		expect(container.querySelector('[data-testid="classroom-settings-panel"]')).toBeNull();
		elapse(6000);
		expect(activeSlideText(container)).toContain('Énoncé B');
	});

	it('« Temps écoulé » puis correction allumée : la question repart, sans « Temps écoulé »', async () => {
		useSettings({ pauseAtEnd: true });
		const { container } = await open(threeItems());
		elapse(10_000);
		expect(container.textContent).toContain('Temps écoulé');

		click(container, 'Réglages');
		toggle(container, 'Correction après chaque question');
		click(container, 'Fermer les réglages');
		await tick();
		flushSync();

		expect(container.textContent).not.toContain('Temps écoulé');
		expect(text(container, 'classroom-position')).toBe('Question 1 / 3');
	});

	it('allumer la correction en cours de route garde la question affichée', async () => {
		const { container } = await open(threeItems());
		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');

		click(container, 'Réglages');
		toggle(container, 'Correction après chaque question');
		click(container, 'Fermer les réglages');
		await tick();
		flushSync();

		expect(text(container, 'classroom-position')).toBe('Question 2 / 3');
		expect(activeSlideText(container)).toContain('Énoncé B');
		elapse(10_000);
		expect(text(container, 'classroom-position')).toBe('Correction 2 / 3');
	});
});
