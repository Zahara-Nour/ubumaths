/**
 * Case « résolution » (outil 55) : chaque ligne a les mêmes solutions que la
 * précédente, la dernière est « x = valeur ». Comportements validés par David le
 * 2026-11-28 (journal `docs/wip/outil-equation-lignes-progress.md`).
 */
import { describe, expect, it } from 'vitest';
import {
	formatResolutionAnswer,
	judgeResolutionAnswer,
	parseResolutionAnswer,
	RESOLUTION_MAX_LINES
} from '../resolution-answer.ts';

const START = { equation: '3x-5=7' };

function judge(lines: string[], fields: Parameters<typeof judgeResolutionAnswer>[1] = START) {
	return judgeResolutionAnswer(formatResolutionAnswer(lines), fields);
}

describe('lignes de la case', () => {
	it('aller-retour : lignes vides retirées, espaces ôtés', () => {
		const value = formatResolutionAnswer([' 3x=12 ', '', 'x=4']);
		expect(value).toBe('3x=12\\\\x=4');
		expect(parseResolutionAnswer(value)).toEqual(['3x=12', 'x=4']);
	});

	it('une barre oblique seule en fin de ligne ne casse pas la ligne suivante', () => {
		const value = formatResolutionAnswer(['3x=12\\ ', 'x=4']);
		expect(parseResolutionAnswer(value)).toEqual(['3x=12', 'x=4']);
	});

	it('une ligne qui commence par une commande LaTeX reste entière', () => {
		const value = formatResolutionAnswer(['4\\times3=5x', '\\frac{12}{5}=x']);
		expect(parseResolutionAnswer(value)).toEqual(['4\\times3=5x', '\\frac{12}{5}=x']);
	});
});

describe('nominal', () => {
	it('3x − 5 = 7 → 3x = 12 → x = 4 : juste', () => {
		const verdict = judge(['3x=12', 'x=4']);
		expect(verdict.status).toBe('correct');
		expect(verdict.lines).toEqual(['ok', 'ok']);
		expect(verdict.finalValue).toBe('4');
	});

	it('une étape qui multiplie les deux membres reste juste (6x = 24)', () => {
		expect(judge(['3x=12', '6x=24', 'x=4']).status).toBe('correct');
	});

	it('x = 4 seul, sans étape : juste (minLines par défaut 1)', () => {
		expect(judge(['x=4']).status).toBe('correct');
	});

	it('distributivité : 3(2x + 1) = 4x − 5', () => {
		const verdict = judge(['6x+3=4x-5', '2x=-8', 'x=-4'], { equation: '3(2x+1)=4x-5' });
		expect(verdict.status).toBe('correct');
	});

	it('équation de proportion 4/x = 5/3 → 12 = 5x → x = 12/5', () => {
		const verdict = judge(['12=5x', 'x=\\frac{12}{5}'], { equation: '\\frac{4}{x}=\\frac{5}{3}' });
		expect(verdict.status).toBe('correct');
		expect(verdict.finalValue).toBe('\\frac{12}{5}');
	});

	it('virgule décimale : x = 2{,}5', () => {
		expect(judge(['2x=5', 'x=2{,}5'], { equation: '2x-1=4' }).status).toBe('correct');
	});

	it('autre inconnue (`variable: t`)', () => {
		expect(judge(['2t=6', 't=3'], { equation: '2t+1=7', variable: 't' }).status).toBe('correct');
	});
});

describe('limite', () => {
	it('x = 12/3 : lignes justes, la valeur (non simplifiée) reste à juger', () => {
		const verdict = judge(['3x=12', 'x=\\frac{12}{3}']);
		expect(verdict.status).toBe('correct');
		expect(verdict.finalValue).toBe('\\frac{12}{3}');
	});

	it('une ligne recopiée sans changement est acceptée', () => {
		expect(judge(['3x-5=7', '3x=12', 'x=4']).status).toBe('correct');
	});

	it('minLines : x = 4 seul refusé quand le modèle exige 2 lignes', () => {
		const verdict = judge(['x=4'], { ...START, minLines: 2 });
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toMatch(/au moins 2 lignes/);
	});

	it('minLines : une conclusion recopiée ne compte pas comme une étape', () => {
		const verdict = judge(['x=4', 'x=4'], { ...START, minLines: 2 });
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toMatch(/au moins 2 lignes/);
	});

	it('minLines : l’équation de l’énoncé recopiée ne compte pas non plus', () => {
		expect(judge(['3x - 5 = 7', 'x=4'], { ...START, minLines: 2 }).status).toBe('incorrect');
		expect(judge(['3x=12', 'x=4'], { ...START, minLines: 2 }).status).toBe('correct');
	});

	it('trop de lignes : pas lue', () => {
		const lines = Array.from({ length: RESOLUTION_MAX_LINES + 1 }, () => '3x=12');
		expect(judge(lines).status).toBe('incorrect');
	});
});

