/**
 * Un résultat exact trop long garde son écriture (option A de David, 2026-10-12, seuil
 * 1 000 caractères) — comme `1000!` le faisait déjà. Sa valeur approchée reste au bouton ≈ et
 * en mode décimal. Valeurs attendues tirées des fractions exactes (Python `Fraction`).
 *
 * Mesuré avant : `(1+1/10000)^10000` 13 s (80 003 caractères), `(1+1/100000)^100000` bloqué
 * plus de 200 s, `1000!` en mode décimal : « result too large to stay exact ».
 */

import { describe, it, expect } from 'vitest';
import { WebReplEngine } from '../web-repl-engine';

function exact(input: string) {
	return new WebReplEngine().execute(input);
}

function decimal(input: string) {
	const engine = new WebReplEngine();
	engine.execute('.mode decimal');
	return engine.execute(input);
}

describe('au-delà de 1 000 caractères : l’écriture gardée, la valeur approchée à côté', () => {
	it.each([
		['(1+1/1000)^1000', '\\approx 2.7169', '≈ 2.7169'],
		['1.01^365', '\\approx 37.7834', '≈ 37.7834'],
		['1000*(1+0.03/12)^360', '\\approx 2456.8422', '≈ 2456.8422'],
		['1.5^2000', '\\approx 1.5224 \\times 10^{352}', '≈ 1.5224*10^352'],
		['2^100000', '\\approx 9.9900 \\times 10^{30102}', '≈ 9.9900*10^30102'],
		['1000!', '\\approx 4.0239 \\times 10^{2567}', '≈ 4.0239*10^2567']
	])('%s', (input, approximate, decimalOutput) => {
		const line = exact(input);

		expect(line.success).toBe(true);
		expect(line.output.length).toBeLessThan(40);
		expect(line.exactTooLong).toBeGreaterThan(1000);
		expect(line.approximateLatex).toBe(approximate);
		expect(decimal(input).output).toBe(decimalOutput);
	});

	it('l’écriture gardée est celle qu’on a tapée', () => {
		expect(exact('(1+1/1000)^1000').output).toBe('(1+1/1000)^1000');
	});

	// Mesuré avant : 13 s ; et bloqué plus de 200 s pour n = 100 000
	it.each(['(1+1/10000)^10000', '(1+1/100000)^100000'])('%s en moins d’une seconde', (input) => {
		const start = performance.now();
		const exactLine = exact(input);
		const decimalLine = decimal(input);

		expect(performance.now() - start).toBeLessThan(1000);
		expect(exactLine.output).toBe(input);
		expect(decimalLine.output).toBe(input === '(1+1/10000)^10000' ? '≈ 2.7181' : '≈ 2.7183');
	});
});

describe('en deçà : rien ne change', () => {
	it.each([
		['2^1000', 302],
		['200!', 375],
		['(1+1/100)^100', 403]
	])('%s s’écrit en entier (%i caractères)', (input, length) => {
		const line = exact(input);

		expect(line.output.length).toBe(length);
		expect(line.exactTooLong).toBeUndefined();
	});

	it('une comparaison de grandes puissances rend toujours vrai ou faux', () => {
		expect(exact('2^5000 > 3^3000').output).toBe('true');
	});
});

// Revue : les fonctions de l'utilisateur échappaient au garde-fou — `u(6000)` prenait 2 s, et
// `u(100000)` figeait la page (la suite de limite e, cas de lycée)
describe('une fonction de l’utilisateur passe par le même garde-fou', () => {
	it('u(n) = (1+1/n)^n : u(100000) en moins d’une seconde', () => {
		const engine = new WebReplEngine();
		engine.execute('.def u(n) = (1+1/n)^n');
		const start = performance.now();
		const line = engine.execute('u(100000)');

		expect(performance.now() - start).toBeLessThan(1000);
		expect(line.exactTooLong).toBeGreaterThan(1000);
		expect(line.approximateLatex).toBe('\\approx 2.7183');
	});

	it('une fonction à valeur booléenne reste vraie ou fausse', () => {
		const engine = new WebReplEngine();
		engine.execute('.def f(x) = x > 2');

		expect(engine.execute('f(2^5000)').output).toBe('true');
	});
});

describe('ce qui n’est pas une écriture gardée', () => {
	// Revue : `(1/0)^{2000}` réussissait en mode exact, « trop long »
	it('une erreur reste une erreur', () => {
		expect(exact('(1/0)^2000').success).toBe(false);
	});

	it('en mode décimal, le bouton « valeur exacte » montre l’écriture gardée, non développée', () => {
		const latex = decimal('(1+1/1000)^1000').exactLatex ?? '';

		expect(latex).toContain('1000');
		expect(latex.length).toBeLessThan(60);
	});
});

