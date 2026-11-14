/**
 * Boîte à outils du programme de calcul (5e) : uniquement des blocs que `executerCalcul` sait
 * exécuter (ADR 0039). Chaque entrée porte une ombre, pour que l'élève voie un nombre à changer
 * ou une place où poser « nombre choisi ».
 *
 * Répétition : `controls_repeat` seul (nombre de tours écrit dans le bloc) ; `controls_repeat_ext`
 * est refusé par l'interpréteur (un nombre de tours calculé ne s'écrirait pas en texte).
 *
 * Sans import de Blockly : se charge partout (les couleurs servent aussi à `blocs.ts`).
 */

/** Couleurs des catégories (même saturation que les autres catégories). */
export const COULEURS_CALCUL = {
	calcul: '#3D4570',
	resultat: '#703D55',
	afficher: '#3D705E',
	boucles: '#3D703D'
} as const;

function nombre(valeur: number) {
	return { shadow: { type: 'math_number', fields: { NUM: valeur } } } as const;
}

function operation(op: 'ADD' | 'MINUS' | 'MULTIPLY' | 'DIVIDE', b: number) {
	return {
		kind: 'block',
		type: 'calcul_operation',
		fields: { OP: op },
		inputs: { A: nombre(1), B: nombre(b) }
	} as const;
}

export const CALCUL_TOOLBOX = {
	kind: 'categoryToolbox',
	contents: [
		{
			kind: 'category',
			name: 'Calcul',
			colour: COULEURS_CALCUL.calcul,
			contents: [
				{ kind: 'block', type: 'calcul_nombre_choisi' },
				operation('ADD', 2),
				operation('MINUS', 2),
				operation('MULTIPLY', 2),
				operation('DIVIDE', 2),
				{ kind: 'block', type: 'math_number', fields: { NUM: 1 } }
			]
		},
		{
			kind: 'category',
			name: 'Résultat',
			colour: COULEURS_CALCUL.resultat,
			contents: [
				{ kind: 'block', type: 'calcul_mettre_resultat', inputs: { VALEUR: nombre(0) } },
				{ kind: 'block', type: 'calcul_resultat' }
			]
		},
		{
			kind: 'category',
			name: 'Afficher',
			colour: COULEURS_CALCUL.afficher,
			contents: [{ kind: 'block', type: 'calcul_afficher', inputs: { VALEUR: nombre(0) } }]
		},
		{
			kind: 'category',
			name: 'Boucles',
			colour: COULEURS_CALCUL.boucles,
			contents: [{ kind: 'block', type: 'controls_repeat', fields: { TIMES: 2 } }]
		}
	]
} as const;
