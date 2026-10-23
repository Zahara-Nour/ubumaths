/**
 * Les cartes d'une valeur, d'une suite et d'une liste — lot 4a de
 * `docs/archive/wip/atelier-refonte-interface-phase0.md`.
 *
 * Décisions de David (2026-10-18, « je suis tes recos ») : la grammaire de la
 * carte de fonction (lot 3) pour tous — une ligne `● nom = [définition]`,
 * l'œil si l'objet se trace, un menu Affichage / Actions, Renommer et
 * Supprimer en fin de menu. Une liste se modifie dans Données (aperçu sur la
 * ligne) ; ses actions à deux listes passent par « Avec une autre liste » ; le
 * curseur d'une valeur qui n'est pas un paramètre est caché, affichable depuis
 * le menu ; le premier terme d'une récurrence est sous la ligne.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { actionsFor, partnersOf } from '$lib/atelier/actions';
import { isSequence, isValue } from '$lib/atelier/types';
import { cardOf, chooseObjectAction, menuItemOf, openCardMenu } from './harness/function-card';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

// =============================================================================
// Décor
// =============================================================================

function fieldOf(card: HTMLElement): MathfieldElement {
	const field = card.querySelector('math-field');
	if (!field) throw new Error('pas de champ');
	return field as MathfieldElement;
}

/** Le premier clic de la session est parfois perdu par MathLive (mesuré). */
async function typeInto(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	await userEvent.keyboard(keys);
}

function input(root: ParentNode, label: string): HTMLInputElement {
	const found = root.querySelector(`input[aria-label="${label}"]`) as HTMLInputElement | null;
	if (!found) throw new Error(`pas de champ « ${label} »`);
	return found;
}

function setInput(field: HTMLInputElement, value: string) {
	field.value = value;
	field.dispatchEvent(new Event('input', { bubbles: true }));
}

/** Valider un champ (Entrée ou sortie du champ : l'événement `change`). */
function commitInput(field: HTMLInputElement) {
	field.dispatchEvent(new Event('change', { bubbles: true }));
}

/** Les libellés des éléments d'un menu ouvert (le libellé, sans la raison). */
function labelsOf(menu: HTMLElement): string[] {
	return [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map((el) =>
		(el.querySelector('.item > span')?.textContent ?? el.textContent ?? '').trim()
	);
}

async function closeMenu() {
	await userEvent.keyboard('{Escape}');
	await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());
}

/** Ouvrir le sous-menu « Avec une autre liste » du menu ouvert ; rend son contenu. */
async function openPartnerSubmenu(menu: HTMLElement): Promise<HTMLElement> {
	const trigger = menuItemOf(menu, 'Avec une autre liste');
	trigger.focus();
	await userEvent.keyboard('{ArrowRight}');
	return vi.waitFor(() => {
		const menus = document.querySelectorAll<HTMLElement>('[role="menu"]');
		expect(menus.length).toBe(2);
		return menus[1];
	});
}

// =============================================================================
// Valeur
// =============================================================================

describe('carte d’une valeur — une ligne', () => {
	it('montre a = et le champ sans rien ouvrir, sans libellé « valeur » ni 👁', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'a');
		expect(fieldOf(card).value.replace(/\s+/g, '')).toBe('3');
		expect(card.textContent?.replace(/\s+/g, '')).toContain('a=');
		expect(card.querySelector('.type')).toBeNull();
		expect(card.textContent).not.toMatch(/valeur/i);
		expect(card.querySelector('button[aria-label="Options de a"]')).toBeTruthy();
		expect(card.querySelector('button[aria-label^="Tracer"]')).toBeNull();
	});

	it('range la définition à Entrée, et Échap rétablit', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '3' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const field = fieldOf(cardOf(container, 'a'));

		await typeInto(field, '{End}5');
		await new Promise((resolve) => setTimeout(resolve, 600));
		expect(atelier.get('a')?.definition).toBe('3');
		await userEvent.keyboard('{Enter}');
		await vi.waitFor(() => expect(atelier.get('a')?.definition).toBe('35'));

		await userEvent.keyboard('{End}7{Escape}');
		await vi.waitFor(() => expect(field.value.replace(/\s+/g, '')).toBe('35'));
		expect(atelier.get('a')?.definition).toBe('35');
	});

	it('une grandeur s’écrit avec son unité sur la ligne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'v', definition: '12[km]' }, 'url');
		const { container } = await render(WithAtelier, { atelier });

		expect(fieldOf(cardOf(container, 'v')).value).toContain('km');
	});
});

