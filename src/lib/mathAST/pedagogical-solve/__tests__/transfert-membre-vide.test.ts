/**
 * Transfert du lycée (« On isole les termes en x ») : un membre qui ne garde rien s'écrit
 * avec le seul terme coloré, jamais `0` devant lui (écart V51, relevé le 2026-10-13).
 *
 * `5=2x+1` affichait `0 \textcolor{blue}{- 2x} = 1 \textcolor{blue}{- 5}` ; il affiche
 * `\textcolor{blue}{-2x} = 1 \textcolor{blue}{- 5}`. Un membre sans reste ni terme déplacé
 * garde son `0`.
 */

import { describe, it, expect } from 'vitest';
import { generateEquationSteps, generateInequalitySteps } from '../index';
import { parseCustomSafe } from '../../parser/custom';
import { isRelation } from '../../guards';
import { LinearEquationRenderer, formatTransformationCustom } from '../linear-renderer';

function steps(source: string) {
	const rel = parseCustomSafe(source).ast;
	if (rel === null || !isRelation(rel)) throw new Error(`pas une relation : ${source}`);
	return rel.relation === '='
		? generateEquationSteps(rel, { level: 'lycee' })
		: generateInequalitySteps(rel, { level: 'lycee' });
}

/** La première ligne du transfert, en LaTeX. */
function transferLine(source: string): string {
	const rendered = new LinearEquationRenderer()
		.renderAll(steps(source), { schoolLevel: 'lycee', verbosity: 'detailed' })
		.find((s) => s.title.startsWith('On isole'));
	if (rendered?.expressionLatex === undefined) throw new Error(`pas de transfert : ${source}`);
	return rendered.expressionLatex.split(' \\\\ ')[0].replace('\\begin{aligned}   ', '');
}

/** La première ligne du transfert, en syntaxe de la console. */
function transferCustom(source: string): string {
	const step = steps(source).find((s) => s.operation?.kind === 'transpose-terms');
	const text = step === undefined ? null : formatTransformationCustom(step);
	if (text === null) throw new Error(`pas de transfert : ${source}`);
	return text.split('\n')[0];
}

describe('V51 : membre vide dans le transfert du lycée', () => {
	it.each([
		['5=2x+1', '\\textcolor{blue}{-2x} &= 1 \\textcolor{blue}{- 5}'],
		['4=3x', '\\textcolor{blue}{-3x} &= \\textcolor{blue}{-4}'],
		['7=-2x+1', '\\textcolor{blue}{2x} &= 1 \\textcolor{blue}{- 7}'],
		['5<3x-1', '\\textcolor{blue}{-3x} &< -1 \\textcolor{blue}{- 5}'],
		['3x+2=5x', '3x \\textcolor{blue}{- 5x} &= \\textcolor{blue}{-2}']
	])('%s : %s', (source, expected) => {
		expect(transferLine(source)).toBe(expected);
	});

	it('syntaxe de la console : 5=2x+1', () => {
		expect(transferCustom('5=2x+1')).toBe('@blue{-2x} = 1 @blue{- 5}');
	});

	it('syntaxe de la console : 4=3x', () => {
		expect(transferCustom('4=3x')).toBe('@blue{-3x} = @blue{-4}');
	});
});
