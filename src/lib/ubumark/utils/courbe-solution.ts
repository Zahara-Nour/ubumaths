/**
 * Corrigé dessiné d'un repère à compléter (`solution: oui`)
 * ==========================================================
 *
 * Ce qu'un repère à points à placer, à droite ou à vecteur à tracer montre
 * quand sa réponse est dessinée : les points attendus ; la droite attendue et
 * deux de ses nœuds ; la flèche attendue, et pour une somme de deux vecteurs
 * les pointillés de sa construction. Une seule source pour l'écran
 * (`Courbe.svelte`) et le PDF (`courbe-typst.ts`) : le corrigé imprimé d'une
 * série d'automatismes (V108).
 *
 * @module ubumark/utils/courbe-solution
 */

import type { CourbeSpec } from '../types/courbe';
import { constructionTraces } from './courbe-combinaison';
import type { CourbePlacedPoint } from './courbe-placer';
import { solutionLine } from './courbe-tracer';
import { solutionVector } from './courbe-vecteur';

// ============================================================================
// Types
// ============================================================================

/** Un point attendu ; `name` vide : un nœud de la droite, sans nom */
export interface SolvedMark extends CourbePlacedPoint {
	name: string;
}

/** Un trait attendu : la droite (d'un bord à l'autre), la flèche, ou un pointillé */
export interface SolvedTrace {
	from: CourbePlacedPoint;
	to: CourbePlacedPoint;
	arrow: boolean;
	dashed: boolean;
}

export interface SolvedOverlay {
	marks: SolvedMark[];
	/** Dans l'ordre du dessin : pointillés d'abord, sous la flèche */
	traces: SolvedTrace[];
}

// ============================================================================
// Fonctions
// ============================================================================

/**
 * La réponse attendue du repère, à dessiner. Équation ou coordonnées masquées,
 * ou réponse hors de la fenêtre : rien pour ce geste.
 */
export function solvedOverlay(spec: CourbeSpec): SolvedOverlay {
	const marks: SolvedMark[] = (spec.placer ?? []).map((t) => ({ name: t.name, x: t.x, y: t.y }));
	const traces: SolvedTrace[] = [];

	const vecteur = spec.vecteur;
	const arrow = vecteur?.coords ? solutionVector(spec, vecteur.coords, null, vecteur.origin) : null;
	if (vecteur && arrow) {
		const construction = vecteur.terms ? constructionTraces(spec, vecteur.terms, arrow.from) : [];
		for (const t of construction) traces.push({ ...t, dashed: true });
		traces.push({ ...arrow, arrow: true, dashed: false });
	}

	const tracer = spec.tracer;
	const line = tracer ? solutionLine(spec, tracer.equation) : null;
	if (line) {
		traces.push({ from: line.segment[0], to: line.segment[1], arrow: false, dashed: false });
		for (const p of line.points) marks.push({ name: '', x: p.x, y: p.y });
	}

	return { marks, traces };
}