describe('carte d’une valeur — le curseur', () => {
	it('un paramètre a son curseur SOUS la ligne, sans rien ouvrir', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const thumb = await vi.waitFor(() => {
			const found = cardOf(container, 'a').querySelector('[role="slider"]');
			expect(found).toBeTruthy();
			return found!;
		});
		await vi.waitFor(() => expect(thumb.getAttribute('aria-label')).toBe('Curseur de a'));
		// Les bornes ne sont plus sur la carte : elles sont dans une petite fenêtre
		expect(cardOf(container, 'a').querySelector('input[aria-label^="de, minimum"]')).toBeNull();
	});

	it('une valeur qui n’est pas un paramètre : curseur caché, affichable depuis le menu', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeNull();
		const menu = await openCardMenu(container, 'a');
		const item = menuItemOf(menu, 'Curseur');
		expect(item.getAttribute('aria-checked')).toBe('false');
		item.click();

		await vi.waitFor(() =>
			expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeTruthy()
		);
	});

	// Décision de David du 2026-10-18 : retenu avec l'atelier, il survit au
	// rechargement (une carte remontée depuis l'état rangé)
	it('le curseur affiché depuis le menu est retenu : une carte remontée le montre', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		const first = await render(WithAtelier, { atelier });
		const menu = await openCardMenu(first.container, 'a');
		menuItemOf(menu, 'Curseur').click();
		await vi.waitFor(() => {
			const a = atelier.get('a');
			expect(a && isValue(a) && a.sliderShown).toBe(true);
		});
		await first.unmount();

		const fresh = new Atelier();
		fresh.restore(atelier.serialize());
		const { container } = await render(WithAtelier, { atelier: fresh });

		expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeTruthy();
	});

	it('un paramètre garde son curseur : l’élément du menu le dit, coché', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'a');
		const item = menuItemOf(menu, 'Curseur');
		expect(item.getAttribute('aria-checked')).toBe('true');
		expect(item.getAttribute('aria-disabled')).toBe('true');
		expect(item.textContent).toContain('paramètre');
	});

	it('une grandeur n’a pas de curseur, et le menu dit pourquoi', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'v', definition: '12[km]' }, 'url');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'v');
		const item = menuItemOf(menu, 'Curseur');
		expect(item.getAttribute('aria-disabled')).toBe('true');
		expect(item.textContent).toContain('km');
		expect(labelsOf(menu)).toContain('Convertir');
	});

	it('une valeur calculée n’a pas de curseur, et le menu dit pourquoi', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'b', definition: '1' }, 'text');
		atelier.create({ kind: 'value', name: 'a', definition: 'b+1' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeNull();
		const menu = await openCardMenu(container, 'a');
		const item = menuItemOf(menu, 'Curseur');
		expect(item.getAttribute('aria-disabled')).toBe('true');
		expect(item.textContent).toContain('calculée');
	});

	it('bornes et pas se règlent dans une petite fenêtre', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'a');
		menuItemOf(menu, 'Bornes et pas du curseur').click();
		const dialog = await vi.waitFor(() => {
			const found = document.querySelector<HTMLElement>('[role="dialog"]');
			expect(found).toBeTruthy();
			return found!;
		});
		expect(input(dialog, 'de, minimum du curseur de a').value).toBe('-10');
		setInput(input(dialog, 'à, maximum du curseur de a'), '5');

		await vi.waitFor(() => {
			const a = atelier.get('a');
			expect(a && isValue(a) && a.slider?.max).toBe(5);
		});
	});
});

// =============================================================================
// Suite
// =============================================================================

