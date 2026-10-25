/**
 * La fenêtre de réglages de l'atelier, et le choix de la saisie dans Calcul.
 *
 * Phase 0 `docs/archive/wip/atelier-reglages-phase0.md` : « Texte » par défaut, le
 * choix prend effet tout de suite et reste dans ce navigateur, la ligne en
 * cours suit la bascule, les réponses ne changent pas.
 */

import { describe, it, expect, vi, afterEach, beforeEach } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { page, userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { INPUT_MODE_KEY } from '$lib/atelier/input-mode';
import { POINT_DRAG_MODE_KEY } from '$lib/atelier/point-drag-mode';
import { chooseObjectAction } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

type Choice = 'Texte' | 'Écriture mathématique' | 'Aimanté' | 'Fluide';

beforeEach(() => {
	localStorage.removeItem(INPUT_MODE_KEY);
	localStorage.removeItem(POINT_DRAG_MODE_KEY);
});

// Le stockage est celui de l'origine, commun à tous les fichiers de tests du
// navigateur : laissé sur « Écriture mathématique », il retirait le champ
// texte des tests suivants (mesuré : 7 échecs dans deux autres fichiers)
afterEach(() => {
	localStorage.removeItem(INPUT_MODE_KEY);
	localStorage.removeItem(POINT_DRAG_MODE_KEY);
});

/** Un atelier reçu par lien (éphémère) : les réglages y sont aussi. */
async function open(atelier = new Atelier()) {
	const view = await render(AtelierContainer, { atelier, ephemeral: true });
	const container = view.container;
	const calcul = () => container.querySelector('.calcul form') as HTMLFormElement;
	// Hors de l'onglet Calcul, la vue n'existe plus : aucun champ
	const textField = () =>
		(container.querySelector('.calcul form input[type="text"]') as HTMLInputElement | null) ?? null;
	const mathField = () =>
		(container.querySelector('.calcul form math-field') as MathfieldElement | null) ?? null;
	const settingsButton = () =>
		[...container.querySelectorAll('button')].find(
			(b) => b.getAttribute('aria-label') === 'Réglages'
		);
	const history = () => container.querySelector('.historique')?.textContent ?? '';

	/** Un VRAI clic : c'est lui qui donne le focus au bouton, que la fenêtre rendra. */
	async function openSettings() {
		const button = settingsButton();
		if (button === undefined) throw new Error('pas de bouton « Réglages »');
		await userEvent.click(button);
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeTruthy());
	}

	async function choose(choice: Choice) {
		await openSettings();
		await page.getByRole('radio', { name: new RegExp(`^${choice}`) }).click();
		await userEvent.keyboard('{Escape}');
		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
	}

	/** Le mode texte : la valeur posée, comme une frappe. */
	async function typeText(text: string) {
		const field = textField();
		if (field === null) throw new Error('pas de champ texte');
		field.value = text;
		field.dispatchEvent(new Event('input', { bubbles: true }));
		await vi.waitFor(() => expect(field.value).toBe(text));
	}

	/** Le mode mathématique : de VRAIES frappes, curseur en fin de champ. */
	async function typeMath(keys: string) {
		const field = mathField();
		if (field === null) throw new Error('pas de champ mathématique');
		await userEvent.click(field);
		await vi.waitFor(() => expect(document.activeElement).toBe(field));
		field.executeCommand('moveToMathfieldEnd');
		await userEvent.keyboard(keys);
	}

	function tab(label: string): HTMLButtonElement {
		const found = [...container.querySelectorAll('.onglet')].find((t) =>
			t.textContent?.trim().startsWith(label)
		);
		if (!found) throw new Error(`pas d'onglet ${label}`);
		return found as HTMLButtonElement;
	}

	function card(name: string): HTMLElement {
		const found = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === name
		);
		if (!found) throw new Error(`pas de carte ${name}`);
		return found as HTMLElement;
	}

	return {
		container,
		tab,
		card,
		calcul,
		textField,
		mathField,
		settingsButton,
		history,
		openSettings,
		choose,
		typeText,
		typeMath
	};
}

// =============================================================================
// La fenêtre
// =============================================================================

