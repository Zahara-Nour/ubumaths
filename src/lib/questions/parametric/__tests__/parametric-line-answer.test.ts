import { describe, expect, it } from 'vitest';
import {
	expectedParametricLatex,
	judgeParametricLineAnswer,
	PARAMETRIC_FEEDBACK,
	readExpectedParametricLine
} from '../parametric-line-answer.ts';
import { formatParametricAnswer, parseParametricAnswer } from '../parametric-lines.ts';

// Droite passant par A(1 ; 2 ; −1), de vecteur directeur u(2 ; 0 ; 3)
const EXPECTED = 'x=1+2t\\\\y=2\\\\z=-1+3t';

function judge(x: string, y: string, z: string) {
	return judgeParametricLineAnswer(formatParametricAnswer([x, y, z]), EXPECTED);
}

describe('parametric-lines', () => {
	it('écrit et relit les lignes, vides comprises', () => {
		const value = formatParametricAnswer(['1+2t', '', '-1+3t']);
		expect(value).toBe('x=1+2t\\\\y=\\\\z=-1+3t');
		expect(parseParametricAnswer(value)).toEqual(['1+2t', '', '-1+3t']);
	});

	it("lit l'attendue d'un auteur, avec ou sans cases", () => {
		expect(parseParametricAnswer('\\begin{cases}x=1+2t\\\\y=2\\\\z=-1+3t\\end{cases}')).toEqual([
			'1+2t',
			'2',
			'-1+3t'
		]);
	});
});

describe('judgeParametricLineAnswer — même droite', () => {
	it('la représentation attendue est juste', () => {
		expect(judge('1+2t', '2', '-1+3t').status).toBe('correct');
	});

	it("l'ordre des termes ne compte pas", () => {
		expect(judge('2t+1', '2', '3t-1').status).toBe('correct');
	});

	it('un autre point de la droite est juste', () => {
		expect(judge('3+2t', '2', '2+3t').status).toBe('correct');
	});

	it('un autre vecteur directeur colinéaire est juste', () => {
		expect(judge('1-4t', '2', '-1-6t').status).toBe('correct');
	});

	it('une autre lettre, la même sur les trois lignes, est juste', () => {
		expect(judge('1+2k', '2', '-1+3k').status).toBe('correct');
	});

	it('une lettre grecque sert aussi de paramètre', () => {
		expect(judge('1+2\\lambda', '2', '-1+3\\lambda').status).toBe('correct');
	});

	it('π est une constante, pas un paramètre', () => {
		expect(
			judgeParametricLineAnswer(
				formatParametricAnswer(['\\pi+2t', '2', '-1+3t']),
				'x=\\pi+2t\\\\y=2\\\\z=-1+3t'
			).status
		).toBe('correct');
	});

	it('une écriture non simplifiée de la même droite est juste', () => {
		expect(judge('1+2t-0', '2', '-1+\\frac{6}{2}t').status).toBe('correct');
	});

	it('des fractions exactes sont justes', () => {
		expect(judge('2+t', '2', '\\frac{1}{2}+\\frac{3}{2}t').status).toBe('correct');
	});
});

describe('judgeParametricLineAnswer — faux', () => {
	it('point et vecteur échangés : le point n’est pas sur la droite', () => {
		const verdict = judge('2+t', '0+2t', '3-t');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.pointOff('t'));
	});

	it('bon point, vecteur non colinéaire', () => {
		const verdict = judge('1+2t', '2+t', '-1+3t');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.notCollinear);
	});

	it('aucune lettre : vecteur nul', () => {
		const verdict = judge('1', '2', '-1');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.zero);
	});

	it('un carré du paramètre : pas de la forme a + b t', () => {
		const verdict = judge('1+2t^2', '2', '-1+3t');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.notAffine('x'));
	});

	it('un produit du paramètre par lui-même est refusé aussi', () => {
		expect(judge('1+t\\times t', '2', '-1+3t').status).toBe('incorrect');
	});

	it('deux lettres différentes : refusé', () => {
		const verdict = judge('1+2t', '2', '-1+3k');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.letters);
	});

	it('x, y ou z ne servent pas de paramètre', () => {
		const verdict = judge('1+2y', '2', '-1+3y');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.letters);
	});

	it('une ligne illisible', () => {
		const verdict = judge('1+2t', '2', '-1+');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.unreadable('z'));
	});

	it('une égalité dans une ligne est illisible', () => {
		expect(judge('1+2t=3', '2', '-1+3t').status).toBe('incorrect');
	});

	it('une division par zéro est fausse, sans exception', () => {
		expect(judge('\\frac{1}{0}+2t', '2', '-1+3t').status).toBe('incorrect');
	});
});

describe('judgeParametricLineAnswer — retours de revue', () => {
	it('« x = » retapé dans la ligne de x : toléré', () => {
		expect(judge('x=1+2t', 'y=2', 'z=-1+3t').status).toBe('correct');
	});

	it('exposant négatif démesuré : refusé sans calcul', () => {
		const verdict = judge('(1+t)^{-999}', '2', '-1+3t');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.unreadable('x'));
	});

	it('e ou π pris pour paramètre : message propre', () => {
		for (const letter of ['e', '\\pi']) {
			const verdict = judge(`1+2${letter}`, '2', `-1+3${letter}`);
			expect(verdict.status).toBe('incorrect');
			expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.constantParameter);
		}
	});

	it('paramètre λ : la lettre grecque dans le message', () => {
		const verdict = judge('2+\\lambda', '2\\lambda', '3-\\lambda');
		expect(verdict.feedback).toBe("Le point obtenu pour λ = 0 n'est pas sur la droite.");
	});
});

describe('judgeParametricLineAnswer — vide, incomplet', () => {
	it('rien d’écrit : vide', () => {
		expect(judge('', '', '').status).toBe('empty');
		expect(judgeParametricLineAnswer('', EXPECTED).status).toBe('empty');
	});

	it('une ligne vide : faux, avec le message', () => {
		const verdict = judge('1+2t', '', '-1+3t');
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(PARAMETRIC_FEEDBACK.incomplete);
	});
});

describe('readExpectedParametricLine', () => {
	it("accepte l'attendue d'un auteur", () => {
		expect(readExpectedParametricLine(EXPECTED)).toEqual({ ok: true });
	});

	it('refuse une attendue sans paramètre (vecteur nul)', () => {
		expect(readExpectedParametricLine('x=1\\\\y=2\\\\z=3').ok).toBe(false);
	});

	it('refuse une attendue de deux lignes (espace seulement)', () => {
		expect(readExpectedParametricLine('x=1+t\\\\y=2').ok).toBe(false);
	});

	it('refuse une attendue illisible', () => {
		expect(readExpectedParametricLine('x=1+\\\\y=2\\\\z=t').ok).toBe(false);
	});
});

describe('expectedParametricLatex', () => {
	it('rend un système avec le paramètre', () => {
		expect(expectedParametricLatex(EXPECTED)).toBe(
			'\\begin{cases}x=1+2t\\\\y=2\\\\z=-1+3t\\end{cases}\\quad(t\\in\\mathbb{R})'
		);
	});
});