describe('carte d’une suite', () => {
	it('explicite : u(n) = et le champ, le rang de départ sous la ligne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n+1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'u');
		expect(card.textContent?.replace(/\s+/g, '')).toContain('u(n)=');
		expect(fieldOf(card).value.replace(/\s+/g, '')).toBe('2n+1');
		expect(card.querySelector('.type')).toBeNull();
		expect(input(card, 'Rang du premier terme de u')).toBeTruthy();
		expect(card.querySelector('input[aria-label="u(0) =, premier terme de u"]')).toBeNull();
	});

	it('récurrente : u(n+1) = puis u(0) = sous la ligne, deux champs', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'u');
		expect(card.textContent?.replace(/\s+/g, '')).toContain('u(n+1)=');
		// Comme la définition : rangé à Entrée ou à la sortie du champ, jamais à la
		// frappe (décision de David du 2026-10-18)
		setInput(input(card, 'u(0) =, premier terme de u'), '3');
		await new Promise((resolve) => setTimeout(resolve, 400));
		const before = atelier.get('u');
		expect(before && isSequence(before) && before.firstTerm).toBe('0');
		commitInput(input(card, 'u(0) =, premier terme de u'));
		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.firstTerm).toBe('3');
		});
		setInput(input(card, 'Rang du premier terme de u'), '1');
		commitInput(input(card, 'Rang du premier terme de u'));
		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.firstIndex).toBe(1);
		});
		// L'indice de départ suit le rang
		await vi.waitFor(() =>
			expect(card.querySelector('input[aria-label="u(1) =, premier terme de u"]')).toBeTruthy()
		);
	});

	it('le premier terme peut être une valeur de l’atelier (S1)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		atelier.create({ kind: 'value', name: 'a', definition: '4' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		setInput(input(cardOf(container, 'u'), 'u(0) =, premier terme de u'), 'a');
		commitInput(input(cardOf(container, 'u'), 'u(0) =, premier terme de u'));

		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.firstTerm).toBe('a');
		});
		// a est alors un paramètre de u : son curseur s'affiche
		await vi.waitFor(() =>
			expect(cardOf(container, 'a').querySelector('[role="slider"]')).toBeTruthy()
		);
	});

	it('un premier terme refusé se dit en quittant le champ, relié à lui seul', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const card = cardOf(container, 'u');
		const first = input(card, 'u(0) =, premier terme de u');

		setInput(first, 'u');
		expect(card.querySelector('.refus-suite')?.textContent ?? '').toBe('');
		first.dispatchEvent(new Event('change', { bubbles: true }));

		await vi.waitFor(() =>
			expect(card.querySelector('.refus-suite')?.textContent).toContain('elle-même')
		);
		expect(first.getAttribute('aria-invalid')).toBe('true');
	});

	it('a son 👁 et son point de couleur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		(cardOf(container, 'u').querySelector('button[aria-label="Tracer u"]') as HTMLElement).click();
		await vi.waitFor(() => expect(atelier.get('u')?.plotted).toBe(true));

		await userEvent.click(
			cardOf(container, 'u').querySelector('button[aria-label="Couleur et trait de u"]')!
		);
		const red = await vi.waitFor(() => {
			const found = document.querySelector<HTMLButtonElement>(
				'[aria-label="Couleur de la courbe"] button[role="radio"]:not([aria-checked="true"])'
			);
			expect(found).toBeTruthy();
			return found!;
		});
		const before = (() => {
			const u = atelier.get('u');
			return u && isSequence(u) ? u.display?.color : undefined;
		})();
		red.click();
		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.display?.color).not.toBe(before);
		});
	});

	it('Affichage : nuage ou escalier, et les marches sous la ligne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '0,5u_n + 3' }, 'text');
		atelier.setPlotted('u', true);
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'u');
		expect(menuItemOf(menu, 'Nuage').getAttribute('aria-checked')).toBe('true');
		menuItemOf(menu, 'Escalier').click();
		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.display?.representation).toBe('cobweb');
		});

		const steps = await vi.waitFor(() => input(cardOf(container, 'u'), 'marches de u'));
		setInput(steps, '4');
		commitInput(steps);
		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.display?.cobwebSteps).toBe(4);
		});
	});

	it('l’escalier d’une suite explicite est indisponible, avec sa raison', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n+1' }, 'text');
		atelier.setPlotted('u', true);
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'u');
		const cobweb = menuItemOf(menu, 'Escalier');
		expect(cobweb.getAttribute('aria-disabled')).toBe('true');
		expect(cobweb.textContent).toContain('demande une récurrence');
	});

	it('une suite non tracée : nuage et escalier indisponibles, avec la raison', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'u');
		expect(menuItemOf(menu, 'Nuage').getAttribute('aria-disabled')).toBe('true');
		expect(menuItemOf(menu, 'Nuage').getAttribute('aria-describedby')).toBeTruthy();
	});

	it('le mode se change depuis le menu', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2n+1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'u');
		expect(menuItemOf(menu, 'Explicite').getAttribute('aria-checked')).toBe('true');
		menuItemOf(menu, 'Récurrence').click();

		await vi.waitFor(() => {
			const u = atelier.get('u');
			expect(u && isSequence(u) && u.mode).toBe('recurrence');
		});
	});

	it('« Premiers termes » écrit dans la console, sans changer de vue', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		atelier.setSequence('u', { firstTerm: '1' });
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe'
		});

		await chooseObjectAction(container, 'u', 'Premiers termes');

		await vi.waitFor(() =>
			expect(container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim()).toBe(
				'Graphe'
			)
		);
		await vi.waitFor(() => expect(container.querySelector('.nouveau')).toBeTruthy());
	});
});

