/**
 * Numérotation des exercices d'une fiche — LA règle, écrite une seule fois.
 * ========================================================================
 *
 * Le numéro que voit l'élève n'est PAS `worksheet_exercises.position`.
 * `position` redémarre à 1 dans chaque section — mesuré en production :
 * 21 collisions sur 32 sections, une fiche affichant 20 exercices pour
 * seulement 7 positions distinctes. Le numéro affiché est un **ordinal continu
 * 1..N**, calculé au rendu :
 *
 *   sections dans l'ordre de leur propre `position`,
 *   puis exercices dans l'ordre de la leur,
 *   puis les exercices hors section, à la fin.
 *
 * POURQUOI CE MODULE. Cette règle était écrite trois fois, et la troisième
 * copie avait déjà dérivé : les notifications de signalement d'erreur
 * annonçaient `position + 1` à l'élève, c'est-à-dire un numéro faux deux fois
 * (position est déjà 1-based, et elle n'est pas l'ordinal affiché). Une règle
 * dupliquée finit toujours par diverger ; celle-ci décide de ce que le
 * professeur et l'élève croient désigner par « exercice 3 ».
 *
 * Le tri est refait ici plutôt que supposé : un appelant qui aurait oublié un
 * `order by` produirait sinon une numérotation silencieusement différente.
 *
 * @module worksheets/exercise-numbering
 */

/**
 * Le minimum qu'un exercice doit porter pour être NUMÉROTÉ.
 *
 * Volontairement sans `id` : le générateur PDF manipule des `ResolvedExercise`
 * qui n'en portent pas, et numéroter ne demande pas d'identité. Les fonctions
 * qui, elles, désignent un exercice précis l'exigent en plus (voir
 * `IdentifiableExercise`).
 */
export interface NumberableExercise {
	section_id?: string | null;
	position: number;
}

/** Un exercice qu'on peut en plus DÉSIGNER, pour `[[exos:fiche#3]]`. */
export interface IdentifiableExercise extends NumberableExercise {
	id: string;
}

/** Le minimum qu'une section doit porter pour être ordonnée. */
export interface NumberableSection {
	id: string;
	position: number;
}

/** Un exercice et le numéro sous lequel l'élève le connaît. */
export interface NumberedExercise<E> {
	exercise: E;
	/** Ordinal continu, 1-based, tel qu'affiché sur la fiche et dans le PDF. */
	number: number;
}

/**
 * Un bloc d'affichage : une section et ses exercices numérotés.
 * `section` vaut `null` pour le bloc des exercices hors section, toujours dernier.
 */
export interface DisplayGroup<E, S> {
	section: S | null;
	exercises: NumberedExercise<E>[];
}

/**
 * Les exercices groupés par section, dans l'ordre d'affichage, numérotés en continu.
 *
 * C'est la forme dont a besoin tout ce qui affiche des en-têtes de section : le
 * générateur PDF, la page élève.
 */
export interface DisplayOptions {
	/**
	 * Conserver l'ordre du tableau reçu au lieu de trier par `position`.
	 *
	 * Nécessaire pour les fiches TIRÉES AU SORT : `worksheet_instances.exercise_order`
	 * définit un ordre propre à chaque élève, et retrier par `position`
	 * l'annulerait. Le défaut trie, parce qu'un appelant qui aurait oublié son
	 * `order by` produirait sinon une numérotation silencieusement différente de
	 * celle du PDF — et c'est précisément l'écart que ce module existe pour
	 * empêcher.
	 */
	preserveExerciseOrder?: boolean;
}

export function groupExercisesForDisplay<E extends NumberableExercise, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[],
	options: DisplayOptions = {}
): DisplayGroup<E, S>[] {
	const byPosition = (a: { position: number }, b: { position: number }) => a.position - b.position;

	const bySection = new Map<string | null, E[]>();
	for (const exercise of exercises) {
		const key = exercise.section_id ?? null;
		const group = bySection.get(key);
		if (group) group.push(exercise);
		else bySection.set(key, [exercise]);
	}

	const groups: DisplayGroup<E, S>[] = [];
	let counter = 0;

	const push = (section: S | null, list: E[] | undefined) => {
		if (!list || list.length === 0) return;
		const ordered = options.preserveExerciseOrder ? [...list] : [...list].sort(byPosition);
		groups.push({
			section,
			exercises: ordered.map((exercise) => ({ exercise, number: ++counter }))
		});
	};

	for (const section of [...sections].sort(byPosition)) {
		push(section, bySection.get(section.id));
	}

	// Un exercice dont la `section_id` ne correspond à AUCUNE section fournie
	// rejoint les exercices hors section : mieux vaut l'afficher à la fin que
	// le faire disparaître de la fiche.
	const known = new Set(sections.map((s) => s.id));
	const orphans: E[] = [];
	for (const [sectionId, list] of bySection) {
		if (sectionId === null || !known.has(sectionId)) orphans.push(...list);
	}
	push(null, orphans);

	return groups;
}

/**
 * Les exercices à plat, dans l'ordre d'affichage, avec leur numéro.
 */
export function orderExercisesForDisplay<E extends NumberableExercise, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[],
	options: DisplayOptions = {}
): NumberedExercise<E>[] {
	return groupExercisesForDisplay(exercises, sections, options).flatMap((group) => group.exercises);
}

/**
 * Le numéro affiché d'un exercice donné, ou `null` s'il n'est pas dans la fiche.
 */
export function displayNumberOf<E extends IdentifiableExercise, S extends NumberableSection>(
	exercises: readonly E[],
	sections: readonly S[],
	exerciseId: string
): number | null {
	const found = orderExercisesForDisplay(exercises, sections).find(
		(entry) => entry.exercise.id === exerciseId
	);
	return found ? found.number : null;
}

/**
 * L'exercice portant ce numéro affiché, ou `null`.
 *
 * C'est la résolution dont a besoin `[[exos:derivees#3]]` : « exercice 3 » ne
 * peut désigner que ce que l'élève appelle ainsi.
 */
export function exerciseAtDisplayNumber<
	E extends IdentifiableExercise,
	S extends NumberableSection
>(exercises: readonly E[], sections: readonly S[], displayNumber: number): E | null {
	if (!Number.isInteger(displayNumber) || displayNumber < 1) return null;
	const found = orderExercisesForDisplay(exercises, sections).find(
		(entry) => entry.number === displayNumber
	);
	return found ? found.exercise : null;
}
