import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SequenceInput from '../SequenceInput.svelte';
import { parseSequence } from '$lib/grapheur/sequence';
import type { SequencePlottable } from '$lib/grapheur/types';

/**
 * Saisir `u_n` à la main demande `u`, `_`, `n`, puis la flèche droite pour
 * sortir de l'indice — une étape que les élèves oublient, ce qui produit
 * silencieusement `u_{n+3}`. Le bouton d'insertion existe pour l'éviter.
 */
describe('SequenceInput', () => {
	function sequence(overrides: Partial<SequencePlottable> = {}): SequencePlottable {
		const mode = overrides.mode ?? 'recurrence';
		const latex = overrides.latex ?? '0.5u_n+3';
		const name = overrides.name ?? 'u';
		const parsed = parseSequence(latex, mode, name);

		return {
			id: '55555555-5555-4555-8555-555555555555',
			type: 'sequence',
			name,
			mode,
			latex,
			ast: parsed.ast ?? undefined,
			parseError: parsed.error ?? undefined,
			usesIndex: parsed.usesIndex,
			firstIndex: 0,
			firstTerm: 8,
			firstTermMin: -10,
			firstTermMax: 10,
			representation: 'ranks',
			cobwebSteps: 10,
			color: '#0000ff',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid',
			...overrides
		};
	}

	function insertButton(container: HTMLElement): HTMLElement | null {
		return container.querySelector('[aria-label="Insérer le terme précédent"]');
	}

	it('propose le bouton d’insertion du terme précédent en récurrence', () => {
		const { container } = render(SequenceInput, { sequence: sequence() });

		expect(insertButton(container)).not.toBeNull();
	});

	it('ne le propose pas pour une suite explicite, qui n’a pas de terme précédent', () => {
		const { container } = render(SequenceInput, {
			sequence: sequence({ mode: 'explicit', latex: '3n+2', firstTerm: null })
		});

		expect(insertButton(container)).toBeNull();
	});

	it('porte le nom de la suite', () => {
		const { container } = render(SequenceInput, {
			sequence: sequence({ name: 'v', latex: '2v_n' })
		});

		expect(insertButton(container)?.textContent?.replace(/\s/g, '')).toBe('vn');
	});

	it('affiche le membre de gauche selon le mode', () => {
		const recurrence = render(SequenceInput, { sequence: sequence() });
		expect(recurrence.container.textContent?.replace(/\s/g, '')).toContain('un+1=');

		const explicite = render(SequenceInput, {
			sequence: sequence({ mode: 'explicit', latex: '3n+2', firstTerm: null })
		});
		expect(explicite.container.textContent?.replace(/\s/g, '')).toContain('un=');
	});

	/**
	 * Balayer le premier terme en continu est ce qui fait voir qu'un point fixe
	 * attire ou repousse : la même récurrence converge ou diverge selon u₀, et
	 * retaper une valeur ne le montre pas.
	 */
	describe('curseur du premier terme', () => {
		it('affiche le curseur pour une récurrence', () => {
			const { container } = render(SequenceInput, { sequence: sequence() });

			expect(container.querySelector('[aria-label="Premier terme (curseur)"]')).not.toBeNull();
		});

		it('n’affiche pas de curseur pour une suite explicite', () => {
			const { container } = render(SequenceInput, {
				sequence: sequence({ mode: 'explicit', latex: '3n+2', firstTerm: null })
			});

			expect(container.querySelector('[aria-label="Premier terme (curseur)"]')).toBeNull();
		});

		it('expose des bornes réglables', () => {
			const { container } = render(SequenceInput, { sequence: sequence() });

			const min = container.querySelector<HTMLInputElement>(
				'[aria-label="Borne inférieure du curseur"]'
			);
			const max = container.querySelector<HTMLInputElement>(
				'[aria-label="Borne supérieure du curseur"]'
			);

			expect(min?.value).toBe('-10');
			expect(max?.value).toBe('10');
		});

		it('garde le champ de saisie exacte à côté du curseur', () => {
			const { container } = render(SequenceInput, { sequence: sequence() });

			expect(container.querySelector('[aria-label="Premier terme"]')).not.toBeNull();
		});
	});
});
