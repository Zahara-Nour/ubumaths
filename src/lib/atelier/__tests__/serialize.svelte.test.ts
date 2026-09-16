/**
 * `serialize()` doit rendre des données ordinaires — vérifié dans un vrai
 * navigateur, seul endroit où le piège existe.
 *
 * `structuredClone` jette `DataCloneError` sur un proxy `$state`. Le projet l'a
 * déjà payé en production (configuration d'école, 2026-09-02). ⚠️ En node, les
 * proxies ne sont pas les mêmes objets et tout passe : un test écrit là-bas
 * rassure sans rien vérifier.
 */

import { describe, it, expect } from 'vitest';
import { Atelier } from '../atelier.svelte';

function peupler(): Atelier {
	const a = new Atelier();
	a.create({ kind: 'function', name: 'f', definition: 'x^2' });
	a.create({ kind: 'list', name: 'L', definition: '1;2;3' });
	a.create({ kind: 'value', name: 'k', definition: '3' });
	return a;
}

describe('sérialisation dans un navigateur', () => {
	// Le contraste est la preuve : l'état vivant n'est pas clonable, ce que
	// `serialize()` en tire l'est.
	it('l’état vivant N’EST PAS clonable', () => {
		const a = peupler();
		expect(() => structuredClone(a.objects)).toThrow();
		expect(() => structuredClone(a.get('L'))).toThrow();
	});

	it('ce que rend `serialize()` est clonable', () => {
		const a = peupler();
		expect(() => structuredClone(a.serialize())).not.toThrow();
	});

	it('et se range donc en JSON sans perdre les valeurs', () => {
		const a = peupler();
		const json = JSON.stringify(a.serialize());
		expect(json).toContain('x^2');
		expect(json).toContain('1;2;3');
	});
});
