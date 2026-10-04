/**
 * Atelier — reporter les objets tracés vers le grapheur
 *
 * **Option B**, tranchée le 2026-09-16 : l'atelier détient l'état, le grapheur
 * le reflète. Un seul sens — rien de ce qui se passe dans le grapheur ne remonte
 * vers l'atelier, sinon il y aurait deux vérités, et c'est précisément ce que la
 * décision figée n° 1 interdit.
 *
 * Conséquence visible : modifier `f` dans le panneau redessine sa courbe, sans
 * que l'élève ait à re-tracer.
 *
 * @module atelier/plot-sync
 */

import type { Atelier } from './atelier.svelte';
import type { AtelierObject, CurveDisplay } from './types';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import { isExplicitFunction, isScatter, type ExplicitFunction } from '$lib/grapheur/types';
import { expressionOf } from './engine';
import { isFunction, isList } from './types';

/**
 * Les courbes posées par l'atelier, par nom d'objet.
 *
 * Tenue à part du grapheur : celui-ci ne connaît pas les noms de l'atelier, et
 * il ne doit pas avoir à les connaître. C'est aussi ce qui garantit qu'on ne
 * touche jamais aux courbes ajoutées à la main dans `/grapheur`.
 *
 * ⚠️ Clé sur le COUPLE (atelier, grapheur), et pas sur le seul grapheur : deux
 * ateliers partageant un même grapheur partiraient sinon en ping-pong — chaque
 * synchronisation retirerait les courbes de l'autre, dont l'effet les reposerait.
 * L'invariant est structurel plutôt que supposé.
 */
const posted = new WeakMap<Atelier, WeakMap<GrapheurStore, Map<string, string>>>();

/** Ce qu'un nuage doit valoir. */
interface WantedScatter {
	readonly kind: 'scatter';
	readonly xs: readonly number[];
	readonly ys: readonly number[];
	readonly label: string;
}

/** Ce qu'une courbe doit valoir, ou `null` si l'objet ne doit pas être tracé. */
interface Wanted {
	readonly definition: string;
	/**
	 * Une courbe reste EN PLACE, masquée, tant que son objet ne peut rien
	 * produire.
	 *
	 * ⚠️ La retirer puis la recréer lui donnerait un nouvel identifiant et une
	 * nouvelle couleur : en pleine saisie, chaque frappe intermédiaire fautive
	 * ferait changer la courbe de couleur. Seul un retrait VOULU la supprime.
	 */
	readonly visible: boolean;
	/**
	 * Les réglages de l'objet, recopiés tels quels. Absents si l'objet n'en a
	 * pas (ne devrait pas arriver : le tracé les attribue) — la courbe garde
	 * alors ceux que le grapheur lui a donnés.
	 */
	readonly display?: CurveDisplay;
}

/** Ce que le grapheur reçoit d'un réglage d'atelier. */
type CurveSettings = Pick<
	ExplicitFunction,
	| 'color'
	| 'lineStyle'
	| 'lineWidth'
	| 'tangentAt'
	| 'integral'
	| 'showOsculating'
	| 'showArcLength'
	| 'showDerivative'
>;

/**
 * Les champs de la courbe à réécrire pour qu'elle corresponde à l'objet.
 *
 * ⚠️ Seulement ceux qui DIFFÈRENT : l'effet qui appelle `syncPlots` lit ce
 * qu'il écrit, et une écriture inconditionnelle le ferait boucler.
 *
 * `showDerivative` est toujours ramené à `false` : la case « f′ » est remplacée
 * par l'action « Dériver » (phase 0 `/grapheur`, Q1).
 */
function settingsDiff(current: ExplicitFunction, display: CurveDisplay): Partial<CurveSettings> {
	const wanted: CurveSettings = { ...display, showDerivative: false };
	const diff: Partial<CurveSettings> = {};
	for (const key of Object.keys(wanted) as (keyof CurveSettings)[]) {
		const a = current[key];
		const b = wanted[key];
		const same =
			key === 'integral'
				? a === b ||
					(a !== null &&
						b !== null &&
						typeof a === 'object' &&
						typeof b === 'object' &&
						a.from === b.from &&
						a.to === b.to)
				: a === b;
		if (!same) Object.assign(diff, { [key]: b });
	}
	return diff;
}

function wantedFor(atelier: Atelier, object: AtelierObject): Wanted | null {
	if (object.kind !== 'function' || !object.plotted) return null;

	// ⚠️ Le grapheur reçoit l'expression ENTIÈREMENT substituée — dérivées ET
	// valeurs. Il ne connaît ni `f'`, ni `a` : ses propres `parameters` sont
	// vides, puisque c'est l'atelier qui détient les valeurs (décision n° 1).
	//
	// ⚠️⚠️ J'ai cru un moment devoir préserver `a*x` « pour ne pas figer le
	// curseur du grapheur ». C'était faux, et mesuré : le grapheur parse `a*x`
	// SANS ERREUR, garde la courbe visible, et ne dessine rien — `a` y est une
	// variable libre. Le test qui m'avait convaincu vérifiait la chaîne
	// transmise, pas que la courbe apparaisse.
	//
	// 🔜 Le jour où « Régler le curseur » sera câblé, les valeurs de l'atelier
	// devront devenir de vrais paramètres du grapheur (décision D3) — c'est là
	// que le curseur reprendra son sens, pas avant.
	const substituted = expressionOf(atelier, object.name);
	return {
		definition: substituted.ok ? substituted.expression : object.definition,
		visible: object.status === 'ok',
		...(isFunction(object) && object.display && { display: object.display })
	};
}

