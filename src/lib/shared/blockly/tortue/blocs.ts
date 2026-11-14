/**
 * Blocs tortue : définitions Blockly et générateurs d'aperçu JavaScript / Python.
 *
 * Le code généré n'est qu'un aperçu montré à l'élève : le programme est exécuté par
 * `executerTortue` (ADR 0039), jamais par ce code.
 */

import * as Blockly from 'blockly';
import { javascriptGenerator, Order as OrdreJs } from 'blockly/javascript';
import { pythonGenerator, Order as OrdrePy } from 'blockly/python';

// =============================================================================
// Constantes
// =============================================================================

/** Couleur de la catégorie Tortue (même saturation que les autres catégories). */
export const COULEUR_TORTUE = '#3D6670';

/** Blocs à une entrée numérique : type, libellé, nom de l'entrée, fonctions d'aperçu. */
const BLOCS_A_NOMBRE = [
	{
		type: 'tortue_avancer',
		message: 'avancer de %1',
		entree: 'VALEUR',
		js: 'avancer',
		py: 'forward'
	},
	{
		type: 'tortue_reculer',
		message: 'reculer de %1',
		entree: 'VALEUR',
		js: 'reculer',
		py: 'backward'
	},
	{
		type: 'tortue_droite',
		message: 'tourner à droite de %1 °',
		entree: 'ANGLE',
		js: 'tournerADroite',
		py: 'right'
	},
	{
		type: 'tortue_gauche',
		message: 'tourner à gauche de %1 °',
		entree: 'ANGLE',
		js: 'tournerAGauche',
		py: 'left'
	}
] as const;

/** Blocs sans entrée. */
const BLOCS_SIMPLES = [
	{ type: 'tortue_lever_stylo', message: 'lever le stylo', js: 'leverLeStylo', py: 'penup' },
	{ type: 'tortue_baisser_stylo', message: 'baisser le stylo', js: 'baisserLeStylo', py: 'pendown' }
] as const;

/** Import ajouté en tête de l'aperçu Python (module turtle de Python). */
const IMPORT_TURTLE = 'from turtle import *';

// =============================================================================
// Fonctions
// =============================================================================

/** `definitions_` est protégé dans les types de Blockly, mais c'est par lui que ses propres
 * blocs Python ajoutent leurs imports (`import math`…). */
function importerTurtle(): void {
	const generateur = pythonGenerator as unknown as { definitions_: Record<string, string> };
	generateur.definitions_['import_turtle'] = IMPORT_TURTLE;
}

/**
 * Définit les blocs tortue et leurs générateurs. Idempotente ; à appeler avant de créer un
 * espace de travail ou de générer du code (jamais au chargement du module).
 */
export function definirBlocsTortue(): void {
	if (Blockly.Blocks['tortue_avancer']) return;

	Blockly.common.defineBlocksWithJsonArray([
		...BLOCS_A_NOMBRE.map((bloc) => ({
			type: bloc.type,
			message0: bloc.message,
			args0: [{ type: 'input_value', name: bloc.entree, check: 'Number' }],
			inputsInline: true,
			previousStatement: null,
			nextStatement: null,
			colour: COULEUR_TORTUE
		})),
		...BLOCS_SIMPLES.map((bloc) => ({
			type: bloc.type,
			message0: bloc.message,
			previousStatement: null,
			nextStatement: null,
			colour: COULEUR_TORTUE
		}))
	]);

	for (const bloc of BLOCS_A_NOMBRE) {
		javascriptGenerator.forBlock[bloc.type] = (block, generateur) =>
			`${bloc.js}(${generateur.valueToCode(block, bloc.entree, OrdreJs.NONE) || '0'});\n`;
		pythonGenerator.forBlock[bloc.type] = (block, generateur) => {
			importerTurtle();
			return `${bloc.py}(${generateur.valueToCode(block, bloc.entree, OrdrePy.NONE) || '0'})\n`;
		};
	}
	for (const bloc of BLOCS_SIMPLES) {
		javascriptGenerator.forBlock[bloc.type] = () => `${bloc.js}();\n`;
		pythonGenerator.forBlock[bloc.type] = () => {
			importerTurtle();
			return `${bloc.py}()\n`;
		};
	}
}
