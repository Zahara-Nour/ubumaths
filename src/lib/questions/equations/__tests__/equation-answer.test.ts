/**
 * Réponse « équation » : jugement d'une équation de droite ou de cercle
 * (spécification validée par David le 2026-10-03, docs/wip/reponse-equation-progress.md).
 * Les numéros renvoient au tableau des comportements du document de suivi.
 */

import { describe, it, expect } from 'vitest';
import { judgeEquationAnswer, readExpectedEquation, EQUATION_FEEDBACK } from '../equation-answer';

// Fixtures
const LINE = '2x-y+1=0';
const CIRCLE = '(x-1)^2+(y+2)^2=9';

function statusOf(
	answer: string,
	expected: string,
	form?: Parameters<typeof judgeEquationAnswer>[2]
) {
	return judgeEquationAnswer(answer, expected, form).status;
}

describe('1-4 — droite : tout multiple non nul est juste', () => {
	it.each(['2x-y+1=0', '-2x+y-1=0', '4x-2y+2=0', 'y=2x+1', '2x-y=-1', 'y=1+2x', '2x+1=y'])(
		'%s pour 2x-y+1=0',
		(answer) => {
			expect(statusOf(answer, LINE)).toBe('correct');
		}
	);

	it.each(['x-4=0', '2x=8', '4=x', 'x=4'])('%s pour x=4 (verticale)', (answer) => {
		expect(statusOf(answer, 'x=4')).toBe('correct');
	});

	it.each(['y-3=0', '2y=6', 'y=3'])('%s pour y=3 (horizontale)', (answer) => {
		expect(statusOf(answer, 'y=3')).toBe('correct');
	});

	it('y=3 n’est pas x=3', () => {
		expect(statusOf('x=3', 'y=3')).toBe('incorrect');
	});

	it.each(['x-\\frac12y+\\frac12=0', 'y=\\frac{4x+2}{2}', '\\frac{x}{2}-\\frac{y}{4}+\\frac14=0'])(
		'fractions : %s',
		(answer) => {
			expect(statusOf(answer, LINE)).toBe('correct');
		}
	);

	it('attendu à coefficients fractionnaires', () => {
		expect(statusOf('2x-y+1=0', 'y=2x+1')).toBe('correct');
		expect(statusOf('x-2y+3=0', 'y=\\frac12x+\\frac32')).toBe('correct');
	});

	it('virgule décimale de MathLive', () => {
		expect(statusOf('y=0{,}5x+1', 'x-2y+2=0')).toBe('correct');
		expect(statusOf('y=0,5x+1', 'x-2y+2=0')).toBe('correct');
	});
});