// =============================================================================
// Liste
// =============================================================================

describe('carte d’une liste', () => {
	it('un aperçu tronqué, non éditable, et le nombre de valeurs', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '3;5;8;13;21;34;55;89;144;233;377;610' });
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, 'L');
		expect(card.querySelector('math-field')).toBeNull();
		const text = card.textContent?.replace(/\s+/g, ' ') ?? '';
		expect(text).toContain('{3 ; 5 ; 8 ; …}');
		expect(text).toContain('(12 valeurs)');
		expect(card.querySelector('.type')).toBeNull();
		expect(card.querySelector('button[aria-label="Options de L"]')).toBeTruthy();
	});

	it('une liste courte s’affiche en entier', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2' });
		const { container } = await render(WithAtelier, { atelier });

		const text = cardOf(container, 'L').textContent?.replace(/\s+/g, ' ') ?? '';
		expect(text).toContain('{1 ; 2}');
		expect(text).toContain('(2 valeurs)');
	});

	it('une liste qualitative compte ses modalités', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'C', definition: 'rouge;vert;rouge;bleu;vert' });
		const { container } = await render(WithAtelier, { atelier });

		const text = cardOf(container, 'C').textContent?.replace(/\s+/g, ' ') ?? '';
		expect(text).toContain('{rouge ; vert ; rouge ; …}');
		expect(text).toContain('5 valeurs, 3 modalités');
	});

	it('les actions à deux listes sont dans « Avec une autre liste »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4;5;6' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'L');
		expect(labelsOf(menu)).toContain('Statistiques');
		expect(labelsOf(menu)).not.toContain('Nuage avec M');
		const sub = await openPartnerSubmenu(menu);
		expect(labelsOf(sub)).toContain('Nuage avec M');
		// Plus de liste déroulante « avec… » sur la carte
		expect(cardOf(container, 'L').querySelector('[data-slot="select-trigger"]')).toBeNull();
	});

	it('sans autre liste, pas de sous-menu', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openCardMenu(container, 'L');
		expect(labelsOf(menu)).not.toContain('Avec une autre liste');
	});

	it('Propriétés, Renommer et Supprimer ferment le menu, après « Modifier dans Données »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4;5;6' });
		const { container } = await render(WithAtelier, { atelier });

		const labels = labelsOf(await openCardMenu(container, 'L'));
		const data = labels.indexOf('Modifier dans Données');
		expect(data).toBeGreaterThan(-1);
		expect(labels.indexOf('Avec une autre liste')).toBeLessThan(data);
		expect(labels.slice(-3)).toEqual(['Propriétés', 'Renommer', 'Supprimer']);
	});

	it('« Modifier dans Données » ouvre la vue Données', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe'
		});

		await chooseObjectAction(container, 'L', 'Modifier dans Données');

		await vi.waitFor(() =>
			expect(container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim()).toBe(
				'Données'
			)
		);
	});

	// Revue de #1501 : la colonne de la liste est SÉLECTIONNÉE en arrivant, pas
	// seulement l'onglet ouvert
	it('« Modifier dans Données » sélectionne la colonne de la liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4;5;6;7' });
		const { container } = await render(AtelierContainer, {
			atelier,
			ephemeral: true,
			view: 'graphe'
		});
		const cellAt = (name: string) =>
			container.querySelector(`td[role="gridcell"][data-cell="${name}"]`);

		await chooseObjectAction(container, 'M', 'Modifier dans Données');

		await vi.waitFor(() => expect(cellAt('B1')?.getAttribute('aria-selected')).toBe('true'));
		expect(cellAt('B4')?.getAttribute('aria-selected')).toBe('true');
		expect(cellAt('A1')?.getAttribute('aria-selected')).toBe('false');
	});

	it('une action à deux listes se choisit dans le sous-menu', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		atelier.create({ kind: 'list', name: 'M', definition: '4;5;6' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await chooseObjectAction(container, 'L', 'Nuage avec M');

		await vi.waitFor(() =>
			expect(container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim()).toBe(
				'Graphe'
			)
		);
	});
});

