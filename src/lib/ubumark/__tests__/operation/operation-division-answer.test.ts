/**
 * Bloc ```operation — la réponse d'une division posée (PR 3b, phase 0 :
 * `docs/wip/operations-posees-progress.md` § 12)
 *
 * Euclidienne : deux cases (quotient, reste) ; décimale : une seule (le
 * quotient, virgule posée par l'élève). Le quotient se lit de gauche à
 * droite, le reste comme le résultat du lot 1. `_` = case vide.
 */

import { describe, expect, it } from 'vitest';
import { parseOperationContent } from '$lib/ubumark/parser/operation-parser';
import {
	buildDivisionScene,
	type DivisionScene
} from '$lib/ubumark/utils/operation-division-scene';
import {
	divisionCaseCount,
	divisionExpectedAnswers,
	quotientFromAnswer,
	readQuotientAnswer,
	readRemainderAnswer,
	remainderFromAnswer,
	wrongQuotientComma,
	wrongQuotientDigits,
	wrongRemainderDigits
} from '$lib/ubumark/utils/operation-division-answer';

function spec(...lines: string[]) {
	const node = parseOperationContent(lines.join('\n'));
	expect(node.errors).toEqual([]);
	return node.spec!;
}

const scene = (...lines: string[]): DivisionScene => buildDivisionScene(spec(...lines));

/** `135_` → ['1', '3', '5', ''] */
const cells = (typed: string) => typed.split('').map((d) => (d === '_' ? '' : d));

/**
 * Le quotient tel que l'élève l'écrit : `196,25_` → chiffres et virgule
 * (case à droite de laquelle elle est, null sans virgule)
 */
function quotient(typed: string): { digits: string[]; comma: number | null } {
	const at = typed.indexOf(',');
	const digits = cells(typed.replace(',', ''));
	return { digits, comma: at === -1 ? null : at - 1 };
}

/** Le reste, aligné à droite sous les colonnes de la scène : `6` → [..., '', '6'] */
const remainder = (s: DivisionScene, typed: string) =>
	cells(typed.padStart(s.columns, '_')).slice(-s.columns);

describe('divisionExpectedAnswers : les réponses attendues, sous leur forme la plus simple', () => {
	it.each([
		['calcul: 9 456 ÷ 7', ['1350', '6']],
		['calcul: 456 ÷ 7', ['65', '1']],
		['calcul: 5 ÷ 7', ['0', '5']],
		['calcul: 9 ÷ 1', ['9', '0']],
		['calcul: 0 ÷ 7', ['0', '0']],
		['calcul: 785 ÷ 4\nquotient: décimal', ['196.25']],
		['calcul: 148,2 ÷ 5', ['29.64']],
		['calcul: 4,20 ÷ 2', ['2.1']]
	])('%s → %j (n° 4, 7, 10-13)', (line, expected) => {
		expect(divisionExpectedAnswers(spec(line))).toEqual(expected);
	});

	it('euclidienne : deux cases ; décimale : une (Q2, n° 7)', () => {
		expect(divisionCaseCount(spec('calcul: 9456 ÷ 7'))).toBe(2);
		expect(divisionCaseCount(spec('calcul: 785 ÷ 4', 'quotient: décimal'))).toBe(1);
		expect(divisionCaseCount(spec('calcul: 148,2 ÷ 5'))).toBe(1);
	});
});