describe('la fenêtre de réglages', () => {
	it('un bouton « Réglages » l’ouvre ; « Texte » est choisi par défaut', async () => {
		const { settingsButton, openSettings, textField, mathField } = await open();

		expect(settingsButton()).toBeTruthy();
		await openSettings();

		await expect
			.element(page.getByRole('heading', { name: 'Réglages de l’atelier' }))
			.toBeVisible();
		await expect
			.element(page.getByRole('radio', { name: /^Texte/ }))
			.toHaveAttribute('aria-checked', 'true');
		await expect
			.element(page.getByRole('radio', { name: /^Écriture mathématique/ }))
			.toHaveAttribute('aria-checked', 'false');
		// Le mode mathématique est annoncé comme un essai (décision 2 de David)
		expect(document.querySelector('[role="dialog"]')?.textContent).toContain('en essai');
		expect(textField()).toBeTruthy();
		expect(mathField()).toBeNull();
	});

	it('Échap la ferme et rend le focus au bouton', async () => {
		const { settingsButton, openSettings } = await open();

		await openSettings();
		await userEvent.keyboard('{Escape}');

		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await vi.waitFor(() => expect(document.activeElement).toBe(settingsButton()));
	});
});

// =============================================================================
// Le déplacement des points (2026-10-22)
// =============================================================================

describe('le choix du déplacement des points', () => {
	it('« Aimanté » est choisi par défaut', async () => {
		const atelier = new Atelier();
		const { openSettings } = await open(atelier);

		await openSettings();

		await expect
			.element(page.getByRole('radio', { name: /^Aimanté/ }))
			.toHaveAttribute('aria-checked', 'true');
		expect(atelier.pointDragMode).toBe('snap');
	});

	it('« Fluide » vaut tout de suite pour l’atelier, et se retient', async () => {
		const atelier = new Atelier();
		const { choose } = await open(atelier);

		await choose('Fluide');

		expect(atelier.pointDragMode).toBe('fluid');
		expect(localStorage.getItem(POINT_DRAG_MODE_KEY)).toBe('fluid');

		await choose('Aimanté');

		expect(atelier.pointDragMode).toBe('snap');
		expect(localStorage.getItem(POINT_DRAG_MODE_KEY)).toBe('snap');
	});

	it('le choix retenu vaut dès l’ouverture de l’atelier', async () => {
		localStorage.setItem(POINT_DRAG_MODE_KEY, 'fluid');
		const atelier = new Atelier();

		await open(atelier);

		expect(atelier.pointDragMode).toBe('fluid');
	});
});

// =============================================================================
// Le choix de la saisie
// =============================================================================

describe('le choix de la saisie dans Calcul', () => {
	it('« Écriture mathématique » met un champ MathLive à la place, tout de suite, et le retient', async () => {
		const { choose, textField, mathField } = await open();

		await choose('Écriture mathématique');

		await vi.waitFor(() => expect(mathField()).toBeTruthy());
		expect(textField()).toBeNull();
		expect(localStorage.getItem(INPUT_MODE_KEY)).toBe('math');
	});

	it('le choix retenu vaut dès l’ouverture de l’atelier', async () => {
		localStorage.setItem(INPUT_MODE_KEY, 'math');
		const { mathField, textField } = await open();

		await vi.waitFor(() => expect(mathField()).toBeTruthy());
		expect(textField()).toBeNull();
	});

	it('revenir à « Texte » rend le champ texte', async () => {
		const { choose, textField, mathField } = await open();

		await choose('Écriture mathématique');
		await choose('Texte');

		await vi.waitFor(() => expect(textField()).toBeTruthy());
		expect(mathField()).toBeNull();
		expect(localStorage.getItem(INPUT_MODE_KEY)).toBe('text');
	});

	it('la ligne en cours de frappe suit la bascule, dans les deux sens', async () => {
		const { choose, typeText, textField, mathField } = await open();

		await typeText('x^2+1');
		await choose('Écriture mathématique');
		await vi.waitFor(() => expect(mathField()?.value).toMatch(/x\^2\s*\+\s*1/));

		await choose('Texte');
		await vi.waitFor(() => expect(textField()?.value).toMatch(/x\^2\s*\+\s*1/));
	});
});

// =============================================================================
// Calculer en écriture mathématique
// =============================================================================

