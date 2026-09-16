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

import type { Atelier } from './atelier.svelte';
import type { AtelierObject } from './types';
import { isValue, isList } from './types';

/** Une action proposée sur un objet. */
export interface ObjectAction {
	/** Identifiant stable, pour le code et les tests. */
	readonly id: string;
	/** Ce que lit l'élève. En français, et sans vocabulaire de développeur. */
	readonly label: string;
	/** Renseignée quand l'action est visible mais indisponible ici. */
	readonly disabledReason?: string;
}

/** Ce qu'on répond quand la vue qui rendrait l'action n'existe pas encore. */
const NOT_YET_REASON = 'Cette action arrive dans un prochain lot.';

/** Les gestes qui restent possibles quand plus rien d'autre ne l'est. */
const ALWAYS: readonly ObjectAction[] = [
	{ id: 'rename', label: 'Renommer', disabledReason: NOT_YET_REASON },
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
	// ⚠️ « Nuage » et « Ajustement » sont remplacés par une action PAR PARTENAIRE
	// quand l'atelier est connu (voir `partnerActions`). Ces deux-là ne servent
	// donc qu'au repli, quand `actionsFor` est appelée sans atelier.
	list: [
		{ id: 'stats', label: 'Statistiques' },
		{ id: 'scatter', label: 'Nuage de points' },
		{ id: 'fit', label: 'Ajustement affine' }
	]
};

/**
 * Actions dont la vue n'existe pas encore.
 *
 * ⚠️ Mieux vaut un bouton qui dit pourquoi il ne répond pas qu'un bouton mort :
 * un élève qui clique sans rien voir arriver conclut que l'outil est cassé.
 * Cette liste se vide au fur et à mesure des lots (§3 E1).
 */
const NOT_YET: ReadonlySet<string> = new Set([
	// 'plot' est câblé depuis le lot « vue Graphe ».
	// 'derive', 'solve', 'variations' et 'image' le sont depuis la vue Calcul.
	// 'stats', 'scatter' et 'fit' sont câblés depuis la vue Données.
	'plot-points',
	'plot-cobweb',
	'table',
	'slider',
	'convert',
	'rename'
]);

/**
 * Les nuages et ajustements possibles, une action par partenaire.
 *
 * ⚠️ C'est le catalogue lui-même qui porte le choix, plutôt qu'un écran de
 * sélection : le mécanisme du §3 sert exactement à ça — une action apparaît si
 * elle a un sens. Avec deux listes il n'y a qu'un partenaire, donc rien ne
 * change pour l'élève ; à trois, « la suivante » aurait été un choix arbitraire
 * fait à sa place.
 *
 * L'identifiant porte le nom de la partenaire (`scatter:M`) : c'est lui que
 * l'exécution relit, donc rien n'est redeviné au moment du clic.
 */
function partnerActions(object: AtelierObject, atelier: Atelier): ObjectAction[] {
	const partners = atelier.objects.filter((o) => isList(o) && o.name !== object.name);

	if (partners.length === 0) {
		const reason = 'Il faut deux listes : crée-en une seconde dans « Mes objets ».';
		return [
			{ id: 'scatter', label: 'Nuage de points', disabledReason: reason },
			{ id: 'fit', label: 'Ajustement affine', disabledReason: reason }
		];
	}

	// Une seule partenaire : inutile de la nommer deux fois dans la même liste
	// d'actions — mais on la nomme quand même, pour que l'élève sache SANS
	// cliquer ce qui va être tracé.
	return partners.flatMap((partner) => [
		{ id: `scatter:${partner.name}`, label: `Nuage avec ${partner.name}` },
		{ id: `fit:${partner.name}`, label: `Ajustement avec ${partner.name}` }
	]);
}

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
export function actionsFor(object: AtelierObject, atelier?: Atelier): ObjectAction[] {
	const blocked = blockedBy(object);

	// Les listes voient leurs partenaires, quand l'atelier est là pour les dire.
	const catalogue =
		isList(object) && atelier !== undefined
			? [BY_KIND.list[0], ...partnerActions(object, atelier)]
			: BY_KIND[object.kind];

	const specific = catalogue.map((action) => {
		// « Tracer » devient « Retirer du graphe » quand la courbe est là : un
		// même bouton qui bascule, plutôt que deux boutons dont un est inutile.
		if (action.id === 'plot' && object.plotted) {
			action = { ...action, label: 'Retirer du graphe' };
		}
		// D4 : un curseur sur une grandeur n'a pas de sens — on le dit plutôt que
		// de faire disparaître l'action, sinon l'élève cherche pourquoi.
		if (action.id === 'slider' && isValue(object) && object.unit !== undefined) {
			return {
				...action,
				disabledReason: `« ${object.name} » est une grandeur en ${object.unit} : un curseur n’aurait pas de sens ici.`
			};
		}
		// ⚠️ Retirer du graphe reste possible même quand l'objet ne peut plus rien
		// produire : sinon une fonction qui casse laisse un marqueur « tracé » que
		// l'élève ne peut plus enlever, alors que sa courbe a déjà disparu.
		if (blocked && !(action.id === 'plot' && object.plotted)) {
			// ⚠️ Une raison déjà posée par `partnerActions` (« il faut deux listes »)
			// est plus précise que « cet objet ne peut rien produire » : on la garde.
			return { ...action, disabledReason: action.disabledReason ?? blocked };
		}
		// L'objet va bien, mais la vue qui rendrait cette action n'existe pas
		// encore : on le dit, plutôt que de laisser un bouton sans effet.
		// `scatter:M` et `fit:M` portent leur partenaire : c'est la racine qui
		// décide si l'action attend son lot.
		const root = action.id.split(':')[0];
		if (NOT_YET.has(root)) return { ...action, disabledReason: NOT_YET_REASON };
		return action;
	});

	// « Convertir » n'existe que s'il y a une unité à convertir.
	const convert: ObjectAction[] =
		isValue(object) && object.unit !== undefined ? [{ id: 'convert', label: 'Convertir' }] : [];

	return [...specific, ...convert, ...ALWAYS];
}
