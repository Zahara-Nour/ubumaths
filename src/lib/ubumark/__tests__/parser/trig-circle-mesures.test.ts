/**
 * Bloc ```trig : mesures principales (décision de David, 2026-10-02)
 *
 * `mesures: principales` écrit toute étiquette d'angle dans ]−π ; π] ; le
 * défaut `mesures: 0-2pi` garde [0 ; 2π[. Les points ne bougent pas : seule
 * l'étiquette change. `equation:` lit aussi une valeur écrite avec une
 * fonction : `cos(x) = cos(pi/5)`.
 */
import { describe, it, expect } from 'vitest';
import { parseTrigCircleContent } from '../../parser/trig-circle-parser';
import { generateTrigCircleTypst } from '../../generators/trig-circle-typst';
import { convertLatexToTypstMath } from '../../generators/typst-generator';
import type { TrigAngle, TrigCircleNode } from '../../types/trig-circle';

const PI = Math.PI;

function nodeOf(source: string): TrigCircleNode {
	const { node } = parseTrigCircleContent(source);
	return node!;
}

const latexOf = (angles: TrigAngle[] | undefined) => (angles ?? []).map((a) => a.latex);
const radiansOf = (angles: TrigAngle[] | undefined) => (angles ?? []).map((a) => a.radians);

/** Lignes `content(...)` qui écrivent une valeur d'angle dans le Typst */
function valueLines(typst: string): string[] {
	const start = typst.indexOf('// Angle labels');
	if (start === -1) return [];
	return typst
		.slice(start)
		.split('\n\n')[0]
		.split('\n')
		.filter((l) => l.trim().startsWith('content('));
}

describe('trig — mesures: principales', () => {
	it('défaut inchangé : sin(x) = -1/2 donne 7π/6 et 11π/6', () => {
		const node = nodeOf('preset: custom\nequation: sin(x) = -1/2');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{7\\pi}{6}', '\\frac{11\\pi}{6}']);
	});

	it('principales : sin(x) = -1/2 donne −5π/6 et −π/6, aux mêmes places', () => {
		const node = nodeOf('preset: custom\nequation: sin(x) = -1/2\nmesures: principales');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.solution?.angles)).toEqual(['-\\frac{5\\pi}{6}', '-\\frac{\\pi}{6}']);
		const radians = radiansOf(node.solution?.angles);
		expect(radians[0]).toBeCloseTo((7 * PI) / 6, 10);
		expect(radians[1]).toBeCloseTo((11 * PI) / 6, 10);
	});

	it('principales : le preset sixths est écrit dans ]−π ; π]', () => {
		const defaut = nodeOf('preset: sixths');
		const node = nodeOf('preset: sixths\nmesures: principales');
		expect(radiansOf(node.angles)).toEqual(radiansOf(defaut.angles));
		expect(latexOf(node.angles)).toEqual([
			'0',
			'\\frac{\\pi}{6}',
			'\\frac{\\pi}{3}',
			'\\frac{\\pi}{2}',
			'\\frac{2\\pi}{3}',
			'\\frac{5\\pi}{6}',
			'\\pi',
			'-\\frac{5\\pi}{6}',
			'-\\frac{2\\pi}{3}',
			'-\\frac{\\pi}{2}',
			'-\\frac{\\pi}{3}',
			'-\\frac{\\pi}{6}'
		]);
	});

	it('principales : `angles:` récrits (11π/6 → −π/6, −π → π, 200° → −160°)', () => {
		const node = nodeOf('preset: custom\nangles: 11*pi/6, 5*pi/3, -pi, 200°\nmesures: principales');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.angles)).toEqual([
			'\\pi',
			'-160^\\circ',
			'-\\frac{\\pi}{3}',
			'-\\frac{\\pi}{6}'
		]);
	});

	it('principales : borne d’arc d’une inéquation écrite −π/3, arc inchangé', () => {
		const defaut = nodeOf(
			'preset: custom\nangles: pi/3, 5*pi/3\nequation: cos(x) >= 1/2\nmode: arc'
		);
		const node = nodeOf(
			'preset: custom\nangles: pi/3, 5*pi/3\nequation: cos(x) >= 1/2\nmode: arc\nmesures: principales'
		);
		expect(latexOf(defaut.angles)).toEqual(['\\frac{\\pi}{3}', '\\frac{5\\pi}{3}']);
		expect(latexOf(node.angles)).toEqual(['\\frac{\\pi}{3}', '-\\frac{\\pi}{3}']);
		expect(node.solution?.arcs).toEqual(defaut.solution?.arcs);
	});

	it('`mesures: 0-2pi` explicite = défaut', () => {
		const defaut = nodeOf('preset: all\nequation: sin(x) = -1/2');
		const explicite = nodeOf('preset: all\nequation: sin(x) = -1/2\nmesures: 0-2pi');
		expect(explicite.angles).toEqual(defaut.angles);
		expect(explicite.solution).toEqual(defaut.solution);
	});

	it('valeur invalide : erreur située', () => {
		const { errors } = parseTrigCircleContent('preset: quarters\nmesures: degres');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toBe(
			'Ligne 2 : mesures inconnues « degres » (possibles : 0-2pi, principales)'
		);
	});

	it('clé inconnue : le message cite `mesures`', () => {
		const { errors } = parseTrigCircleContent('preset: quarters\nmesure: principales');
		expect(errors[0].message).toContain('mesures');
	});

	it('PDF : mêmes étiquettes que l’écran', () => {
		const typst = generateTrigCircleTypst(
			nodeOf('preset: custom\nequation: sin(x) = -1/2\nmesures: principales')
		);
		const lines = valueLines(typst).join('\n');
		expect(lines).toContain(`[$${convertLatexToTypstMath('-\\frac{\\pi}{6}')}$]`);
		expect(lines).toContain(`[$${convertLatexToTypstMath('-\\frac{5\\pi}{6}')}$]`);
		expect(lines).not.toContain(convertLatexToTypstMath('\\frac{11\\pi}{6}'));
	});
});