describe('Calcul en écriture mathématique', () => {
	it('Entrée calcule', async () => {
		const { choose, typeMath, history, mathField } = await open();
		await choose('Écriture mathématique');

		await typeMath('2+3{Enter}');

		await vi.waitFor(() => expect(history()).toContain('5'));
		// Le champ est vidé, prêt pour la ligne suivante
		expect(mathField()?.value).toBe('');
	});

	// David, 2026-10-15 : `*` au clavier écrivait le point `\cdot` de MathLive
	it('`*` au clavier écrit la croix ×, et le calcul se fait', async () => {
		const { choose, typeMath, mathField, history } = await open();
		await choose('Écriture mathématique');

		await typeMath('3*4');
		await vi.waitFor(() => expect(mathField()?.value).toContain('\\times'));
		expect(mathField()?.value).not.toContain('\\cdot');
		await userEvent.keyboard('{Enter}');

		await vi.waitFor(() => expect(history()).toContain('12'));
	});

	it('une commande s’écrit sans point', async () => {
		const { choose, typeMath, history } = await open();
		await choose('Écriture mathématique');

		await typeMath('dériver x^3{Enter}');

		// 3x² composé par MathLive : « 3x2 » en texte
		await vi.waitFor(() => expect(history()).toContain('3x2'));
	});

	it('le bouton « Calculer » calcule aussi', async () => {
		const { choose, typeMath, history, calcul } = await open();
		await choose('Écriture mathématique');

		await typeMath('4+3');
		const button = [...calcul().querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === 'Calculer'
		);
		await vi.waitFor(() => expect(button?.disabled).toBe(false));
		button?.click();

		await vi.waitFor(() => expect(history()).toContain('7'));
	});

	it('↑ rappelle une saisie faite en mode texte, réécrite pour le champ', async () => {
		const { choose, typeText, calcul, typeMath, mathField } = await open();

		await typeText('.dériver x^3');
		calcul().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		await choose('Écriture mathématique');
		await typeMath('{ArrowUp}');

		await vi.waitFor(() => expect(mathField()?.value).toContain('\\text{dériver}'));
	});

	it('↑ une seconde fois remonte à la saisie d’avant', async () => {
		const { choose, typeText, calcul, typeMath, mathField } = await open();
		const submitText = async (text: string) => {
			await typeText(text);
			calcul().dispatchEvent(new SubmitEvent('submit', { bubbles: true, cancelable: true }));
		};

		await submitText('2+3');
		// Réécrite pour le champ (`\exponentialE^{2 x}`), puis rangée autrement
		// par MathLive (`{2x}`, mesuré) : ↑ ne doit pas la croire modifiée
		await submitText('e^(2x)');
		await choose('Écriture mathématique');
		await typeMath('{ArrowUp}');
		await vi.waitFor(() => expect(mathField()?.value).toContain('exponentialE'));
		await userEvent.keyboard('{ArrowUp}');

		await vi.waitFor(() => expect(mathField()?.value).toMatch(/^2\s*\+\s*3$/));
	});

	it('une case vide du modèle : la ligne reste, la raison est dite', async () => {
		const { choose, container, mathField, history, typeMath } = await open();
		await choose('Écriture mathématique');
		const field = mathField();
		if (field === null) throw new Error('pas de champ mathématique');
		field.value = String.raw`\text{intégrer}\,\placeholder{}`;

		await typeMath('{Enter}');

		await vi.waitFor(() =>
			expect(container.querySelector('.retour')?.textContent).toContain('case du modèle')
		);
		expect(field.value).toContain('placeholder');
		expect(history()).toBe('');
	});

	it('la liste et le modèle du mode texte ne s’ouvrent pas', async () => {
		const { choose, typeMath, container } = await open();
		await choose('Écriture mathématique');

		await typeMath('résoudre ');

		await vi.waitFor(() => expect(container.textContent).not.toContain('Modèle :'));
		expect(container.querySelector('[aria-label="Commandes disponibles"]')).toBeNull();
	});
});

// =============================================================================
// Revues : la ligne venue du dehors, l'onglet, l'accessibilité
// =============================================================================

