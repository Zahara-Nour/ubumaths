/**
 * Racines réelles d'une quartique ax⁴ + bx³ + cx² + dx + e (a ≠ 0), en
 * flottants : Ferrari, puis polissage de Newton sur le polynôme d'origine.
 *
 * Partagé par le solveur (`solve/solvers/quartic.ts`) et l'image réciproque
 * (`domain/preimage.ts`), qui en avaient chacun une copie — fausse dans les
 * deux (m de Ferrari confondu avec m/2, #1527) et fragile sur les racines
 * doubles.
 *
 * ⚠️ Une racine double ne sort de Ferrari qu'à ~1e-8 près : le discriminant du
 * facteur du second degré qui la porte est alors légèrement NÉGATIF, et une
 * tolérance absolue la perdait (`3x⁴ − 11x³ − 2x² + 44x − 40` : 2 manquait).
 * D'où une tolérance relative sur le discriminant, puis un polissage et un
 * contrôle du résidu, qui écarte une racine qui n'en serait pas une.
 *
 * @module mathAST/common/quartic-roots
 */

/** Écart relatif sous lequel un discriminant compte pour nul. */
const RELATIVE_DISCRIMINANT_EPS = 1e-6;

/** Résidu relatif |P(r)| / Σ|coefficients|·max(1, |r|)⁴ accepté pour une racine. */
const RELATIVE_RESIDUAL_EPS = 1e-9;

/** Deux racines plus proches que ceci sont confondues. */
const MERGE_EPS = 1e-7;

/** Une racine aussi proche d'un entier y est ramenée (si le résidu ne grandit pas). */
const SNAP_EPS = 1e-9;

/**
 * Les racines réelles distinctes, triées. `a` doit être non nul (une cubique
 * se traite à part).
 */
export function realQuarticRoots(a: number, b: number, c: number, d: number, e: number): number[] {
	const coefficients = [a, b, c, d, e];
	const scale = coefficients.reduce((sum, k) => sum + Math.abs(k), 0);
	const evaluate = (x: number) => (((a * x + b) * x + c) * x + d) * x + e;
	const slope = (x: number) => ((4 * a * x + 3 * b) * x + 2 * c) * x + d;

	const candidates = ferrariCandidates(b / a, c / a, d / a, e / a);

	const polished = candidates.map((root) => polish(root, evaluate, slope));
	const accepted = polished
		.filter(
			(root) =>
				Number.isFinite(root) &&
				Math.abs(evaluate(root)) <= RELATIVE_RESIDUAL_EPS * scale * Math.max(1, Math.abs(root)) ** 4
		)
		.map((root) => snapToInteger(root, evaluate));
	return mergeClose(accepted);
}

/**
 * Candidats de Ferrari pour le polynôme unitaire x⁴ + px³ + qx² + rx + s :
 * x = t − p/4, t⁴ + At² + Bt + C = 0.
 */
function ferrariCandidates(p: number, q: number, r: number, s: number): number[] {
	const shift = p / 4;
	const A = q - (3 * p * p) / 8;
	const B = r - (p * q) / 2 + (p * p * p) / 8;
	const C = s - (p * r) / 4 + (p * p * q) / 16 - (3 * p * p * p * p) / 256;
	const size = Math.abs(A) + Math.abs(B) + Math.abs(C) + 1;

	// Bicarrée : u = t², u² + Au + C = 0
	if (Math.abs(B) <= 1e-12 * size) {
		const roots: number[] = [];
		for (const u of quadraticRoots(1, A, C)) {
			if (u < -1e-9 * size) continue;
			const t = Math.sqrt(Math.max(0, u));
			roots.push(t - shift, -t - shift);
		}
		return roots;
	}

	// Résolvante écrite pour y = m/2 : y³ + (A/2)y² + ((A² − 4C)/16)y − B²/64 = 0.
	// B ≠ 0 : elle a une racine strictement positive (valeur −B²/64 < 0 en 0).
	const y = Math.max(...monicCubicRoots(A / 2, (A * A - 4 * C) / 16, -(B * B) / 64));
	const m = 2 * y;
	if (!(m > 0)) return [];

	// t⁴ + At² + Bt + C = (t² + √(2m)·t + q₁)(t² − √(2m)·t + q₂)
	const root2m = Math.sqrt(2 * m);
	const q1 = A / 2 + m - B / (2 * root2m);
	const q2 = A / 2 + m + B / (2 * root2m);
	return [...quadraticRoots(1, root2m, q1), ...quadraticRoots(1, -root2m, q2)].map(
		(t) => t - shift
	);
}