describe('5-7 — cercle : coefficient 1 exigé', () => {
	it.each([CIRCLE, 'x^2+y^2-2x+4y-4=0', '(x-1)^2+(y+2)^2=3^2', '(y+2)^2+(x-1)^2=9'])(
		'%s : juste',
		(answer) => {
			expect(statusOf(answer, CIRCLE)).toBe('correct');
		}
	);

	it.each(['-x^2-y^2+2x-4y+4=0', '9=(x-1)^2+(y+2)^2', '-(x-1)^2-(y+2)^2=-9'])(
		'%s : signe changé (|k| = 1) → juste',
		(answer) => {
			expect(statusOf(answer, CIRCLE)).toBe('correct');
		}
	);

	it('attendue écrite avec un multiple : ramenée au coefficient 1 de x²', () => {
		expect(statusOf('x^2+y^2=4', '2x^2+2y^2=8')).toBe('correct');
		expect(statusOf('x^2+y^2-4=0', '-3x^2-3y^2+12=0')).toBe('correct');
		const verdict = judgeEquationAnswer('2x^2+2y^2=8', '2x^2+2y^2=8');
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.scaledSquare);
	});

	it('sans x² : référence y², puis premier terme de plus haut degré', () => {
		expect(statusOf('y^2=x', '2y^2-2x=0')).toBe('correct');
		expect(statusOf('2y^2=2x', 'y^2=x')).toBe('unoptimal_form');
		expect(statusOf('xy=1', '2xy=2')).toBe('correct');
		expect(statusOf('-xy=-1', 'xy=1')).toBe('correct');
		expect(statusOf('3xy=3', 'xy=1')).toBe('unoptimal_form');
	});

	it.each(['2x^2+2y^2-4x+8y-8=0', '-2x^2-2y^2+4x-8y+8=0', '\\frac12x^2+\\frac12y^2-x+2y-2=0'])(
		'%s : multiple → ½ avec message',
		(answer) => {
			const verdict = judgeEquationAnswer(answer, CIRCLE);
			expect(verdict.status).toBe('unoptimal_form');
			expect(verdict.feedback).toBe(EQUATION_FEEDBACK.scaledSquare);
		}
	);

	it('attendu développé, réponse centre-rayon', () => {
		expect(statusOf(CIRCLE, 'x^2+y^2-2x+4y-4=0')).toBe('correct');
	});

	it('cercle centré à l’origine', () => {
		expect(statusOf('x^2+y^2-4=0', 'x^2+y^2=4')).toBe('correct');
		expect(statusOf('x^2+y^2=2^2', 'x^2+y^2=4')).toBe('correct');
		expect(statusOf('x^2+y^2=2', 'x^2+y^2=4')).toBe('incorrect');
	});

	it('rayon irrationnel : calcul exact', () => {
		expect(statusOf('(x-1)^2+y^2=(\\sqrt{5})^2', '(x-1)^2+y^2=5')).toBe('correct');
		expect(statusOf('x^2+y^2-2x-4=0', '(x-1)^2+y^2=5')).toBe('correct');
	});
});

describe('8 — forme exigée : réduite', () => {
	it.each(['y=2x+1', 'y=1+2x'])('%s : juste', (answer) => {
		expect(statusOf(answer, 'y=2x+1', 'reduite')).toBe('correct');
	});

	it('x+1=y pour y=x+1 : mauvaise forme (décision du 2026-10-02)', () => {
		expect(statusOf('x+1=y', 'y=x+1', 'reduite')).toBe('bad_form');
		expect(statusOf('x+1=y', 'y=x+1')).toBe('correct');
	});

	it.each(['2x-y+1=0', 'y=2(x+1)-1', '2x+1=y', 'y-2x=1', 'y=2x+1+0', 'y=x+x+1'])(
		'%s : mauvaise forme',
		(answer) => {
			const verdict = judgeEquationAnswer(answer, 'y=2x+1', 'reduite');
			expect(verdict.status).toBe('bad_form');
			expect(verdict.feedback).toBe(EQUATION_FEEDBACK.forms.reduite);
		}
	);

	it('fractions et pentes particulières', () => {
		expect(statusOf('y=\\frac12x-3', 'x-2y-6=0', 'reduite')).toBe('correct');
		expect(statusOf('y=\\frac{x}{2}-3', 'x-2y-6=0', 'reduite')).toBe('correct');
		expect(statusOf('y=-x', 'x+y=0', 'reduite')).toBe('correct');
		expect(statusOf('y=3', 'y-3=0', 'reduite')).toBe('correct');
	});

	it('verticale : x = c', () => {
		expect(statusOf('x=4', 'x-4=0', 'reduite')).toBe('correct');
		expect(statusOf('2x=8', 'x-4=0', 'reduite')).toBe('bad_form');
		expect(statusOf('4=x', 'x-4=0', 'reduite')).toBe('bad_form');
	});

	it('une réponse fausse reste fausse, forme ou pas', () => {
		expect(statusOf('y=2x+2', 'y=2x+1', 'reduite')).toBe('incorrect');
	});
});

