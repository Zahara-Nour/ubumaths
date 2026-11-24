/**
 * Mots du dictionnaire masqués par défaut (R6 du chantier `mots-cliquables`,
 * comportements B1–B7 validés par David le 2026-11-16) : un bouton sur la
 * carte affiche leur soulignement, choix mémorisé sur l'appareil.
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import QuestionCard from '../QuestionCard.svelte';
import FlashCard from '../FlashCard.svelte';
import { generateInstance } from '#lib/questions/generator/instance-generator.ts';
import type { QuestionInstance, QuestionTemplate } from '#lib/questions/types.ts';
import { resolvedMarkdown, templateMarkdown } from '#lib/ubumark/index.ts';
import {
	LEXICON_VISIBILITY_STORAGE_KEY,
	setLexiconShown
} from '#lib/dictionary/visibility.svelte.ts';

// Le dictionnaire arrive de /api/dictionnaire (ADR 0022) : ici, le jeu de référence figé
vi.mock('#lib/dictionary/fetch-dictionary.ts', async () => {
	const { REFERENCE_DICTIONARY: entries } =
		await import('../../../../../tests/fixtures/lexique/dictionnaire-reference');
	return { fetchDictionary: async () => entries };
});

// Souris par défaut ; B4 passe à un écran tactile
const pointer = vi.hoisted(() => ({ canHover: true }));
vi.mock('#lib/dictionary/can-hover.svelte.ts', () => ({ canHover: () => pointer.canHover }));

const TOGGLE = 'Mots du dictionnaire';

function instanceOf(statement: string, choices: string[] = ['$$4$$', '$$3$$']): QuestionInstance {
	const template = {
		id: '00000000-0000-4000-8000-0000000000d2',
		title: 'Mots du dictionnaire',
		level: 1,
		grades: ['6'],
		status: 'published',
		variations: [
			{
				statement: templateMarkdown(
					`${statement}\n\n\`\`\`choix\n${choices.map((choice) => `- ${choice}`).join('\n')}\n\`\`\``
				),
				blanks: [{ expectedAnswer: '0' }]
			}
		]
	} as unknown as QuestionTemplate;
	const result = generateInstance(template, 1);
	if (!result.success) throw new Error('instance non générée');
	return result.instance;
}

function terms(container: HTMLElement): HTMLButtonElement[] {
	return [...container.querySelectorAll<HTMLButtonElement>('button.lexicon-term')];
}

function toggleOf(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector<HTMLButtonElement>(`button[aria-label="${TOGGLE}"]`);
}

function underlined(element: Element): boolean {
	return getComputedStyle(element).textDecorationLine.includes('underline');
}

async function renderCard(statement = 'Le quotient du pourcentage à l’échelle.') {
	const result = await render(QuestionCard, { interactive: true, instance: instanceOf(statement) });
	await expect.poll(() => terms(result.container).length).toBe(3);
	return result;
}

beforeEach(() => {
	localStorage.clear();
	pointer.canHover = true;
});

afterEach(() => {
	vi.restoreAllMocks();
	localStorage.clear();
	// Le choix de la page (stockage bloqué) ne déborde pas sur le test suivant
	setLexiconShown(false);
});

describe('mots du dictionnaire masqués par défaut (R6)', () => {
	it('B1. première visite : aucun mot souligné, bouton présent, non pressé', async () => {
		const { container } = await renderCard();
		const toggle = toggleOf(container);
		expect(toggle).not.toBeNull();
		expect(toggle?.getAttribute('aria-pressed')).toBe('false');
		for (const term of terms(container)) expect(underlined(term)).toBe(false);
	});

	it('B2. le bouton affiche les mots, sur cette carte et les suivantes, mémorisé sur l’appareil', async () => {
		const { container } = await renderCard();
		await userEvent.click(toggleOf(container)!);
		await expect.poll(() => toggleOf(container)?.getAttribute('aria-pressed')).toBe('true');
		await expect.poll(() => terms(container).every(underlined)).toBe(true);
		expect(localStorage.getItem(LEXICON_VISIBILITY_STORAGE_KEY)).toBe('shown');

		const next = await renderCard();
		expect(terms(next.container).every(underlined)).toBe(true);
		expect(toggleOf(next.container)?.getAttribute('aria-pressed')).toBe('true');

		// Second clic : de nouveau masqués partout
		await userEvent.click(toggleOf(next.container)!);
		await expect.poll(() => terms(container).some(underlined)).toBe(false);
		expect(localStorage.getItem(LEXICON_VISIBILITY_STORAGE_KEY)).toBe('hidden');
	});

	it('B2. au rechargement, le choix mémorisé est repris', async () => {
		localStorage.setItem(LEXICON_VISIBILITY_STORAGE_KEY, 'shown');
		const { container } = await renderCard();
		expect(toggleOf(container)?.getAttribute('aria-pressed')).toBe('true');
		expect(terms(container).every(underlined)).toBe(true);
	});

	it('B3. masqué, à la souris : survol → souligné ; clic → sa fiche', async () => {
		const { container } = await renderCard();
		const [, mot] = terms(container);
		expect(underlined(mot)).toBe(false);
		await userEvent.hover(mot);
		await expect.poll(() => underlined(mot)).toBe(true);
		await userEvent.click(mot);
		await expect
			.poll(() => document.querySelector('[role="dialog"]')?.textContent)
			.toContain('pourcentage');
	});

	it('B4. masqué, écran tactile : les mots ne sont pas cliquables', async () => {
		pointer.canHover = false;
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Le quotient du pourcentage à l’échelle.')
		});
		// Le bouton prouve que les mots sont repérés ; ils restent du texte
		await expect.poll(() => toggleOf(container)).not.toBeNull();
		expect(terms(container)).toEqual([]);
		expect(container.textContent).toContain('échelle');

		await userEvent.click(toggleOf(container)!);
		await expect.poll(() => terms(container).length).toBe(3);
		expect(terms(container).every(underlined)).toBe(true);
	});

	it('B5. masqué, au clavier : Tab saute les mots ; affiché, il s’y arrête', async () => {
		const { container } = await renderCard();
		const toggle = toggleOf(container)!;
		toggle.focus();
		await userEvent.tab();
		expect(document.activeElement?.classList.contains('lexicon-term')).toBe(false);

		await userEvent.click(toggle);
		await expect.poll(() => toggle.getAttribute('aria-pressed')).toBe('true');
		toggle.focus();
		await userEvent.tab();
		expect(document.activeElement?.textContent).toBe('quotient');
	});

	it('B6. aucun mot repéré sur la carte : pas de bouton', async () => {
		// Une carte à mots d'abord : le dictionnaire est chargé, l'absence prouve la règle
		await renderCard();
		const { container } = await render(QuestionCard, {
			interactive: true,
			instance: instanceOf('Combien font $$2+2$$ ?')
		});
		await expect.poll(() => container.textContent).toContain('Combien');
		expect(terms(container)).toEqual([]);
		expect(toggleOf(container)).toBeNull();
	});

	it('B6. évaluation notée : ni mot, ni bouton', async () => {
		await renderCard();
		const { container } = await render(QuestionCard, {
			interactive: true,
			collectOnly: true,
			instance: instanceOf('Le quotient du pourcentage à l’échelle.')
		});
		await expect.poll(() => container.textContent).toContain('échelle');
		expect(toggleOf(container)).toBeNull();
	});

	it('B7. mémoire illisible : masqué, aucune erreur, le bouton marche pour la page', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new DOMException('bloqué', 'SecurityError');
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new DOMException('bloqué', 'SecurityError');
		});
		const { container } = await renderCard();
		expect(toggleOf(container)?.getAttribute('aria-pressed')).toBe('false');
		expect(terms(container).some(underlined)).toBe(false);

		await userEvent.click(toggleOf(container)!);
		await expect.poll(() => terms(container).every(underlined)).toBe(true);
	});

	it('le bouton est aussi sur le recto d’une flash-card', async () => {
		const { container } = await render(FlashCard, {
			instance: instanceOf('Le quotient du pourcentage à l’échelle.')
		});
		const front = () => container.querySelector('.flip-front') ?? container;
		await expect.poll(() => toggleOf(front() as HTMLElement)).not.toBeNull();
	});

	// Revue de la PR : la carte de cours n'avait pas de bouton, ses mots masqués étaient perdus au doigt
	it('carte de cours : le bouton est là aussi', async () => {
		pointer.canHover = false;
		const course = {
			templateId: 'carte',
			// Question de cours : seuls les mots marqués sont repérés (R4)
			statement: resolvedMarkdown('Quel est le [quotient]{.def} de $6$ par $2$ ?'),
			correction: { steps: [resolvedMarkdown('Longueur fois largeur.')] },
			options: { courseCard: true },
			grades: ['6'],
			level: 1,
			generatedAt: new Date().toISOString()
		} as QuestionInstance;
		const { container } = await render(QuestionCard, { interactive: true, instance: course });
		await expect.poll(() => toggleOf(container)).not.toBeNull();
		await userEvent.click(toggleOf(container)!);
		await expect.poll(() => terms(container).length).toBeGreaterThan(0);
	});
});
