/**
 * La carte modifiable — lot 2a du passage de `/grapheur` par l'atelier.
 *
 * Phase 0 `docs/archive/wip/atelier-grapheur-phase0.md` §1 (C1 à C11). La frappe est
 * RÉELLE (`userEvent.keyboard` dans le champ MathLive) : un `setValue` ne passe
 * ni par les raccourcis de MathLive ni par l'événement `input` (mesuré).
 *
 * Lots 3 et 4a de la refonte de l'atelier : fonctions, valeurs, suites et
 * listes sont sur une ligne, leur champ toujours là, rangé à Entrée
 * (`carte-fonction.svelte.test.ts`, `cartes-valeur-suite-liste.svelte.test.ts`).
 * Points et courbes s'ouvrent encore par leur en-tête.
 */

import { describe, it, expect, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import { userEvent } from 'vitest/browser';
import type { MathfieldElement } from 'mathlive';
import WithAtelier from './harness/WithAtelier.svelte';
import AtelierContainer from '../AtelierContainer.svelte';
import { Atelier } from '$lib/atelier/atelier.svelte';
import { chooseCardAction } from './harness/function-card';

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

/** Le champ d'une carte : sur la ligne, ou dans la carte ouverte (point, courbe). */
async function open(container: HTMLElement, name: string): Promise<HTMLElement> {
	const card = cardFor(container, name);
	if (card.querySelector('math-field')) return card;
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

		expect(card.querySelector('.ligne')?.textContent?.replace(/\s+/g, '')).toContain('f(x)=');
		expect(fieldOf(card).value).toContain('x^2');
	});

	// C6 revu au lot 3 de la refonte : une fonction est rangée à Entrée
	it('met l’objet à jour à Entrée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		await typeInto(fieldOf(card), 'x^2{ArrowRight}+1{Enter}');

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

		await typeInto(fieldOf(card), "f'(x)+1{Enter}");

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

		expect(card.querySelector('.ligne')?.textContent?.replace(/\s+/g, '')).toContain('a=');
	});

	it('une grandeur tapée avec son unité est comprise', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'a');

		// Lot 4a : une valeur est rangée à Entrée, comme une fonction
		await typeInto(fieldOf(card), '12 km{Enter}');

		await vi.waitFor(() => expect(atelier.get('a')?.status).toBe('ok'));
		expect(atelier.get('a')).toMatchObject({ unit: 'km' });
	});

	// Lot C des grandeurs : l'espace tapée doit survivre dans MathLive — sans
	// elle, « 5 m » arrivait « 5m », le produit 5 × m
	it('« 5 m » tapé avec une espace est une grandeur', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'a');

		await typeInto(fieldOf(card), '5 m{Enter}');

		await vi.waitFor(() => expect(atelier.get('a')).toMatchObject({ unit: 'm' }));
	});

	// C11
	it('une liste n’a pas de champ dans la carte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'L').querySelector('math-field')).toBeNull();
	});
});

// =============================================================================
// La carte fermée (C1 à C4)
// =============================================================================

describe('carte fermée', () => {
	// C1 : rendu mathématique, plus de texte brut (un point : fonctions, valeurs,
	// suites et listes montrent leur ligne, lots 3 et 4a de la refonte)
	it('rend la définition en écriture mathématique', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(sqrt(2) ; 1)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const definition = cardFor(container, 'A').querySelector('.definition') as HTMLElement;

		expect(definition.textContent).not.toContain('sqrt');
		expect(definition.querySelector('.ML__latex, math')).toBeTruthy();
	});

	it('une définition illisible reste lisible en texte', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(2 + * 3 ; 1)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'A').querySelector('.definition')?.textContent).toContain('2 + * 3');
	});

	// C1 / C2 : la pastille dit la couleur de la courbe
	it('la pastille prend la couleur de la courbe tracée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		atelier.setPlotted('f', true);
		atelier.setDisplay('f', { color: 'curve-3' });
		const { container } = await render(WithAtelier, { atelier });

		const pastille = cardFor(container, 'f').querySelector(
			'button[aria-label="Couleur et trait de f"]'
		) as HTMLElement;

		expect(pastille.getAttribute('style')).toContain('--color-curve-3');
	});

	it('la pastille est neutre quand la fonction n’est pas tracée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		const { container } = await render(WithAtelier, { atelier });

		const pastille = cardFor(container, 'f').querySelector(
			'button[aria-label="Couleur et trait de f"]'
		) as HTMLElement;

		expect(pastille.getAttribute('style') ?? '').not.toContain('--color-curve');
	});

	// C3 : tracer en un clic, sans ouvrir la carte NI changer de vue
	it('👁 trace et retire la courbe sans changer de vue', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });
		const before = currentView(container);

		const eye = cardFor(container, 'f').querySelector(
			'button[aria-label="Tracer f"]'
		) as HTMLButtonElement;
		expect(eye.getAttribute('aria-pressed')).toBe('false');
		eye.click();

		await vi.waitFor(() => expect(atelier.get('f')?.plotted).toBe(true));
		expect(eye.getAttribute('aria-pressed')).toBe('true');
		expect(currentView(container)).toBe(before);

		eye.click();
		await vi.waitFor(() => expect(atelier.get('f')?.plotted).toBe(false));
	});

	it('pas de 👁 sur une valeur ni sur une liste', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '2' });
		atelier.create({ kind: 'list', name: 'L', definition: '1 ; 2' });
		const { container } = await render(WithAtelier, { atelier });

		expect(cardFor(container, 'a').querySelector('button[aria-label^="Tracer"]')).toBeNull();
		expect(cardFor(container, 'L').querySelector('button[aria-label^="Tracer"]')).toBeNull();
	});
});