describe('trig — equation: valeur écrite avec une fonction', () => {
	it('cos(x) = cos(pi/5) : solutions π/5 et 9π/5', () => {
		const node = nodeOf('preset: custom\nequation: cos(x) = cos(pi/5)');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{\\pi}{5}', '\\frac{9\\pi}{5}']);
		const radians = radiansOf(node.solution?.angles);
		expect(radians[0]).toBeCloseTo(PI / 5, 10);
		expect(radians[1]).toBeCloseTo((9 * PI) / 5, 10);
	});

	it('cos(x) = cos(pi/5), principales : ±π/5', () => {
		const node = nodeOf('preset: custom\nequation: cos(x) = cos(pi/5)\nmesures: principales');
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{\\pi}{5}', '-\\frac{\\pi}{5}']);
	});

	it('sin(x) > sin(2*pi/7) : arc de 2π/7 à 5π/7', () => {
		const node = nodeOf('preset: custom\nequation: sin(x) > sin(2*pi/7)\nmode: arc');
		expect(node.errors).toEqual([]);
		const arc = node.solution!.arcs[0];
		expect(arc.startAngle).toBeCloseTo((2 * PI) / 7, 10);
		expect(arc.endAngle).toBeCloseTo((5 * PI) / 7, 10);
		expect(node.config.equation?.value).toBe('sin(2*pi/7)');
	});

	it('tan(x) = tan(pi/5) : solutions π/5 et 6π/5', () => {
		const node = nodeOf('preset: custom\nequation: tan(x) = tan(pi/5)');
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{\\pi}{5}', '\\frac{6\\pi}{5}']);
	});

	it('angle illisible dans la fonction : erreur située', () => {
		const { errors } = parseTrigCircleContent('preset: custom\nequation: cos(x) = cos(truc)');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/^Ligne 2 : équation illisible/);
	});
});

describe('trig — equation: un moins devant la fonction de la valeur', () => {
	it('sin(x) < -sin(4*pi/12) : arc de 4π/3 à 5π/3, comme sin(-4*pi/12)', () => {
		const node = nodeOf('preset: custom\nequation: sin(x) < -sin(4*pi/12)\nmode: arc');
		expect(node.errors).toEqual([]);
		expect(node.config.equation?.numericValue).toBeCloseTo(-Math.sqrt(3) / 2, 10);
		const arc = node.solution!.arcs[0];
		const twin = nodeOf('preset: custom\nequation: sin(x) < sin(-4*pi/12)\nmode: arc').solution!
			.arcs[0];
		expect(arc.startAngle).toBeCloseTo(twin.startAngle, 10);
		expect(arc.endAngle).toBeCloseTo(twin.endAngle, 10);
		expect(arc.startAngle).toBeCloseTo((4 * PI) / 3, 10);
		expect(arc.endAngle).toBeCloseTo((5 * PI) / 3, 10);
		expect(node.config.equation?.value).toBe('-sin(4*pi/12)');
	});

	it('sin(x) = -sin(4*pi/12) : solutions 4π/3 et 5π/3', () => {
		const node = nodeOf('preset: custom\nequation: sin(x) = -sin(4*pi/12)');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{4\\pi}{3}', '\\frac{5\\pi}{3}']);
	});

	it('cos(x) = -cos(pi/3) (espace après le moins toléré) : solutions 2π/3 et 4π/3', () => {
		const node = nodeOf('preset: custom\nequation: cos(x) = - cos(pi/3)');
		expect(node.errors).toEqual([]);
		expect(latexOf(node.solution?.angles)).toEqual(['\\frac{2\\pi}{3}', '\\frac{4\\pi}{3}']);
	});

	it('cos(x) >= -cos(pi/5) : valeur −cos(π/5)', () => {
		const node = nodeOf('preset: custom\nequation: cos(x) >= -cos(pi/5)\nmode: arc');
		expect(node.errors).toEqual([]);
		expect(node.config.equation?.numericValue).toBeCloseTo(-Math.cos(PI / 5), 10);
	});

	it('valeurs numériques négatives déjà acceptées : -1/2, -√3/2, -\\frac{\\sqrt{2}}{2}', () => {
		for (const v of ['-1/2', '-√3/2', '-\\frac{\\sqrt{2}}{2}', '-0.3']) {
			expect(nodeOf(`preset: custom\nequation: cos(x) = ${v}`).errors).toEqual([]);
		}
	});

	it('un double moins reste illisible : erreur située', () => {
		const { errors } = parseTrigCircleContent('preset: custom\nequation: cos(x) = --cos(pi/3)');
		expect(errors).toHaveLength(1);
		expect(errors[0].message).toMatch(/^Ligne 2 : équation illisible/);
	});
});
