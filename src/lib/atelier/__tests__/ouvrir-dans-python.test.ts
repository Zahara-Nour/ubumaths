/**
 * « Ouvrir dans Python » — la traduction d'un objet de l'atelier en code Python
 * (phase 0 `docs/wip/atelier-python-phase0.md`, validée par David le 2026-10-24).
 *
 * La règle : le code qu'un élève de lycée écrirait, ou qu'un sujet de bac lui
 * donnerait à compléter. Les valeurs exactes restent exactes (`1/3`, `sqrt(2)`),
 * `from math import …` ne nomme que ce qui sert, et ce qui ne se traduit pas sans
 * perte est REFUSÉ avec sa raison, jamais approché.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import LZString from 'lz-string';
import { pythonOf, pythonPageOf } from '../to-python';
import { actionsFor } from '../actions';

// =============================================================================
// Décor
// =============================================================================

type Kind = 'value' | 'function' | 'sequence' | 'list';

function atelierWith(...objects: [Kind, string, string][]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of objects) {
		const created = atelier.create({ kind, name, definition }, 'text');
		if (!created.ok) throw new Error(`${name} : ${created.message}`);
	}
	return atelier;
}

function codeOf(atelier: Atelier, name: string): string {
	const result = pythonOf(atelier, name);
	if (!result.ok) throw new Error(`refusé : ${result.message}`);
	return result.code;
}

function refusalOf(atelier: Atelier, name: string): string {
	const result = pythonOf(atelier, name);
	if (result.ok) throw new Error(`accepté :\n${result.code}`);
	return result.message;
}

// =============================================================================
// Nominal
// =============================================================================

describe('une fonction', () => {
	it('un polynôme : def f(x), puissances en **, produits écrits', () => {
		const atelier = atelierWith(['function', 'f', '3x^2 - 2x + 1']);
		expect(codeOf(atelier, 'f')).toBe('def f(x):\n    return 3*x**2 - 2*x + 1\n');
	});

	it('fonctions usuelles : importées par leur nom, seulement celles qui servent', () => {
		const atelier = atelierWith(['function', 'g', 'e^{-x}sqrt(x)']);
		expect(codeOf(atelier, 'g')).toBe(
			'from math import exp, sqrt\n\ndef g(x):\n    return exp(-x)*sqrt(x)\n'
		);
	});

	it('ln → log, log → log10, π → pi, |x| → abs (sans import)', () => {
		const atelier = atelierWith(['function', 'h', 'ln(x) + log(x) + π + abs(x)']);
		expect(codeOf(atelier, 'h')).toBe(
			'from math import log, log10, pi\n\ndef h(x):\n    return log(x) + log10(x) + pi + abs(x)\n'
		);
	});

	it('la constante e seule : importée', () => {
		const atelier = atelierWith(['function', 'f', '2e x']);
		expect(codeOf(atelier, 'f')).toBe('from math import e\n\ndef f(x):\n    return 2*e*x\n');
	});

	it('sin²(x) → sin(x)**2 ; arccos → acos', () => {
		const atelier = atelierWith(['function', 'f', 'sin(x)^2 + arccos(x)']);
		expect(codeOf(atelier, 'f')).toBe(
			'from math import acos, sin\n\ndef f(x):\n    return sin(x)**2 + acos(x)\n'
		);
	});

	it('les parenthèses que la priorité exige, et seulement elles', () => {
		const atelier = atelierWith(['function', 'f', '(x+1)^2/(2x-1) - (x-3)']);
		expect(codeOf(atelier, 'f')).toBe('def f(x):\n    return (x + 1)**2/(2*x - 1) - (x - 3)\n');
	});

	it('un opposé au carré garde ses parenthèses : (-x)**2, pas -x**2', () => {
		const atelier = atelierWith(['function', 'f', '(-x)^2 - x^2']);
		expect(codeOf(atelier, 'f')).toBe('def f(x):\n    return (-x)**2 - x**2\n');
	});

	it('un exposant composé reste groupé : 2**(x + 1)', () => {
		const atelier = atelierWith(['function', 'f', '2^{x+1}']);
		expect(codeOf(atelier, 'f')).toBe('def f(x):\n    return 2**(x + 1)\n');
	});

	it('la lettre choisie par l’élève est gardée : def f(t)', () => {
		const atelier = new Atelier();
		// La définition est rangée en x ; seule la lettre affichée est t (`letter.ts`)
		atelier.create({ kind: 'function', name: 'f', definition: 'x^2', letter: 't' }, 'text');
		expect(codeOf(atelier, 'f')).toBe('def f(t):\n    return t**2\n');
	});
});

describe('ce qu’une fonction cite part avec elle', () => {
	it('un curseur : sa valeur du moment, avant la fonction', () => {
		const atelier = atelierWith(['value', 'a', '3'], ['function', 'f', 'a x^2']);
		expect(codeOf(atelier, 'f')).toBe(
			'a = 3  # curseur de l’atelier\n\ndef f(x):\n    return a*x**2\n'
		);
	});

	it('une autre fonction : définie d’abord', () => {
		const atelier = atelierWith(['function', 'f', 'x^2'], ['function', 'h', 'f(x) + 1']);
		expect(codeOf(atelier, 'h')).toBe(
			'def f(x):\n    return x**2\n\ndef h(x):\n    return f(x) + 1\n'
		);
	});

	it('en chaîne, chaque objet une seule fois, imports réunis en tête', () => {
		const atelier = atelierWith(
			['value', 'a', '2'],
			['function', 'f', 'a sqrt(x)'],
			['function', 'g', 'f(x) + a exp(x)']
		);
		expect(codeOf(atelier, 'g')).toBe(
			'from math import exp, sqrt\n\n' +
				'a = 2  # curseur de l’atelier\n\n' +
				'def f(x):\n    return a*sqrt(x)\n\n' +
				'def g(x):\n    return f(x) + a*exp(x)\n'
		);
	});

	it('une valeur calculée à partir d’une autre', () => {
		const atelier = atelierWith(
			['value', 'a', '2'],
			['value', 'b', '3a + 1'],
			['function', 'f', 'b x']
		);
		expect(codeOf(atelier, 'f')).toBe(
			'a = 2  # curseur de l’atelier\nb = 3*a + 1\n\ndef f(x):\n    return b*x\n'
		);
	});
});

describe('une suite', () => {
	it('explicite : def u(n)', () => {
		const atelier = atelierWith(['sequence', 'u', '2n + 1']);
		expect(codeOf(atelier, 'u')).toBe('def u(n):\n    return 2*n + 1\n');
	});

	it('récurrente, écrite u_n : la boucle des sujets de bac', () => {
		const atelier = atelierWith(['sequence', 'u', '0,5u_n + 3']);
		atelier.setSequence('u', { firstTerm: '2' });
		expect(codeOf(atelier, 'u')).toBe(
			'def u(n):\n    u = 2\n    for k in range(n):\n        u = 0.5*u + 3\n    return u\n'
		);
	});

	it('récurrente, écrite u(n), qui cite n : n devient k dans la boucle', () => {
		const atelier = atelierWith(['sequence', 'u', 'u(n) + n']);
		atelier.setSequence('u', { firstTerm: '1' });
		expect(codeOf(atelier, 'u')).toBe(
			'def u(n):\n    u = 1\n    for k in range(n):\n        u = u + k\n    return u\n'
		);
	});

	it('premier rang 1 : range(1, n)', () => {
		const atelier = atelierWith(['sequence', 'u', '2u_n']);
		atelier.setSequence('u', { firstTerm: '3', firstIndex: 1 });
		expect(codeOf(atelier, 'u')).toBe(
			'def u(n):\n    u = 3\n    for k in range(1, n):\n        u = 2*u\n    return u\n'
		);
	});

	it('premier terme donné par un curseur : le curseur part avec elle', () => {
		const atelier = atelierWith(['value', 'a', '5'], ['sequence', 'u', '2u_n']);
		atelier.setSequence('u', { firstTerm: 'a' });
		expect(codeOf(atelier, 'u')).toBe(
			'a = 5  # curseur de l’atelier\n\n' +
				'def u(n):\n    u = a\n    for k in range(n):\n        u = 2*u\n    return u\n'
		);
	});
});

describe('une liste', () => {
	it('des nombres entre crochets', () => {
		const atelier = atelierWith(['list', 'L', '12 ; 15 ; 9']);
		expect(codeOf(atelier, 'L')).toBe('L = [12, 15, 9]\n');
	});
});

// =============================================================================
// Limites
// =============================================================================

describe('limites', () => {
	it('les valeurs exactes restent exactes : 1/3, sqrt(2)', () => {
		const atelier = atelierWith(['function', 'f', 'x/3 + sqrt(2)']);
		expect(codeOf(atelier, 'f')).toBe(
			'from math import sqrt\n\ndef f(x):\n    return x/3 + sqrt(2)\n'
		);
	});

	it('la virgule décimale devient un point', () => {
		const atelier = atelierWith(['list', 'L', '0,5 ; 1/4 ; -2']);
		expect(codeOf(atelier, 'L')).toBe('L = [0.5, 1/4, -2]\n');
	});

	it('une liste à trous : cases vides retirées, et c’est écrit', () => {
		const atelier = atelierWith(['list', 'L', '12 ;  ; 15 ;  ; 9']);
		expect(codeOf(atelier, 'L')).toBe('# 2 cases vides retirées\nL = [12, 15, 9]\n');
	});
});

// =============================================================================
// Refus
// =============================================================================

describe('refus', () => {
	it('un objet incomplet', () => {
		const atelier = atelierWith(['function', 'f', '']);
		expect(refusalOf(atelier, 'f')).toMatch(/définition/);
	});

	it('une fonction à paramètre sans valeur', () => {
		const atelier = atelierWith(['function', 'f', 'k x']);
		expect(refusalOf(atelier, 'f')).toMatch(/k/);
	});

	it('une fonction définie sur un intervalle', () => {
		const atelier = new Atelier();
		const created = atelier.create(
			{ kind: 'function', name: 'f', definition: 'x^2', interval: '[0;+∞[' },
			'text'
		);
		expect(created.ok).toBe(true);
		expect(refusalOf(atelier, 'f')).toMatch(/intervalle/);
	});

	it('une fonction définie par morceaux', () => {
		const atelier = atelierWith([
			'function',
			'f',
			'\\begin{cases} x & x<0 \\\\ x^2 & x \\geq 0 \\end{cases}'
		]);
		expect(pythonOf(atelier, 'f').ok).toBe(false);
	});

	it('une liste qualitative', () => {
		const atelier = atelierWith(['list', 'C', 'fille ; garçon ; fille']);
		expect(refusalOf(atelier, 'C')).toMatch(/mots|texte/);
	});

	it('une grandeur à unité citée', () => {
		const atelier = atelierWith(['value', 'd', '3 cm'], ['function', 'f', 'd x']);
		const result = pythonOf(atelier, 'f');
		expect(result.ok).toBe(false);
	});

	it('la carte d’une dérivée', () => {
		const atelier = atelierWith(['function', 'f', 'x^3']);
		expect(atelier.createDerivative('f').ok).toBe(true);
		expect(refusalOf(atelier, "f'")).toMatch(/dérivée/);
	});

	it('un objet qui n’existe pas', () => {
		expect(refusalOf(new Atelier(), 'f')).toMatch(/f/);
	});
});

// =============================================================================
// Le bouton de la carte
// =============================================================================

describe('« Ouvrir dans Python » dans le menu de la carte', () => {
	it('sur une fonction, une suite, une liste', () => {
		const atelier = atelierWith(
			['function', 'f', 'x^2'],
			['sequence', 'u', '2n'],
			['list', 'L', '1 ; 2']
		);
		for (const name of ['f', 'u', 'L']) {
			const action = actionsFor(atelier.get(name)!, atelier).find((a) => a.id === 'python');
			expect(action, name).toMatchObject({ label: 'Ouvrir dans Python' });
			expect(action?.disabledReason, name).toBeUndefined();
		}
	});

	it('grisé avec la raison quand la traduction est refusée', () => {
		const atelier = atelierWith(['list', 'C', 'fille ; garçon']);
		const action = actionsFor(atelier.get('C')!, atelier).find((a) => a.id === 'python');
		expect(action?.disabledReason).toMatch(/mots|texte/);
	});

	it('pas sur une valeur, un point, une courbe', () => {
		const atelier = atelierWith(['value', 'a', '3']);
		expect(actionsFor(atelier.get('a')!, atelier).some((a) => a.id === 'python')).toBe(false);
	});
});

// =============================================================================
// L'adresse de /python
// =============================================================================

describe('l’adresse de /python', () => {
	it('porte le code compressé, comme le partage du playground', () => {
		const code = 'def f(x):\n    return x**2\n';
		const page = pythonPageOf(code);
		if (!page.ok) throw new Error(page.message);
		const param = new URL(page.url, 'https://www.chiph.re').searchParams.get('code')!;
		expect(page.url.startsWith('/python?code=')).toBe(true);
		expect(LZString.decompressFromEncodedURIComponent(param)).toBe(code);
	});

	it('trop longue : refusée en français', () => {
		const values = Array.from({ length: 4000 }, (_, i) => String((i * 7919) % 100003)).join(', ');
		expect(pythonPageOf(`L = [${values}]\n`)).toEqual({
			ok: false,
			message: 'Trop long pour être ouvert dans Python.'
		});
	});
});
