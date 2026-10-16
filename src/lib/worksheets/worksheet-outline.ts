/**
 * Le plan d'une fiche en édition : ses zones, et ce qu'une dépose enregistre.
 * ===========================================================================
 *
 * L'édition d'une fiche montre UNE liste : les sections dans leur ordre, chacune
 * avec ses corvées, puis « Sans section ». Ce module décide, sans le geste :
 *
 * - quelles zones existent — TOUTES les sections, vides comprises (une section
 *   vide doit pouvoir recevoir une corvée), puis « Sans section », toujours ;
 * - ce qu'une dépose enregistre — rien si l'ordre de la zone n'a pas changé,
 *   sinon la zone renumérotée 1..n (`position` redémarre à 1 dans chaque
 *   section, cf. `exercise-numbering.ts`).
 *
 * ⚠️ On compare la zone déposée aux PROPS, jamais à l'état du geste : pendant
 * un glisser, `svelte-dnd-action` promène une copie « ombre » qui reprend
 * l'identifiant de la corvée tirée, et relire la zone survolée ferait croire
 * qu'elle y était déjà (bug payé sur le plan de chapitre, cf. `section-dnd.ts`).
 *
 * @module worksheets/worksheet-outline
 */

import {
	groupExercisesForDisplay,
	type NumberableExercise,
	type NumberableSection,
	type NumberedExercise
} from './exercise-numbering';

/** Une zone du plan : une section (`null` = « Sans section ») et ses corvées numérotées. */
export interface OutlineZone<E, S> {
	section: S | null;
	exercises: NumberedExercise<E>[];
}

/** Ce qu'on écrit d'une corvée après une dépose (corps de `PUT /exercises`). */
export interface ExercisePlacement {
	id: string;
	position: number;
	section_id: string | null;
}

/** Ce qu'on écrit d'une section après un déplacement (corps de `PUT /sections`). */
export interface SectionPlacement {
	id: string;
	position: number;
}

type Placeable = NumberableExercise & { id: string };

const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

/**
 * Toutes les zones du plan, dans l'ordre d'affichage, numérotées en continu.
 *
 * Contrairement à `groupExercisesForDisplay` (qui sert le PDF), une zone vide
 * est GARDÉE : c'est là qu'on dépose.
 */
export function worksheetOutline<E extends Placeable, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[]
): OutlineZone<E, S>[] {
	const groups = groupExercisesForDisplay(exercises, sections);
	const of = (sectionId: string | null) =>
		groups.find((g) => (g.section?.id ?? null) === sectionId)?.exercises ?? [];

	return [
		...[...sections].sort(byPosition).map((section) => ({ section, exercises: of(section.id) })),
		{ section: null, exercises: of(null) }
	];
}

/**
 * Ce qu'une dépose de corvée enregistre dans la zone qui la reçoit.
 *
 * @param zone        la zone qui reçoit (`null` = « Sans section »)
 * @param orderedIds  ses corvées, dans l'ordre déposé ; un identifiant inconnu
 *                    (copie « ombre ») est ignoré
 * @returns les corvées qui changent de position ou de section — celles de la
 *          zone qui reçoit, puis celles de la zone qu'une corvée a quittée,
 *          renumérotée elle aussi ; `[]` si la zone n'a pas bougé
 */
export function placementsAfterDrop<E extends Placeable, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[],
	zone: string | null,
	orderedIds: readonly string[]
): ExercisePlacement[] {
	const byId = new Map(exercises.map((x) => [x.id, x]));
	const ids = orderedIds.filter((id) => byId.has(id));
	const outline = worksheetOutline(exercises, sections);
	const zoneOf = new Map(
		outline.flatMap((z) => z.exercises.map((x) => [x.exercise.id, z.section?.id ?? null] as const))
	);
	const idsOf = (key: string | null) =>
		outline.find((z) => (z.section?.id ?? null) === key)?.exercises.map((x) => x.exercise.id) ?? [];

	const before = idsOf(zone);
	if (before.length === ids.length && before.every((id, i) => id === ids[i])) return [];

	const placements: ExercisePlacement[] = [];
	const renumber = (key: string | null, list: readonly string[]) =>
		list.forEach((id, i) => {
			const current = byId.get(id)!;
			const position = i + 1;
			if (current.position !== position || (current.section_id ?? null) !== key) {
				placements.push({ id, position, section_id: key });
			}
		});

	renumber(zone, ids);

	// Les zones quittées : sans renumérotation, sortir la 1re de trois corvées
	// laisserait des rangs 2, 3 — sans effet à l'affichage, mais l'ancienne liste
	// renumérotait, et des rangs à trous finissent par surprendre.
	const arrived = new Set(ids);
	const leftZones = new Set(ids.map((id) => zoneOf.get(id) ?? null).filter((key) => key !== zone));
	for (const key of leftZones) {
		renumber(
			key,
			idsOf(key).filter((id) => !arrived.has(id))
		);
	}
	return placements;
}

/** Les corvées après une dépose : position et section, le reste intact. */
export function applyPlacements<E extends Placeable>(
	exercises: readonly E[],
	placements: readonly ExercisePlacement[]
): E[] {
	const byId = new Map(placements.map((p) => [p.id, p]));
	return exercises.map((x) => {
		const p = byId.get(x.id);
		return p ? { ...x, position: p.position, section_id: p.section_id } : x;
	});
}

/**
 * Ce qu'un déplacement de section enregistre.
 *
 * @param orderedIds les sections dans l'ordre déposé ; un identifiant inconnu
 *                   (copie « ombre ») est ignoré
 * @returns les sections qui changent de rang, numérotées 1..n ; `[]` si l'ordre
 *          n'a pas changé
 */
export function sectionOrderAfterDrop<S extends NumberableSection>(
	sections: readonly S[],
	orderedIds: readonly string[]
): SectionPlacement[] {
	const known = new Set(sections.map((x) => x.id));
	const ids = orderedIds.filter((id) => known.has(id));
	const before = [...sections].sort(byPosition).map((x) => x.id);
	if (before.length === ids.length && before.every((id, i) => id === ids[i])) return [];

	const byId = new Map(sections.map((x) => [x.id, x]));
	return ids.flatMap((id, i) =>
		byId.get(id)!.position === i + 1 ? [] : [{ id, position: i + 1 }]
	);
}

/** Les sections après un déplacement. */
export function applySectionOrder<S extends NumberableSection>(
	sections: readonly S[],
	placements: readonly SectionPlacement[]
): S[] {
	const byId = new Map(placements.map((p) => [p.id, p.position]));
	return sections.map((x) => (byId.has(x.id) ? { ...x, position: byId.get(x.id)! } : x));
}
