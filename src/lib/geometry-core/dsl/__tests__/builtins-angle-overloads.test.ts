/**
 * Tests sémantiques pour les overloads V2 de `angle(...)` :
 *   - `angle(u, v)`       — entre 2 vecteurs
 *   - `angle(seg1, seg2)` — entre 2 segments
 *   - `angle(d1, d2)`     — entre 2 droites (convention angle aigu)
 *
 * Reference : docs/wip/geometry/angle-v2-progress.md
 *
 * Tous les tests sont `it.todo()` en P0 ; ils deviendront actifs en P2/P3
 * quand les handlers correspondants seront implémentés dans `dsl/builtins.ts`.
 */
import { describe, it, expect } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { DslRuntimeError } from '../errors';
import { isAngle } from '../../types/elements';

function run(script: string) {
	const program = parse(script);
	return interpret(program);
}

function sym(result: ReturnType<typeof run>, name: string) {
	return result.symbols.allEntries().get(name);
}

// Évite les warnings TS sur les imports utilisés uniquement dans les futurs tests.
void run;
void sym;
void DslRuntimeError;
void isAngle;
void expect;

// =============================================================================
// angle(u, v) — sémantique mesure(α)
// =============================================================================

describe('angle(u, v) — 2 vectors overload (semantic)', () => {
	it.todo('mesure(angle(u, v)) = π/3 for u=(1,0) and v=(cos(π/3), sin(π/3))');
	it.todo('mesure(angle(u, v)) = π/2 for orthogonal vectors u=(1,0), v=(0,1)');
	it.todo('mesure(angle(u, v)) = 0 for parallel vectors same direction u=(2,0), v=(5,0)');
	it.todo('mesure(angle(u, v)) = π for antiparallel vectors u=(1,0), v=(-1,0)');
	it.todo('mesure(angle(u, v)) = π/4 for u=(1,0), v=(1,1)');
	it.todo('mesure(angle(u, v)) is always in [0, π] (non-oriented)');
	it.todo('angle(u, v) bound vectors sharing common origin reuses that point as vertex');
	it.todo('angle(u, v) bound vectors NOT sharing common origin builds synthetic vertex');
	it.todo('angle(u, v) free + free creates 3 synthetic invisible points (vertex at (0,0))');
	it.todo('angle(u, v) returns a GeoAngle element (isAngle === true)');
	it.todo('angle(u, v) the returned GeoAngle is visible=true by default');
	it.todo('angle(u, v, marque="carre") creates an angle with right-angle marker');
});

// =============================================================================
// angle(seg1, seg2) — sémantique mesure(α)
// =============================================================================

describe('angle(seg1, seg2) — 2 segments overload (semantic)', () => {
	it.todo('common endpoint → uses it as vertex (mesure π/2 for perpendicular segments)');
	it.todo('disjoint secant segments → computes intersection point as vertex');
	it.todo('disjoint secant segments → mesure = expected geometric angle');
	it.todo('parallel segments → throws DslRuntimeError with structured hint');
	it.todo('parallel segments error hint mentions angle(d1, d2) alternative');
	it.todo('coincident segments → throws DslRuntimeError (treated as parallel)');
	it.todo('segments with one shared endpoint at extremity → mesure(α) reactive on drag');
	it.todo('mesure(angle(s1, s2)) accepts unite="deg" via mesure() named arg');
});

// =============================================================================
// angle(d1, d2) — sémantique mesure(α) + convention angle aigu
// =============================================================================

describe('angle(d1, d2) — 2 lines overload (semantic)', () => {
	it.todo('perpendicular lines → mesure = π/2');
	it.todo('lines making a 60° angle → mesure = π/3 (acute convention)');
	it.todo('lines making a 120° angle → mesure = π/3 (swapped to acute)');
	it.todo('lines making a 45° angle → mesure = π/4');
	it.todo('parallel lines → throws DslRuntimeError');
	it.todo('coincident lines → throws DslRuntimeError (treated as parallel)');
	it.todo('parallel lines error hint mentions 0 convention');
	it.todo('acute angle convention: mesure(angle(d1, d2)) ∈ [0, π/2] always');
	it.todo('angle(d1, d2) reuses intersection point via intersectLL');
	it.todo('angle(d1, d2) is reactive: drag d1 through-point → mesure updates');
});

// =============================================================================
// arcSpacingPx named arg (toutes les overloads)
// =============================================================================

describe('arcSpacingPx parameter (semantic)', () => {
	it.todo('default value is 6 px when arcSpacingPx is omitted');
	it.todo('arcSpacingPx=10 is stored on the GeoAngle element');
	it.todo('arcSpacingPx works on angle(A, V, B) 3-points form');
	it.todo('arcSpacingPx works on angle(u, v) 2-vectors form');
	it.todo('arcSpacingPx works on angle(seg1, seg2) 2-segments form');
	it.todo('arcSpacingPx works on angle(d1, d2) 2-lines form');
	it.todo('arcSpacingPx=0 throws DslRuntimeError (strictly positive required)');
	it.todo('arcSpacingPx=-3 throws DslRuntimeError');
});

// =============================================================================
// Dispatch errors (mix types, mauvaise arité)
// =============================================================================

describe('angle(...) dispatch errors (semantic)', () => {
	it.todo('angle(u, segment) (vector + segment) throws structured error listing 4 forms');
	it.todo('angle(droite, vecteur) (line + vector) throws structured error');
	it.todo('angle(segment, droite) (segment + line) throws structured error');
	it.todo('angle() with 0 args throws structured DslRuntimeError');
	it.todo('angle(A) with 1 arg (point) throws structured DslRuntimeError');
	it.todo('angle(u) with 1 arg (vector) throws structured DslRuntimeError');
	it.todo('angle(A, B, C, D) with 4 args throws structured DslRuntimeError');
});
