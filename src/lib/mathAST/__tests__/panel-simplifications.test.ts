/**
 * Le panel de référence des simplifications.
 *
 * Ce fichier **pinne** `docs/ref/panel-simplifications.md`, qui est le document
 * de référence que David et moi consultons pour savoir ce que le moteur rend.
 *
 * ⚠️ **Les deux vont ensemble.** Quand une valeur change ici, elle doit changer
 * là-bas dans le même commit. Sans ce test, le document pourrit en silence :
 * c'est exactement ce qui est arrivé au §1 de
 * `docs/wip/simplify-reecriture-releve.md`, mesuré le 2026-09-20 et périmé
 * neuf PR plus tard sans que rien ne le signale.
 *
 * Les quatre intentions sont mesurées à `schoolLevel: 'lycee'` : les identités
 * trigonométriques et exponentielles sont coupées en dessous, et c'est un
 * garde-fou pédagogique délibéré.
 *
 * Un rouge ici n'est pas forcément une régression — ce peut être une
 * amélioration. Il demande seulement qu'on REGARDE, et qu'on mette le document
 * à jour en même temps.
 */

import { describe, it, expect } from 'vitest';
import { toLatex } from '../index';
import { parseLatex } from '../parser';
import { generatePedagogicalSimplifySteps } from '../pedagogical-simplify/pipeline';
import type { SimplifyIntent } from '../pedagogical-simplify/types';
import { simplify } from '../simplify';

const parSimplify = (entree: string) => toLatex(simplify(parseLatex(entree)).result);

const parIntention = (entree: string, intent: SimplifyIntent) =>
	toLatex(
		generatePedagogicalSimplifySteps(parseLatex(entree), { intent, schoolLevel: 'lycee' }).result
	);

