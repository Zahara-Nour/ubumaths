/**
 * Les propriétés d'un objet (panneau « Propriétés », chantier
 * `docs/archive/wip/atelier-proprietes-progress.md`, validé par David le 2026-10-23) :
 * valeur, fonction, suite, liste, dépendances. Les mesures de la figure ont
 * leurs tests (`figure-properties.test.ts`).
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';
import { propertiesOf } from '../properties';

// =============================================================================
// Décor
// =============================================================================

type Entry = [
	kind: 'value' | 'function' | 'sequence' | 'point' | 'curve',
	name: string,
	definition: string
];

function atelierWith(entries: Entry[]): Atelier {
	const atelier = new Atelier();
	for (const [kind, name, definition] of entries) {
		const done = atelier.create({ kind, name, definition }, 'text');
		if (!done.ok) throw new Error(`${name} refusé : ${done.message}`);
	}
	return atelier;
}

/** Les lignes en clair : `Libellé : valeur`. */
function rowsOf(atelier: Atelier, name: string): string[] {
	return propertiesOf(atelier, name).map(
		(row) =>
			`${row.label} : ${row.text}${row.approximate === undefined ? '' : ` (${row.approximate})`}`
	);
}

// =============================================================================
// Tests
// =============================================================================

describe('les propriétés d’une valeur', () => {
	it('un décimal : sa valeur, sans valeur approchée', () => {
		const atelier = atelierWith([['value', 'a', '3,4']]);
		expect(rowsOf(atelier, 'a')).toEqual(['Valeur : 3,4']);
		expect(propertiesOf(atelier, 'a')[0].latex).toBe('3{,}4');
	});

	it('une racine : la valeur exacte et la valeur approchée', () => {
		const atelier = atelierWith([['value', 'r', 'sqrt(2)']]);
		const [row] = propertiesOf(atelier, 'r');
		expect(row.label).toBe('Valeur');
		expect(row.text).toBe('√2');
		expect(row.approximate).toBe('≈ 1,4142');
	});

	// Revue de #1630 : l'unité sortait au format rangé (`√2[cm]`, `~\\mathrm{cm}` visible)
	it('une grandeur : l’unité écrite en clair, dans la valeur et à côté', () => {
		const atelier = atelierWith([['value', 'a', 'sqrt(2)[cm]']]);
		const [value, unit] = propertiesOf(atelier, 'a');
		expect(value.text).toBe('√2 cm');
		expect(value.approximate).toBe('≈ 1,4142 cm');
		expect(unit.text).toBe('cm');
	});

	it('une unité au carré s’écrit m²', () => {
		const atelier = atelierWith([['value', 's', '3[m^2]']]);
		expect(rowsOf(atelier, 's')).toEqual(['Valeur : 3 m²', 'Unité : m²']);
	});
});

describe('les propriétés d’une fonction', () => {
	it('f(x) = 1/x : variable x, ensemble de définition calculé', () => {
		const atelier = atelierWith([['function', 'f', '1/x']]);
		expect(rowsOf(atelier, 'f')).toEqual(['Variable : x', 'Ensemble de définition : ℝ \\ {0}']);
	});

	it('f(x) = sqrt(x) sur [1 ; 4] : l’ensemble écrit, croisé avec le domaine', () => {
		const atelier = new Atelier();
		const done = atelier.create(
			{ kind: 'function', name: 'f', definition: 'sqrt(x)', interval: '[1;4]' },
			'text'
		);
		if (!done.ok) throw new Error(done.message);
		expect(rowsOf(atelier, 'f')).toContain('Ensemble de définition : [1 ; 4]');
	});
});

describe('les propriétés d’une suite', () => {
	it('explicite : mode et premier rang', () => {
		const atelier = atelierWith([['sequence', 'u', 'n^2']]);
		expect(rowsOf(atelier, 'u')).toEqual(['Définition : explicite', 'Premier rang : 0']);
	});

	it('par récurrence : le premier terme, relu (jamais recopié dans le LaTeX)', () => {
		const atelier = atelierWith([['sequence', 'u', '2u(n)+1']]);
		atelier.setSequence('u', { firstTerm: '3' });
		expect(rowsOf(atelier, 'u')).toEqual([
			'Définition : par récurrence',
			'Premier rang : 0',
			'Premier terme : u_0 = 3'
		]);
	});
});

describe('le nom indicé d’une suite', () => {
	// Revue de #1630 : `u_1_{0}`, un double indice que MathLive compose mal
	it('u_1 par récurrence : {u_{1}}_{0} = 3', () => {
		const atelier = atelierWith([['sequence', 'u_1', '2u_1(n)+1']]);
		atelier.setSequence('u_1', { firstTerm: '3' });
		const first = propertiesOf(atelier, 'u_1').find((r) => r.label === 'Premier terme');
		expect(first?.latex).toBe('{u_{1}}_{0}=3');
	});
});

describe('l’ensemble de définition en LaTeX', () => {
	it('l’ensemble s’écrit en LaTeX, accolades et barre oblique échappées', () => {
		const atelier = atelierWith([['function', 'f', '1/x']]);
		const row = propertiesOf(atelier, 'f').find((r) => r.label === 'Ensemble de définition');
		expect(row?.latex).toBe('\\mathbb{R} \\setminus  \\{0\\}');
	});
});

describe('les dépendances', () => {
	it('d = [AB] dépend de A et B ; A est utilisé par d', () => {
		const atelier = atelierWith([
			['point', 'A', '(0 ; 1)'],
			['point', 'B', '(1 ; 3)'],
			['curve', 'd', '[AB]']
		]);
		expect(rowsOf(atelier, 'd')).toContain('Dépend de : A, B');
		expect(rowsOf(atelier, 'A')).toContain('Utilisé par : d');
	});

	it('un objet en attente garde ses dépendances, sans mesure', () => {
		const atelier = atelierWith([
			['point', 'A', '(0 ; 1)'],
			['point', 'I', 'milieu(A, Z)']
		]);
		expect(rowsOf(atelier, 'I')).toEqual(['Dépend de : A']);
	});

	it('un objet absent n’a rien', () => {
		expect(propertiesOf(new Atelier(), 'X')).toEqual([]);
	});
});
