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
import { isValue, isList, isQualitative, type ListObject } from './types';
import { crossProblem } from './cross';
import { compareProblem } from './compare';

/** Une action proposée sur un objet. */
export interface ObjectAction {
	/** Identifiant stable, pour le code et les tests. */
	readonly id: string;
	/** Ce que lit l'élève. En français, et sans vocabulaire de développeur. */
	readonly label: string;
	/** Renseignée quand l'action est visible mais indisponible ici. */
	readonly disabledReason?: string;
	/** La liste partenaire avec laquelle l'action est faite (Q46), sinon absente */
	readonly partner?: string;
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
	// « Régler le curseur » n'est plus un bouton : le curseur est dans la carte
	// (phase 0 `/grapheur` §4)
	value: [],
	function: [
		{ id: 'plot', label: 'Tracer' },
		{ id: 'derive', label: 'Dériver' },
		// D7 : les DEUX gestes, distincts. « Dériver » affiche, « Garder » crée
		// un objet — donc quelque chose de traçable et de citable.
		{ id: 'table', label: 'Tabuler' },
		{ id: 'solve', label: 'Résoudre f(x) = 0' },
		{ id: 'variations', label: 'Variations' }
		// « Image d'un nombre » n'est plus un bouton : c'est un petit champ de la
		// carte, qui calcule sans envoyer dans Calcul (phase 0 `/grapheur` §3 A4)
	],
	sequence: [
		// « Tracer en nuage / en escalier » ne sont plus des boutons : 👁 trace, et
		// la représentation se règle dans « Sur le graphique » (lot 5b, U2)
		{ id: 'terms', label: 'Premiers termes' }
	],
	// ⚠️ « Nuage » et « Ajustement » sont remplacés par une action PAR PARTENAIRE
	// quand l'atelier est connu (voir `partnerActions`). Ces deux-là ne servent
	// donc qu'au repli, quand `actionsFor` est appelée sans atelier.
	list: [
		{ id: 'stats', label: 'Statistiques' },
		{ id: 'chart', label: 'Diagramme en bâtons' },
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
	// 'derive', 'solve' et 'variations' le sont depuis la vue Calcul ('image' est
	// devenu un champ de la carte, lot 3b).
	// 'stats', 'scatter' et 'fit' sont câblés depuis la vue Données, 'chart'
	// depuis le lot 5 des outils statistiques.
	'table',
	'convert',
	'rename'
]);

/**
 * Les listes partenaires d'une liste et celle retenue par défaut (Q46).
 *
 * ⚠️ UNE partenaire à la fois : une action par partenaire donnait 5 boutons par
 * autre liste, illisible dès trois listes. La carte affiche donc un choix de
 * partenaire, et `actionsFor` ne rend que les actions faites avec elle.
 *
 * L'identifiant porte toujours le nom de la partenaire (`scatter:M`) : c'est
 * lui que l'exécution relit, donc rien n'est redeviné au moment du clic.
 */
/** Les listes partenaires possibles d'une liste : les autres, dans l'ordre du panneau. */
export function partnersOf(object: AtelierObject, atelier: Atelier): string[] {
	if (!isList(object)) return [];
	return atelier.objects.filter((o) => isList(o) && o.name !== object.name).map((o) => o.name);
}

/**
 * La partenaire proposée d'abord (Q46) : celle du diagramme affiché, pour que
 * « Retirer le diagramme » reste sous la main ; sinon la liste suivante du
 * panneau, en revenant au début ; null sans partenaire.
 */
export function defaultPartner(object: AtelierObject, atelier: Atelier): string | null {
	const partners = partnersOf(object, atelier);
	if (partners.length === 0) return null;
	const shown = atelier.chartOf(object.name)?.partner;
	if (shown != null && partners.includes(shown)) return shown;
	const lists = atelier.objects.filter(isList).map((o) => o.name);
	const index = lists.indexOf(object.name);
	return lists.slice(index + 1).find((n) => partners.includes(n)) ?? partners[0];
}

