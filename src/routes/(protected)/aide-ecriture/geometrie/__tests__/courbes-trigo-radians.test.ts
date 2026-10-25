/**
 * Aide à l'écriture, géométrie : une courbe trigonométrique se trace en radians.
 * Décidé par David le 2026-10-25 (docs/wip/demo-debug-progress.md).
 *
 * Le DSL compte les angles en degrés par défaut, `courbe()` comprise : sans
 * `unite_angle("radians")`, `courbe("y = sin(x)")` est presque plate (sin(π/2) ≈ 0,027).
 *
 * - tout script d'une page de l'aide dont une `courbe()` contient sin, cos ou tan
 *   déclare `unite_angle("radians")` ; sauf les courbes polaires `r = f(theta)`,
 *   où θ est en radians dans les deux modes (mesuré : r = 2cos θ passe par (0,5 ; 0,866)) ;
 * - ainsi, sin(π/2) vaut 1 sur la courbe de la page des courbes.
 */
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, it, expect } from 'vitest';
import { runDsl } from '$lib/geometry-core/dsl';

// Constantes
const ROOT = 'src/routes/(protected)/aide-ecriture/geometrie';
// Une courbe cartésienne ou implicite (pas « r = … ») qui appelle sin, cos ou tan
const TRIG_CURVE = /courbe\("(?!\s*r\s*=)[^"]*\b(sin|cos|tan)\(/;

// Functions
function pageFiles(dir: string): string[] {
	return readdirSync(dir, { withFileTypes: true }).flatMap((entry) => {
		const path = join(dir, entry.name);
		if (entry.isDirectory()) return entry.name === '__tests__' ? [] : pageFiles(path);
		return entry.name.endsWith('.svelte') ? [path] : [];
	});
}

/** Les scripts DSL d'une page : ses chaînes entre accents graves */
function scripts(file: string): string[] {
	return [...readFileSync(file, 'utf8').matchAll(/`([^`]*)`/g)].map((match) => match[1]);
}

function script(file: string, name: string): string {
	const match = readFileSync(file, 'utf8').match(new RegExp(`const ${name} = \`([^\`]*)\``));
	return match?.[1] ?? '';
}

describe('courbes trigonométriques de l’aide géométrie', () => {
	it('déclarent unite_angle("radians")', () => {
		const offenders = pageFiles(ROOT).flatMap((file) =>
			scripts(file)
				.filter((code) => TRIG_CURVE.test(code) && !code.includes('unite_angle("radians")'))
				.map((code) => `${file} : ${code.split('\n')[0]}`)
		);

		expect(offenders).toEqual([]);
	});

	it('tracent sin(π/2) = 1 sur la page des courbes', () => {
		const code = script(join(ROOT, 'curves/+page.svelte'), 'functionDsl');
		const { figure, symbols } = runDsl(`${code}\nM = point_sur(f2, ${Math.PI / 2})`);
		const m = figure.getPosition(symbols.get('M')?.figureId ?? '') as { y: { value?: number } };

		expect(m.y.value).toBeCloseTo(1, 6);
	});
});
