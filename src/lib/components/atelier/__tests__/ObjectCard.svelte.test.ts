/**
 * La carte modifiable — lot 2a du passage de `/grapheur` par l'atelier.
 *
 * Phase 0 `docs/wip/atelier-grapheur-phase0.md` §1 (C1 à C11). La frappe est
 * RÉELLE (`userEvent.keyboard` dans le champ MathLive) : un `setValue` ne passe
 * ni par les raccourcis de MathLive ni par l'événement `input` (mesuré).
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

function cardFor(container: HTMLElement, name: string): HTMLElement {
	const card = [...container.querySelectorAll('.objet')].find(
		(el) => el.querySelector('.nom')?.textContent?.trim() === name
	);
	if (!card) throw new Error(`pas de carte ${name}`);
	return card as HTMLElement;
}

async function open(container: HTMLElement, name: string): Promise<HTMLElement> {
	const card = cardFor(container, name);
	(card.querySelector('.entete') as HTMLButtonElement).click();
	await vi.waitFor(() => expect(cardFor(container, name).querySelector('math-field')).toBeTruthy());
	return cardFor(container, name);
}

function fieldOf(card: HTMLElement): MathfieldElement {
	return card.querySelector('math-field') as MathfieldElement;
}

/** Le premier clic de la session est parfois perdu par MathLive (mesuré). */
async function typeInto(field: MathfieldElement, keys: string) {
	await userEvent.click(field);
	await vi.waitFor(() => expect(document.activeElement).toBe(field));
	await userEvent.keyboard(keys);
}

function currentView(container: HTMLElement): string | undefined {
	return container.querySelector('.onglet[aria-current="page"]')?.textContent?.trim();
}

// =============================================================================
// Le champ (C5 à C10)
// =============================================================================

describe('carte ouverte — le champ', () => {
	it('montre la définition dans un champ de maths, précédée de f(x) =', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2+1' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = await open(container, 'f');

		expect(card.querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('f(x)=');
		expect(fieldOf(card).value).toContain('x^2');
	});

	// C6 : la frappe met l'objet à jour, sans bouton à cliquer
	it('met l’objet à jour quand on tape', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeInto(fieldOf(card), 'x^2{ArrowRight}+1');

		await vi.waitFor(() => expect(atelier.get('f')?.definition).toBe('x^2+1'));
		expect(atelier.get('f')?.provenance).toBe('keyboard');
		expect(atelier.get('f')?.status).toBe('ok');
	});

	// D7 en avance : MathLive écrit f^{\prime}, que le parseur refusait
	it('accepte f′ tapé au clavier', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		atelier.create({ kind: 'function', name: 'g', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'g');

		await typeInto(fieldOf(card), "f'(x)+1");

		await vi.waitFor(() => expect(atelier.get('g')?.definition).toContain('\\prime'));
		expect(atelier.get('g')?.status).toBe('ok');
	});

	// C8 : modifié ailleurs (vue Calcul), le champ suit
	it('suit une définition modifiée ailleurs', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		atelier.update('f', 'x^3', 'text');

		await vi.waitFor(() => expect(fieldOf(card).value).toContain('x^3'));
	});

	// C9
	it('« + Fonction » ouvre une carte vide, prête à taper', async () => {
		const atelier = new Atelier();
		const { container } = await render(WithAtelier, { atelier });

		const create = [...container.querySelectorAll('button')].find(
			(b) => b.textContent?.trim() === '+ Fonction'
		) as HTMLButtonElement;
		create.click();

		await vi.waitFor(() => {
			const field = container.querySelector('math-field');
			expect(field).toBeTruthy();
			expect(document.activeElement).toBe(field);
		});
	});

	// C10
	it('une valeur a aussi son champ, précédé de a =', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		const { container } = await render(WithAtelier, { atelier });

		const card = await open(container, 'a');

		expect(card.querySelector('.prefixe')?.textContent?.replace(/\s+/g, '')).toBe('a=');
	});

	it('une grandeur tapée avec son unité est comprise', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'a');

		await typeInto(fieldOf(card), '12 km');

		await vi.waitFor(() => expect(atelier.get('a')?.status).toBe('ok'));
		expect(atelier.get('a')).toMatchObject({ unit: 'km' });
	});

	// C11
	it('une liste n’a pas de champ dans la carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const { container } = await render(WithAtelier, { atelier });

		(cardFor(container, 'L').querySelector('.entete') as HTMLButtonElement).click();
		await new Promise((r) => setTimeout(r, 0));

		expect(cardFor(container, 'L').querySelector('math-field')).toBeNull();
	});
});

// =============================================================================
// La carte fermée (C1 à C4)
// =============================================================================

describe('carte fermée', () => {
	// C1 : rendu mathématique, plus de texte brut
	it('rend la définition en écriture mathématique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'sqrt(x)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const definition = cardFor(container, 'f').querySelector('.definition') as HTMLElement;

		expect(definition.textContent).not.toContain('sqrt');
		expect(definition.querySelector('.ML__latex, math')).toBeTruthy();
	});

	it('une définition illisible reste lisible en texte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '2 + * 3' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'f').querySelector('.definition')?.textContent).toContain('2 + * 3');
	});

	// C1 / C2 : la pastille dit la couleur de la courbe
	it('la pastille prend la couleur de la courbe tracée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		atelier.setPlotted('f', true);
		atelier.setDisplay('f', { color: 'curve-3' });
		const { container } = await render(WithAtelier, { atelier });

		const pastille = cardFor(container, 'f').querySelector('.pastille') as HTMLElement;

		expect(pastille.getAttribute('style')).toContain('--color-curve-3');
	});

	it('la pastille est neutre quand la fonction n’est pas tracée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		const { container } = await render(WithAtelier, { atelier });

		const pastille = cardFor(container, 'f').querySelector('.pastille') as HTMLElement;

		expect(pastille.getAttribute('style') ?? '').not.toContain('--color-curve');
	});

	// C3 : tracer en un clic, sans ouvrir la carte NI changer de vue
	it('👁 trace et retire la courbe sans changer de vue', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const before = currentView(container);

		const eye = cardFor(container, 'f').querySelector('.oeil') as HTMLButtonElement;
		expect(eye.getAttribute('aria-pressed')).toBe('false');
		eye.click();

		await vi.waitFor(() => expect(atelier.get('f')?.plotted).toBe(true));
		expect(eye.getAttribute('aria-pressed')).toBe('true');
		expect(currentView(container)).toBe(before);
		// La carte ne s'est pas ouverte pour autant
		expect(cardFor(container, 'f').querySelector('math-field')).toBeNull();

		eye.click();
		await vi.waitFor(() => expect(atelier.get('f')?.plotted).toBe(false));
	});

	it('pas de 👁 sur une valeur ni sur une liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'a').querySelector('.oeil')).toBeNull();
		expect(cardFor(container, 'L').querySelector('.oeil')).toBeNull();
	});
});
