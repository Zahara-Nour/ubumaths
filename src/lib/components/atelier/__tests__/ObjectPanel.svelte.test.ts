/**
 * Le panneau d'objets — §3 vu depuis l'écran.
 *
 * Ces tests cliquent pour de vrai : c'est le seul moyen de vérifier que la
 * progressivité se voit, et pas seulement qu'elle se calcule.
 */

import { describe, it, expect } from 'vitest';
import { render } from 'vitest-browser-svelte';
import WithAtelier from './harness/WithAtelier.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

/** Les libellés des boutons d'action visibles. */
function actionLabels(container: HTMLElement): string[] {
	return [...container.querySelectorAll('.action')].map((b) => b.textContent?.trim() ?? '');
}

function cardFor(container: HTMLElement, name: string): HTMLElement | undefined {
	return [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	) as HTMLElement | undefined;
}

describe('panneau d’objets', () => {
	it('annonce un atelier vide plutôt que de ne rien montrer', () => {
		const { container } = render(WithAtelier, { atelier: new Atelier() });
		expect(container.textContent).toContain('Rien encore');
	});

	it('montre les objets avec leur nom et leur définition', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = render(WithAtelier, { atelier });

		expect(cardFor(container, 'f')).toBeTruthy();
		expect(container.textContent).toContain('x^2');
	});

	// §3 N1 — la progressivité doit SE VOIR, pas seulement se calculer
	it('n’affiche aucune action de fonction dans un atelier de nombres', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'k', definition: '3' });
		const { container } = render(WithAtelier, { atelier });

		cardFor(container, 'k')?.querySelector('button')?.click();
		expect(actionLabels(container)).not.toContain('Dériver');
		expect(actionLabels(container)).not.toContain('Tracer');
	});

	// §3 N2 — les actions arrivent avec l'objet
	it('affiche les actions d’une fonction quand on la sélectionne', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(actionLabels(container)).toContain('Tracer');
		expect(actionLabels(container)).toContain('Dériver');
	});

	// §3 L2 — visible ET désactivée, avec la raison lisible au survol
	it('désactive les actions d’un objet en attente, en disant ce qui manque', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		const tracer = [...container.querySelectorAll('.action')].find(
			(b) => b.textContent?.trim() === 'Tracer'
		) as HTMLButtonElement | undefined;

		expect(tracer?.disabled).toBe(true);
		expect(tracer?.title).toContain('a');
	});

	it('laisse toujours renommer et supprimer, même en erreur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^^2' });
		const { container } = render(WithAtelier, { atelier });

		cardFor(container, 'f')?.querySelector('button')?.click();
		await new Promise((r) => setTimeout(r, 0));

		const boutons = [...container.querySelectorAll('.action')] as HTMLButtonElement[];
		const supprimer = boutons.find((b) => b.textContent?.trim() === 'Supprimer');
		expect(supprimer?.disabled).toBe(false);
	});

	// §2.1 N3 — « + Fonction » crée un objet nommé, vide, et le sélectionne
	it('crée un objet nommé automatiquement au clic', async () => {
		const atelier = new Atelier();
		const { container } = render(WithAtelier, { atelier });

		const bouton = [...container.querySelectorAll('.creer button')].find(
			(b) => b.textContent?.trim() === '+ Fonction'
		) as HTMLButtonElement;
		bouton.click();
		await new Promise((r) => setTimeout(r, 0));

		expect(atelier.names).toEqual(['f']);
		expect(atelier.get('f')?.status).toBe('incomplete');
		expect(cardFor(container, 'f')).toBeTruthy();
	});

	it('affiche le message d’un objet qui ne peut rien produire', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'a*x' });
		const { container } = render(WithAtelier, { atelier });

		expect(container.textContent).toContain('En attente');
	});
});
