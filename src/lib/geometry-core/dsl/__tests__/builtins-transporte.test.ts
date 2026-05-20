/**
 * Tests sémantiques pour le builtin V3a `transporte(α, V', direction)`.
 *
 * Construction au compas du report d'angle : produit un nouveau `GeoAngle` au
 * sommet V', de même mesure que α, orienté dans une direction au choix
 * (axe Ox par défaut, point, vecteur, ou angle polaire).
 *
 * Reference : docs/wip/geometry/angle-v3a-progress.md
 *
 * P0 : tests `.todo()` rouges, activés en P1 après implémentation de
 * `handleTransporte` dans `dsl/builtins.ts`.
 */
import { describe, it } from 'vitest';
import { parse } from '../parser';
import { interpret } from '../interpreter';
import { DslRuntimeError } from '../errors';
import { isAngle } from '../../types/elements';
import { geoToNumber } from '../../compute/to-number';

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

// Silence unused-import warnings while squelette is `.todo()`.
void parse;
void interpret;
void DslRuntimeError;
void isAngle;
void geoToNumber;
void run;
void sym;
void scalarValue;

// =============================================================================
// transporte — 4 signatures (direction par défaut / point / vec= / angle=)
// =============================================================================

describe("transporte(α, V') — signature 1 : direction par défaut (axe Ox)", () => {
	it.todo('transporte(α, V\') retourne un GeoAngle de type "angle" au sommet V\'');
	it.todo("mesure(transporte(α, V')) = mesure(α) (préservation, π/3)");
	it.todo("transporte(angle 60° en (0,0), V'=(5,0)) : côté 1 orienté selon (1, 0)");
	it.todo("transporte(angle 90°, V') : côté 2 orienté à π/2 par rapport à Ox");
});

describe("transporte(α, V', P) — signature 2 : direction = rayon V'→P", () => {
	it.todo("transporte(α, V', P) : direction = unit(P − V')");
	it.todo("transporte(α 60°, V'=(5,0), P=(5,5)) : côté 1 orienté selon (0, 1) (vers le nord)");
	it.todo("transporte(α 30°, V'=(0,0), P=(1,1)) : mesure(β) = π/6 et côté 1 à π/4");
});

describe("transporte(α, V', vec=v) — signature 3 : direction = vecteur", () => {
	it.todo(
		"transporte(α, V', vec=v) avec v=vecteur(O,(3,4)) : direction = unit((3,4)) = (0.6, 0.8)"
	);
	it.todo("transporte(α 90°, V'=(0,0), vec=v) : indépendant de la norme de v (unit(v) utilisé)");
});

describe("transporte(α, V', angle=θ) — signature 4 : direction = angle polaire", () => {
	it.todo("transporte(α, V', angle=π/4) : côté 1 à π/4 (mode radians)");
	it.todo("transporte(α, V', angle=45) en mode degrés : côté 1 à 45° (= π/4 rad)");
});

// =============================================================================
// transporte — Préservation de la mesure et du sens
// =============================================================================

describe('transporte — mesure préservée pour différentes valeurs', () => {
	it.todo('mesure préservée pour α = 30°');
	it.todo('mesure préservée pour α = 60°');
	it.todo('mesure préservée pour α = 90°');
	it.todo('mesure préservée pour α = 180° (angle plat)');
	it.todo('mesure préservée pour α = 0° (angle nul)');
	it.todo('α rentrant (mesure > π) → β rentrant par défaut (kind hérité) : mesure ≈ 2π − interior');
});

// =============================================================================
// transporte — Sommet du nouveau angle
// =============================================================================

describe('transporte — sommet du nouveau GeoAngle', () => {
	it.todo("sommet(transporte(α, V')) renvoie V' (réutilise l'id du point fourni)");
	it.todo("cote(transporte(α, V'), 1) renvoie un point synthétique invisible non-draggable");
	it.todo("cote(transporte(α, V'), 2) renvoie un point synthétique invisible non-draggable");
});

// =============================================================================
// transporte — Héritage des options de style depuis α
// =============================================================================

describe('transporte — héritage du style de α', () => {
	it.todo('transporte(α avec marque="arcs2", V\') : β.marque === "arcs2"');
	it.todo("transporte(α avec arcRadiusPx=40, V') : β.arcRadiusPx === 40");
	it.todo("transporte(α avec arcSpacingPx=10, V') : β.arcSpacingPx === 10");
	it.todo('transporte(α avec showLabel="mesure", unite="deg", V\') : β.showLabel/unite hérités');
	it.todo('transporte(α avec style.fillColor="red", V\') : β.style.fillColor === "red"');
	it.todo(
		'transporte(α, V\', P, marque="carre") : override locale > héritage (β.marque === "carre")'
	);
	it.todo('transporte(α avec fillColor="red", V\', P, fill_color="blue") : override possible');
});

// =============================================================================
// transporte — Erreurs structurées (DslRuntimeError + forms)
// =============================================================================

describe('transporte — erreurs structurées', () => {
	it.todo('transporte() sans argument → DslRuntimeError avec 4 forms listées');
	it.todo('transporte(α) avec 1 seul argument → DslRuntimeError structurée');
	it.todo("transporte(α, V', vec=v, angle=θ) → DslRuntimeError (options mutuellement exclusives)");
	it.todo("transporte(α, V', P, vec=v) → DslRuntimeError (3e positionnel + vec=)");
	it.todo('transporte("foo", V\') arg1 non GeoAngle → DslRuntimeError structurée');
	it.todo('transporte(α, "foo") arg2 non point → DslRuntimeError structurée');
});

// =============================================================================
// transporte — Cas dégénérés
// =============================================================================

describe('transporte — cas dégénérés', () => {
	it.todo("transporte(α, V') avec V' == vertex(α) → DslRuntimeError structurée");
	it.todo("transporte(α, V', P) avec P == V' (direction nulle) → DslRuntimeError structurée");
	it.todo("transporte(α, V', vec=v) avec ‖v‖ = 0 → DslRuntimeError structurée");
	it.todo("transporte(α 0°, V') : mesure 0 propagée, β construit (rendu arc minuscule)");
	it.todo("transporte(α π, V') : mesure π propagée, β construit (rendu demi-cercle)");
});
