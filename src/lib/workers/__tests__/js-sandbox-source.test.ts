import { describe, expect, it } from 'vitest';

import { construireSourceSandbox, NOMS_INTERDITS_EN_PARAMETRE } from '../js-sandbox-source';

// Ancien défaut (2025-12-06 → 2026-11-14) : `eval` figurait parmi les paramètres de la fonction
// sandbox en mode strict → SyntaxError à chaque exécution, quel que soit le programme.
function executer(noms: string[], valeurs: unknown[], code: string): unknown {
	const fn = new Function(construireSourceSandbox(noms, code));
	return fn(...valeurs);
}

describe('construireSourceSandbox', () => {
	it('compile et exécute le code avec les globales passées', () => {
		const sortie: string[] = [];
		const console = { log: (x: string) => sortie.push(x) };
		executer(['console', 'window'], [console, undefined], 'console.log(typeof window);');
		expect(sortie).toEqual(['undefined']);
	});

	it.each([...NOMS_INTERDITS_EN_PARAMETRE])(
		'refuse « %s » en paramètre, avec un message clair',
		(nom) => {
			expect(() => construireSourceSandbox(['console', nom], '')).toThrow(/mode strict/);
		}
	);

	it('le code tourne en mode strict', () => {
		expect(() => executer([], [], 'nonDeclaree = 1;')).toThrow(ReferenceError);
	});
});
