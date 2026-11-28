/**
 * Écart V76 (2026-11-28) : les arcs de compas du carré restent affichés
 * =====================================================================
 *
 * « Axes de symétrie et construction d'un carré » vient de l'ancien format JSON.
 * Son auteur y effaçait ses 44 arcs de compas (traits de construction) par
 * `hide arc_9`, `hide arc_10`… Le passage au DSL a gardé ces ordres sous la
 * forme `@cacher("arc_9")`, mais `@cacher` ne cache que des instruments, et
 * les arcs du DSL n'ont pas de nom : rien n'est effacé.
 *
 * Correctif : le n-ième `arc(…)` du script reçoit le nom du n-ième arc tracé
 * dans le JSON d'origine (`_arc9 = arc(…)`, même ordre de tracé, mêmes rayons
 * et angles : vérifié par le test), et chaque `@cacher("arc_9")` devient
 * `masque(_arc9)`, à la même place.
 *
 * Même ligne, second défaut : la migration vers le DSL a changé le signe des
 * angles (repère de l'écran → repère math) sans échanger début et fin. Un arc
 * de 20° de l'auteur (`-10 → 10`) est devenu `debut=10, fin=-10`, soit 340° :
 * presque un cercle (13 arcs sur 44 ; les 31 autres tournaient dans l'autre sens
 * et sont justes). `debut` et `fin` sont échangés quand l'arc dépasse 180°.
 *
 * Source : la sauvegarde `avant-2026-10-23.json` (script DSL et JSON d'origine),
 * identique à la prod le 2026-11-28 (même empreinte md5 du `dsl_script`).
 *
 * Lu par `appliquer.ts --lot v76` et par `scripts/__tests__/constructions-prod.test.ts`.
 */

import backup from './avant-2026-10-23.json';
import { CHANGES as CHANGES_2026_10_23, type ConstructionChange } from './contenu';

// ============================================================================
// TYPES
// ============================================================================

interface DrawArcStep {
	type: 'action';
	action: {
		kind: 'drawArc';
		radius: number;
		startAngle: number;
		endAngle: number;
		createObject: { id: string };
	};
}

// ============================================================================
// CONSTANTES
// ============================================================================

export const CARRE_ID = '7687e832-0069-4299-b05e-c9eabff60bf0';

const ARC_LINE = /^arc\((\S+), rayon=(\S+), debut=(\S+), fin=(\S+)\)$/;
const HIDE_ARC_LINE = /^@cacher\("arc_(\d+)"\)$/;

// ============================================================================
// FONCTIONS
// ============================================================================

/** Balayage, dans le sens direct, de `debut` à `fin` (degrés, dans [0 ; 360[) */
export function ccwSweep(debut: number, fin: number): number {
	return (((fin - debut) % 360) + 360) % 360;
}

function isDrawArcStep(step: unknown): step is DrawArcStep {
	if (!step || typeof step !== 'object' || !('action' in step)) return false;
	const action = step.action;
	return (
		!!action &&
		typeof action === 'object' &&
		'kind' in action &&
		action.kind === 'drawArc' &&
		'createObject' in action &&
		!!action.createObject &&
		typeof action.createObject === 'object' &&
		'id' in action.createObject &&
		typeof action.createObject.id === 'string'
	);
}

/** Ligne de la sauvegarde du carré : script DSL converti et JSON d'origine. */
export function carreBackup(): { dslScript: string; drawArcs: DrawArcStep['action'][] } {
	const row = backup.find((r) => r.id === CARRE_ID);
	if (!row || typeof row.dsl_script !== 'string') throw new Error('carré absent de la sauvegarde');
	const steps: unknown[] =
		row.script && typeof row.script === 'object' && 'steps' in row.script
			? (row.script.steps as unknown[])
			: [];
	return { dslScript: row.dsl_script, drawArcs: steps.filter(isDrawArcStep).map((s) => s.action) };
}

/**
 * Nomme les arcs du script DSL d'après le JSON d'origine (dans l'ordre de tracé)
 * et remplace chaque `@cacher("arc_n")` par `masque(_arcn)`. Refuse si les deux
 * listes d'arcs n'ont pas la même longueur ou si un `@cacher` vise un arc inconnu.
 */
export function nameAndHideArcs(dslScript: string, arcIds: readonly string[]): string {
	const lines = dslScript.split('\n');
	const arcCount = lines.filter((l) => ARC_LINE.test(l)).length;
	if (arcCount !== arcIds.length) {
		throw new Error(`${arcCount} arcs dans le DSL, ${arcIds.length} dans le JSON`);
	}
	const known = new Set(arcIds);
	let next = 0;
	return lines
		.map((line) => {
			const arc = ARC_LINE.exec(line);
			if (arc) {
				const id = arcIds[next++];
				const [, center, radius, start, end] = arc;
				// L'arc du DSL tourne de `debut` à `fin` dans le sens direct : on garde
				// l'ordre qui donne le petit arc de l'auteur.
				const [debut, fin] =
					ccwSweep(Number(start), Number(end)) > 180 ? [end, start] : [start, end];
				return `_${id.replace('_', '')} = arc(${center}, rayon=${radius}, debut=${debut}, fin=${fin})`;
			}
			const hide = HIDE_ARC_LINE.exec(line);
			if (hide) {
				const id = `arc_${hide[1]}`;
				if (!known.has(id)) throw new Error(`@cacher("${id}") : arc inconnu`);
				return `masque(_arc${hide[1]})`;
			}
			return line;
		})
		.join('\n');
}

function carreChange(): ConstructionChange {
	const before = CHANGES_2026_10_23.find((c) => c.id === CARRE_ID);
	if (!before) throw new Error('carré absent du lot du 2026-10-23');
	const { dslScript, drawArcs } = carreBackup();
	return {
		id: CARRE_ID,
		// Titre posé par le lot du 2026-10-23, inchangé depuis
		titreAvant: before.title,
		title: before.title,
		description: before.description,
		dslScript: nameAndHideArcs(
			dslScript,
			drawArcs.map((a) => a.createObject.id)
		),
		dslAvant: dslScript,
		isPublic: before.isPublic
	};
}

// ============================================================================
// CHANGEMENTS
// ============================================================================

export const CHANGES: readonly ConstructionChange[] = [carreChange()];