// =============================================================================
// Revue du lot 2a
// =============================================================================

describe('revue du lot 2a', () => {
	// A : ouvrir puis fermer réécrivait la définition traduite en LaTeX. Lot 3 de
	// la refonte : le champ d'une fonction est toujours monté — y entrer et en
	// sortir sans rien taper ne réécrit rien non plus
	it('entrer dans le champ et en sortir ne touche pas à la définition', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'sqrt(x) + 2x^2' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const revision = atelier.revision;

		const field = fieldOf(await open(container, 'f'));
		await userEvent.click(field);
		field.blur();
		await new Promise((r) => setTimeout(r, 400));

		expect(atelier.get('f')).toMatchObject({ definition: 'sqrt(x) + 2x^2', provenance: 'text' });
		expect(atelier.revision).toBe(revision);
	});

	// C : vidée ailleurs, la définition doit vider le champ
	it('une définition effacée ailleurs vide le champ', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' });
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'f');

		atelier.update('f', '', 'text');

		await vi.waitFor(() => expect(fieldOf(card).value).toBe(''));
	});

	// B : la carte fermée affichait « 12 \unitkm » ; lot 4a, son champ est sur la ligne
	it('une grandeur s’affiche sans commande \\unit', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'value', name: 'a', definition: '12[km]' }, 'url');
		const { container } = await render(WithAtelier, { atelier });

		const value = fieldOf(cardFor(container, 'a')).value;

		expect(value).not.toContain('\\unit');
		expect(value).toContain('km');
	});

	// A11y 1 : le rendu MathLive est fait de glyphes ; le bouton doit porter un
	// texte lisible par un lecteur d'écran
	it('la définition rendue a un équivalent lisible', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(2^3+1 ; 1)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const definition = cardFor(container, 'A').querySelector('.definition') as HTMLElement;

		const visual = definition.querySelector('.ML__latex')?.closest('[aria-hidden="true"]');
		const spoken = definition.querySelector('.sr-only')?.textContent?.trim() ?? '';

		expect(visual).toBeTruthy();
		expect(spoken).not.toBe('');
		expect(spoken).not.toContain('\\');
	});

	// A11y 2 : étiquette CONSTANTE, l'état est porté par aria-pressed seul
	it('le 👁 garde la même étiquette, tracé ou non', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x' });
		const { container } = await render(WithAtelier, { atelier });
		const eye = cardFor(container, 'f').querySelector(
			'button[aria-label="Tracer f"]'
		) as HTMLButtonElement;

		expect(eye.getAttribute('aria-label')).toBe('Tracer f');
		eye.click();
		await vi.waitFor(() => expect(eye.getAttribute('aria-pressed')).toBe('true'));
		expect(eye.getAttribute('aria-label')).toBe('Tracer f');
	});
});

// =============================================================================
// Lot 3a : la carte f′
// =============================================================================

describe('la carte f′', () => {
	function derivativeCard(container: HTMLElement): HTMLElement {
		const card = [...container.querySelectorAll('.objet')].find(
			(el) => el.querySelector('.nom')?.textContent?.trim() === 'f′'
		);
		if (!card) throw new Error('pas de carte f′');
		return card as HTMLElement;
	}

	it('s’appelle f′ et montre la formule calculée, pas « f′(x) »', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2-3x+1' }, 'text');
		atelier.createDerivative('f');
		const { container } = await render(WithAtelier, { atelier });

		const card = derivativeCard(container);
		const spoken = card.querySelector('.formule .sr-only')?.textContent ?? '';

		expect(spoken).not.toContain('prime');
		expect(spoken).toMatch(/2/);
		expect(spoken).toMatch(/3/);
	});

	// L2 : elle se calcule, elle ne se tape pas
	it('n’a pas de champ : elle dit de quelle fonction elle est la dérivée', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.createDerivative('f');
		const { container } = await render(WithAtelier, { atelier });

		(derivativeCard(container).querySelector('button.lien') as HTMLButtonElement).click();
		await vi.waitFor(() =>
			expect(derivativeCard(container).querySelector('.note')?.textContent).toContain(
				'dérivée de f'
			)
		);

		expect(derivativeCard(container).querySelector('math-field')).toBeNull();
	});

	it('cliquer « Dériver » fait apparaître la carte f′', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		const { container } = await render(AtelierContainer, { atelier, ephemeral: true });

		await chooseCardAction(container, 'f', 'Dériver');

		await vi.waitFor(() => expect(derivativeCard(container)).toBeTruthy());
	});
});

// Retour de David (2026-10-04) : re-cliquer une carte ouverte la referme (points
// et courbes : les autres objets n'ont plus de vue développée, lots 3 et 4a)
describe('refermer une carte', () => {
	it('re-cliquer l’en-tête d’une carte ouverte la referme', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });

		const card = await open(container, 'A');
		(card.querySelector('.entete') as HTMLButtonElement).click();

		await vi.waitFor(() => expect(cardFor(container, 'A').querySelector('math-field')).toBeNull());
		expect(cardFor(container, 'A').classList.contains('selected')).toBe(false);
	});

	it('et un nouveau clic la rouvre', async () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'point', name: 'A', definition: '(1 ; 2)' }, 'text');
		const { container } = await render(WithAtelier, { atelier });
		const card = await open(container, 'A');
		(card.querySelector('.entete') as HTMLButtonElement).click();
		await vi.waitFor(() => expect(cardFor(container, 'A').querySelector('math-field')).toBeNull());

		await open(container, 'A');

		expect(cardFor(container, 'A').querySelector('math-field')).toBeTruthy();
	});
});
