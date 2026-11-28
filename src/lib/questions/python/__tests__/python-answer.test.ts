/**
 * Case « programme Python » : valeur de la case (code + verdict) et réponse attendue
 */

import { describe, it, expect } from 'vitest';
import {
	expectedPythonAnswer,
	PYTHON_NOT_RUN,
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
