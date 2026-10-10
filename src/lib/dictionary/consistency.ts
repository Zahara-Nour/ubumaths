/**
 * Règles de cohérence du dictionnaire (ADR 0022, refus 10 à 16)
 * =============================================================
 *
 * Une seule fonction, appelée par le serveur à chaque enregistrement de l'admin
 * et par les tests sur le jeu de référence. Elle rend la liste des problèmes,
 * en français, prêts à être montrés à l'admin.
 *
 * Les entrées masquées ne sont lues par personne : seules les entrées visibles
 * sont vérifiées, mais un nom pris par une entrée masquée reste pris (refus 15),
 * et un renvoi visible ne peut pas viser une entrée masquée (refus 11 et 16).
 *
 * @module dictionary/consistency
 */

import { GRADE_CODES, GRADES, type GradeCode } from '$lib/types/grades';
import { hasAccessToGrade } from '$lib/utils/grades';
import { isTermVisibleTo, resolveGradedField, type MathTerm } from './model';

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

/** Une entrée telle que la vérifient les règles : son contenu et son état masqué. */
export interface CheckedEntry {
	term: MathTerm;
	hidden: boolean;
}

// ---------------------------------------------------------------------------
// Functions
// ---------------------------------------------------------------------------

/** Minuscules, accents retirés : « Unité » et « unite » sont le même mot. */
export function normalizeName(text: string): string {
	return text
		.normalize('NFD')
		.replace(/[\u0300-\u036f]/g, '')
		.toLowerCase()
		.trim();
}

/** « carré (géométrie) » ou « carré ». */
function label(term: MathTerm): string {
	return term.sense ? `${term.term} (${term.sense})` : term.term;
}

/** Refus 10 : une définition au niveau du mot d'abord, puis des niveaux qui montent. */
function checkLevels(term: MathTerm, problems: string[]): void {
	const items = term.definitions?.items ?? [];
	if (!term.derivedFrom && items.length === 0) {
		problems.push(`« ${label(term)} » n'a aucune définition.`);
	}
	if (items.some((item) => item.content.trim() === '')) {
		problems.push(`« ${label(term)} » a une définition vide.`);
	}
	if (items.length > 0 && items[0].grade !== term.grade) {
		problems.push(
			`« ${label(term)} » : la première définition doit être au niveau du mot (${GRADES[term.grade].shortName}), pas en ${GRADES[items[0].grade].shortName}.`
		);
	}
	for (let i = 1; i < items.length; i++) {
		const previous = items[i - 1].grade;
		const current = items[i].grade;
		if (current === previous || !hasAccessToGrade(current, previous)) {
			problems.push(
				`« ${label(term)} » : les niveaux des définitions doivent monter (${GRADES[previous].shortName} puis ${GRADES[current].shortName}).`
			);
		}
	}
	for (const item of term.exemples?.items ?? []) {
		if (!hasAccessToGrade(item.grade, term.grade)) {
			problems.push(
				`« ${label(term)} » : un exemple en ${GRADES[item.grade].shortName} vient avant le mot (${GRADES[term.grade].shortName}).`
			);
		}
	}
	// Un lecteur qui voit le mot (filière partagée comprise) doit lire au moins une définition
	// (une première définition mal rangée est déjà signalée : pas de second message)
	if (!term.derivedFrom && term.definitions && items.length > 0 && items[0].grade === term.grade) {
		const blind = GRADE_CODES.filter(
			(reader) =>
				isTermVisibleTo(term, reader) &&
				resolveGradedField(term.definitions as NonNullable<MathTerm['definitions']>, reader)
					.length === 0
		);
		if (blind.length > 0) {
			problems.push(
				`« ${label(term)} » : aucune définition lisible en ${blind.map((g) => GRADES[g].shortName).join(', ')}.`
			);
		}
	}
}

/** Refus 13 : partage seulement avec une filière parallèle de la même année. */
function checkSharing(
	where: string,
	grade: GradeCode,
	sharedWith: readonly GradeCode[] | undefined,
	problems: string[]
): void {
	for (const other of sharedWith ?? []) {
		const sameYear = GRADES[other].schoolYear === GRADES[grade].schoolYear;
		if (!sameYear || hasAccessToGrade(other, grade) || hasAccessToGrade(grade, other)) {
			problems.push(
				`${where} (${GRADES[grade].shortName}) ne peut pas être partagé avec ${GRADES[other].shortName} : seulement une filière parallèle de la même année.`
			);
		}
	}
}

