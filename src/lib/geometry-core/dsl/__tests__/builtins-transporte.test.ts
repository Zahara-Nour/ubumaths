/**
 * Tests sémantiques pour le builtin V3a `transporte(α, V', direction)`.
 *
 * Construction au compas du report d'angle : produit un nouveau `GeoAngle` au
 * sommet V', de même mesure que α, orienté dans une direction au choix
 * (axe Ox par défaut, point, vecteur, ou angle polaire).
 *
 * Reference : docs/wip/geometry/angle-v3a-progress.md
 *
 * P1 (activés) : implémentation `handleTransporte` dans `dsl/builtins.ts`.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { DslRuntimeError } from '../errors';
import { isAngle, isFreePoint } from '../../types/elements';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

/** Read the numeric value of a scalar symbol via figure.getScalarValue. */
function scalarValue(result: ReturnType<typeof run>, name: string): number {
	const s = sym(result, name);
	if (!s || !s.figureId) throw new Error(`No scalar named ${name}`);
	const v = result.figure.getScalarValue(s.figureId);
	if (v == null) throw new Error(`Scalar ${name} has no value`);
	return v;
}

/** Get the GeoAngle element via its symbol name. */
function getAngle(result: ReturnType<typeof run>, name: string) {
	const s = sym(result, name);
	if (!s || !s.figureId) throw new Error(`No symbol ${name}`);
	const el = result.figure.getElementById(s.figureId);
	if (!el || !isAngle(el)) throw new Error(`Symbol ${name} is not a GeoAngle`);
	return el;
}

/** Measure of a GeoAngle β in radians (force fresh scalar to read live value). */
function measureRad(result: ReturnType<typeof run>, angleSymName: string): number {
	const ang = getAngle(result, angleSymName);
	const sid = result.figure.createScalarAngleMeasure(ang.p1Id, ang.vertexId, ang.p2Id, {
		unite: 'rad'
	});
	const v = result.figure.getScalarValue(sid);
	if (v == null) throw new Error(`Cannot measure angle ${angleSymName}`);
	return v;
}

const TAU = Math.PI * 2;
const TWO_PI = TAU;

// =============================================================================
// transporte — 4 signatures (direction par défaut / point / vec= / angle=)
// =============================================================================

describe("transporte(α, V') — signature 1 : direction par défaut (axe Ox)", () => {
	it('transporte(α, V\') retourne un GeoAngle de type "angle" au sommet V\'', () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		const s = sym(r, 'b');
		expect(s).toBeDefined();
		expect(s!.type).toBe('angle');
		const el = r.figure.getElementById(s!.figureId!)!;
		expect(isAngle(el)).toBe(true);
		const beta = getAngle(r, 'b');
		expect(beta.vertexId).toBe(sym(r, 'Vp')!.figureId);
	});

	it("mesure(transporte(α, V')) ≈ mesure(α) — π/3 préservée", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				// Angle de π/3 (60°) : B sur (cos π/3, sin π/3).
				'B = point(0.5, 0.8660254037844386)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(measureRad(r, 'b')).toBeCloseTo(Math.PI / 3, 6);
	});

	it("transporte(angle 60° en (0,0), V'=(5,0)) : côté 1 orienté selon (1, 0)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0.5, 0.8660254037844386)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const Vpx = 5;
		const Vpy = 0;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - Vpx;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - Vpy;
		const norm = Math.hypot(dx, dy);
		expect(dx / norm).toBeCloseTo(1, 6);
		expect(dy / norm).toBeCloseTo(0, 6);
	});

	it("transporte(angle 90°, V') : côté 2 orienté à π/2 par rapport à Ox", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(3, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p2Pos = r.figure.getPosition(beta.p2Id)!;
		const Vpx = 3;
		const Vpy = 0;
		const dx = Number(p2Pos.x.kind === 'numeric' ? p2Pos.x.value : 0) - Vpx;
		const dy = Number(p2Pos.y.kind === 'numeric' ? p2Pos.y.value : 0) - Vpy;
		expect(dx).toBeCloseTo(0, 6);
		expect(dy).toBeCloseTo(1, 6);
	});
});