/**
 * Un diagramme est affiché avec une AUTRE partenaire que celle choisie : son
 * « Retirer le diagramme » rejoint les actions de la liste, sinon il faudrait
 * rechoisir cette partenaire pour le retirer (revue de la PR Q46).
 */
function otherChartRemoval(
	object: AtelierObject,
	atelier: Atelier,
	chosen: string | undefined
): ObjectAction[] {
	const shown = atelier.chartOf(object.name)?.partner;
	if (shown == null || shown === chosenPartner(object, atelier, chosen)) return [];
	return [{ id: `chart:${shown}`, label: 'Retirer le diagramme' }];
}

/** La partenaire effectivement utilisée : celle choisie si elle existe, sinon celle par défaut. */
function chosenPartner(
	object: AtelierObject,
	atelier: Atelier,
	chosen: string | undefined
): string | null {
	const names = partnersOf(object, atelier);
	return chosen !== undefined && names.includes(chosen) ? chosen : defaultPartner(object, atelier);
}

function partnerActions(
	object: AtelierObject,
	atelier: Atelier,
	chosen: string | undefined
): ObjectAction[] {
	// ⚠️ UNE partenaire à la fois (Q46) : une action par partenaire donnait
	// 2 + 5 × (n − 1) boutons, 37 avec 8 listes (revue de code et audit a11y)
	const names = partnersOf(object, atelier);
	const wanted = chosenPartner(object, atelier, chosen);
	const partners = atelier.objects.filter((o) => o.name === wanted && names.includes(o.name));

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
	// Outils statistiques, lot 5 (Q35) : la partenaire peut aussi donner les
	// EFFECTIFS des valeurs de cette liste
	return partners.flatMap((partner) => {
		// Une partenaire QUALITATIVE ne se prête à aucune de ces actions (Q88) :
		// visibles, désactivées, avec la raison
		const words = isList(partner) && isQualitative(partner) ? wordsReason(partner.name) : undefined;
		const reason = words ?? countsProblem(object, partner);
		const withCounts = (action: ObjectAction): ObjectAction =>
			reason === undefined ? action : { ...action, disabledReason: reason };
		const actions: ObjectAction[] = [
			withCounts({
				id: `stats:${partner.name}`,
				label: `Statistiques avec effectifs ${partner.name}`
			}),
			withCounts({
				id: `chart:${partner.name}`,
				label: `Diagramme avec effectifs ${partner.name}`
			}),
			// Lot 6 (Q44) : la partenaire donne les PROBABILITÉS d'une variable aléatoire
			withCounts({ id: `law:${partner.name}`, label: `Loi avec probabilités ${partner.name}` }),
			{ id: `simulate:${partner.name}`, label: `Simuler avec probabilités ${partner.name}` },
			// Lot 5 (Q113) : deux séries de longueurs quelconques, sans appariement
			{
				id: `compare:${partner.name}`,
				label: `Comparer avec ${partner.name}`,
				...(isList(object) &&
					isList(partner) &&
					compareProblem(object, partner) !== undefined && {
						disabledReason: compareProblem(object, partner)
					})
			},
			{ id: `scatter:${partner.name}`, label: `Nuage avec ${partner.name}` },
			{ id: `fit:${partner.name}`, label: `Ajustement avec ${partner.name}` }
		].map((action) =>
			// « Comparer » garde SA raison, celle que donne aussi la commande (revue)
			words === undefined || action.id.startsWith('compare:')
				? action
				: { ...action, disabledReason: words }
		);
		// Le nom de la partenaire voyage avec l'action : la carte les regroupe dessus
		return actions.map((action) => ({ ...action, partner: partner.name }));
	});
}

/**
 * Pourquoi `partner` ne peut pas donner les effectifs de `object`, s'il ne le
 * peut pas. Une action qui ne ferait qu'échouer le dit AVANT le clic (revue
 * du lot 5 des outils statistiques).
 *
 * ⚠️ Seulement pour les effectifs : un nuage ou un ajustement utilisent les
 * paires complètes et disent ce qu'ils écartent (§4 L1).
 */
