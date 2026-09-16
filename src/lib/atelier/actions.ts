/**
 * Atelier — les actions attachées aux objets
 *
 * C'est le mécanisme de progressivité 6ᵉ → terminale (§3, cadrage §6) : **une
 * action apparaît si elle a un sens pour le TYPE de l'objet**, et pour aucune
 * autre raison. Un atelier qui ne contient que des nombres n'affiche donc jamais
 * « dériver » — sans sélecteur de niveau, sans réglage, sans stigmatiser
 * personne.
 *
 * ⚠️ Quand une action a un sens pour le type mais ne peut rien produire sur cet
 * objet-là, elle reste **visible et désactivée avec sa raison**. La cacher
 * ferait conclure à l'élève que l'outil ne sait pas faire, au lieu de lui montrer
 * ce qui lui manque.
 *
 * @module atelier/actions
 */

import type { AtelierObject } from './types';
import { isValue } from './types';

/** Une action proposée sur un objet. */
export interface ObjectAction {
	/** Identifiant stable, pour le code et les tests. */
	readonly id: string;
	/** Ce que lit l'élève. En français, et sans vocabulaire de développeur. */
	readonly label: string;
	/** Renseignée quand l'action est visible mais indisponible ici. */
	readonly disabledReason?: string;
}

/** Les gestes qui restent possibles quand plus rien d'autre ne l'est. */
const ALWAYS: readonly ObjectAction[] = [
	{ id: 'rename', label: 'Renommer' },
	{ id: 'remove', label: 'Supprimer' }
];

/** Ce que chaque type sait produire, avant toute considération d'état. */
const BY_KIND: Readonly<Record<AtelierObject['kind'], readonly ObjectAction[]>> = {
	value: [{ id: 'slider', label: 'Régler le curseur' }],
	function: [
		{ id: 'plot', label: 'Tracer' },
		{ id: 'derive', label: 'Dériver' },
		{ id: 'table', label: 'Tabuler' },
		{ id: 'solve', label: 'Résoudre f(x) = 0' },
		{ id: 'variations', label: 'Variations' },
		{ id: 'image', label: 'Image d’un nombre' }
	],
	sequence: [
		{ id: 'plot-points', label: 'Tracer en nuage' },
		{ id: 'plot-cobweb', label: 'Tracer en escalier' },
		{ id: 'table', label: 'Premiers termes' }
	],
	list: [
		{ id: 'stats', label: 'Statistiques' },
		{ id: 'scatter', label: 'Nuage de points' },
		{ id: 'fit', label: 'Ajustement affine' }
	]
};

/** Pourquoi un objet ne peut rien produire, s'il ne peut rien produire. */
function blockedBy(object: AtelierObject): string | undefined {
	switch (object.status) {
		case 'incomplete':
			return 'Cet objet n’a pas encore de définition.';
		case 'pending':
		case 'error':
			// Le message de l'objet dit déjà ce qui manque ou ce qui cloche : le
			// reformuler ici le ferait diverger.
			return object.message ?? 'Cet objet ne peut rien produire pour le moment.';
		default:
			return undefined;
	}
}

/**
 * Les actions à proposer sur cet objet, dans l'ordre d'affichage.
 *
 * @param object - L'objet tel que l'atelier le connaît, statut compris
 */
export function actionsFor(object: AtelierObject): ObjectAction[] {
	const blocked = blockedBy(object);

	const specific = BY_KIND[object.kind].map((action) => {
		// D4 : un curseur sur une grandeur n'a pas de sens — on le dit plutôt que
		// de faire disparaître l'action, sinon l'élève cherche pourquoi.
		if (action.id === 'slider' && isValue(object) && object.unit !== undefined) {
			return {
				...action,
				disabledReason: `« ${object.name} » est une grandeur en ${object.unit} : un curseur n’aurait pas de sens ici.`
			};
		}
		return blocked ? { ...action, disabledReason: blocked } : action;
	});

	// « Convertir » n'existe que s'il y a une unité à convertir.
	const convert: ObjectAction[] =
		isValue(object) && object.unit !== undefined ? [{ id: 'convert', label: 'Convertir' }] : [];

	return [...specific, ...convert, ...ALWAYS];
}
