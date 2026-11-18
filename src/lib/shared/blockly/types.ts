/**
 * Types du module Blockly partagé : génération de code pour l'aperçu (« Voir en Python »).
 * Rien n'exécute le code généré (ADR 0039) : les blocs tortue et calcul ont leurs interpréteurs.
 */

/** Langage du code généré */
export type ExecutionLanguage = 'javascript' | 'python';

/** Résultat de `generateCode` */
export interface CodeGenerationResult {
	/** Code généré */
	code: string;
	/** Langage du code */
	language: ExecutionLanguage;
	/** Vrai si la génération a abouti */
	success: boolean;
	/** Message d'erreur si elle a échoué */
	error?: string;
	/** Nombre de blocs lus */
	blockCount: number;
	/** Boucle peut-être infinie repérée dans le code */
	hasInfiniteLoop?: boolean;
	/** Avertissements éventuels */
	warnings?: string[];
}
