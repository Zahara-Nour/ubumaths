import { describe, expect, it } from 'vitest';
import { guessErrorKind } from '../error-kind';

describe('guessErrorKind — types reconnus', () => {
	it('signe : réponse = opposé de l’attendu', () => {
		expect(guessErrorKind('-12', '12')).toEqual({ kind: 'sign' });
		expect(guessErrorKind('7', '-7')).toEqual({ kind: 'sign' });
		expect(guessErrorKind('\\frac{3}{4}', '-\\frac{3}{4}')).toEqual({ kind: 'sign' });
	});

	it('puissance de 10 : virgule mal placée ou conversion', () => {
		expect(guessErrorKind('3,5', '35')).toEqual({ kind: 'power-of-ten', exponent: -1 });
		expect(guessErrorKind('2500', '2,5')).toEqual({ kind: 'power-of-ten', exponent: 3 });
		expect(guessErrorKind('0.07', '7')).toEqual({ kind: 'power-of-ten', exponent: -2 });
	});

	it('puissance de 10 au-delà de 1 000 : non reconnue', () => {
		expect(guessErrorKind('35000', '3,5')).toBeNull();
	});

	it('inverse', () => {
		expect(guessErrorKind('\\frac{4}{3}', '\\frac{3}{4}')).toEqual({ kind: 'inverse' });
		expect(guessErrorKind('0,2', '5')).toEqual({ kind: 'inverse' });
	});

	it('double et moitié', () => {
		expect(guessErrorKind('30', '15')).toEqual({ kind: 'double' });
		expect(guessErrorKind('-4', '-2')).toEqual({ kind: 'double' });
		expect(guessErrorKind('7,5', '15')).toEqual({ kind: 'half' });
	});

	it('carré oublié : réponse² = attendu', () => {
		expect(guessErrorKind('5', '25')).toEqual({ kind: 'square-missing' });
		expect(guessErrorKind('-5', '25')).toEqual({ kind: 'square-missing' });
	});

	it('carré en trop : réponse = attendu²', () => {
		expect(guessErrorKind('49', '7')).toEqual({ kind: 'square-extra' });
		// (−2)² = 4 : l'élève a élevé au carré, signe compris
		expect(guessErrorKind('4', '-2')).toEqual({ kind: 'square-extra' });
	});

	it('attendu irrationnel : la relation se lit sur la valeur', () => {
		expect(guessErrorKind('2', '\\sqrt{2}')).toEqual({ kind: 'square-extra' });
	});
});

describe('guessErrorKind — rien quand on ne sait pas', () => {
	it('réponse juste', () => {
		expect(guessErrorKind('12', '12')).toBeNull();
		expect(guessErrorKind('0,5', '\\frac{1}{2}')).toBeNull();
	});

	it('attendu 0, 1 ou −1', () => {
		expect(guessErrorKind('-1', '1')).toBeNull();
		expect(guessErrorKind('1', '-1')).toBeNull();
		expect(guessErrorKind('10', '0')).toBeNull();
	});

	it('deux types vrais à la fois', () => {
		// 2 = moitié de 4 ET 2² = 4 (carré oublié)
		expect(guessErrorKind('2', '4')).toBeNull();
		// 0,25 = moitié de 0,5 ET carré de 0,5
		expect(guessErrorKind('\\frac{1}{4}', '\\frac{1}{2}')).toBeNull();
		// 4 = double de 2 ET carré de 2
		expect(guessErrorKind('4', '2')).toBeNull();
		// 10 = 100 ÷ 10 ET 10² = 100 (carré oublié)
		expect(guessErrorKind('10', '100')).toBeNull();
		// 0,1 = inverse de 10 ET 10 ÷ 100
		expect(guessErrorKind('0,1', '10')).toBeNull();
	});

	it('aucune relation connue', () => {
		expect(guessErrorKind('13', '12')).toBeNull();
	});

	it('réponse qui n’est pas un nombre écrit en entier', () => {
		expect(guessErrorKind('2\\times6', '-12')).toBeNull();
		expect(guessErrorKind('x', '12')).toBeNull();
		expect(guessErrorKind('', '12')).toBeNull();
	});

	it('attendu littéral, en pourcentage ou illisible', () => {
		expect(guessErrorKind('-2', '2x')).toBeNull();
		expect(guessErrorKind('200', '20\\%')).toBeNull();
		expect(guessErrorKind('3', '\\frac{1}{')).toBeNull();
	});
});
