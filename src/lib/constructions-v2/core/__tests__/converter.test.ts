import { describe, it, expect } from 'vitest';
import { convertXmlToDsl } from '../../converter';
import { parseDsl } from '$lib/geometry-core/dsl';

const wrap = (actions: string) => `<INSTRUMENPOCHE version="2">${actions}</INSTRUMENPOCHE>`;

describe('converter — point creation', () => {
	it('converts point creer to DSL', async () => {
		const xml = wrap('<action objet="point" mouvement="creer" id="A" abscisse="3" ordonnee="4" />');
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('A = point(3, 4)');
	});

	it('generates name for non-identifier IDs', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="123" abscisse="0" ordonnee="0" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		expect(result.dsl).toContain('P1 = point(0, 0)');
	});

	it('creates multiple points', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="0" ordonnee="0" />' +
				'<action objet="point" mouvement="creer" id="B" abscisse="4" ordonnee="0" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('A = point(0, 0)');
		expect(result.dsl).toContain('B = point(4, 0)');
	});
});

describe('converter — instruments', () => {
	it('converts regle montrer to @instrument', async () => {
		const xml = wrap('<action objet="regle" mouvement="montrer" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instrument("regle")');
	});

	it('converts compas montrer to @instrument', async () => {
		const xml = wrap('<action objet="compas" mouvement="montrer" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instrument("compas")');
	});

	it('converts masquer to @cacher', async () => {
		const xml = wrap('<action objet="regle" mouvement="masquer" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@cacher');
	});
});

describe('converter — tempo to @pause', () => {
	it('converts tempo to @pause', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="0" ordonnee="0" tempo="10" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@pause(500)'); // 10 * 50 = 500ms
	});
});

describe('converter — compass trace to cercle', () => {
	it('converts compas tracer to cercle', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="O" abscisse="0" ordonnee="0" />' +
				'<action objet="compas" mouvement="tracer" id="O" rayon="3" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('cercle(O, rayon=3)');
	});
});

describe('converter — text to @instruction', () => {
	it('converts texte ecrire to @instruction', async () => {
		const xml = wrap('<action objet="texte" mouvement="ecrire" texte="Placer le point A" />');
		const result = await convertXmlToDsl(xml);
		expect(result.dsl).toContain('@instruction("Placer le point A")');
	});
});

describe('converter — DSL validity', () => {
	it('generated DSL is parsable', async () => {
		const xml = wrap(
			'<action objet="point" mouvement="creer" id="A" abscisse="0" ordonnee="0" />' +
				'<action objet="point" mouvement="creer" id="B" abscisse="4" ordonnee="0" />' +
				'<action objet="regle" mouvement="montrer" />' +
				'<action objet="compas" mouvement="montrer" />' +
				'<action objet="compas" mouvement="masquer" />' +
				'<action objet="texte" mouvement="ecrire" texte="Construction" />'
		);
		const result = await convertXmlToDsl(xml);
		expect(result.success).toBe(true);
		// Should parse without error
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