describe('readQuotientAnswer : le quotient, lu de gauche à droite (n° 6, Q6)', () => {
	const read = (typed: string) => {
		const { digits, comma } = quotient(typed);
		return readQuotientAnswer(digits, comma);
	};

	it('cases vides à droite ignorées', () => {
		expect(read('1350')).toBe('1350');
		expect(read('65_')).toBe('65');
		expect(read('1350_')).toBe('1350');
	});

	it('zéros de tête retirés', () => {
		expect(read('01350')).toBe('1350');
		expect(read('065')).toBe('65');
		expect(read('0')).toBe('0');
	});

	it('case vide au milieu : incomplète', () => {
		expect(read('13_0')).toBe('');
		expect(read('1_')).toBe('1');
	});

	it('cases de tête vides : rien (l’élève a commencé plus loin)', () => {
		expect(read('_65')).toBe('65');
	});

	it('rien d’écrit : vide', () => {
		expect(read('____')).toBe('');
	});

	it('virgule posée par l’élève', () => {
		expect(read('196,25_')).toBe('196{,}25');
		expect(read('29,64__')).toBe('29{,}64');
	});

	it('décimales de fin vides ou nulles retirées (`2,1` juste et complet, PR 3a)', () => {
		expect(read('2,1__')).toBe('2{,}1');
		expect(read('2,10_')).toBe('2{,}1');
		expect(read('10,_')).toBe('10');
	});

	it('virgule sans chiffre à sa gauche : 0 implicite (`, 3` → 0,3)', () => {
		const digits = ['', '3', ''];
		expect(readQuotientAnswer(digits, 0)).toBe('0{,}3');
	});

	it('décimale de tête vide : incomplète (`2, _ 5`)', () => {
		expect(read('2,_5')).toBe('');
	});

	it('virgule après le dernier chiffre : un entier', () => {
		expect(read('65,_')).toBe('65');
	});

	it('espaces de milliers selon la question', () => {
		expect(read('13500')).toBe('13\\,500');
		expect(readQuotientAnswer(cells('1350'), null, { minDigits: 4 })).toBe('1\\,350');
	});
});

describe('readRemainderAnswer : le reste, comme le résultat du lot 1 (n° 5, 12)', () => {
	it('9 456 ÷ 7 : une case', () => {
		const s = scene('calcul: 9456 ÷ 7');
		expect(readRemainderAnswer(s, remainder(s, '6'))).toBe('6');
	});

	it('diviseur à deux chiffres : case de tête vide ignorée', () => {
		const s = scene('calcul: 9456 ÷ 23');
		expect(readRemainderAnswer(s, remainder(s, '_3'))).toBe('3');
		expect(readRemainderAnswer(s, remainder(s, '13'))).toBe('13');
	});

	it('reste nul : la case attend 0 ; vide → incomplète (pas de 0 implicite)', () => {
		const s = scene('calcul: 9 ÷ 1');
		expect(readRemainderAnswer(s, remainder(s, '0'))).toBe('0');
		expect(readRemainderAnswer(s, remainder(s, '_'))).toBe('');
	});

	it('zéro de tête retiré', () => {
		const s = scene('calcul: 9456 ÷ 23');
		expect(readRemainderAnswer(s, remainder(s, '03'))).toBe('3');
	});
});

describe('retour sur la question : la réponse remise dans les cases', () => {
	it('quotient : chiffres de gauche à droite, virgule de la réponse', () => {
		expect(quotientFromAnswer(scene('calcul: 9456 ÷ 7'), '1350')).toEqual({
			digits: ['1', '3', '5', '0'],
			comma: null
		});
		expect(quotientFromAnswer(scene('calcul: 785 ÷ 4', 'quotient: décimal'), '196{,}25')).toEqual({
			digits: ['1', '9', '6', '2', '5', ''],
			comma: 2
		});
		expect(quotientFromAnswer(scene('calcul: 456 ÷ 7'), '65')).toEqual({
			digits: ['6', '5', ''],
			comma: null
		});
	});

	it('quotient : espaces de milliers lus', () => {
		expect(quotientFromAnswer(scene('calcul: 94560 ÷ 7'), '13\\,508').digits).toEqual([
			'1',
			'3',
			'5',
			'0',
			'8'
		]);
	});

	it('quotient trop long ou illisible : cases vides', () => {
		const s = scene('calcul: 456 ÷ 7');
		expect(quotientFromAnswer(s, '6512')).toEqual({ digits: ['', '', ''], comma: null });
		expect(quotientFromAnswer(s, 'abc')).toEqual({ digits: ['', '', ''], comma: null });
	});

	it('reste : aligné à droite', () => {
		const s = scene('calcul: 9456 ÷ 23');
		expect(remainderFromAnswer(s, '3')).toEqual(remainder(s, '_3'));
		expect(remainderFromAnswer(s, '')).toEqual(remainder(s, '__'));
	});
});

