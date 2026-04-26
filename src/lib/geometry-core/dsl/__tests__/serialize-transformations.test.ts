import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { serialize } from '../serializer';

describe('Serialization — transformation objects', () => {
	it('serializes a rotation object', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 3)', 'r = rotation(angle=45, centre=O)'].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('r = rotation(angle=45, centre=O)');
	});

	it('serializes a reflection (central) object', () => {
		const { figure, symbols } = runDsl(['O = point(1, 1)', 's = symetrie(centre=O)'].join('\n'));
		const output = serialize(figure, symbols);
		expect(output).toContain('s = symetrie(centre=O)');
	});

	it('serializes a reflection over line object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 's = symetrie(axe=(A, B))'].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('s = symetrie(axe=(A, B))');
	});

	it('serializes a translation object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(3, 4)', 't = translation(vecteur=(A, B))'].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('t = translation(vecteur=(A, B))');
	});

	it('serializes a translation with vector element', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)'
			].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('t = translation(vecteur=v)');
	});

	it('serializes a homothety object', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'h = homothetie(rapport=2, centre=O)'].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('h = homothetie(rapport=2, centre=O)');
	});

	it('serializes a composition', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'r = rotation(angle=90, centre=O)',
				'A = point(0, 0)',
				'B = point(1, 0)',
				't = translation(vecteur=(A, B))',
				'f = compose(r, t)'
			].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('f = compose(r, t)');
	});
});

describe('Serialization — transforme() output', () => {
	it('serializes transforme(r, A) for a point', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'r = rotation(angle=90, centre=O)',
				'B = transforme(r, A)'
			].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('B = transforme(r, A)');
	});

	it('serializes transforme(r, segment)', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				'r = rotation(angle=90, centre=O)',
				's2 = transforme(r, s)'
			].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('s2 = transforme(r, s)');
	});

	it('intermediate invisible points are NOT serialized', () => {
		const { figure, symbols } = runDsl(
			[
				'O = point(0, 0)',
				'A = point(1, 0)',
				'B = point(2, 0)',
				's = segment(A, B)',
				'r = rotation(angle=90, centre=O)',
				's2 = transforme(r, s)'
			].join('\n')
		);
		const output = serialize(figure, symbols);
		const lines = output.split('\n');
		// Should not contain auto-generated point names for the intermediate rotated points
		const rotPtLines = lines.filter((l) => l.includes('rotation(') && l.includes('centre='));
		// Only the transformation object line should have 'rotation'
		expect(rotPtLines.every((l) => l.includes('r = rotation'))).toBe(true);
	});

	it('direct application (no transforme) still serializes as before', () => {
		const { figure, symbols } = runDsl(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n')
		);
		const output = serialize(figure, symbols);
		expect(output).toContain('B = rotation(A, centre=O, angle=90)');
		expect(output).not.toContain('transforme');
	});
});

describe('Serialization — roundtrip', () => {
	it('roundtrip for transformation object + transforme', () => {
		const script = [
			'O = point(0, 0)',
			'A = point(1, 0)',
			'r = rotation(angle=90, centre=O)',
			'B = transforme(r, A)'
		].join('\n');
		const { figure: fig1, symbols: sym1 } = runDsl(script);
		const serialized = serialize(fig1, sym1);

		// Re-parse and check positions match
		const { figure: fig2, symbols: sym2 } = runDsl(serialized);
		const posB1 = fig1.getPosition(sym1.get('B')!.figureId!);
		const posB2 = fig2.getPosition(sym2.get('B')!.figureId!);
		expect(posB1).toBeDefined();
		expect(posB2).toBeDefined();
		expect(posB1!.x).toEqual(posB2!.x);
		expect(posB1!.y).toEqual(posB2!.y);
	});
});
