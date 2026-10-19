/**
 * Les raccourcis du recalcul de l'atelier (chantier perf du 2026-10-19), et ce
 * qu'ils comptent.
 *
 * Chaque raccourci rend EXACTEMENT ce que rendrait le chemin long ; les
 * interrupteurs n'existent que pour que les tests le prouvent (même suite de
 * modifications, raccourcis allumés puis éteints, mêmes états —
 * `recalcul-equivalence.test.ts`).
 *
 * ⚠️ RÉSERVÉ AUX TESTS : aucun code de l'application ne les éteint ; en
 * production, ils restent allumés. Le compteur `perfStats` ne compte qu'en
 * développement et en test (`import.meta.env.DEV`).
 */
export const perfSwitches = {
	/** Mémo des lectures de définitions (`parseByProvenance`, `parse.ts`). */
	readCache: true,
	/**
	 * Liaisons limitées aux noms qu'un arbre peut citer (`bindingsOf` avec
	 * `root`, `engine.ts`) ; aucune pour un arbre qui ne nomme rien.
	 */
	scopedBindings: true,
	/** Mémo, par objet rangé, des noms que cite sa définition (`#refsOf`). */
	refsMemo: true
};

/** Ce que les raccourcis évitent, compté (en dev et en test) pour le garde-fou de performance. */
export const perfStats = {
	/** Définitions relues par `bindingsOf` (une par objet lié). */
	boundDefinitions: 0
};