describe("transporte(α, V', P) — signature 2 : direction = rayon V'→P", () => {
	it("transporte(α, V', P) : direction = unit(P − V')", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0.5, 0.8660254037844386)',
				'a = angle(A, V, B)',
				'Vp = point(2, 0)',
				'P = point(2, 4)',
				'b = transporte(a, Vp, P)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const Vpx = 2;
		const Vpy = 0;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - Vpx;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - Vpy;
		expect(dx).toBeCloseTo(0, 6);
		expect(dy).toBeCloseTo(1, 6);
	});

	it("transporte(α 60°, V'=(5,0), P=(5,5)) : côté 1 orienté selon (0, 1) (vers le nord)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0.5, 0.8660254037844386)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'P = point(5, 5)',
				'b = transporte(a, Vp, P)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 5;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 0;
		expect(dx).toBeCloseTo(0, 6);
		expect(dy).toBeCloseTo(1, 6);
		expect(measureRad(r, 'b')).toBeCloseTo(Math.PI / 3, 6);
	});

	it("transporte(α 30°, V'=(3,0), P=(4,1)) : mesure(β) = π/6 et côté 1 à π/4 (relatif à V')", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				// 30° : (cos 30°, sin 30°) ≈ (0.866, 0.5)
				'B = point(0.8660254037844387, 0.5)',
				'a = angle(A, V, B)',
				'Vp = point(3, 0)',
				'P = point(4, 1)',
				'b = transporte(a, Vp, P)'
			].join('\n')
		);
		expect(measureRad(r, 'b')).toBeCloseTo(Math.PI / 6, 6);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 3;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 0;
		expect(Math.atan2(dy, dx)).toBeCloseTo(Math.PI / 4, 6);
	});
});

describe("transporte(α, V', vec=v) — signature 3 : direction = vecteur", () => {
	it("transporte(α, V', vec=v) avec v=(3,4) : direction = unit((3,4)) = (0.6, 0.8)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(2, 0)',
				'O = point(0, 0)',
				'Q = point(3, 4)',
				'v = vecteur(O, Q)',
				'b = transporte(a, Vp, vec=v)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 2;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 0;
		expect(dx).toBeCloseTo(0.6, 6);
		expect(dy).toBeCloseTo(0.8, 6);
	});

	it("transporte(α 90°, V'=(5,5), vec=(10,0)) : indépendant de la norme de v (unit utilisé)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(5, 5)',
				'O = point(0, 0)',
				'Q = point(10, 0)',
				'v = vecteur(O, Q)',
				'b = transporte(a, Vp, vec=v)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 5;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 5;
		// norme = 1 (unit vector)
		expect(Math.hypot(dx, dy)).toBeCloseTo(1, 6);
		expect(dx).toBeCloseTo(1, 6);
		expect(dy).toBeCloseTo(0, 6);
	});
});