describe('9 — forme exigée : cartésienne', () => {
	it.each(['2x-y+1=0', '-2x+y-1=0', '4x-2y+2=0', '1+2x-y=0'])('%s : juste', (answer) => {
		expect(statusOf(answer, LINE, 'cartesienne')).toBe('correct');
	});

	it.each(['y=2x+1', '2x-y=-1', '2x-y+1-0=0', '2(x+1)-y-1=0'])('%s : mauvaise forme', (answer) => {
		const verdict = judgeEquationAnswer(answer, LINE, 'cartesienne');
		expect(verdict.status).toBe('bad_form');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.forms.cartesienne);
	});
});

describe('10 — forme exigée : centre-rayon', () => {
	it.each([CIRCLE, '(x-1)^2+(y+2)^2=3^2', '(y+2)^2+(x-1)^2=9'])('%s : juste', (answer) => {
		expect(statusOf(answer, CIRCLE, 'centre-rayon')).toBe('correct');
	});

	it('centre sur un axe', () => {
		expect(statusOf('x^2+(y-1)^2=4', 'x^2+y^2-2y-3=0', 'centre-rayon')).toBe('correct');
	});

	it.each(['x^2+y^2-2x+4y-4=0', '(x-1)^2+(y+2)^2-9=0', '2(x-1)^2+2(y+2)^2=18'])(
		'%s : mauvaise forme',
		(answer) => {
			const verdict = judgeEquationAnswer(answer, CIRCLE, 'centre-rayon');
			expect(verdict.status).toBe('bad_form');
			expect(verdict.feedback).toBe(EQUATION_FEEDBACK.forms['centre-rayon']);
		}
	);
});

describe('11-12 — réponses qui ne sont pas l’équation attendue', () => {
	it.each([
		'2x-y+1',
		'x<3',
		'2x-y+1\\le0',
		'x=\\sqrt{y}',
		'\\frac{1}{x}=y',
		'a+b=0',
		'2a-b+1=0',
		')(',
		'=',
		'x==2',
		'2x-y+2=0',
		'0=0',
		'1=2',
		'(2x-y+1)^2=0'
	])('%s : incorrect, sans exception', (answer) => {
		expect(statusOf(answer, LINE)).toBe('incorrect');
	});

	it('vide : empty', () => {
		expect(statusOf('', LINE)).toBe('empty');
		expect(statusOf('  ', LINE)).toBe('empty');
	});

	it('pas une équation : message', () => {
		expect(judgeEquationAnswer('2x-y+1', LINE).feedback).toBe(EQUATION_FEEDBACK.notEquation);
	});

	it('réponse démesurée : refusée vite', () => {
		const hostile = `(x+y+1)^{${'9'.repeat(3)}}=0`;
		const start = performance.now();
		expect(statusOf(hostile, LINE)).toBe('incorrect');
		expect(performance.now() - start).toBeLessThan(300);
	});
});

describe('15 — réponse attendue du modèle', () => {
	it('lisible', () => {
		expect(readExpectedEquation(LINE).ok).toBe(true);
		expect(readExpectedEquation(CIRCLE).ok).toBe(true);
	});

	it.each(['2x-y+1', 'x<3', '1=1', 'x=\\sqrt{y}', 'a=2', ''])('illisible : %s', (expected) => {
		expect(readExpectedEquation(expected).ok).toBe(false);
	});

	it('attendue illisible : toute réponse est incorrecte, sans exception', () => {
		expect(statusOf('2x=8', '2x-y+1')).toBe('incorrect');
	});
});

// Espace (x, y, z) : plan jugé comme une droite, sphère comme un cercle
// (décision de David du 2026-10-04)
const PLANE = '2x-y+3z-4=0';
const SPHERE = '(x-1)^2+(y+2)^2+(z-3)^2=16';

