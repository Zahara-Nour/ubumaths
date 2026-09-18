/**
 * Atelier — la dérivation expliquée.
 *
 * ⚠️ Ce que l'élève recevait, mesuré :
 *
 *   d/dx(x^2*sin(x)) = 2xsin(x)+x^2cos(x)
 *   d/dx((2x+1):/(x-1)) = {2(x-1)-(2x+1)}/{(x-1)^2}
 *
 * Notation de terminal, un `:/` parasite, des accolades au lieu d'une fraction
 * — et surtout aucune règle nommée. `pedagogical-differentiation` dit, lui,
 * « Règle du produit, avec u = x² et v = sin(x) », et détaille chaque facteur.
 */

import { describe, it, expect } from 'vitest';
import { deriveSteps } from '../derive-steps';

describe('les règles sont nommées', () => {
	it('le produit, avec u et v', () => {
		const derived = deriveSteps('x^2*sin(x)', 'f');

		expect(derived).not.toBeNull();
		expect(derived!.steps[0].title).toBe('Règle du produit');
		expect(derived!.steps[0].explanation).toContain('u = x^2');
		expect(derived!.steps[0].explanation).toContain('(uv)');
	});

	it('le quotient', () => {
		const derived = deriveSteps('(2x+1)/(x-1)', 'f');

		expect(derived!.steps[0].title).toBe('Règle du quotient');
	});

	it('la composition passe par la fonction extérieure', () => {
		const derived = deriveSteps('sin(x^2)', 'f');

		expect(derived!.steps[0].title).toBe('Dérivée de sinus');
	});

	it('chaque facteur est détaillé en sous-étape', () => {
		const derived = deriveSteps('x^2*sin(x)', 'f');

		// ⚠️ C'est ce qui manquait le plus : `2xsin(x)+x^2cos(x)` tombait du ciel.
		const titres = (derived!.steps[0].subSteps ?? []).map((s) => s.title);
		expect(titres).toEqual(['Règle de la puissance (2)', 'Dérivée de sinus']);
	});
});

describe('la réponse que porte la ligne', () => {
	it('nommée quand l’objet a un nom', () => {
		expect(deriveSteps('x^2-3x+2', 'f')!.answer).toBe("f'(x) = 2 x - 3");
	});

	it('elle suit le nom de l’objet', () => {
		expect(deriveSteps('x^2-3x+2', 'g')!.answer).toBe("g'(x) = 2 x - 3");
	});

	it('sans nom, la dérivée seule', () => {
		// `.dériver x^2-3x+2` tapé à la main : il n'y a pas d'objet à nommer.
		expect(deriveSteps('x^2-3x+2')!.answer).toBe('2 x - 3');
	});
});

describe('les cas simples restent simples', () => {
	it('une constante', () => {
		expect(deriveSteps('3', 'f')!.answer).toBe("f'(x) = 0");
	});

	it('la variable elle-même', () => {
		expect(deriveSteps('x', 'f')!.answer).toBe("f'(x) = 1");
	});

	it('un paramètre est traité comme une constante', () => {
		// ⚠️ Le cas que l'atelier rencontre tout le temps : `k(x) = bx` se dérive
		// sans rien savoir de `b`.
		expect(deriveSteps('b*x', 'k')!.answer).toBe("k'(x) = b");
	});
});

describe('le repli', () => {
	it('une fonction que le module ne sait pas dériver', () => {
		// `abs(x)` lève `PedagogicalDifferentiationNotImplemented`.
		expect(deriveSteps('abs(x)', 'f')).toBeNull();
	});

	it('une entrée que le parseur refuse', () => {
		expect(deriveSteps('', 'f')).toBeNull();
		expect(deriveSteps('   ', 'f')).toBeNull();
		expect(deriveSteps('###', 'f')).toBeNull();
	});

	it('une entrée absurde mais LISIBLE se dérive comme une autre', () => {
		// ⚠️ Mesuré : le parseur est tolérant, et lit « n’importe quoi » comme un
		// produit de lettres. Il n'y a pas de `x` dedans, donc la dérivée vaut 0
		// — ce que le moteur répondait déjà. Ce lot ne change rien là-dessus, et
		// ce test est là pour qu'on ne prenne pas ce 0 pour un défaut introduit.
		expect(deriveSteps('n’importe quoi', 'f')?.answer).toBe("f'(x) = 0");
	});
});
