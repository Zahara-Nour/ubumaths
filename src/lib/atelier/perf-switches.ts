/**
 * Les raccourcis du recalcul de l'atelier (chantier perf du 2026-10-19), et ce
 * qu'ils comptent.
 *
 * Chaque raccourci rend EXACTEMENT ce que rendrait le chemin long ; les
 * interrupteurs n'existent que pour que les tests le prouvent (même suite de
 * modifications, raccourcis allumés puis éteints, mêmes états —
 * `recalcul-equivalence.test.ts`). En dehors des tests, ils restent allumés.
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

/** Ce que les raccourcis évitent, compté pour le garde-fou de performance. */
export const perfStats = {
	/** Définitions relues par `bindingsOf` (une par objet lié). */
	boundDefinitions: 0
};