/** Racines de ax² + bx + c (a ≠ 0), discriminant presque nul compté pour nul. */
function quadraticRoots(a: number, b: number, c: number): number[] {
	const discriminant = b * b - 4 * a * c;
	const size = b * b + Math.abs(4 * a * c);
	if (Math.abs(discriminant) <= RELATIVE_DISCRIMINANT_EPS * size) return [-b / (2 * a)];
	if (discriminant < 0) return [];
	const root = Math.sqrt(discriminant);
	return [(-b - root) / (2 * a), (-b + root) / (2 * a)];
}

/** Racines réelles de y³ + py² + qy + r (Cardano, ou forme trigonométrique). */
function monicCubicRoots(p: number, q: number, r: number): number[] {
	const third = p / 3;
	const P = q - p * third;
	const Q = 2 * third * third * third - third * q + r;
	const discriminant = (Q * Q) / 4 + (P * P * P) / 27;
	if (discriminant > 0) {
		const root = Math.sqrt(discriminant);
		return [Math.cbrt(-Q / 2 + root) + Math.cbrt(-Q / 2 - root) - third];
	}
	if (P === 0) return [-third];
	const radius = 2 * Math.sqrt(-P / 3);
	const angle = Math.acos(Math.max(-1, Math.min(1, ((3 * Q) / (2 * P)) * Math.sqrt(-3 / P)))) / 3;
	return [0, 1, 2].map((k) => radius * Math.cos(angle - (2 * Math.PI * k) / 3) - third);
}

/** Écart relatif maximal entre une racine polie et son candidat. */
const POLISH_RADIUS = 1e-4;

/**
 * Newton sur le polynôme d'origine ; garde le meilleur point rencontré, sans
 * s'éloigner du candidat : près d'une racine double P′ ≈ 0, et un pas pouvait
 * sauter sur une AUTRE racine (1 double de 3(x − 1)²(x − 1,5)(x − 4,5) devenait
 * 1,5, puis fusionnait avec elle).
 */
function polish(
	start: number,
	evaluate: (x: number) => number,
	slope: (x: number) => number
): number {
	let best = start;
	let bestValue = Math.abs(evaluate(start));
	const radius = POLISH_RADIUS * Math.max(1, Math.abs(start));
	let x = start;
	for (let i = 0; i < 60 && bestValue > 0; i++) {
		const derivative = slope(x);
		if (derivative === 0 || !Number.isFinite(derivative)) break;
		x -= evaluate(x) / derivative;
		if (!(Math.abs(x - start) <= radius)) break;
		const value = Math.abs(evaluate(x));
		if (!Number.isFinite(value)) break;
		if (value < bestValue) {
			best = x;
			bestValue = value;
		}
	}
	return best;
}

function snapToInteger(root: number, evaluate: (x: number) => number): number {
	const rounded = Math.round(root);
	return Math.abs(root - rounded) < SNAP_EPS &&
		Math.abs(evaluate(rounded)) <= Math.abs(evaluate(root))
		? rounded
		: root;
}

function mergeClose(roots: number[]): number[] {
	const sorted = [...roots].sort((x, y) => x - y);
	const merged: number[] = [];
	for (const root of sorted) {
		const last = merged[merged.length - 1];
		if (last !== undefined && Math.abs(root - last) <= MERGE_EPS * Math.max(1, Math.abs(root))) {
			continue;
		}
		merged.push(root);
	}
	return merged;
}