describe('correction : chiffres faux du quotient et du reste (n° 8)', () => {
	const euclid = spec('calcul: 9456 ÷ 7');

	it('quotient : chiffre faux surligné, case par case depuis la gauche', () => {
		const { digits } = quotient('1340');
		expect(wrongQuotientDigits(euclid, digits)).toEqual([false, false, true, false]);
	});

	it('quotient : un chiffre oublié à droite est faux', () => {
		const { digits } = quotient('135_');
		expect(wrongQuotientDigits(euclid, digits)).toEqual([false, false, false, true]);
	});

	it('quotient : un zéro de tête écrit n’est jamais faux, la suite est décalée', () => {
		const s = spec('calcul: 456 ÷ 7');
		const { digits } = quotient('064');
		expect(wrongQuotientDigits(s, digits)).toEqual([false, false, true]);
	});

	it('quotient décimal : zéro de fin vide jamais faux (`2,1` pour 2,10)', () => {
		const s = spec('calcul: 4,20 ÷ 2');
		const { digits } = quotient('2,1__');
		expect(wrongQuotientDigits(s, digits)).toEqual([false, false, false, false]);
	});

	it('reste faux surligné', () => {
		const s = buildDivisionScene(euclid);
		const wrong = wrongRemainderDigits(euclid, remainder(s, '5'));
		expect(wrong.at(-1)).toBe(true);
		expect(wrong.slice(0, -1).every((w) => !w)).toBe(true);
	});

	it('reste juste : rien de surligné ; case de tête vide jamais fausse', () => {
		const s23 = spec('calcul: 9456 ÷ 23');
		const s = buildDivisionScene(s23);
		expect(wrongRemainderDigits(s23, remainder(s, '_3')).some((w) => w)).toBe(false);
	});
});

describe('correction : la virgule du quotient (Q6, comme au lot 2)', () => {
	const decimal = spec('calcul: 785 ÷ 4', 'quotient: décimal');

	it('bien placée : rien', () => {
		const { digits, comma } = quotient('196,25_');
		expect(wrongQuotientComma(decimal, digits, comma)).toBeNull();
	});

	it('absente : la case où elle devait être', () => {
		const { digits, comma } = quotient('19625_');
		expect(wrongQuotientComma(decimal, digits, comma)).toEqual({ mistake: 'absente', at: 2 });
	});

	it('mal placée : la virgule de l’élève', () => {
		const { digits, comma } = quotient('19,625_');
		expect(wrongQuotientComma(decimal, digits, comma)).toEqual({ mistake: 'mal placée', at: 1 });
	});

	it('quotient entier, virgule posée après un chiffre au milieu : mal placée', () => {
		const euclid = spec('calcul: 9456 ÷ 7');
		const { digits, comma } = quotient('13,50');
		expect(wrongQuotientComma(euclid, digits, comma)).toEqual({ mistake: 'mal placée', at: 1 });
	});

	it('quotient entier, virgule après le dernier chiffre écrit : aucune virgule', () => {
		const euclid = spec('calcul: 456 ÷ 7');
		const { digits, comma } = quotient('65,_');
		expect(wrongQuotientComma(euclid, digits, comma)).toBeNull();
	});

	it('zéro de tête écrit : la place attendue suit le décalage', () => {
		const { digits, comma } = quotient('019625');
		expect(wrongQuotientComma(decimal, digits, comma)).toEqual({ mistake: 'absente', at: 3 });
	});

	it('zéro de tête écrit, virgule mal placée : signalée (`0 1 9 , 6 2 5`)', () => {
		const { digits, comma } = quotient('019,625');
		expect(wrongQuotientComma(decimal, digits, comma)).toEqual({ mistake: 'mal placée', at: 2 });
	});
});

describe('correction : quotient commencé dans la 2e case (revue #1758)', () => {
	it('3 ÷ 4, `_ 0 , 8 5` : virgule juste, seul le 8 surligné', () => {
		const s = spec('calcul: 3 ÷ 4', 'quotient: décimal');
		const { digits, comma } = quotient('_0,85');
		expect(wrongQuotientComma(s, digits, comma)).toBeNull();
		expect(wrongQuotientDigits(s, digits)).toEqual([false, false, true, false]);
	});

	it('9456 ÷ 7, `_ 1 3 4` : le 4 surligné', () => {
		const { digits } = quotient('_134');
		expect(wrongQuotientDigits(spec('calcul: 9456 ÷ 7'), digits)).toEqual([
			false,
			false,
			false,
			true
		]);
	});
});