describe('la ligne venue du dehors, en écriture mathématique', () => {
	it('une commande préparée par une carte arrive entière, et calcule', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3;4;5;6' });
		atelier.create({ kind: 'list', name: 'M', definition: '1/6;1/6;1/6;1/6;1/6;1/6' });
		const { choose, mathField, typeMath, history, container } = await open(atelier);
		await choose('Écriture mathématique');

		// Lot 4a de la refonte : l'action est dans le sous-menu « Avec une autre liste »
		await chooseObjectAction(container, 'L', 'Simuler avec probabilités M');
		// Les arguments séparés par `\,` : une espace simple ne se voit pas en
		// mathématiques, l'élève lisait « simuler LM100 » (revue du 2026-10-14)
		await vi.waitFor(() => expect(mathField()?.value).toContain(String.raw`L\,M\,100`));
		await typeMath('{Enter}');

		await vi.waitFor(() => expect(history()).toContain('100'));
		expect(container.querySelector('.historique li.refus')).toBeNull();
	});

	// Revue de #1501 : « Tableau croisé » part, comme « Simuler », une fois le menu
	// fermé (`onOpenChangeComplete`) — sinon la console n'obtient pas le focus
	it('« Tableau croisé » prépare sa commande dans la console, qui a le focus', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'C', definition: 'rouge;vert;rouge' });
		atelier.create({ kind: 'list', name: 'D', definition: 'grand;petit;grand' });
		const { choose, mathField, container } = await open(atelier);
		await choose('Écriture mathématique');

		await chooseObjectAction(container, 'C', 'Tableau croisé avec D');

		await vi.waitFor(() => expect(mathField()?.value).toContain('croiser'));
		await vi.waitFor(() => expect(document.activeElement).toBe(mathField()));
	});

	it('fermer et rouvrir la console garde la ligne en cours, cases du modèle comprises', async () => {
		const { choose, typeMath, mathField, container } = await open();
		await choose('Écriture mathématique');

		await typeMath('intégrer');
		await userEvent.keyboard('{Tab}');
		await vi.waitFor(() => expect(mathField()?.value).toContain('placeholder'));
		const before = mathField()?.value;
		const consoleButton = container.querySelector(
			'button[aria-label="Console"]'
		) as HTMLButtonElement;
		consoleButton.click();
		await vi.waitFor(() => expect(consoleButton.getAttribute('aria-expanded')).toBe('false'));
		consoleButton.click();

		await vi.waitFor(() => expect(consoleButton.getAttribute('aria-expanded')).toBe('true'));
		expect(mathField()?.value).toBe(before);
	});
});

describe('l’accessibilité du champ mathématique et de la fenêtre', () => {
	it('les propositions sont annoncées aux lecteurs d’écran', async () => {
		const { choose, typeMath, calcul } = await open();
		await choose('Écriture mathématique');

		await typeMath('rés');

		await vi.waitFor(() =>
			expect(calcul().parentElement?.querySelector('[role="status"]')?.textContent).toMatch(
				/résoudre, 1 sur \d+/
			)
		);
	});

	it('la liste des propositions reste dans l’écran quand le champ est en bas', async () => {
		const { choose, typeMath, container } = await open();
		// L'atelier sur toute la hauteur : le champ de Calcul est en bas de l'écran
		container.style.height = '100vh';
		await choose('Écriture mathématique');

		await typeMath('ré');

		const list = await vi.waitFor(() => {
			const found = document.querySelector('[role="listbox"]');
			expect(found).toBeTruthy();
			return found as HTMLElement;
		});
		// « résoudre » et « réciproque » : visibles en entier, pas dans un ruban qui défile
		const options = [...list.querySelectorAll('[role="option"]')].slice(0, 2);
		expect(options).toHaveLength(2);
		const shown = list.getBoundingClientRect();
		for (const option of options) {
			const box = option.getBoundingClientRect();
			expect(box.top).toBeGreaterThanOrEqual(Math.max(0, shown.top));
			expect(box.bottom).toBeLessThanOrEqual(Math.min(window.innerHeight, shown.bottom));
		}
	});

	it('la croix « Fermer » ferme la fenêtre et rend le focus au bouton', async () => {
		const { settingsButton, openSettings } = await open();

		await openSettings();
		// `exact` : « Fermer la console » est aussi un bouton de la page
		await page.getByRole('button', { name: 'Fermer', exact: true }).click();

		await vi.waitFor(() => expect(document.querySelector('[role="dialog"]')).toBeNull());
		await vi.waitFor(() => expect(document.activeElement).toBe(settingsButton()));
	});
});