/**
 * Le nuage qu'une liste marquée demande, avec sa partenaire.
 *
 * ⚠️ Un nuage relie DEUX listes, mais c'est la liste d'**abscisses** qui porte
 * le marqueur : sans ça, retirer le nuage demanderait de savoir laquelle des
 * deux le tenait. La partenaire est la suivante du panneau — et la vue Données
 * le dit à l'élève au moment où elle la choisit.
 */
function wantedScatterFor(atelier: Atelier, object: AtelierObject): WantedScatter | null {
	if (!isList(object) || object.plotted !== true) return null;

	const lists = atelier.objects.filter(isList);

	// Le choix de l'élève d'abord : il a cliqué « Nuage avec N », pas « avec la
	// suivante ». Le repli ne sert qu'aux ateliers à deux listes, où il n'y a
	// qu'une réponse possible.
	const chosen =
		object.plottedWith === undefined ? undefined : lists.find((l) => l.name === object.plottedWith);
	const index = lists.findIndex((l) => l.name === object.name);
	const partner = chosen ?? lists[index + 1] ?? (index === 0 ? undefined : lists[0]);
	if (partner === undefined) return null;

	return {
		kind: 'scatter',
		xs: object.values,
		ys: partner.values,
		label: `${object.name} / ${partner.name}`
	};
}

/** Deux séries sont-elles identiques ? Sinon le nuage doit être réécrit. */
function sameSeries(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((value, i) => value === b[i]);
}

/**
 * Mettre le grapheur en accord avec l'atelier.
 *
 * ⚠️ **Idempotente** : appelée deux fois sans changement, elle ne fait rien.
 * Sans cela, chaque frappe recréerait les courbes et le graphe clignoterait.
 */
export function syncPlots(atelier: Atelier, graph: GrapheurStore): void {
	const perGraph = posted.get(atelier) ?? new WeakMap<GrapheurStore, Map<string, string>>();
	posted.set(atelier, perGraph);
	const mine = perGraph.get(graph) ?? new Map<string, string>();
	perGraph.set(graph, mine);

	const wanted = new Map<string, Wanted | WantedScatter>();
	for (const object of atelier.objects) {
		const curve = wantedFor(atelier, object);
		if (curve !== null) {
			wanted.set(object.name, curve);
			continue;
		}
		const cloud = wantedScatterFor(atelier, object);
		if (cloud !== null) wanted.set(object.name, cloud);
	}

	// Retirer ce qui ne doit plus être tracé.
	for (const [name, id] of mine) {
		if (!wanted.has(name)) {
			graph.removeFunction(id);
			mine.delete(name);
		}
	}

	// Poser ou mettre à jour le reste.
	for (const [name, target] of wanted) {
		const id = mine.get(name);

		// Les nuages ont leur propre pose : deux séries de nombres, pas un latex.
		if ('kind' in target) {
			const current = id === undefined ? undefined : graph.getFunction(id);
			if (current === undefined || !isScatter(current)) {
				mine.set(name, graph.addScatter(target.xs, target.ys, target.label));
				continue;
			}
			// N'écrire que ce qui diffère — l'idempotence, là aussi.
			if (!sameSeries(current.xs, target.xs) || !sameSeries(current.ys, target.ys)) {
				graph.updateScatter(id!, { xs: target.xs, ys: target.ys, label: target.label });
			}
			continue;
		}

		const current = id === undefined ? undefined : graph.getFunction(id);
		// Pas encore posée, ou disparue du grapheur (effacement manuel) : on la
		// (re)pose, puis la suite de la boucle lui applique visibilité et réglages.
		const curveId = current === undefined ? graph.addFunction(target.definition) : id!;
		if (current === undefined) mine.set(name, curveId);
		const curve = graph.getFunction(curveId);
		if (curve === undefined) continue;

		// N'écrire que ce qui diffère : c'est cette condition qui rend la
		// synchronisation idempotente, donc l'effet qui l'appelle non bouclant.
		const changes: Partial<CurveSettings> & { latex?: string; visible?: boolean } = {};
		if (isExplicitFunction(curve)) {
			if (curve.latex !== target.definition) changes.latex = target.definition;
			if (target.display) Object.assign(changes, settingsDiff(curve, target.display));
		}
		if (curve.visible !== target.visible) changes.visible = target.visible;
		if (Object.keys(changes).length > 0) graph.updateFunction(curveId, changes);
	}
}
