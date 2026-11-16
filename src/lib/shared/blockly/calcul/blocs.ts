/**
 * Blocs des programmes de calcul (5e, 4e, 3e) : définitions Blockly, textes en français des
 * blocs génériques (variables, reste), surveillance des noms de variables.
 *
 * Ce fichier importe Blockly : seuls l'éditeur et l'espace de travail le chargent. L'interpréteur,
 * la notation et le jugement (`interpreteur.ts`, `notation.ts`, `jugement.ts`) n'en dépendent
 * pas et tournent sous Node (correction) : ne jamais les faire importer d'ici, ni ajouter un
 * `index.ts` qui mêlerait les deux.
 *
 * Aucun générateur de code : le programme est exécuté par `executerCalcul` (ADR 0039).
 */

import * as Blockly from 'blockly';
import { refusDeNouveauNom } from './interpreteur';
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

/**
 * Textes des blocs génériques de Blockly, réécrits comme la notation (`notation.ts`) :
 * « mettre x à … », « ajouter … à x », « reste de … par … ». Les textes de Blockly en français
 * (« définir », « incrémenter ») ne disent pas la même chose que le programme écrit au corrigé.
 */
const MESSAGES_CALCUL: Readonly<Record<string, string>> = {
	VARIABLES_SET: 'mettre %1 à %2',
	VARIABLES_SET_TOOLTIP: 'Range une valeur dans cette variable.',
	MATH_CHANGE_TITLE: 'ajouter %2 à %1',
	MATH_CHANGE_TOOLTIP: 'Ajoute un nombre à la variable « %1 ».',
	MATH_MODULO_TITLE: 'reste de la division de %1 par %2',
	MATH_MODULO_TOOLTIP: 'Le reste de la division euclidienne du premier nombre par le second.',
	NEW_VARIABLE: 'Créer une variable…',
	NEW_VARIABLE_TITLE: 'Nom de la nouvelle variable :'
};

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Définit les blocs du programme de calcul. Idempotente ; à appeler avant de créer un espace de
 * travail (jamais au chargement du module).
 */
export function definirBlocsCalcul(): void {
	if (Blockly.Blocks['calcul_si']) return;

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
			type: 'calcul_si',
			message0: 'si %1 alors',
			args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
			message1: '%1',
			args1: [{ type: 'input_statement', name: 'ALORS' }],
			previousStatement: null,
			nextStatement: null,
			colour: COULEURS_CALCUL.conditions,
			tooltip: 'Si la condition est vraie, fait les blocs placés dedans.'
		},
		{
			type: 'calcul_si_sinon',
			message0: 'si %1 alors',
			args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
			message1: '%1',
			args1: [{ type: 'input_statement', name: 'ALORS' }],
			message2: 'sinon',
			message3: '%1',
			args3: [{ type: 'input_statement', name: 'SINON' }],
			previousStatement: null,
			nextStatement: null,
			colour: COULEURS_CALCUL.conditions,
			tooltip: 'Si la condition est vraie, fait les blocs de « alors » ; sinon, ceux de « sinon ».'
		},
		{
			type: 'calcul_repeter_jusqua',
			message0: 'répéter jusqu’à %1',
			args0: [{ type: 'input_value', name: 'CONDITION', check: 'Boolean' }],
			message1: '%1',
			args1: [{ type: 'input_statement', name: 'DO' }],
			previousStatement: null,
			nextStatement: null,
			colour: COULEURS_CALCUL.boucles,
			tooltip: 'Répète les blocs placés dedans jusqu’à ce que la condition soit vraie.'
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

/**
 * Textes des blocs génériques (variables, reste) comme la notation. À appeler après
 * `Blockly.setLocale` (qui les remettrait), avant de créer un espace de travail : les blocs
 * lisent leurs textes à leur création.
 */
export function francaiserBlocsCalcul(): void {
	Object.assign(Blockly.Msg, MESSAGES_CALCUL);
}

/**
 * Refuse, à la création ou au renommage, un nom de variable que l'interpréteur refuserait (mot du
 * programme, nom mal écrit) ou confondrait avec une autre variable (`Côté` et `cote`) : la
 * variable créée est retirée, la variable renommée reprend son nom, et `surNom` reçoit le
 * message pour l'élève ; un nom accepté lui envoie null (le message précédent s'efface). Rend la
 * fonction qui arrête la surveillance.
 */
export function surveillerNomsDeVariables(
	espace: Blockly.Workspace,
	surNom: (refus: string | null) => void
): () => void {
	const variables = espace.getVariableMap();

	// Variables acceptées, id → nom. Blockly envoie ses événements au tour suivant : comparer à
	// toutes les variables présentes confondrait l'ordre (deux créations rapprochées retireraient
	// la première).
	const acceptees = new Map(variables.getAllVariables().map((v) => [v.getId(), v.getName()]));
	const autresNoms = (id: string): string[] =>
		[...acceptees].filter(([autre]) => autre !== id).map(([, nom]) => nom);

	/**
	 * Corrige un nom refusé hors de l'historique : la correction n'émet aucun événement, et
	 * l'événement refusé sort de la pile d'annulation (sinon Ctrl+Z recréerait la variable
	 * refusée, aussitôt retirée : l'élève resterait bloqué ; revue de la PR B).
	 */
	const corriger = (evenement: Blockly.Events.Abstract, correction: () => void): void => {
		Blockly.Events.disable();
		try {
			correction();
		} finally {
			Blockly.Events.enable();
		}
		const pile = espace.getUndoStack();
		const rang = pile.lastIndexOf(evenement);
		if (rang !== -1) pile.splice(rang, 1);
	};

	const ecouter = (evenement: Blockly.Events.Abstract): void => {
		if (evenement instanceof Blockly.Events.VarCreate) {
			const { varId, varName } = evenement;
			if (varId === undefined || varName === undefined || acceptees.has(varId)) return;
			const refus = refusDeNouveauNom(varName, autresNoms(varId));
			if (refus) {
				const variable = variables.getVariableById(varId);
				if (variable) corriger(evenement, () => variables.deleteVariable(variable));
			} else {
				acceptees.set(varId, varName);
			}
			surNom(refus);
		} else if (evenement instanceof Blockly.Events.VarRename) {
			const { varId, newName, oldName } = evenement;
			if (varId === undefined || newName === undefined) return;
			// Rien de neuf (dont le retour à l'ancien nom après un refus) : le message reste
			const avant = acceptees.get(varId) ?? oldName;
			if (avant === newName) return;
			const refus = refusDeNouveauNom(newName, autresNoms(varId));
			if (refus) {
				const variable = variables.getVariableById(varId);
				if (variable && avant !== undefined) {
					corriger(evenement, () => variables.renameVariable(variable, avant));
				}
			} else {
				acceptees.set(varId, newName);
			}
			surNom(refus);
		} else if (evenement instanceof Blockly.Events.VarDelete) {
			if (evenement.varId !== undefined) acceptees.delete(evenement.varId);
		}
	};
	espace.addChangeListener(ecouter);
	return () => espace.removeChangeListener(ecouter);
}