// Défauts laissés par #1175 (2026-10-12) : la taille était PRÉVUE seulement. Une base
// irrationnelle y échappait (`\sqrt{2}^{100000}` : 15 052 caractères affichés), et la prévision
// additionnait avant de simplifier (`10^{600}×10^{-598}` gardait son écriture, « 1 200 chiffres »,
// pour 100). La prévision ne sert plus qu'à ne pas figer la page ; la règle des 1 000 caractères
// se lit sur le résultat calculé.
describe('la règle des 1 000 caractères se lit sur le résultat calculé', () => {
	it.each([
		['sqrt(2)^100000', 15052, '\\approx 3.1607 \\times 10^{15051}'],
		['(1+sqrt(2))^3000', 2305, '\\approx 2.1235 \\times 10^{1148}'],
		['(sqrt(2)/3)^2000', 1258, '\\approx 6.1304 \\times 10^{-654}']
	])('une base irrationnelle : %s garde son écriture', (input, length, approximate) => {
		const line = exact(input);

		expect(line.output).toBe(input);
		expect(line.exactTooLong).toBe(length);
		expect(line.approximateLatex).toBe(approximate);
	});

	it.each([
		['sqrt(2)^2000', 302],
		['(1+sqrt(2))^100', 84]
	])('une base irrationnelle en deçà : %s s’écrit en entier', (input, length) => {
		const line = exact(input);

		expect(line.output.length).toBe(length);
		expect(line.exactTooLong).toBeUndefined();
	});

	it.each([
		['10^600*10^-598', '100'],
		['10^600/10^598', '100']
	])('ce qui se simplifie : %s = %s', (input, output) => {
		const line = exact(input);

		expect(line.output).toBe(output);
		expect(line.exactTooLong).toBeUndefined();
	});

	it('1000!/999! ne s’annonce plus « environ 5 000 chiffres »', () => {
		expect(exact('1000!/999!').exactTooLong).toBeUndefined();
		expect(decimal('1000!/999!').output).toBe('1000');
	});

	it('la note donne la longueur réelle', () => {
		expect(exact('(1+1/1000)^1000').exactTooLong).toBe(6003);
		expect(exact('1.01^365').exactTooLong).toBe(1464);
	});
});

// Mesuré avant : 4,1 s — chaque addition double la taille des termes, et Euclide est quadratique
describe('une somme de grandes fractions ne fige pas la page', () => {
	it('cinq fractions d’environ 9 000 chiffres en moins d’une seconde', () => {
		const start = performance.now();
		const line = exact('(2/3)^18900+(5/7)^10600+(10/11)^8600+(12/13)^8000+(16/17)^7300');

		expect(performance.now() - start).toBeLessThan(1000);
		expect(line.approximateLatex).toBe('\\approx 6.2914 \\times 10^{-193}');
	});
});

// Revue : deux contournements du plafond de calcul — une base irrationnelle n'était pas
// prévue (`\\sqrt{2}^{40000000}` : 2,6 s), ni un exposant hors des entiers sûrs
// (`2^{2^{100}}` : 2,4 s, puis « Maximum BigInt size exceeded »)
describe('le plafond de calcul couvre aussi', () => {
	it.each(['sqrt(2)^40000000', '(1+sqrt(2))^10000000', '2^(2^100)'])(
		'%s : répond en moins de 300 ms',
		(input) => {
			const start = performance.now();
			const line = exact(input);

			expect(performance.now() - start).toBeLessThan(300);
			expect(line.output).not.toContain('BigInt');
		}
	);

	it('une base irrationnelle en deçà reste calculée', () => {
		expect(exact('sqrt(2)^100000').exactTooLong).toBe(15052);
		expect(exact('(1+sqrt(2))^20000').exactTooLong).toBe(15320);
	});
});

describe('un produit de puissances qui se compensent', () => {
	it.each([
		['10^6000*10^-5998', '100'],
		['10^60000/10^59990', '10000000000'],
		['(1+1/100000)^100000*(1+1/100000)^-100000', '1'],
		['2^100000000*2^-99999999', '2'],
		['2^100000000/2^99999999', '2']
	])('%s = %s, en moins de 300 ms', (input, output) => {
		const start = performance.now();
		const line = exact(input);

		expect(performance.now() - start).toBeLessThan(300);
		expect(line.output).toBe(output);
		expect(line.exactTooLong).toBeUndefined();
	});

	// Revue : mesurés à 2,9 s et 4,3 s (puis « Maximum BigInt size exceeded »)
	it.each(['(1+1/10000)^10000*(1+1/10000)^-9999', '2^(10^20+1)*2^-(10^20)'])(
		'%s : en moins de 300 ms, sans erreur de BigInt',
		(input) => {
			const start = performance.now();
			const line = exact(input);

			expect(performance.now() - start).toBeLessThan(300);
			expect(line.output).not.toContain('BigInt');
		}
	);

	it('un produit compensé encore trop long garde son écriture, longueur réelle', () => {
		const line = exact('6^30000/2^30000');

		expect(line.output).toBe('{6^30000}/{2^30000}');
		expect(line.exactTooLong).toBe(14314);
	});
});

