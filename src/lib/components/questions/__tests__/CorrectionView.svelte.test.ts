import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { render } from 'vitest-browser-svelte';
import CorrectionView from '../CorrectionView.svelte';
import { CORRECTION_DETAIL_STORAGE_KEY } from '../correction-view-preference';

/**
 * Correction concise / détaillée (ADR 0017, D6–D9, Q88) : le composant
 * commun ouvre en concis, un seul interrupteur, mémorisé sur l'appareil.
 */

const tick = () => new Promise((r) => setTimeout(r, 0));

const WITH_DETAIL = [
	'On isole le terme en $x$.',
	'',
	'> [!méthode] On ajoute le même nombre aux deux membres.',
	'',
	'Étape cachée [car on soustrait 3]{.rappel} puis conclusion visible.'
].join('\n');

function toggle(container: HTMLElement): HTMLButtonElement | null {
	return container.querySelector<HTMLButtonElement>('button[aria-expanded]');
}

function clearStorage() {
	try {
		localStorage.removeItem(CORRECTION_DETAIL_STORAGE_KEY);
	} catch {
		// stockage indisponible : rien à nettoyer
	}
}

beforeEach(clearStorage);
afterEach(() => {
	vi.restoreAllMocks();
	clearStorage();
});

describe('CorrectionView', () => {
	it('s’ouvre en concis : détails absents du rendu', async () => {
		const { container } = await render(CorrectionView, { markdown: WITH_DETAIL });
		const text = container.textContent ?? '';
		expect(text).toContain('On isole le terme');
		expect(text).toContain('conclusion visible');
		expect(text).not.toContain('même nombre aux deux membres');
		expect(text).not.toContain('Méthode');
		expect(text).not.toContain('on soustrait 3');
		expect(toggle(container)?.textContent).toContain('Voir le détail');
		expect(toggle(container)?.getAttribute('aria-expanded')).toBe('false');
	});

	it('sans marqueur : pas d’interrupteur, texte entier', async () => {
		const { container } = await render(CorrectionView, { markdown: 'Simple correction.' });
		expect(container.textContent).toContain('Simple correction.');
		expect(toggle(container)).toBeNull();
		expect(container.textContent).not.toContain('Voir le détail');
	});

	it('bascule : détails visibles avec leur libellé, aria-expanded, puis retour', async () => {
		const { container } = await render(CorrectionView, { markdown: WITH_DETAIL });
		toggle(container)?.click();
		await tick();

		const text = container.textContent ?? '';
		expect(text).toContain('même nombre aux deux membres');
		expect(text).toContain('Méthode');
		expect(text).toContain('on soustrait 3');
		expect(container.querySelector('[data-callout="method"]')).not.toBeNull();
		expect(container.querySelector('.detail-inline')).not.toBeNull();
		expect(toggle(container)?.getAttribute('aria-expanded')).toBe('true');
		expect(toggle(container)?.textContent).toContain('Masquer le détail');

		toggle(container)?.click();
		await tick();
		expect(container.textContent).not.toContain('même nombre aux deux membres');
		expect(toggle(container)?.getAttribute('aria-expanded')).toBe('false');
	});

	it('l’interrupteur est un vrai bouton (clavier) qui pilote la zone de correction', async () => {
		const { container } = await render(CorrectionView, { markdown: WITH_DETAIL });
		const button = toggle(container);
		expect(button?.tagName).toBe('BUTTON');
		expect(button?.type).toBe('button');
		const controlled = button?.getAttribute('aria-controls');
		expect(controlled).toBeTruthy();
		expect(container.querySelector(`#${CSS.escape(controlled ?? '')}`)).not.toBeNull();
	});

	it('mémorisé sur l’appareil : une nouvelle correction s’ouvre détaillée', async () => {
		const first = await render(CorrectionView, { markdown: WITH_DETAIL });
		toggle(first.container)?.click();
		await tick();
		expect(localStorage.getItem(CORRECTION_DETAIL_STORAGE_KEY)).toBe('detailed');
		await first.unmount();

		const second = await render(CorrectionView, { markdown: WITH_DETAIL });
		await tick();
		expect(second.container.textContent).toContain('même nombre aux deux membres');
		expect(toggle(second.container)?.getAttribute('aria-expanded')).toBe('true');
	});

	it('localStorage qui lève : rendu correct, concis, bascule possible', async () => {
		vi.spyOn(Storage.prototype, 'getItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		vi.spyOn(Storage.prototype, 'setItem').mockImplementation(() => {
			throw new Error('SecurityError');
		});
		const { container } = await render(CorrectionView, { markdown: WITH_DETAIL });
		await tick();
		expect(container.textContent).toContain('On isole le terme');
		expect(container.textContent).not.toContain('même nombre aux deux membres');

		toggle(container)?.click();
		await tick();
		expect(container.textContent).toContain('même nombre aux deux membres');
	});

	it('D6 : tout est détail → la vue concise montre la réponse attendue', async () => {
		const { container } = await render(CorrectionView, {
			markdown: '> [!méthode] On isole x.\n\n[On trouve deux.]{.calcul}',
			expectedAnswer: 'Réponse : deux'
		});
		const text = container.textContent ?? '';
		expect(text).toContain('Réponse : deux');
		expect(text).not.toContain('On isole x.');
		expect(toggle(container)).not.toBeNull();

		toggle(container)?.click();
		await tick();
		expect(container.textContent).toContain('On isole x.');
	});

	it('D6 sans réponse attendue : jamais vide, la version détaillée est montrée', async () => {
		const { container } = await render(CorrectionView, {
			markdown: '> [!méthode] On isole x.'
		});
		expect(container.textContent).toContain('On isole x.');
		expect(toggle(container)).toBeNull();
	});

	it('D5 : marqueur mal formé → élève : version détaillée, sans message', async () => {
		const { container } = await render(CorrectionView, {
			markdown: 'Texte [x]{.truc} fin.'
		});
		expect(container.textContent).toContain('[x]{.truc}');
		expect(container.querySelector('[data-authoring-errors]')).toBeNull();
		expect(toggle(container)).toBeNull();
	});

	it('D5 : contexte auteur → message d’auteur affiché', async () => {
		const { container } = await render(CorrectionView, {
			markdown: 'Texte [x]{.truc} fin.',
			showAuthoringErrors: true
		});
		const errors = container.querySelector('[data-authoring-errors]');
		expect(errors?.textContent).toContain('truc');
	});
});