describe('garde de coût du solveur', () => {
	it.each([
		['(x+1)^{999}=(x+2)^{999}', 'exposant démesuré'],
		['((((x+1)^{10})^{10})^{10})^{10}=1', 'puissances emboîtées'],
		['x^{x}=1', 'exposant non numérique']
	])('%s (%s) : illisible, sans faire tourner le solveur', (line) => {
		const start = performance.now();
		const verdict = judge(Array.from({ length: RESOLUTION_MAX_LINES }, () => line));
		expect(verdict.lines).toEqual(['unreadable']);
		expect(performance.now() - start).toBeLessThan(1000);
	});

	it('second degré écrit (x² − 4x + 4 = 0) : lu', () => {
		expect(judge(['(x-2)^2=0', 'x=2'], { equation: 'x^2-4x+4=0' }).status).toBe('correct');
	});
});

describe('erreur', () => {
	it('3x = 2 → x = 2/3 : la ligne 1 est fausse, la suite reste sans marque', () => {
		const verdict = judge(['3x=2', 'x=\\frac{2}{3}']);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.lines).toEqual(['not-equivalent']);
		expect(verdict.feedback).toBe("La ligne 1 n'a pas les mêmes solutions que la précédente.");
	});

	it('deux erreurs qui se compensent : réponse fausse malgré x = 4', () => {
		// 3x − 5 = 7 → 3x = 2 (faux) → x = 4 (faux par rapport à 3x = 2)
		const verdict = judge(['3x=2', 'x=4']);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.lines).toEqual(['not-equivalent']);
	});

	it('multiplier par 0 (0 = 0) ne garde pas les solutions', () => {
		expect(judge(['0=0']).lines).toEqual(['not-equivalent']);
	});

	it('ligne sans « = » : illisible', () => {
		const verdict = judge(['3x+12', 'x=4']);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.lines[0]).toBe('unreadable');
		expect(verdict.feedback).toMatch(/Je ne peux pas lire la ligne 1/);
	});

	it('plusieurs égalités sur une ligne (x = 12/3 = 4) : une seule par ligne', () => {
		const verdict = judge(['3x=12', 'x=\\frac{12}{3}=4']);
		expect(verdict.lines).toEqual(['ok', 'unreadable']);
		expect(verdict.feedback).toBe('Ligne 2 : écris une seule égalité par ligne.');
	});

	it('ligne avec une autre lettre : illisible', () => {
		expect(judge(['3y=12', 'x=4']).lines[0]).toBe('unreadable');
	});

	it('lignes justes mais pas de conclusion « x = … »', () => {
		const verdict = judge(['3x=12']);
		expect(verdict.status).toBe('incorrect');
		expect(verdict.feedback).toBe('Termine ta résolution par « x = … ».');
	});

	it('conclusion à l’envers (4 = x) : à écrire « x = … »', () => {
		expect(judge(['3x=12', '4=x']).feedback).toBe('Termine ta résolution par « x = … ».');
	});

	it('rien écrit : vide', () => {
		expect(judgeResolutionAnswer('', START).status).toBe('empty');
		expect(judgeResolutionAnswer('\\\\ \\\\', START).status).toBe('empty');
	});

	it('équation de l’énoncé absente ou illisible : jamais d’exception', () => {
		expect(judge(['x=4'], {}).status).toBe('incorrect');
		expect(judge(['x=4'], { equation: '3x+' }).status).toBe('incorrect');
	});
});
