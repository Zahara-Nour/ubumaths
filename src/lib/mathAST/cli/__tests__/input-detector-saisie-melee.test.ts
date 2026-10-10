/**
 * Détection de format : une saisie MÊLÉE — un nom de fonction sans antislash
 * (`cos(`) avec une commande LaTeX (`\pi`) ou un exposant entre accolades.
 *
 * ⚠️ Révélé par l'oracle des dérivées (#910) dans l'atelier : `\pi` (que
 * l'atelier conseille depuis #896) suffisait à tout envoyer au parseur LaTeX,
 * qui lit `cos` comme c·o·s. Et `e^{sin(x)}` — l'écriture que la substitution
 * de l'atelier produit — devenait e^{s·i·n·x}. Le parseur maison, lui, lit
 * `\pi` et les accolades.
 */

import { describe, it, expect } from 'vitest';
import { detectInputFormat } from '../core/input-detector';

describe('detectInputFormat — saisie mêlée', () => {
	it.each(['cos(3x+\\pi/4)', 'sin(\\pi x)', 'e^{sin(x)}', 'ln(3)*3^{2x}', '2cos(x)e^{sin(x)}'])(
		'%s : un nom de fonction sans antislash, donc syntaxe maison',
		(input) => {
			expect(detectInputFormat(input).format).toBe('custom');
		}
	);

	it('log_2(x) est de la syntaxe maison (le nom est suivi de son indice)', () => {
		expect(detectInputFormat('3log_2(x)').format).toBe('custom');
	});

	it.each([
		'\\sin^2(x)',
		'\\arcsin(x)',
		'\\sinh(x)+1',
		'\\cos\\left(3x+\\pi\\right)',
		'\\log_2(x)'
	])('%s : un nom avec antislash reste du LaTeX', (input) => {
		expect(detectInputFormat(input).format).toBe('latex');
	});
});
