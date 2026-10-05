/**
 * `.resoudre` sur les objets de l'atelier — signalé le 2026-10-05.
 *
 * `.resoudre f'(x)=0` répondait « Je n'ai pas su lire cette expression » :
 * `substituteNames` ne reconnaissait pas `f'(x)`, remplaçait le `f` seul et
 * laissait `(x^2-3x)'(x)`. Les dérivées d'une commande doivent être
 * développées AVANT la substitution, comme pour une saisie libre
 * (`expandInput`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { CalcDesk } from '../desk.svelte';

// =============================================================================
// Décor
// =============================================================================

function withF(definition: string): CalcDesk {
	const d = new CalcDesk(new Atelier());
	d.submit(`f(x)=${definition}`);
	return d;
}

/** La dernière ligne, réponse en formule comprise. */
function answer(d: CalcDesk) {
	const entry = d.entries[d.entries.length - 1];
	return { failed: entry.failed, text: entry.text, latex: entry.latex ?? '' };
}

// =============================================================================
// Comportements
// =============================================================================

describe('.resoudre sur une dérivée', () => {
	it("f'(x) = 0 pour f(x) = x² − 3x : x = 3/2", () => {
		const d = withF('x^2-3x');

		d.submit(".resoudre f'(x)=0");

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(result.latex.replace(/\s/g, '')).toMatch(/\\d?frac\{3\}\{2\}/);
	});

	it("f'(x) = 0 pour f(x) = x e^x : x = −1", () => {
		const d = withF('x e^x');

		d.submit(".resoudre f'(x)=0");

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(`${result.text} ${result.latex}`).toMatch(/-\s*1/);
	});

	it("f'(x) = 2 pour f(x) = 3x² : x = 1/3", () => {
		const d = withF('3x^2');

		d.submit(".resoudre f'(x)=2");

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(result.latex.replace(/\s/g, '')).toMatch(/\\d?frac\{1\}\{3\}/);
	});
});

describe('.resoudre sur une fonction', () => {
	it('f(x) = 0 pour f(x) = x² − 3x : x = 0 ou x = 3', () => {
		const d = withF('x^2-3x');

		d.submit('.resoudre f(x)=0');

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(result.latex.replace(/\s/g, '')).toMatch(/0\\,;\\,3/);
	});
});

// =============================================================================
// Revue de #859
// =============================================================================

describe('.resoudre — ce que la revue a trouvé', () => {
	it("une valeur citée par la fonction est substituée : a = 2, f(x) = a x², f'(x) = 4 → x = 1", () => {
		const d = new CalcDesk(new Atelier());
		d.submit('a = 2');
		d.submit('f(x)=a x^2');

		d.submit(".resoudre f'(x)=4");

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(`${result.text} ${result.latex}`.replace(/\s/g, '')).toMatch(/x=1(?![0-9])/);
	});

	it("l'apostrophe typographique est un prime : f’(x) = 0", () => {
		const d = withF('x^2-3x');

		d.submit('.resoudre f’(x)=0');

		const result = answer(d);
		expect(result.failed).toBe(false);
		expect(result.latex.replace(/\s/g, '')).toMatch(/\\d?frac\{3\}\{2\}/);
	});

	it("une suite ne se dérive pas : u'(n) est refusé, en le disant", () => {
		const d = new CalcDesk(new Atelier());
		d.submit('u(n)=2n+1');

		d.submit(".resoudre u'(n)=0");

		const result = answer(d);
		expect(result.failed).toBe(true);
		expect(result.text).toContain('suite');
	});
});
