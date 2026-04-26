import { describe, it, expect } from 'vitest';
import { runDsl } from '../index';
import { geoToNumber } from '../../compute/to-number';
import type {
	GeoRotation,
	GeoReflection,
	GeoReflectionOverLine,
	GeoTranslation,
	GeoHomothety
} from '../../types/elements';

describe('Transformation objects — DSL creation (0 positional args)', () => {
	it('rotation(angle=40, centre=O) creates a rotation transformation object', () => {
		const { figure, symbols } = runDsl(
			['O = point(2, 3)', 'r = rotation(angle=40, centre=O)'].join('\n')
		);
		const entry = symbols.get('r');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoRotation;
		expect(el.type).toBe('rotation');
		expect(el.visible).toBe(false);
		// angle stored in radians
		expect(geoToNumber(el.angle)).toBeCloseTo((40 * Math.PI) / 180);
	});

	it('symetrie(centre=O) creates a reflection transformation object', () => {
		const { figure, symbols } = runDsl(['O = point(1, 1)', 's = symetrie(centre=O)'].join('\n'));
		const entry = symbols.get('s');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoReflection;
		expect(el.type).toBe('reflection');
		expect(el.visible).toBe(false);
	});

	it('symetrie(axe=(A, B)) creates a reflectionOverLine transformation object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 's = symetrie(axe=(A, B))'].join('\n')
		);
		const entry = symbols.get('s');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoReflectionOverLine;
		expect(el.type).toBe('reflectionOverLine');
		expect(el.visible).toBe(false);
	});

	it('symetrie(axe=d) creates a reflectionOverLine from a line element', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(4, 0)', 'd = droite(A, B)', 's = symetrie(axe=d)'].join('\n')
		);
		const entry = symbols.get('s');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoReflectionOverLine;
		expect(el.type).toBe('reflectionOverLine');
	});

	it('translation(vecteur=(A, B)) creates a translation transformation object', () => {
		const { figure, symbols } = runDsl(
			['A = point(0, 0)', 'B = point(3, 4)', 't = translation(vecteur=(A, B))'].join('\n')
		);
		const entry = symbols.get('t');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoTranslation;
		expect(el.type).toBe('translation');
		expect(el.visible).toBe(false);
		expect(el.vectorId).toBeUndefined();
	});

	it('translation(vecteur=v) creates a translation with vector element reference', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(3, 4)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)'
			].join('\n')
		);
		const entry = symbols.get('t');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoTranslation;
		expect(el.type).toBe('translation');
		expect(el.vectorId).toBeDefined();
	});

	it('homothetie(rapport=2, centre=O) creates a homothety transformation object', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'h = homothetie(rapport=2, centre=O)'].join('\n')
		);
		const entry = symbols.get('h');
		expect(entry).toBeDefined();
		expect(entry!.type).toBe('transformation');
		const el = figure.getElementById(entry!.figureId!) as GeoHomothety;
		expect(el.type).toBe('homothety');
		expect(el.visible).toBe(false);
		expect(geoToNumber(el.factor)).toBe(2);
	});
});

describe('Transformation objects — retrocompatibility (1+ positional args)', () => {
	it('rotation(A, centre=O, angle=40) still creates a rotated point', () => {
		const { symbols } = runDsl(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = rotation(A, centre=O, angle=90)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
	});

	it('symetrie(A, centre=O) still creates a reflected point', () => {
		const { symbols } = runDsl(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = symetrie(A, centre=O)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
	});

	it('translation(A, vecteur=(O, B)) still creates a translated point', () => {
		const { symbols } = runDsl(
			[
				'A = point(0, 0)',
				'O = point(0, 0)',
				'B = point(3, 4)',
				'C = translation(A, vecteur=(O, B))'
			].join('\n')
		);
		expect(symbols.get('C')!.type).toBe('point');
	});

	it('homothetie(A, centre=O, rapport=2) still creates a dilated point', () => {
		const { symbols } = runDsl(
			['A = point(1, 0)', 'O = point(0, 0)', 'B = homothetie(A, centre=O, rapport=2)'].join('\n')
		);
		expect(symbols.get('B')!.type).toBe('point');
	});
});

describe('Transformation objects — dependency graph', () => {
	it('rotation depends on its center point', () => {
		const { figure, symbols } = runDsl(
			['O = point(0, 0)', 'r = rotation(angle=45, centre=O)'].join('\n')
		);
		const el = figure.getElementById(symbols.get('r')!.figureId!) as GeoRotation;
		const centerId = symbols.get('O')!.figureId!;
		expect(el.dependsOn).toContain(centerId);
	});

	it('translation by vector depends on vector element', () => {
		const { figure, symbols } = runDsl(
			[
				'A = point(0, 0)',
				'B = point(1, 2)',
				'v = vecteur(A, B)',
				't = translation(vecteur=v)'
			].join('\n')
		);
		const el = figure.getElementById(symbols.get('t')!.figureId!) as GeoTranslation;
		const vecId = symbols.get('v')!.figureId!;
		expect(el.dependsOn).toContain(vecId);
	});

	it('transformation objects are not visible in getAllElements with visible filter', () => {
		const { figure } = runDsl(['O = point(0, 0)', 'r = rotation(angle=45, centre=O)'].join('\n'));
		const visible = figure.getAllElements().filter((e) => e.visible);
		expect(visible.every((e) => e.type !== 'rotation')).toBe(true);
	});
});

describe('Transformation objects — validation', () => {
	it('rotation without centre throws when no origin point exists', () => {
		expect(() => runDsl('r = rotation(angle=90)')).toThrow();
	});

	it('symetrie without centre or axe throws', () => {
		expect(() => runDsl('s = symetrie()')).toThrow(/necessite/);
	});

	it('translation without vecteur throws', () => {
		expect(() => runDsl('t = translation()')).toThrow(/vecteur/);
	});
});
