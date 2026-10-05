/**
 * La dérivée se trace de la couleur de sa fonction, en tirets — décision de
 * David (2026-10-05), comme la case « f′ » de l'ancien grapheur.
 *
 * Les dérivées suivantes gardent la couleur et changent de trait, pour rester
 * distinctes : `f′` en tirets, `f″` en pointillés, `f‴` en tiret-point.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';

// =============================================================================
// Décor
// =============================================================================

/** `f` tracée, recolorée pour ne pas tomber par hasard sur la couleur suivante. */
function withPlottedF(): Atelier {
	const atelier = new Atelier();
	atelier.create({ kind: 'function', name: 'f', definition: '3x^3-x^2+1' }, 'text');
	atelier.create({ kind: 'function', name: 'g', definition: 'x+1' }, 'text');
	atelier.setPlotted('g', true);
	atelier.setPlotted('f', true);
	atelier.setDisplay('f', { color: 'curve-3' });
	return atelier;
}

function displayOf(atelier: Atelier, name: string) {
	const object = atelier.get(name);
	return object !== undefined && 'display' in object ? object.display : undefined;
}

// =============================================================================
// À la création
// =============================================================================

describe('la couleur d’une dérivée', () => {
	it('f′ prend la couleur de f, en tirets', () => {
		const atelier = withPlottedF();

		atelier.createDerivative('f');

		expect(displayOf(atelier, "f'")).toMatchObject({ color: 'curve-3', lineStyle: 'dashed' });
	});

	it('f″ garde la couleur de f, en pointillés', () => {
		const atelier = withPlottedF();
		atelier.createDerivative('f');

		atelier.createDerivative("f'");

		expect(displayOf(atelier, "f''")).toMatchObject({ color: 'curve-3', lineStyle: 'dotted' });
	});

	it('f′ tracée alors que f ne l’a jamais été est tout de même en tirets', () => {
		const atelier = new Atelier();
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2' }, 'text');
		atelier.createDerivative('f');

		atelier.setPlotted("f'", true);

		expect(displayOf(atelier, "f'")?.lineStyle).toBe('dashed');
	});

	// =========================================================================
	// Ensuite
	// =========================================================================

	it('changer la couleur de f change celle de ses dérivées, pas leur trait', () => {
		const atelier = withPlottedF();
		atelier.createDerivative('f');
		atelier.createDerivative("f'");

		atelier.setDisplay('f', { color: 'curve-4' });

		expect(displayOf(atelier, "f'")).toMatchObject({ color: 'curve-4', lineStyle: 'dashed' });
		expect(displayOf(atelier, "f''")).toMatchObject({ color: 'curve-4', lineStyle: 'dotted' });
	});

	it('changer l’épaisseur de f ne touche pas f′', () => {
		const atelier = withPlottedF();
		atelier.createDerivative('f');
		const before = displayOf(atelier, "f'")?.lineWidth;

		atelier.setDisplay('f', { lineWidth: 4 });

		expect(displayOf(atelier, "f'")?.lineWidth).toBe(before);
	});

	it('f′ se règle encore à la main', () => {
		const atelier = withPlottedF();
		atelier.createDerivative('f');

		atelier.setDisplay("f'", { color: 'curve-1', lineStyle: 'solid' });

		expect(displayOf(atelier, "f'")).toMatchObject({ color: 'curve-1', lineStyle: 'solid' });
	});

	it('une autre fonction ne suit pas f', () => {
		const atelier = withPlottedF();
		const before = displayOf(atelier, 'g')?.color;

		atelier.setDisplay('f', { color: 'curve-4' });

		expect(displayOf(atelier, 'g')?.color).toBe(before);
	});
});