// =============================================================================
// Aucune action perdue
// =============================================================================

// =============================================================================
// L'état d'une carte (revue de #1501)
// =============================================================================

describe('une carte dit son état', () => {
	it.each([
		['valeur', 'value'],
		['suite', 'sequence'],
		['liste', 'list']
	] as const)('une %s vide annonce « à compléter »', async (_, kind) => {
		const atelier = new Atelier();
		const created = atelier.create({ kind });
		if (!created.ok) throw new Error(created.message);
		const { container } = await render(WithAtelier, { atelier });

		const card = cardOf(container, created.object.name);
		expect(card.querySelector('.etat')?.textContent?.trim()).toBe('à compléter');
	});

	it('une valeur qui cite un objet absent annonce « en attente »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'b', definition: 'c + 1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardOf(container, 'b').querySelector('.etat')?.textContent?.trim()).toBe('en attente');
	});

	it('une valeur prête n’annonce rien', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardOf(container, 'a').querySelector('.etat')).toBeNull();
	});
});

describe('aucune action perdue', () => {
	it('chaque action de `actionsFor` est dans le menu (valeur, suite, listes)', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'v', definition: '12[km]' }, 'url');
		atelier.create({ kind: 'value', name: 'a', definition: '2' }, 'text');
		atelier.create({ kind: 'sequence', name: 'u', definition: '2u_n' }, 'text');
		atelier.create({ kind: 'list', name: 'L', definition: '1;2;3' });
		atelier.create({ kind: 'list', name: 'M', definition: '0,2;0,3;0,5' });
		atelier.create({ kind: 'list', name: 'C', definition: 'rouge;vert;rouge' });
		// Revue de #1501 : une qualitative partenaire (« Tableau croisé avec D ») et
		// un diagramme affiché (« Retirer le diagramme »)
		atelier.create({ kind: 'list', name: 'D', definition: 'grand;petit;grand' });
		atelier.toggleChart('L', null);
		const { container } = await render(WithAtelier, { atelier });

		expect(actionsFor(atelier.get('L')!, atelier).map((a) => a.label)).toContain(
			'Retirer le diagramme'
		);
		expect(actionsFor(atelier.get('C')!, atelier, 'D').map((a) => a.label)).toContain(
			'Tableau croisé avec D'
		);
		for (const name of ['v', 'a', 'u', 'L', 'M', 'C', 'D']) {
			const object = atelier.get(name)!;
			const expected = new Set(actionsFor(object, atelier).map((a) => a.label));
			for (const partner of partnersOf(object, atelier)) {
				for (const action of actionsFor(object, atelier, partner)) expected.add(action.label);
			}
			const menu = await openCardMenu(container, name);
			const shown = new Set(labelsOf(menu));
			if (shown.has('Avec une autre liste')) {
				for (const label of labelsOf(await openPartnerSubmenu(menu))) shown.add(label);
			}
			for (const label of expected) expect(shown, `${name} : ${label}`).toContain(label);
			await closeMenu();
			if (document.querySelector('[role="menu"]')) await closeMenu();
		}
	});
});