describe("transporte(α, V', angle=θ) — signature 4 : direction = angle polaire", () => {
	it("transporte(α, V', angle=\\pi/4) en mode radians : côté 1 à π/4", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(4, 0)',
				'b = transporte(a, Vp, angle=\\pi/4)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 4;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 0;
		expect(Math.atan2(dy, dx)).toBeCloseTo(Math.PI / 4, 6);
	});

	it("transporte(α, V', angle=45) en mode degrés : côté 1 à 45° (= π/4 rad)", () => {
		const r = run(
			[
				'unite_angle("degres")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(4, 0)',
				'b = transporte(a, Vp, angle=45)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		const p1Pos = r.figure.getPosition(beta.p1Id)!;
		const dx = Number(p1Pos.x.kind === 'numeric' ? p1Pos.x.value : 0) - 4;
		const dy = Number(p1Pos.y.kind === 'numeric' ? p1Pos.y.value : 0) - 0;
		expect(Math.atan2(dy, dx)).toBeCloseTo(Math.PI / 4, 6);
	});
});

// =============================================================================
// transporte — Préservation de la mesure et du sens
// =============================================================================

describe('transporte — mesure préservée pour différentes valeurs', () => {
	function buildAndMeasure(thetaDeg: number): number {
		const theta = (thetaDeg * Math.PI) / 180;
		// Round near-zero noise (cos(π/2) = 6e-17) to avoid emitting scientific
		// notation, which the DSL parser does not accept.
		const sanitize = (v: number) => (Math.abs(v) < 1e-12 ? 0 : v).toFixed(15);
		const cx = sanitize(Math.cos(theta));
		const cy = sanitize(Math.sin(theta));
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				`B = point(${cx}, ${cy})`,
				'a = angle(A, V, B)',
				'Vp = point(7, 3)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		return measureRad(r, 'b');
	}

	it('mesure préservée pour α = 30°', () => {
		expect(buildAndMeasure(30)).toBeCloseTo(Math.PI / 6, 6);
	});
	it('mesure préservée pour α = 60°', () => {
		expect(buildAndMeasure(60)).toBeCloseTo(Math.PI / 3, 6);
	});
	it('mesure préservée pour α = 90°', () => {
		expect(buildAndMeasure(90)).toBeCloseTo(Math.PI / 2, 6);
	});
	it('mesure préservée pour α = 180° (angle plat)', () => {
		// 180° : (cos π, sin π) = (-1, 0). Mais alors B colinéaire à A → mesure dépend
		// de la convention `kind='saillant'`. Le scalaire angle_measure retourne π.
		expect(buildAndMeasure(179.9999)).toBeCloseTo(Math.PI, 4);
	});
	it('mesure préservée pour α = 0° (angle nul)', () => {
		// Cas dégénéré : B identique à A. Mesure 0 ; le report doit la propager.
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				// On met B très proche de A pour éviter B=A exact (degenerate).
				'B = point(0.99999, 0.00001)',
				'a = angle(A, V, B)',
				'Vp = point(2, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(measureRad(r, 'b')).toBeCloseTo(0, 3);
	});
	it.todo('α rentrant (mesure > π) → β rentrant par défaut (kind hérité) : mesure ≈ 2π − interior');
});

// =============================================================================
// transporte — Sommet du nouveau angle
// =============================================================================

describe('transporte — sommet du nouveau GeoAngle', () => {
	it("sommet(transporte(α, V')) renvoie V' (réutilise l'id du point fourni)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		expect(beta.vertexId).toBe(sym(r, 'Vp')!.figureId);
	});

	it("cote(transporte(α, V'), 1) renvoie un point synthétique invisible non-draggable", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)',
				'c1 = cote(b, 1)'
			].join('\n')
		);
		const cot1 = sym(r, 'c1')!;
		const el = r.figure.getElementById(cot1.figureId!)!;
		expect(isFreePoint(el)).toBe(true);
		expect(el.visible).toBe(false);
		if (isFreePoint(el)) expect(el.draggable).toBe(false);
	});

	it("cote(transporte(α, V'), 2) renvoie un point synthétique invisible non-draggable", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)',
				'c2 = cote(b, 2)'
			].join('\n')
		);
		const cot2 = sym(r, 'c2')!;
		const el = r.figure.getElementById(cot2.figureId!)!;
		expect(isFreePoint(el)).toBe(true);
		expect(el.visible).toBe(false);
		if (isFreePoint(el)) expect(el.draggable).toBe(false);
	});
});

// =============================================================================
// transporte — Héritage des options de style depuis α
// =============================================================================

describe('transporte — héritage du style de α', () => {
	it('transporte(α avec marque="arcs2", V\') : β.marque === "arcs2"', () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arcs2")',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(getAngle(r, 'b').marque).toBe('arcs2');
	});

	it("transporte(α avec arcRadiusPx=40, V') : β.arcRadiusPx === 40", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, arcRadiusPx=40)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(getAngle(r, 'b').arcRadiusPx).toBe(40);
	});

	it("transporte(α avec arcSpacingPx=10, V') : β.arcSpacingPx === 10", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arcs2", arcSpacingPx=10)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(getAngle(r, 'b').arcSpacingPx).toBe(10);
	});

	it('transporte(α avec showLabel="mesure", unite="deg", V\') : β.showLabel/unite hérités', () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, showLabel="mesure", unite="deg")',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		const beta = getAngle(r, 'b');
		expect(beta.showLabel).toBe('mesure');
		expect(beta.unite).toBe('deg');
	});

	it.todo('transporte(α avec style.fillColor="red", V\') : β.style.fillColor === "red"');

	it('transporte(α, V\', P, marque="carre") : override locale > héritage (β.marque === "carre")', () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0, 1)',
				'a = angle(A, V, B, marque="arcs2")',
				'Vp = point(5, 0)',
				'P = point(5, 5)',
				'b = transporte(a, Vp, P, marque="carre")'
			].join('\n')
		);
		expect(getAngle(r, 'b').marque).toBe('carre');
	});

	it.todo('transporte(α avec fillColor="red", V\', P, fill_color="blue") : override possible');
});