/**
 * Les problèmes du dictionnaire, en français. Liste vide : tout est cohérent.
 * L'ordre des entrées compte : un renvoi vise le premier terme principal de son nom.
 */
export function checkDictionary(entries: readonly CheckedEntry[]): string[] {
	const problems: string[] = [];
	const visible = entries.filter((e) => !e.hidden).map((e) => e.term);
	const principals = visible.filter((t) => !t.derivedFrom);

	// Refus 15 : même nom et même sens (accents et majuscules ignorés), entrées masquées comprises
	const seenKeys = new Map<string, CheckedEntry>();
	for (const entry of entries) {
		const key = `${normalizeName(entry.term.term)}|${normalizeName(entry.term.sense ?? '')}`;
		const other = seenKeys.get(key);
		if (other) {
			problems.push(
				`« ${label(entry.term)} » existe déjà${other.hidden ? ' (entrée masquée)' : ''} : même nom et même sens.`
			);
		}
		seenKeys.set(key, entry);
	}

	// Noms et synonymes des mots visibles, pour les formes conjuguées (refus 14)
	const names = new Set(visible.flatMap((t) => [t.term, ...(t.synonyms ?? [])]).map(normalizeName));
	const formOwners = new Map<string, string>();

	for (const term of visible) {
		checkLevels(term, problems);

		// Refus 12 : un mot à plusieurs sens porte une étiquette sur chacune de ses entrées
		if (
			!term.derivedFrom &&
			!term.sense &&
			principals.some((other) => other !== term && other.term === term.term)
		) {
			problems.push(
				`« ${term.term} » a plusieurs sens : chaque entrée doit porter une étiquette de sens.`
			);
		}

		// Refus 13
		checkSharing(`« ${label(term)} »`, term.grade, term.sharedWith, problems);
		for (const item of term.definitions?.items ?? []) {
			checkSharing(`La définition de « ${label(term)} »`, item.grade, item.sharedWith, problems);
		}

		// Refus 14 : une forme désigne un seul mot, et n'est pas déjà le nom d'un mot
		for (const form of term.forms ?? []) {
			const key = normalizeName(form);
			if (names.has(key)) {
				problems.push(`La forme « ${form} » (${label(term)}) est déjà le nom d'un mot.`);
			}
			const owner = formOwners.get(key);
			if (owner && owner !== label(term)) {
				problems.push(`La forme « ${form} » est déjà prise par « ${owner} ».`);
			}
			formOwners.set(key, label(term));
		}

		// Refus 11 et 16 : un renvoi vise un mot principal visible, lisible par chacun de ses lecteurs
		if (term.derivedFrom) {
			const target = principals.find((t) => t.term === term.derivedFrom);
			if (!target) {
				const hiddenTarget = entries.some(
					(e) => e.hidden && !e.term.derivedFrom && e.term.term === term.derivedFrom
				);
				problems.push(
					hiddenTarget
						? `Le renvoi « ${term.term} » vise « ${term.derivedFrom} », qui est masqué : masquer ou modifier d'abord le renvoi.`
						: `Le renvoi « ${term.term} » vise « ${term.derivedFrom} », qui n'existe pas.`
				);
				continue;
			}
			const blind = GRADE_CODES.filter(
				(reader) => isTermVisibleTo(term, reader) && !isTermVisibleTo(target, reader)
			);
			if (blind.length > 0) {
				problems.push(
					`Le renvoi « ${term.term} » vise « ${label(target)} », caché en ${blind.map((g) => GRADES[g].shortName).join(', ')}.`
				);
			}
		}
	}
	return problems;
}

/**
 * Les problèmes qu'une modification ajoute : ceux d'après, moins ceux d'avant.
 * Un défaut déjà présent ailleurs ne bloque pas l'enregistrement d'une autre entrée.
 */
export function newProblems(
	before: readonly CheckedEntry[],
	after: readonly CheckedEntry[]
): string[] {
	const existing = new Set(checkDictionary(before));
	return checkDictionary(after).filter((problem) => !existing.has(problem));
}
