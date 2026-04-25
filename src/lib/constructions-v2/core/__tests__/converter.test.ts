import { describe, it, expect } from 'vitest';
import { convertXmlToDsl } from '../../converter';
import { parseDsl } from '$lib/geometry-core/dsl';
import { readFileSync } from 'fs';
import { resolve } from 'path';

const wrap = (actions: string) => `<INSTRUMENPOCHE version="2">${actions}</INSTRUMENPOCHE>`;

const fixturesDir = resolve(
	__dirname,
	'../../../../../extern/instrumenpoche-main/devServer/fixtures'
);

function readFixture(name: string): string {
	return readFileSync(resolve(fixturesDir, name), 'utf-8');
}

describe('converter — point creation with coordinate transform', () => {
	it('converts point creer with coordinate transform (800x600)', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="400" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="A" nom="A" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		// (400 - 400) / 40 = 0, (300 - 300) / 40 = 0
		expect(result.dsl).toContain('A = point(0, 0)');
	});

	it('uses point name from nommer action', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="12" abscisse="400" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="12" nom="M" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('M = point(0, 0)');
	});

	it('uses final position after point translation', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="I" abscisse="530" ordonnee="176" />' +
				'<action objet="point" mouvement="nommer" id="I" nom="I" />' +
				'<action objet="point" mouvement="translation" id="I" abscisse="266.6" ordonnee="388.3" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		// Final position: (266.6 - 400) / 40, (300 - 388.3) / 40
		expect(result.dsl).toContain('I = point(');
		expect(result.dsl).not.toContain('point(3.25,'); // not initial position
	});
});

describe('converter — crayon (segments)', () => {
	it('converts crayon tracer to segment with deduplication', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="200" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="A" nom="A" />' +
				'<action objet="point" mouvement="creer" id="B" abscisse="600" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="B" nom="B" />' +
				'<action objet="crayon" mouvement="translation" abscisse="200" ordonnee="300" />' +
				'<action objet="crayon" mouvement="tracer" abscisse="600" ordonnee="300" id="s1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('segment(A, B)');
	});

	it('skips white border traces', async () => {
		const xml = wrap(
			'<action objet="crayon" mouvement="translation" abscisse="800" ordonnee="50" />' +
				'<action objet="crayon" mouvement="tracer" abscisse="800" ordonnee="600" couleur="blanc" id="c1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).not.toContain('segment(');
	});

	it('skips freehand (forme=libre) traces', async () => {
		const xml = wrap(
			'<action objet="crayon" mouvement="tracer" forme="libre" abscisses="1,2,3" ordonnees="1,2,3" id="f1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.warnings).toContain('Trace libre (main levee) ignore');
	});

	it('handles cible attribute for tracer destination', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="K" abscisse="300" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="K" nom="K" />' +
				'<action objet="point" mouvement="creer" id="13" abscisse="500" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="13" nom="B" />' +
				'<action objet="crayon" mouvement="translation" cible="K" />' +
				'<action objet="crayon" mouvement="tracer" cible="13" id="s1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('segment(K, B)');
	});
});

describe('converter — compas (arcs)', () => {
	it('converts compas tracer to arc', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="O" abscisse="400" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="O" nom="O" />' +
				'<action objet="compas" mouvement="translation" abscisse="400" ordonnee="300" />' +
				'<action objet="compas" mouvement="ecarter" ecart="100" />' +
				'<action objet="compas" mouvement="lever" />' +
				'<action objet="compas" mouvement="tracer" sens="5" debut="0" fin="90" id="c1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('arc(O, rayon=2.5, debut=0, fin=90)');
	});

	it('uses cible for compas ecarter (distance to target)', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="C" abscisse="400" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="C" nom="C" />' +
				'<action objet="point" mouvement="creer" id="P" abscisse="440" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="P" nom="P" />' +
				'<action objet="compas" mouvement="translation" abscisse="400" ordonnee="300" />' +
				'<action objet="compas" mouvement="ecarter" cible="P" />' +
				'<action objet="compas" mouvement="lever" />' +
				'<action objet="compas" mouvement="tracer" debut="0" fin="360" id="c1" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		// Distance = 40px = 1 math unit
		expect(result.dsl).toContain('arc(C, rayon=1, debut=0, fin=360)');
	});
});

describe('converter — instruments', () => {
	it('converts regle montrer/masquer', async () => {
		const xml = wrap(
			'<action objet="regle" mouvement="montrer" />' +
				'<action objet="regle" mouvement="masquer" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instrument("regle")');
		expect(result.dsl).toContain('@cacher');
	});

	it('converts equerre montrer/masquer', async () => {
		const xml = wrap(
			'<action objet="equerre" mouvement="montrer" />' +
				'<action objet="equerre" mouvement="masquer" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instrument("equerre")');
		expect(result.dsl).toContain('@cacher');
	});
});

