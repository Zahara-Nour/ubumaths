/**
 * Le panneau d'objets — §3 vu depuis l'écran.
 *
 * Ces tests cliquent pour de vrai : c'est le seul moyen de vérifier que la
 * progressivité se voit, et pas seulement qu'elle se calcule.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import WithAtelier from './harness/WithAtelier.svelte';
import {
	chooseObjectAction,
	menuItemOf,
	openCardMenu,
	openFunctionMenu
} from './harness/function-card';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { onDesktopScreen } from './harness/desktop-screen';

// À 414 px (la page des tests), « Mes objets » est replié : on teste les cartes sur bureau
onDesktopScreen();

/** Les libellés des éléments d'un menu ouvert (le libellé, sans la raison). */
function menuLabels(menu: HTMLElement): string[] {
	return [...menu.querySelectorAll<HTMLElement>('[role^="menuitem"]')].map((el) =>
		(el.querySelector('.item > span')?.textContent ?? el.textContent ?? '').trim()
	);
}

function cardFor(container: HTMLElement, name: string): HTMLElement | undefined {
	return [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	) as HTMLElement | undefined;
}

describe('panneau d’objets', () => {
	it('annonce un atelier vide plutôt que de ne rien montrer', async () => {
		const { container } = await render(WithAtelier, { atelier: new Atelier() });
		expect(container.textContent).toContain('Rien encore');
	});

	it('montre les objets avec leur nom et leur définition', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'value', name: 'k', definition: '3' });
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f')).toBeTruthy();
		// Une fonction montre sa définition dans son champ (lot 3 de la refonte)…
		expect(cardFor(container, 'f')?.querySelector('math-field')).toBeTruthy();
		// …une valeur aussi, sur sa ligne (lot 4a de la refonte)
		expect(cardFor(container, 'k')?.querySelector('math-field')).toBeTruthy();
	});

	// §3 N1 — la progressivité doit SE VOIR, pas seulement se calculer
	it('n’affiche aucune action de fonction dans un atelier de nombres', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'k', definition: '3' });
		const { container } = await render(WithAtelier, { atelier });

		const labels = menuLabels(await openCardMenu(container, 'k'));
		expect(labels).not.toContain('Dériver');
		expect(labels).not.toContain('Tracer');
	});

	// §3 N2 — les actions arrivent avec l'objet (dans son menu, lot 3 de la refonte)
	it('affiche les actions d’une fonction dans le menu de sa carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');

		expect(menuItemOf(menu, 'Tracer')).toBeTruthy();
		expect(menuItemOf(menu, 'Dériver')).toBeTruthy();
	});

	// §3 L2 — visible ET désactivée, avec la raison lisible au survol
	it('désactive les actions d’un objet en attente, en disant ce qui manque', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');
		const tracer = menuItemOf(menu, 'Tracer');

		// Indisponible, mais pas `disabled` : l'élément reste atteignable au
		// clavier, s'annonce indisponible, et sa raison peut être lue.
		expect(tracer.getAttribute('aria-disabled')).toBe('true');
		expect(tracer.hasAttribute('data-disabled')).toBe(false);

		// Et la raison est ÉCRITE dans l'élément, pas seulement en infobulle
		expect(tracer.querySelector('.raison')?.textContent).toContain('a');
	});

	it('laisse toujours renommer et supprimer, même en erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });
		const { container } = await render(WithAtelier, { atelier });

		const menu = await openFunctionMenu(container, 'f');
		expect(menuItemOf(menu, 'Supprimer').getAttribute('aria-disabled')).not.toBe('true');
	});

	// §2.1 N3 — « + Fonction » crée un objet nommé, vide, et le sélectionne
	it('crée un objet nommé automatiquement au clic', async () => {
		const atelier = new Atelier();
		const { container } = await render(WithAtelier, { atelier });

		const bouton = [...container.querySelectorAll('.creer button')].find(
			(b) => b.textContent?.trim() === '+ Fonction'
		) as HTMLButtonElement;
		bouton.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(atelier.names).toEqual(['f']);
		expect(atelier.get('f')?.status).toBe('incomplete');
		expect(cardFor(container, 'f')).toBeTruthy();
	});

	it('affiche le message d’un objet qui ne peut rien produire', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = await render(WithAtelier, { atelier });

		expect(container.textContent).toContain('En attente');
	});
});

// =============================================================================
// Q46 (2026-10-02), revu au lot 4a de la refonte : les actions à deux listes
// sont dans le sous-menu « Avec une autre liste », une partenaire après l'autre
// =============================================================================

describe('actions avec une autre liste', () => {
	async function openLists(lists: string[]) {
		const atelier = new Atelier();
		for (const name of lists) atelier.create({ kind: 'list', name, definition: '1 ; 2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		return { container, atelier };
	}

	/** Le sous-menu « Avec une autre liste » de la carte de `name`, ouvert. */
	async function partnerSubmenu(container: HTMLElement, name: string): Promise<HTMLElement> {
		const menu = await openCardMenu(container, name);
		menuItemOf(menu, 'Avec une autre liste').focus();
		await userEvent.keyboard('{ArrowRight}');
		return vi.waitFor(() => {
			const menus = document.querySelectorAll<HTMLElement>('[role="menu"]');
			expect(menus.length).toBe(2);
			return menus[1];
		});
	}

	it('une seule partenaire : son groupe est nommé, ses actions dedans', async () => {
		const { container } = await openLists(['L', 'M']);

		const sub = await partnerSubmenu(container, 'L');

		expect(sub.textContent).toContain('Avec M');
		expect(menuLabels(sub)).toContain('Nuage avec M');
	});

	it('plusieurs partenaires : un groupe par liste, et le geste part avec la bonne', async () => {
		const { container, atelier } = await openLists(['L', 'M', 'N', 'O', 'P', 'Q', 'R', 'S']);

		const sub = await partnerSubmenu(container, 'L');
		const labels = menuLabels(sub);
		for (const partner of ['M', 'N', 'S']) {
			expect(sub.textContent).toContain(`Avec ${partner}`);
			expect(labels).toContain(`Nuage avec ${partner}`);
		}
		await userEvent.keyboard('{Escape}{Escape}');
		await vi.waitFor(() => expect(document.querySelector('[role="menu"]')).toBeNull());

		await chooseObjectAction(container, 'L', 'Nuage avec N');

		await vi.waitFor(() => {
			const list = atelier.get('L');
			expect(list?.kind === 'list' && list.plottedWith).toBe('N');
		});
	});

	// Q48 : une partenaire renommée garde ses actions, sous son nouveau nom
	it('une partenaire renommée apparaît sous son nouveau nom', async () => {
		const { container, atelier } = await openLists(['L', 'M', 'N']);

		atelier.rename('N', 'Z');

		const labels = menuLabels(await partnerSubmenu(container, 'L'));
		expect(labels).toContain('Nuage avec Z');
		expect(labels).not.toContain('Nuage avec N');
	});
});
