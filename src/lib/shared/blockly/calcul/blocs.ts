/**
 * Blocs du programme de calcul (5e) : définitions Blockly.
 *
 * Ce fichier importe Blockly : seuls l'éditeur et l'espace de travail le chargent. L'interpréteur,
 * la notation et le jugement (`interpreteur.ts`, `notation.ts`, `jugement.ts`) n'en dépendent
 * pas et tournent sous Node (correction) : ne jamais les faire importer d'ici, ni ajouter un
 * `index.ts` qui mêlerait les deux.
 *
 * Aucun générateur de code : le programme est exécuté par `executerCalcul` (ADR 0039).
 */

import * as Blockly from 'blockly';
import { COULEURS_CALCUL } from './toolbox';

// =============================================================================
// Constantes
// =============================================================================

/** Opérations du menu, dans l'ordre de la boîte à outils (champ `OP`). */
const OPERATIONS: [string, string][] = [
	['+', 'ADD'],
	['−', 'MINUS'],
	['×', 'MULTIPLY'],
	['÷', 'DIVIDE']
];

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Définit les blocs du programme de calcul. Idempotente ; à appeler avant de créer un espace de
 * travail (jamais au chargement du module).
 */
export function definirBlocsCalcul(): void {
	if (Blockly.Blocks['calcul_operation']) return;

	Blockly.common.defineBlocksWithJsonArray([
		{
			type: 'calcul_nombre_choisi',
			message0: 'nombre choisi',
			output: 'Number',
			colour: COULEURS_CALCUL.calcul,
			tooltip: 'Le nombre avec lequel on lance le programme.'
		},
		{
			type: 'calcul_operation',
			message0: '%1 %2 %3',
			args0: [
				{ type: 'input_value', name: 'A', check: 'Number' },
				{ type: 'field_dropdown', name: 'OP', options: OPERATIONS },
				{ type: 'input_value', name: 'B', check: 'Number' }
			],
			inputsInline: true,
			output: 'Number',
			colour: COULEURS_CALCUL.calcul
		},
		{
			type: 'calcul_resultat',
			message0: 'résultat',
			output: 'Number',
			colour: COULEURS_CALCUL.resultat,
			tooltip: 'Le nombre rangé dans résultat (0 au départ).'
		},
		{
			type: 'calcul_mettre_resultat',
			message0: 'mettre résultat à %1',
			args0: [{ type: 'input_value', name: 'VALEUR', check: 'Number' }],
			inputsInline: true,
			previousStatement: null,
			nextStatement: null,
			colour: COULEURS_CALCUL.resultat
		},
		{
			type: 'calcul_afficher',
			message0: 'afficher %1',
			args0: [{ type: 'input_value', name: 'VALEUR', check: 'Number' }],
			inputsInline: true,
			previousStatement: null,
			nextStatement: null,
			colour: COULEURS_CALCUL.afficher
		}
	]);
}
