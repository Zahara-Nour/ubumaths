import { describe, expect, it } from 'vitest';
import { render } from 'vitest-browser-svelte';
import SequenceTable from '../SequenceTable.svelte';
import { parseSequence } from '$lib/grapheur/sequence';
import type { SequencePlottable } from '$lib/grapheur/types';

/**
 * Le tableau de valeurs est ce qui sert au calcul de seuil en 1ère : les rangs
 * et les termes affichés doivent correspondre exactement à la suite définie.
 */
describe('SequenceTable', () => {
	function sequence(overrides: Partial<SequencePlottable> = {}): SequencePlottable {
		const mode = overrides.mode ?? 'recurrence';
		const latex = overrides.latex ?? '0.5u_n+3';
		const parsed = parseSequence(latex, mode, overrides.name ?? 'u');

		return {
			id: '33333333-3333-4333-8333-333333333333',
			type: 'sequence',
			name: 'u',
			mode,
			latex,
			ast: parsed.ast ?? undefined,
			parseError: parsed.error ?? undefined,
			usesIndex: parsed.usesIndex,
			firstIndex: 0,
			firstTerm: 8,
			representation: 'cobweb',
			cobwebSteps: 10,
			color: '#0000ff',
			visible: true,
			lineWidth: 2,
			lineStyle: 'solid',
			...overrides
		};
	}

	function rows(container: HTMLElement): string[][] {
		return [...container.querySelectorAll('tbody tr')].map((tr) =>
			[...tr.querySelectorAll('td')].map((td) => td.textContent?.trim() ?? '')
		);
	}

	it('liste les termes successifs d’une récurrence', () => {
		const { container } = render(SequenceTable, { sequence: sequence() });

		const firstRows = rows(container).slice(0, 4);
		expect(firstRows).toEqual([
			['0', '8'],
			['1', '7'],
			['2', '6.5'],
			['3', '6.25']
		]);
	});

	it('démarre au premier rang choisi', () => {
		const { container } = render(SequenceTable, {
			sequence: sequence({ mode: 'explicit', latex: '3n+2', firstIndex: 2, firstTerm: null })
		});

		expect(rows(container).slice(0, 2)).toEqual([
			['2', '8'],
			['3', '11']
		]);
	});

	it('annonce l’absence de terme quand l’expression est invalide', () => {
		const { container } = render(SequenceTable, {
			sequence: sequence({ mode: 'explicit', latex: '', firstTerm: null })
		});

		expect(container.querySelector('table')).toBeNull();
		expect(container.textContent).toContain('Aucun terme');
	});

	it('s’arrête au premier terme non défini', () => {
		const { container } = render(SequenceTable, {
			sequence: sequence({ latex: '\\frac{1}{u_n-1}', firstTerm: 2 })
		});

		expect(rows(container)).toEqual([
			['0', '2'],
			['1', '1']
		]);
	});
});
