/**
 * Case « programme Python » : valeur de la case (code + verdict) et réponse attendue
 */

import { describe, it, expect } from 'vitest';
import {
	expectedPythonAnswer,
	PYTHON_NOT_RUN,
	pythonAnswerForTrace,
	pythonAnswerVerdict,
	readExpectedPythonAnswer,
	readPythonAnswer,
	writePythonAnswer
} from '../python-answer';

const ATTENDU = {
	fonction: 'seuil',
	solution: 'def seuil(A):\n    return 1',
	essais: ['seuil(2)'],
	exiger: ['boucle' as const]
};

describe('valeur de la case', () => {
	it('aller-retour : le code et le verdict', () => {
		const value = writePythonAnswer({ code: 'def f(): pass', verdict: { juste: true } });
		expect(readPythonAnswer(value)).toEqual({ code: 'def f(): pass', verdict: { juste: true } });
	});

	it('valeur illisible (sans préfixe, JSON cassé, forme fausse) : null', () => {
		expect(readPythonAnswer('def f(): pass')).toBeNull();
		expect(readPythonAnswer('python1:{')).toBeNull();
		expect(readPythonAnswer('python1:{"code":3,"verdict":null}')).toBeNull();
		expect(
			readPythonAnswer(`python1:${JSON.stringify({ code: 'x'.repeat(20_001), verdict: null })}`)
		).toBeNull();
	});

	it('verdict lu : juste, faux avec son message, pas essayé, illisible', () => {
		const juste = writePythonAnswer({ code: 'c', verdict: { juste: true } });
		expect(pythonAnswerVerdict(juste)).toEqual({ juste: true });
		const faux = writePythonAnswer({ code: 'c', verdict: { juste: false, message: 'm' } });
		expect(pythonAnswerVerdict(faux)).toEqual({ juste: false, message: 'm' });
		expect(pythonAnswerVerdict(writePythonAnswer({ code: 'c', verdict: null }))).toEqual({
			juste: false,
			message: PYTHON_NOT_RUN
		});
		expect(pythonAnswerVerdict('n’importe quoi')).toEqual({ juste: false });
	});
});

describe('réponse attendue', () => {
	it('aller-retour ; forme fausse : null', () => {
		expect(readExpectedPythonAnswer(expectedPythonAnswer(ATTENDU))).toEqual(ATTENDU);
		expect(readExpectedPythonAnswer('seuil')).toBeNull();
		expect(
			readExpectedPythonAnswer(expectedPythonAnswer({ ...ATTENDU, exiger: ['récursif' as never] }))
		).toBeNull();
	});
});

describe('pythonAnswerForTrace : la trace tient sous la borne de la base (2 000 caractères par case)', () => {
	it('une réponse courte reste telle quelle', () => {
		const value = writePythonAnswer({ code: 'def f(x):\n    return x', verdict: { juste: true } });
		expect(pythonAnswerForTrace(value, 2000)).toBe(value);
	});

	it('un long programme est raccourci, verdict gardé, toujours lisible', () => {
		const code = 'def f(x):\n' + '    x = "a" + x\n'.repeat(300) + '    return x';
		const value = writePythonAnswer({
			code,
			verdict: { juste: false, message: '`f(1)` : ta fonction rend 2, on attendait 1.' }
		});
		expect(value.length).toBeGreaterThan(2000);
		const trace = pythonAnswerForTrace(value, 2000);
		expect(trace.length).toBeLessThanOrEqual(2000);
		const lu = readPythonAnswer(trace);
		expect(lu?.verdict).toEqual({
			juste: false,
			message: '`f(1)` : ta fonction rend 2, on attendait 1.'
		});
		expect(code.startsWith(lu?.code.replace(/…$/, '') ?? 'x')).toBe(true);
	});

	it('une valeur qui n’est pas une réponse Python est coupée à la borne', () => {
		expect(pythonAnswerForTrace('x'.repeat(3000), 2000)).toHaveLength(2000);
	});
});