function countsProblem(object: AtelierObject, partner: AtelierObject): string | undefined {
	if (!isList(object) || !isList(partner)) return undefined;
	if (partner.status !== 'ok') {
		return partner.message ?? `« ${partner.name} » ne peut pas donner d'effectifs pour le moment.`;
	}
	if (object.values.length !== partner.values.length) {
		return `${object.name} a ${object.values.length} valeur(s) et ${partner.name} ${partner.values.length} : il faut un effectif par valeur.`;
	}
	return undefined;
}

/** La raison d'une action numérique refusée à une liste qualitative (Q88) */
export function wordsReason(name: string): string {
	return `${name} contient des mots : action pour une liste de nombres.`;
}

/**
 * Les actions d'une liste QUALITATIVE (Q88) : effectifs, barres, circulaire ;
 * « Statistiques » reste visible, désactivée avec sa raison. Une SEULE action
 * à deux listes, « Tableau croisé avec M » (Q89) : les six actions numériques,
 * toutes désactivées, dépasseraient le plafond de 10 boutons (Q78).
 */
function qualitativeActions(
	object: ListObject,
	atelier: Atelier | undefined,
	chosen: string | undefined
): ObjectAction[] {
	const own: ObjectAction[] = [
		{ id: 'counts', label: 'Effectifs' },
		{ id: 'chart', label: 'Diagramme en barres' },
		{ id: 'pie', label: 'Diagramme circulaire' },
		{ ...BY_KIND.list[0], disabledReason: wordsReason(object.name) }
	];
	// Une seule action à deux listes (Q89) : le tableau croisé avec la partenaire
	const wanted = atelier === undefined ? null : chosenPartner(object, atelier, chosen);
	const partner = wanted === null ? undefined : atelier!.get(wanted);
	if (partner === undefined || !isList(partner)) return own;
	const reason = crossProblem(object, partner);
	return [
		...own,
		{
			id: `cross:${partner.name}`,
			label: `Tableau croisé avec ${partner.name}`,
			partner: partner.name,
			...(reason !== undefined && { disabledReason: reason })
		}
	];
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
export function actionsFor(
	object: AtelierObject,
	atelier?: Atelier,
	partner?: string
): ObjectAction[] {
	const blocked = blockedBy(object);

	// Les listes voient leurs partenaires, quand l'atelier est là pour les dire.
	const catalogue =
		isList(object) && isQualitative(object)
			? qualitativeActions(object, atelier, partner)
			: isList(object) && atelier !== undefined
				? [
						BY_KIND.list[0],
						BY_KIND.list[1],
						...otherChartRemoval(object, atelier, partner),
						...partnerActions(object, atelier, partner)
					]
				: BY_KIND[object.kind];

	const specific = catalogue.map((action) => {
		// « Tracer » devient « Retirer du graphe » quand la courbe est là : un
		// même bouton qui bascule, plutôt que deux boutons dont un est inutile.
		if (action.id === 'plot' && object.plotted) {
			action = { ...action, label: 'Retirer du graphe' };
		}
		// Même bascule pour le diagramme d'une liste (vue Données, Q36) : le bouton
		// qui l'a affiché le retire
		const [root, partner] = action.id.split(':');
		const shown = atelier?.chartOf(object.name);
		const shownKind = shown?.kind ?? 'barres';
		const removesChart =
			shown !== undefined &&
			shown.partner === (partner ?? null) &&
			((root === 'chart' && shownKind === 'barres') ||
				(root === 'pie' && shownKind === 'circulaire'));
		if (removesChart) {
			// Retirer reste possible quoi qu'il arrive à la liste ou à sa partenaire
			return {
				id: action.id,
				label: 'Retirer le diagramme',
				...(action.partner !== undefined && { partner: action.partner })
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
		if (NOT_YET.has(root)) return { ...action, disabledReason: NOT_YET_REASON };
		return action;
	});

	// « Convertir » n'existe que s'il y a une unité à convertir.
	const convert: ObjectAction[] =
		isValue(object) && object.unit !== undefined ? [{ id: 'convert', label: 'Convertir' }] : [];

	return [...specific, ...convert, ...ALWAYS];
}