describe('16 — plan : tout multiple non nul est juste', () => {
	it('attendue lisible', () => {
		expect(readExpectedEquation(PLANE).ok).toBe(true);
		expect(readExpectedEquation('z=2').ok).toBe(true);
	});

	it.each([PLANE, '2x-y+3z=4', '-2x+y-3z+4=0', '4x-2y+6z-8=0', 'z=\\frac{4-2x+y}{3}', '4=2x-y+3z'])(
		'%s : juste',
		(answer) => {
			expect(statusOf(answer, PLANE)).toBe('correct');
		}
	);

	it.each(['2x-y+3z+4=0', '2x-y-3z-4=0', '2x-y-4=0', '2x-y+3z-4', 'x^2+y^2+z^2=4'])(
		'%s : incorrect',
		(answer) => {
			expect(statusOf(answer, PLANE)).toBe('incorrect');
		}
	);

	it('forme cartésienne exigée : membre droit 0, message de l’espace', () => {
		expect(statusOf('4x-2y+6z-8=0', PLANE, 'cartesienne')).toBe('correct');
		const verdict = judgeEquationAnswer('2x-y+3z=4', PLANE, 'cartesienne');
		expect(verdict.status).toBe('bad_form');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.spaceForms.cartesienne);
	});

	it('pas une équation : message en x, y et z', () => {
		expect(judgeEquationAnswer('2x-y+3z-4', PLANE).feedback).toBe(
			EQUATION_FEEDBACK.notEquationSpace
		);
	});
});

describe('17 — sphère : coefficient 1 exigé', () => {
	it.each([
		SPHERE,
		'x^2+y^2+z^2-2x+4y-6z-2=0',
		'(z-3)^2+(x-1)^2+(y+2)^2=4^2',
		'16=(x-1)^2+(y+2)^2+(z-3)^2',
		'-x^2-y^2-z^2+2x-4y+6z+2=0'
	])('%s : juste', (answer) => {
		expect(statusOf(answer, SPHERE)).toBe('correct');
	});

	it('multiple → ½ avec message', () => {
		const verdict = judgeEquationAnswer('2x^2+2y^2+2z^2-4x+8y-12z-4=0', SPHERE);
		expect(verdict.status).toBe('unoptimal_form');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.scaledSquare);
	});

	it.each(['(x-1)^2+(y+2)^2+(z-3)^2=4', '(x+1)^2+(y+2)^2+(z-3)^2=16', '(x-1)^2+(y+2)^2=16'])(
		'%s : incorrect',
		(answer) => {
			expect(statusOf(answer, SPHERE)).toBe('incorrect');
		}
	);

	it('forme centre-rayon exigée', () => {
		expect(statusOf('(x-1)^2+(y+2)^2+(z-3)^2=4^2', SPHERE, 'centre-rayon')).toBe('correct');
		expect(statusOf('x^2+(y+2)^2+(z-3)^2=16', 'x^2+(y+2)^2+(z-3)^2=16', 'centre-rayon')).toBe(
			'correct'
		);
		const verdict = judgeEquationAnswer('x^2+y^2+z^2-2x+4y-6z-2=0', SPHERE, 'centre-rayon');
		expect(verdict.status).toBe('bad_form');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.spaceForms['centre-rayon']);
	});

	it('deux fois la même variable : pas la forme centre-rayon', () => {
		expect(statusOf('(x-1)^2+(x-1)^2+z^2=2', '2(x-1)^2+z^2=2', 'centre-rayon')).toBe('bad_form');
	});
});

describe('18 — case du plan repéré : une réponse en z est fausse, avec un message', () => {
	it.each(['2x-y+z+1=0', 'y=2x+1+z'])('%s pour 2x-y+1=0', (answer) => {
		const verdict = judgeEquationAnswer(answer, LINE);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.unexpectedZ);
	});

	it('cercle : réponse sphère fausse, avec le message', () => {
		const verdict = judgeEquationAnswer('(x-1)^2+(y+2)^2+z^2=9', CIRCLE);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe(EQUATION_FEEDBACK.unexpectedZ);
	});

	it('z qui s’annule : lu comme une droite', () => {
		expect(statusOf('2x-y+z-z+1=0', LINE)).toBe('correct');
	});

	it('autre lettre que x, y, z : toujours illisible', () => {
		expect(statusOf('2x-y+t+1=0', LINE)).toBe('incorrect');
		expect(readExpectedEquation('2x-y+t=0').ok).toBe(false);
	});
});