describe('panel de référence — docs/ref/panel-simplifications.md', () => {
	describe('Fractions numériques', () => {
		it.each([
			[
				'\\frac{2}{6}+\\frac{1}{4}',
				'\\dfrac{7}{12}',
				'\\dfrac{7}{12}',
				'\\dfrac{7}{12}',
				'\\dfrac{7}{12}',
				'\\dfrac{7}{12}'
			],
			[
				'\\frac{3}{6}',
				'\\dfrac{1}{2}',
				'\\dfrac{1}{2}',
				'\\dfrac{1}{2}',
				'\\dfrac{1}{2}',
				'\\dfrac{1}{2}'
			],
			[
				'\\frac{2}{4}\\cdot\\frac{6}{8}',
				'\\dfrac{3}{8}',
				'\\dfrac{3}{8}',
				'\\dfrac{3}{8}',
				'\\dfrac{3}{8}',
				'\\dfrac{1}{2} \\cdot \\dfrac{3}{4}'
			],
			[
				'\\frac{6}{8}x',
				'\\dfrac{3 x}{4}',
				'\\dfrac{3}{4} x',
				'\\dfrac{3}{4} x',
				'\\dfrac{3}{4} x',
				'\\dfrac{3}{4} x'
			]
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Radicaux', () => {
		it.each([
			['\\sqrt{8}', '2 \\sqrt{2}', '2 \\sqrt{2}', '2 \\sqrt{2}', '2 \\sqrt{2}', '2 \\sqrt{2}'],
			[
				'\\frac{1}{\\sqrt{2}}',
				'\\dfrac{\\sqrt{2}}{2}',
				'\\dfrac{1}{2} \\sqrt{2}',
				'\\dfrac{1}{2} \\sqrt{2}',
				'\\dfrac{1}{2} \\sqrt{2}',
				'\\dfrac{\\sqrt{2}}{2}'
			],
			['\\sqrt{x}\\sqrt{x}', 'x', 'x', 'x', 'x', '\\sqrt{x} \\sqrt{x}'],
			[
				'\\sqrt{x^2}',
				'\\sqrt{x^2}',
				'\\left| x \\right|',
				'\\left| x \\right|',
				'\\left| x \\right|',
				'\\sqrt{x^2}'
			],
			[
				'\\sqrt[3]{x}\\sqrt[3]{x}',
				'\\sqrt[3]{x}^2',
				'\\sqrt[3]{x^2}',
				'\\sqrt[3]{x^2}',
				'\\sqrt[3]{x^2}',
				'\\sqrt[3]{x} \\sqrt[3]{x}'
			],
			['\\sqrt{2}\\sqrt{8}', '4', '4', '4', '4', '\\sqrt{2} 2 \\sqrt{2}']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Termes semblables', () => {
		it.each([
			['2x+3x', '5 x', '5 x', '5 x', '5 x', '5 x'],
			['x+x', '2 x', '2 x', '2 x', '2 x', 'x 2'],
			['x-x', '0', '0', '0', '0', 'x 0'],
			['3x+2y+x-y', '4 x + y', '4 x + y', '4 x + y', '4 x + y', '4 x + y']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Développement', () => {
		it.each([
			[
				'(x+1)^2',
				'\\left( x + 1 \\right)^2',
				'x^2 + 2 x + 1',
				'x^2 + 2 x + 1',
				'x^2 + 2 x + 1',
				'\\left( x + 1 \\right)^2'
			],
			[
				'(x+1)(x-1)',
				'x^2 - 1',
				'x^2 - 1',
				'x^2 - 1',
				'x^2 - 1',
				'\\left( x + 1 \\right) \\left( x - 1 \\right)'
			],
			[
				'(2x-3)(x+4)',
				'\\left( 2 x - 3 \\right) \\left( x + 4 \\right)',
				'2 x^2 + 5 x - 12',
				'2 x^2 + 5 x - 12',
				'2 x^2 + 5 x - 12',
				'\\left( 2 x - 3 \\right) \\left( x + 4 \\right)'
			],
			['x(x+1)', 'x^2 + x', 'x^2 + x', 'x^2 + x', 'x^2 + x', 'x \\left( x + 1 \\right)']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Factorisation', () => {
		it.each([
			[
				'x^2-1',
				'x^2 - 1',
				'x^2 - 1',
				'x^2 - 1',
				'x^2 - 1',
				'\\left( x + 1 \\right) \\left( x - 1 \\right)'
			],
			[
				'x^2+2x+1',
				'\\left( x + 1 \\right)^2',
				'x^2 + 2 x + 1',
				'x^2 + 2 x + 1',
				'x^2 + 2 x + 1',
				'\\left( x + 1 \\right)^2'
			],
			['2x+4', '2 x + 4', '2 x + 4', '2 x + 4', '2 x + 4', '2 \\left( x + 2 \\right)'],
			['x^2+2x', 'x^2 + 2 x', 'x^2 + 2 x', 'x^2 + 2 x', 'x^2 + 2 x', 'x \\left( x + 2 \\right)'],
			[
				'3x^2+6x+3',
				'3 x^2 + 6 x + 3',
				'3 x^2 + 6 x + 3',
				'3 x^2 + 6 x + 3',
				'3 x^2 + 6 x + 3',
				'3 \\left( x + 1 \\right)^2'
			],
			[
				'e^{x}+xe^{x}',
				'x e^x + e^x',
				'x e^x + e^x',
				'x e^x + e^x',
				'x e^x + e^x',
				'\\left( x + 1 \\right) e^x'
			],
			['-2x-4', '-2 x - 4', '-2 x - 4', '-2 x - 4', '-2 x - 4', '-2 \\left( x + 2 \\right)'],
			[
				'x^2y+xy',
				'x^2 y + x y',
				'x^2 y + x y',
				'x^2 y + x y',
				'x^2 y + x y',
				'x \\left( x + 1 \\right) y'
			]
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Fractions rationnelles', () => {
		it.each([
			['\\frac{x^2-1}{x+1}', 'x - 1', 'x - 1', 'x - 1', 'x - 1', 'x - 1'],
			['\\frac{x^2-y^2}{x-y}', 'x + y', 'x + y', 'x + y', 'x + y', 'x + y'],
			[
				'\\frac{x^2-y^2}{x^2+2xy+y^2}',
				'\\dfrac{x - y}{x + y}',
				'\\dfrac{x - y}{x + y}',
				'\\dfrac{x - y}{x + y}',
				'\\dfrac{x - y}{x + y}',
				'\\dfrac{x - y}{x + y}'
			],
			['\\frac{x}{x}', '1', '1', '1', '1', '1'],
			[
				'\\frac{(x+y)^2}{x+2y}',
				'\\dfrac{\\left( x + y \\right)^2}{x + 2 y}',
				'\\dfrac{2 x y + x^2 + y^2}{x + 2 y}',
				'\\dfrac{2 x y + x^2 + y^2}{x + 2 y}',
				'\\dfrac{2 x y + x^2 + y^2}{x + 2 y}',
				'\\dfrac{\\left( x + y \\right)^2}{x + 2 y}'
			]
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Puissances', () => {
		it.each([
			['x^{2}x^{3}', 'x^5', 'x^5', 'x^5', 'x^5', 'x^2 x^3'],
			['(x^{2})^{3}', 'x^6', 'x^6', 'x^6', 'x^6', 'x^6'],
			['e^{x}e^{2x}', 'e^x e^{2 x}', 'e^{3 x}', 'e^{3 x}', 'e^{2 x} e^x', 'e^x e^{2 x}'],
			['(e^{x})^{3}', 'e^x^3', 'e^{3 x}', 'e^{3 x}', 'e^x^3', 'e^x^3'],
			['x^{a}x^{b}', 'x^a x^b', 'x^{a + b}', 'x^{a + b}', 'x^a x^b', 'x^a x^b']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Exponentielle et logarithme', () => {
		it.each([
			['e^{x}', 'e^x', 'e^x', 'e^x', 'e^x', 'e^x'],
			[
				'\\ln(e^{x})',
				'\\ln\\left( e^x \\right)',
				'x \\ln\\left( e \\right)',
				'x \\ln\\left( e \\right)',
				'x \\ln\\left( e \\right)',
				'x \\ln\\left( e \\right)'
			],
			[
				'\\frac{e^{2x}}{e^{x}}',
				'\\dfrac{e^{2 x}}{e^x}',
				'\\dfrac{e^{2 x}}{e^x}',
				'\\dfrac{e^{2 x}}{e^x}',
				'\\dfrac{e^{2 x}}{e^x}',
				'\\dfrac{e^{2 x}}{e^x}'
			],
			['e^{0}', '1', '1', '1', '1', '1']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Trigonométrie', () => {
		it.each([
			['\\sin(x)^2+\\cos(x)^2', '1', '1', '1', '1', '1'],
			[
				'\\frac{\\sin(x)}{\\cos(x)}',
				'\\tan\\left( x \\right)',
				'\\tan\\left( x \\right)',
				'\\tan\\left( x \\right)',
				'\\tan\\left( x \\right)',
				'\\tan\\left( x \\right)'
			],
			[
				'\\sin(2x)',
				'\\sin\\left( 2 x \\right)',
				'\\sin\\left( 2 x \\right)',
				'\\sin\\left( 2 x \\right)',
				'\\sin\\left( 2 x \\right)',
				'\\sin\\left( 2 x \\right)'
			],
			[
				'\\cos(-x)',
				'\\cos\\left( x \\right)',
				'\\cos\\left( x \\right)',
				'\\cos\\left( x \\right)',
				'\\cos\\left( x \\right)',
				'\\cos\\left( -x \\right)'
			]
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});

	describe('Signes et neutres', () => {
		it.each([
			[
				'-(x+1)',
				'-\\left( x + 1 \\right)',
				'-x - 1',
				'-x - 1',
				'-x - 1',
				'-\\left( x + 1 \\right)'
			],
			['0\\cdot x', '0', '0', '0', '0', '0 \\cdot x'],
			['1\\cdot x', 'x', 'x', 'x', 'x', '1 \\cdot x'],
			['x+0', 'x', 'x', 'x', 'x', 'x'],
			['-x-1', '-x - 1', '-x - 1', '-x - 1', '-x - 1', '-\\left( x + 1 \\right)']
		])('%s', (entree, attenduSimplify, auto, reduire, developper, factoriser) => {
			expect(parSimplify(entree)).toBe(attenduSimplify);
			expect(parIntention(entree, 'auto')).toBe(auto);
			expect(parIntention(entree, 'reduire')).toBe(reduire);
			expect(parIntention(entree, 'developper')).toBe(developper);
			expect(parIntention(entree, 'factoriser')).toBe(factoriser);
		});
	});
});
