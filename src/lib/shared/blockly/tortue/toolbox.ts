/**
 * Boîte à outils de la tortue : uniquement des blocs que `executerTortue` sait exécuter
 * (ADR 0039). Chaque entrée numérique porte une ombre, pour que l'élève voie un nombre à changer.
 */

import { COULEUR_TORTUE } from './blocs';

function nombre(valeur: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeur } } } as const;
}

export const TORTUE_TOOLBOX = {
	kind: 'categoryToolbox',
	contents: [
		{
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
		},
		{
			kind: 'category',
			name: 'Boucles',
			colour: '#3D703D',
			contents: [{ kind: 'block', type: 'controls_repeat_ext', inputs: { TIMES: nombre(4) } }]
		},
		{
			kind: 'category',
			name: 'Math',
			colour: '#3D4570',
			contents: [{ kind: 'block', type: 'math_number', fields: { NUM: 1 } }]
		}
	]
} as const;
