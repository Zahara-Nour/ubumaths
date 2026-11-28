/**
 * Bloc ```python-a-ecrire — types
 * ===============================
 *
 * Question « programme Python exécuté » (outil 49, chantier `outil-python`, journal
 * `docs/wip/outil-python-progress.md`) : l'élève écrit une fonction Python, son programme
 * tourne dans le navigateur (Pyodide) et sa fonction est comparée à celle de l'auteur sur
 * chaque essai.
 *
 * ```python-a-ecrire
 * fonction: seuil
 * depart: |
 *   def seuil(A):
 *       ...
 * solution: |
 *   def seuil(A):
 *       u = {{u0}}
 *       n = 0
 *       while u <= A:
 *           u = {{q}} * u
 *           n = n + 1
 *       return n
 * essais: seuil(2) ; seuil(100) ; seuil(10000)
 * exiger: boucle
 * ```
 *
 * Jamais dans une évaluation notée (corrigée par le serveur, ADR 0015 : le serveur ne fait
 * pas tourner Python) ; la solution part au navigateur (entraînement seulement, Q2).
 *
 * @module ubumark/types/python-a-ecrire
 */

import type { BaseNode } from './ast';

// ============================================================================
// VALEURS
// ============================================================================

/** Langage du bloc, tel qu'écrit après ``` */
export const PYTHON_A_ECRIRE_LANGUAGE = 'python-a-ecrire';

/**
 * Exigences sur le code (`exiger:`), noms français, liste courte : chacune devient une
 * exigence des exercices Python (`ASTRequirement`, `uses_loop`, `no_print`)
 */
export const PYTHON_EXIGENCES = ['boucle', 'sans print'] as const;

export type PythonExigence = (typeof PYTHON_EXIGENCES)[number];

// ============================================================================
// NŒUD
// ============================================================================

export interface PythonAEcrireSpec {
	/** Nom de la fonction à écrire (`fonction:`) */
	fonction: string;
	/** Programme posé d'avance dans l'éditeur de l'élève (`depart:`), vide sinon */
	depart: string;
	/** Programme de l'auteur (`solution:`) : il calcule les résultats attendus */
	solution: string;
	/** Appels essayés, tels qu'écrits (`seuil(2)`), dans l'ordre */
	essais: string[];
	/** Exigences sur le code (`exiger:`) */
	exiger: PythonExigence[];
}

/** Message situé, à destination de l'AUTEUR (jamais montré à l'élève) */
export interface PythonAEcrireIssue {
	message: string;
	/** Ligne du bloc, 1 = première ligne après ```python-a-ecrire */
	line?: number;
}

export interface PythonAEcrireNode extends BaseNode {
	type: 'python-a-ecrire';
	/** Texte du bloc, sans les clôtures (aller-retour de l'éditeur riche) */
	source: string;
	/** null si le bloc est en erreur */
	spec: PythonAEcrireSpec | null;
	errors: PythonAEcrireIssue[];
	/** Sa case, posée par le générateur (`case: N`) */
	caseIndex?: number;
}

export interface PythonAEcrireBlockRange {
	startIndex: number;
	endIndex: number;
}