// =============================================================================
// transporte — Erreurs structurées (DslRuntimeError + forms)
// =============================================================================

describe('transporte — erreurs structurées', () => {
	it('transporte() sans argument → DslRuntimeError avec 4 forms listées', () => {
		expect(() => run('b = transporte()')).toThrow(DslRuntimeError);
		try {
			run('b = transporte()');
		} catch (e) {
			expect(e).toBeInstanceOf(DslRuntimeError);
			const err = e as DslRuntimeError;
			expect(err.details?.forms?.length).toBe(4);
		}
	});

	it('transporte(α) avec 1 seul argument → DslRuntimeError structurée', () => {
		const script = [
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'b = transporte(a)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it("transporte(α, V', vec=v, angle=θ) → DslRuntimeError (options mutuellement exclusives)", () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'Vp = point(5, 0)',
			'O = point(0, 0)',
			'Q = point(1, 0)',
			'v = vecteur(O, Q)',
			'b = transporte(a, Vp, vec=v, angle=pi/4)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it("transporte(α, V', P, vec=v) → DslRuntimeError (3e positionnel + vec=)", () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'Vp = point(5, 0)',
			'P = point(5, 5)',
			'O = point(0, 0)',
			'Q = point(1, 0)',
			'v = vecteur(O, Q)',
			'b = transporte(a, Vp, P, vec=v)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it('transporte("foo", V\') arg1 non GeoAngle → DslRuntimeError structurée', () => {
		const script = ['Vp = point(5, 0)', 'b = transporte(Vp, Vp)'].join('\n');
		// Vp est un point, pas un angle → erreur sur arg1 non GeoAngle.
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it('transporte(α, "foo") arg2 non point → DslRuntimeError structurée', () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'O = point(0, 0)',
			'Q = point(1, 0)',
			'v = vecteur(O, Q)',
			// arg2 = vecteur, pas un point
			'b = transporte(a, v)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});
});

// =============================================================================
// transporte — Cas dégénérés
// =============================================================================

describe('transporte — cas dégénérés', () => {
	it("transporte(α, V') avec V' == vertex(α) → DslRuntimeError structurée", () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			// Vp = V (le sommet de α)
			'b = transporte(a, V)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it("transporte(α, V', P) avec P == V' (direction nulle) → DslRuntimeError structurée", () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'Vp = point(5, 0)',
			'P = point(5, 0)',
			'b = transporte(a, Vp, P)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it("transporte(α, V', vec=v) avec ‖v‖ = 0 → DslRuntimeError structurée", () => {
		const script = [
			'unite_angle("radians")',
			'A = point(1, 0)',
			'V = point(0, 0)',
			'B = point(0, 1)',
			'a = angle(A, V, B)',
			'Vp = point(5, 0)',
			'O = point(0, 0)',
			'Q = point(0, 0)',
			'v = vecteur(O, Q)',
			'b = transporte(a, Vp, vec=v)'
		].join('\n');
		expect(() => run(script)).toThrow(DslRuntimeError);
	});

	it("transporte(α 0°, V') : mesure 0 propagée, β construit (rendu arc minuscule)", () => {
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				'B = point(0.99999, 0.00001)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(measureRad(r, 'b')).toBeCloseTo(0, 3);
	});

	it("transporte(α π, V') : mesure π propagée, β construit (rendu demi-cercle)", () => {
		// Note : pour α = π exact, l'orientation est ambigüe. On choisit une mesure
		// très proche de π pour avoir un comportement déterministe.
		const r = run(
			[
				'unite_angle("radians")',
				'A = point(1, 0)',
				'V = point(0, 0)',
				// Sur le demi-cercle "supérieur" très proche de π.
				'B = point(-1, 0.00001)',
				'a = angle(A, V, B)',
				'Vp = point(5, 0)',
				'b = transporte(a, Vp)'
			].join('\n')
		);
		expect(measureRad(r, 'b')).toBeCloseTo(Math.PI, 3);
	});
});

// Silence unused-import warning if any binding above is removed in refactor.
void scalarValue;
void TWO_PI;