describe('converter — text and pauses', () => {
	it('converts texte ecrire to @instruction with cleaned text', async () => {
		const xml = wrap(
			'<action objet="texte" mouvement="ecrire" texte="£lt£B£gt£Titre£lt£/B£gt£" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instruction("Titre")');
	});

	it('converts tempo to @pause (ms = tempo * 50)', async () => {
		const xml = wrap('<action objet="regle" mouvement="montrer" tempo="10" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@pause(500)');
	});

	it('skips pauses < 200ms', async () => {
		const xml = wrap('<action objet="regle" mouvement="montrer" tempo="2" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).not.toContain('@pause(');
	});

	it('does not emit consecutive pauses', async () => {
		const xml = wrap(
			'<action objet="regle" mouvement="montrer" tempo="10" />' +
				'<action objet="regle" mouvement="masquer" tempo="10" />'
		);
		const result = await convertXmlToDsl(xml);
		// After @instrument("regle"), @pause(500), @cacher, @pause(500)
		// The second @cacher resets lastLineWasPause, so both pauses should appear
		const pauses = result.dsl!.match(/@pause/g);
		expect(pauses?.length).toBe(2);
	});
});

describe('converter — DSL validity', () => {
	it('basic construction DSL is parsable', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="200" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="A" nom="A" />' +
				'<action objet="point" mouvement="creer" id="B" abscisse="600" ordonnee="300" />' +
				'<action objet="point" mouvement="nommer" id="B" nom="B" />' +
				'<action objet="regle" mouvement="montrer" />' +
				'<action objet="crayon" mouvement="translation" abscisse="200" ordonnee="300" />' +
				'<action objet="crayon" mouvement="tracer" abscisse="600" ordonnee="300" id="s1" />' +
				'<action objet="regle" mouvement="masquer" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(() => parseDsl(result.dsl!)).not.toThrow();
	});
});

describe('converter — error handling', () => {
	it('returns error for invalid XML', async () => {
		const result = await convertXmlToDsl('<invalid>');
		expect(result.success).toBe(false);
		expect(result.errors.length).toBeGreaterThan(0);
	});

	it('returns error for XML without INSTRUMENPOCHE', async () => {
		const result = await convertXmlToDsl('<root></root>');
		expect(result.success).toBe(false);
	});

	it('returns error for empty actions', async () => {
		const result = await convertXmlToDsl(wrap(''));
		expect(result.success).toBe(false);
	});
});

describe('converter — fixture 1.xml (partage segment en 3)', () => {
	it('converts and produces parsable DSL', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(() => parseDsl(result.dsl!)).not.toThrow();
	});

	it('contains points A and B', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('A = point(');
		expect(result.dsl).toContain('B = point(');
	});

	it('contains points I, J, K', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('I = point(');
		expect(result.dsl).toContain('J = point(');
		expect(result.dsl).toContain('K = point(');
	});

	it('contains segment(A, B)', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('segment(A, B)');
	});

	it('contains compass arcs', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		const arcMatches = result.dsl!.match(/arc\(/g);
		expect(arcMatches!.length).toBeGreaterThanOrEqual(3);
	});

	it('contains instructions', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instruction(');
	});

	it('point coordinates are in reasonable range', async () => {
		const xml = readFixture('1.xml');
		const result = await convertXmlToDsl(xml);
		const pointCoords = [...result.dsl!.matchAll(/point\(([^,]+),\s*([^)]+)\)/g)];
		for (const match of pointCoords) {
			const x = parseFloat(match[1]);
			const y = parseFloat(match[2]);
			expect(Math.abs(x)).toBeLessThan(15);
			expect(Math.abs(y)).toBeLessThan(15);
		}
	});
});

describe('converter — fixture 3.xml (construction carre)', () => {
	it('converts and produces parsable DSL', async () => {
		const xml = readFixture('3.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.errors).toHaveLength(0);
		expect(() => parseDsl(result.dsl!)).not.toThrow();
	});

	it('contains points A, B, C, D', async () => {
		const xml = readFixture('3.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('A = point(');
		expect(result.dsl).toContain('B = point(');
		expect(result.dsl).toContain('C = point(');
		expect(result.dsl).toContain('D = point(');
	});

	it('contains point O', async () => {
		const xml = readFixture('3.xml');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('O = point(');
	});

	it('contains multiple segments (sides of square)', async () => {
		const xml = readFixture('3.xml');
		const result = await convertXmlToDsl(xml);
		const segments = result.dsl!.match(/segment\(/g);
		expect(segments!.length).toBeGreaterThanOrEqual(4);
	});

	it('contains compass arcs', async () => {
		const xml = readFixture('3.xml');
		const result = await convertXmlToDsl(xml);
		const arcs = result.dsl!.match(/arc\(/g);
		expect(arcs!.length).toBeGreaterThanOrEqual(4);
	});
});

describe('converter — all fixtures produce parsable DSL', () => {
	for (let i = 0; i <= 8; i++) {
		it(`fixture ${i}.xml produces parsable DSL`, async () => {
			const xml = readFixture(`${i}.xml`);
			const result = await convertXmlToDsl(xml);
			expect(result.success).toBe(true);
			if (result.dsl) {
				expect(() => parseDsl(result.dsl!)).not.toThrow();
			}
		});
	}
});
