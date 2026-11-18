/**
 * Boîtes à outils de la tortue, par niveau : uniquement des blocs que `executerTortue` sait
 * exécuter au niveau (ADR 0039 ; `NIVEAU_DES_BLOCS` de l'interpréteur). Chaque entrée numérique
 * porte une ombre, pour que l'élève voie un nombre à changer.
 *
 * - Sans niveau (`base`) : blocs tortue, « répéter n fois » à champ entier, nombre.
 * - 4e (`niveau: 4e`, chantier `tortue-variables`) : en plus, + − × ÷, variables créées par
 *   l'élève (catégorie dynamique de Blockly : mettre, ajouter, lire), « répéter » à nombre de
 *   tours calculé (à la place du bloc à champ).
 * - 3e : en plus, « si … alors (sinon) », comparaisons, et / ou, non, « répéter jusqu'à ».
 *
 * Sans import de Blockly : se charge partout.
 */

import { COULEUR_TORTUE } from './blocs';
import type { NiveauTortue } from './interpreteur';
import {
	CATEGORIE_DES_VARIABLES,
	COULEURS_CALCUL,
	categorieConditions,
	operation
} from '../calcul/toolbox';

function nombre(valeur: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeur } } } as const;
}

const TORTUE = {
	kind: 'category',
	name: 'Tortue',
	colour: COULEUR_TORTUE,
	contents: [
		{ kind: 'block', type: 'tortue_avancer', inputs: { VALEUR: nombre(1) } },
		{ kind: 'block', type: 'tortue_reculer', inputs: { VALEUR: nombre(1) } },
		{ kind: 'block', type: 'tortue_droite', inputs: { ANGLE: nombre(90) } },
		{ kind: 'block', type: 'tortue_gauche', inputs: { ANGLE: nombre(90) } },
		{ kind: 'block', type: 'tortue_lever_stylo' },
		{ kind: 'block', type: 'tortue_baisser_stylo' }
	]
} as const;

/** Boîte à outils sans niveau (la seule avant le chantier `tortue-variables`). */
export const TORTUE_TOOLBOX = {
	kind: 'categoryToolbox',
	contents: [
		TORTUE,
		{
			kind: 'category',
			name: 'Boucles',
			colour: '#3D703D',
			// Bloc à champ entier ≥ 0 : ni virgule ni négatif ne se saisissent (David, 2026-11-14) ;
			// en 4e / 3e, `controls_repeat_ext` (nombre de tours calculé)
			contents: [{ kind: 'block', type: 'controls_repeat', fields: { TIMES: 4 } }]
		},
		{
			kind: 'category',
			name: 'Math',
			colour: '#3D4570',
			contents: [{ kind: 'block', type: 'math_number', fields: { NUM: 1 } }]
		}
	]
} as const;

/** Boîte à outils des blocs proposés au niveau donné. */
export function toolboxTortue(niveau: NiveauTortue) {
	if (niveau === 'base') return TORTUE_TOOLBOX;
	const troisieme = niveau === '3e';
	return {
		kind: 'categoryToolbox',
		contents: [
			TORTUE,
			{
				kind: 'category',
				name: 'Calcul',
				colour: COULEURS_CALCUL.calcul,
				contents: [
					operation('ADD', 2),
					operation('MINUS', 2),
					operation('MULTIPLY', 2),
					operation('DIVIDE', 2),
					{ kind: 'block', type: 'math_number', fields: { NUM: 1 } }
				]
			},
			CATEGORIE_DES_VARIABLES,
			...(troisieme ? [categorieConditions(true)] : []),
			{
				kind: 'category',
				name: 'Boucles',
				colour: COULEURS_CALCUL.boucles,
				contents: [
					{ kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: nombre(4) } },
					...(troisieme ? [{ kind: 'block', type: 'calcul_repeter_jusqua' }] : [])
				]
			}
		]
	};
}