// Revue de #1184 : une comparaison échappait au plafond de calcul — `2^{30000000}/2^{29999999} = 2`
// prenait 3,5 s, `(1+1/20000)^{20000}×(1+1/20000)^{-20000} = 1` 10 s, `1.0001^{30000} > 20`
// 16,7 s. Un membre au-delà du plafond : un produit de puissances par ses facteurs, sinon les
// valeurs arrondies (l'arrondi garde l'ordre), refus si elles ne départagent pas
describe('une comparaison passe par le même plafond, membre par membre', () => {
	it.each([
		['2^30000000/2^29999999 = 2', 'true'],
		['(1+1/20000)^20000*(1+1/20000)^-20000 = 1', 'true'],
		['(1+1/100000)^100000*(1+1/100000)^-100000 < 1', 'false'],
		['1.0001^30000 > 20', 'true'],
		['(1+1/20000)^20000 > 2', 'true'],
		['(1+1/20000)^20000 + 1 < 3.7183', 'true'],
		['(1+1/20000)^20000 = 3', 'false'],
		['2^100000 > 3^60000', 'true'],
		['1.0001^30000 <= 1.0001^20000', 'false']
	])('%s : %s, en moins de 300 ms', (input, output) => {
		const start = performance.now();
		const line = exact(input);

		expect(performance.now() - start).toBeLessThan(300);
		expect(line.output).toBe(output);
	});

	// Revue : entre 10⁹ et 10¹⁵, un entier exact s'écrit en entier, une valeur approchée en
	// notation scientifique à 5 chiffres — deux grilles : comparer les arrondis rendait `false`
	it.each([
		['(1+1/20000)^20000 + 1000000000 > 1000000001', 'true'],
		['(1+1/20000)^20000*1000000000 > 2718210000', 'true'],
		// 10¹⁴ + 2,718… < 10¹⁴ + 3 (la revue l'avait cru vrai)
		['(1+1/20000)^20000 + 10^14 > 100000000000003', 'false'],
		['-(1+1/20000)^20000 - 1000000000 < -1000000001', 'true'],
		['(1+1/20000)^20000 + 1000000000 < 1000000003', 'true']
	])('une valeur approchée face à un entier exact : %s', (input, output) => {
		const line = exact(input);

		// Trancher juste, ou refuser : jamais le sens faux
		expect(line.output === output || line.success === false).toBe(true);
		expect(line.output).not.toBe(output === 'true' ? 'false' : 'true');
	});

	// Revue : un membre lu par le flottant puis presque annulé par une soustraction —
	// partie entière exacte de (20001/20000)^20000 × 10^16 : 27182138745278830
	it.each([
		['(1+1/20000)^20000*10^16 - 27182138745278831 < 0', 'true'],
		['(1+1/20000)^20000*10^16 - 27182138745278830 > 0', 'true'],
		['(1+1/20000)^20000 + 1000000000 > 1000000001', 'true']
	])('encadré au plus juste : %s', (input, output) => {
		expect(exact(input).output).toBe(output);
	});

	it('une valeur approchée de grands membres, face à un entier : tranchée quand l’écart est net', () => {
		expect(exact('(1+1/20000)^20000 + 1000000000 > 999000000').output).toBe('true');
		expect(exact('(1+1/20000)^20000*1000000000 > 2718000000').output).toBe('true');
	});

	it('avec une variable libre, le refus le dit', () => {
		const line = exact('(1+1/20000)^20000 + x = x + (1+1/20000)^20000');

		expect(line.success).toBe(false);
		expect(line.output).toContain('variable');
	});

	it('deux membres que l’arrondi ne départage pas : refus immédiat', () => {
		const start = performance.now();
		const line = exact('(1+1/20000)^20000 = (1+1/20000)^20000');

		expect(performance.now() - start).toBeLessThan(300);
		expect(line.success).toBe(false);
		expect(line.output).toContain('trop proches');
	});

	it.each([
		['2^5000 > 3^3000', 'true'],
		['2^50000 > 3^30000', 'true'],
		['(1+1/1000)^1000 < 3', 'true'],
		['1/3 + 1/6 = 1/2', 'true']
	])('en deçà, rien ne change : %s', (input, output) => {
		expect(exact(input).output).toBe(output);
	});
});
