import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';

describe('montre() / masque() — visibility verbs', () => {
	it('montre(O) makes a hidden element visible', () => {
		const { figure, symbols } = runDsl(['O = point(0, 0)', 'masque(O)', 'montre(O)'].join('\n'));
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(true);
	});

	it('masque(O) hides an element', () => {
		const { figure, symbols } = runDsl(['O = point(0, 0)', 'masque(O)'].join('\n'));
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(false);
	});

	it('montre(O, couleur="rouge") combines show + style in one call', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'masque(O)', 'montre(O, couleur="rouge")'].join('\n')
		);
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(true);
		// Color should be the rouge mapping
		expect(el?.style?.color).toBe('#dc2626');
	});

	it('montre + multiple style args', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'masque(A)',
				'montre(A, couleur="bleu", forme="croix", epaisseur=3)'
			].join('\n')
		);
		const id = symbols.get('A')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(true);
		expect(el?.style?.color).toBe('#1e40af');
		expect(el?.style?.pointShape).toBe('cross');
		expect(el?.style?.strokeWidth).toBe(3);
	});

	it('style(elem, visible=faux) hides via the pure style mutator', () => {
		const { figure, symbols } = runDsl(['O = point(0, 0)', 'style(O, visible=faux)'].join('\n'));
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(false);
	});

	it('style(elem, visible=vrai) shows via the pure style mutator', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'masque(O)', 'style(O, visible=vrai)'].join('\n')
		);
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(true);
	});

	it('style() never changes visibility when no visible arg', () => {
		const { figure, symbols } = runDsl(['O = point(0, 0)', 'style(O, couleur="rouge")'].join('\n'));
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		// Default visible
		expect(el?.visible).toBe(true);
	});

	it('montre / masque cycle preserves the figureId', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'masque(O)', 'montre(O)', 'masque(O)', 'montre(O)'].join('\n')
		);
		const id = symbols.get('O')!.figureId!;
		const el = figure.getElementById(id);
		expect(el?.visible).toBe(true);
	});

	it('throws on wrong arity for montre()', () => {
		expect(() => runDsl(['montre()'].join('\n'))).toThrow(/montre.*1 argument/i);
		expect(() => runDsl(['A = point(0, 0)', 'B = point(1, 0)', 'montre(A, B)'].join('\n'))).toThrow(
			/montre.*1 argument/i
		);
	});

	it('throws on wrong arity for masque()', () => {
		expect(() => runDsl(['masque()'].join('\n'))).toThrow(/masque.*1 argument/i);
	});
});
