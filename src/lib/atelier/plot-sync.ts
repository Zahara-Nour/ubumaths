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
import type { AtelierObject, CurveDisplay, SequenceDisplay, SequenceMode } from './types';
import type { GrapheurStore } from '$lib/stores/grapheur.svelte';
import {
	isExplicitFunction,
	isScatter,
	type CurveReading,
	type ExplicitFunction
} from '$lib/grapheur/types';
import { firstTermValue, graphLatexOf } from './engine';
import { plainDisplay } from './display';
import { isFunction, isList, isSequence } from './types';
import { allowedDisplay, plotRestrictionOf } from './interval';
import { sameRestriction, type Restriction } from '$lib/grapheur/restriction';
import { displayName, reciprocalOf } from './names';
import { commonRows, valuesOn } from './pairs';

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

/**
 * La clé de la droite y = x dans les courbes posées : jamais un nom d'objet
 * (une espace n'en contient pas), elle ne peut donc pas en écraser un.
 */
const IDENTITY_LINE = 'y = x';

/**
 * La droite y = x (décision (3) de David, 2026-10-13) : grise, en pointillés,
 * plus fine que les courbes. Un token, lisible en clair et en sombre ; la
 * couleur hors palette passe telle quelle (`curveColorValue`).
 */
const IDENTITY_SETTINGS = {
	color: 'var(--color-muted-foreground)',
	lineStyle: 'dashed',
	lineWidth: 1
} as const;

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
	/**
	 * L'ensemble de la fonction (`f(x) = x^2 sur [0;+∞[`), en morceaux
	 * numériques ; absent sans ensemble. `f′` le porte aussi : elle hérite de
	 * celui de f (`#inheritIntervals`).
	 */
	readonly restriction?: Restriction;
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
	// `plainDisplay` : `integral` est un proxy `$state` de l'atelier ; tel quel,
	// le grapheur garderait un objet partagé avec lui.
	// `showReading` n'est pas un réglage du grapheur : il devient `reading`,
	// posé à part avec les abscisses lues dans la console (`wantedReading`)
	// eslint-disable-next-line @typescript-eslint/no-unused-vars -- retiré du reste
	const { showReading, ...settings } = plainDisplay(display);
	const wanted: CurveSettings = { ...settings, showDerivative: false };
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
	// ⚠️ En LaTeX, pas en notation « custom » : le grapheur parse du LaTeX, et
	// les deux divergeaient sur les constantes — `\pix` lui était illisible,
	// `f(x) = e^x` ne se traçait pas (retour de David, 2026-10-05)
	const latex = graphLatexOf(atelier, object.name);
	const restriction = plotRestrictionOf(object);
	return {
		definition: latex ?? object.definition,
		visible: object.status === 'ok',
		// Décision f : la tangente ou l'aire hors de l'ensemble ne se dessine pas
		...(isFunction(object) &&
			object.display && { display: allowedDisplay(object, object.display) }),
		...(restriction && { restriction })
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

	// Les points des lignes où les DEUX colonnes ont un nombre (P1) : par rang,
	// une case vide décalait toutes les paires suivantes
	const { rows } = commonRows([object, partner]);
	return {
		kind: 'scatter',
		xs: valuesOn(object, rows),
		ys: valuesOn(partner, rows),
		label: `${object.name} / ${partner.name}`
	};
}

/** Deux séries sont-elles identiques ? Sinon le nuage doit être réécrit. */
function sameSeries(a: readonly number[], b: readonly number[]): boolean {
	return a.length === b.length && a.every((value, i) => value === b[i]);
}

/** Deux lectures identiques ? Par le contenu : la synchronisation pose des copies. */
function sameReading(a: CurveReading | undefined, b: CurveReading | undefined): boolean {
	if (a === undefined || b === undefined) return a === b;
	return a.name === b.name && sameSeries(a.at, b.at);
}

/**
 * La lecture graphique que la courbe doit montrer : absente si l'option est
 * éteinte. Sans `readings` (synchronisation venue d'ailleurs que de la
 * console), les abscisses déjà posées restent.
 */
function wantedReading(
	object: AtelierObject | undefined,
	current: ExplicitFunction,
	readings: ReadonlyMap<string, readonly number[]> | undefined
): CurveReading | undefined {
	if (object === undefined || !isFunction(object) || object.display?.showReading !== true) {
		return undefined;
	}
	const at =
		readings === undefined ? (current.reading?.at ?? []) : (readings.get(object.name) ?? []);
	return { name: displayName(object.name), at: [...at] };
}

/**
 * Mettre le grapheur en accord avec l'atelier.
 *
 * `readings` : les abscisses lues dans la console, par fonction (`consoleReadings`),
 * pour la lecture graphique de l'image ; absent, celles déjà posées restent.
 *
 * ⚠️ **Idempotente** : appelée deux fois sans changement, elle ne fait rien.
 * Sans cela, chaque frappe recréerait les courbes et le graphe clignoterait.
 */
export function syncPlots(
	atelier: Atelier,
	graph: GrapheurStore,
	readings?: ReadonlyMap<string, readonly number[]>
): void {
	const perGraph = posted.get(atelier) ?? new WeakMap<GrapheurStore, Map<string, string>>();
	posted.set(atelier, perGraph);
	const mine = perGraph.get(graph) ?? new Map<string, string>();
	perGraph.set(graph, mine);

	const wanted = new Map<string, Wanted | WantedScatter | WantedSequence>();
	for (const object of atelier.objects) {
		const curve = wantedFor(atelier, object);
		if (curve !== null) {
			wanted.set(object.name, curve);
			continue;
		}
		const cloud = wantedScatterFor(atelier, object);
		if (cloud !== null) {
			wanted.set(object.name, cloud);
			continue;
		}
		const sequence = wantedSequenceFor(atelier, object);
		if (sequence !== null) wanted.set(object.name, sequence);
	}

	// Retirer ce qui ne doit plus être tracé (la droite y = x a sa propre pose).
	for (const [name, id] of mine) {
		if (!wanted.has(name) && name !== IDENTITY_LINE) {
			graph.removeFunction(id);
			mine.delete(name);
		}
	}

	// Poser ou mettre à jour le reste.
	for (const [name, target] of wanted) {
		const id = mine.get(name);

		// Les nuages ont leur propre pose : deux séries de nombres, pas un latex.
		if ('kind' in target && target.kind === 'sequence') {
			syncSequence(graph, mine, name, id, target);
			continue;
		}

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

		const found = id === undefined ? undefined : graph.getFunction(id);
		// Le nom pointait vers autre chose qu'une courbe (un nuage dont la liste a
		// été remplacée par une fonction du même nom) : on retire l'ancien tracé.
		if (found !== undefined && !isExplicitFunction(found)) graph.removeFunction(id!);
		const current = found !== undefined && isExplicitFunction(found) ? found : undefined;
		// Pas encore posée, ou disparue du grapheur (effacement manuel) : on la
		// (re)pose, puis la suite de la boucle lui applique visibilité et réglages.
		const curveId = current === undefined ? graph.addFunction(target.definition) : id!;
		if (current === undefined) mine.set(name, curveId);
		const curve = graph.getFunction(curveId);
		if (curve === undefined) continue;

		// N'écrire que ce qui diffère : c'est cette condition qui rend la
		// synchronisation idempotente, donc l'effet qui l'appelle non bouclant.
		const changes: Partial<CurveSettings> & {
			latex?: string;
			visible?: boolean;
			restriction?: Restriction;
			reading?: CurveReading;
		} = {};
		if (isExplicitFunction(curve)) {
			if (curve.latex !== target.definition) changes.latex = target.definition;
			// Comparée par contenu : la conversion rend une copie neuve à chaque passage.
			if (!sameRestriction(curve.restriction, target.restriction)) {
				changes.restriction = target.restriction;
			}
			if (target.display) Object.assign(changes, settingsDiff(curve, target.display));
			const reading = wantedReading(atelier.get(name), curve, readings);
			if (!sameReading(curve.reading, reading)) changes.reading = reading;
		}
		if (curve.visible !== target.visible) changes.visible = target.visible;
		if (Object.keys(changes).length > 0) graph.updateFunction(curveId, changes);
	}

	syncIdentityLine(atelier, graph, mine);
}

/** Une fonction affichée dans le Graphe : tracée, et qui produit une courbe. */
function isShown(object: AtelierObject | undefined): boolean {
	return (
		object !== undefined && isFunction(object) && object.plotted === true && object.status === 'ok'
	);
}

/**
 * La droite y = x, d'office quand f ET sa carte f⁻¹ sont affichées ; retirée
 * dès que l'une est masquée, supprimée ou en erreur. Pas une carte : rien dans
 * l'atelier, donc rien de sauvegardé. Idempotente, comme le reste.
 */
function syncIdentityLine(atelier: Atelier, graph: GrapheurStore, mine: Map<string, string>): void {
	const wanted = atelier.objects.some((o) => {
		const base = reciprocalOf(o.name);
		return base !== null && isShown(o) && isShown(atelier.get(base));
	});
	const id = mine.get(IDENTITY_LINE);
	const current = id === undefined ? undefined : graph.getFunction(id);
	if (!wanted) {
		if (id !== undefined) graph.removeFunction(id);
		mine.delete(IDENTITY_LINE);
		return;
	}
	if (current !== undefined && isExplicitFunction(current)) return;
	const posed = graph.addFunction('x');
	graph.updateFunction(posed, IDENTITY_SETTINGS);
	mine.set(IDENTITY_LINE, posed);
}

/**
 * La courbe que la synchronisation a posée pour cet objet, s'il y en a une.
 *
 * Sert à la carte (lot 2b) : la pente, l'aire, la courbure et la longueur
 * qu'elle affiche sont calculées sur CETTE courbe — celle qui est dessinée —
 * et non sur une copie, pour que les nombres lus soient ceux du dessin.
 * En lecture seule : la carte écrit ses réglages dans l'atelier.
 */
export function curveOf(
	atelier: Atelier,
	graph: GrapheurStore,
	name: string
): ExplicitFunction | undefined {
	const id = posted.get(atelier)?.get(graph)?.get(name);
	if (id === undefined) return undefined;
	const curve = graph.getFunction(id);
	return curve !== undefined && isExplicitFunction(curve) ? curve : undefined;
}

// =============================================================================
// Suites (lot 5b)
// =============================================================================

/** Ce qu'une suite tracée doit valoir dans le grapheur. */
interface WantedSequence {
	readonly kind: 'sequence';
	readonly latex: string;
	readonly mode: SequenceMode;
	readonly firstIndex: number;
	readonly firstTerm: number | null;
	readonly display: SequenceDisplay;
	/** Masquée (pas retirée) tant qu'elle ne peut rien produire — comme une courbe. */
	readonly visible: boolean;
}

function wantedSequenceFor(atelier: Atelier, object: AtelierObject): WantedSequence | null {
	if (!isSequence(object) || !object.plotted || object.display === undefined) return null;
	const latex = graphLatexOf(atelier, object.name);
	const first = object.mode === 'recurrence' ? firstTermValue(atelier, object.firstTerm) : null;
	return {
		kind: 'sequence',
		latex: latex ?? '',
		mode: object.mode,
		firstIndex: object.firstIndex,
		firstTerm: typeof first === 'number' ? first : null,
		display: object.display,
		visible: object.status === 'ok' && latex !== null && typeof first !== 'string'
	};
}

/** Poser ou mettre à jour une suite, en n'écrivant que ce qui diffère. */
function syncSequence(
	graph: GrapheurStore,
	mine: Map<string, string>,
	name: string,
	id: string | undefined,
	target: WantedSequence
): void {
	const found = id === undefined ? undefined : graph.getFunction(id);
	// Le nom pointait vers autre chose (une courbe, un nuage) : on le retire
	if (id !== undefined && found !== undefined && found.type !== 'sequence') {
		graph.removeFunction(id);
	}
	let current = found !== undefined && found.type === 'sequence' ? found : undefined;
	if (current === undefined) {
		const fresh = graph.addSequence(target.mode, target.latex);
		mine.set(name, fresh);
		const posed = graph.getFunction(fresh);
		if (posed === undefined || posed.type !== 'sequence') return;
		current = posed;
	}

	const wanted = {
		name,
		latex: target.latex,
		mode: target.mode,
		firstIndex: target.firstIndex,
		firstTerm: target.firstTerm,
		representation: target.display.representation,
		cobwebSteps: target.display.cobwebSteps,
		color: target.display.color,
		lineStyle: target.display.lineStyle,
		lineWidth: target.display.lineWidth,
		visible: target.visible
	};
	const changes: Partial<typeof wanted> = {};
	for (const key of Object.keys(wanted) as (keyof typeof wanted)[]) {
		if (current[key] !== wanted[key]) Object.assign(changes, { [key]: wanted[key] });
	}
	if (Object.keys(changes).length > 0) graph.updateSequence(current.id, changes);
}
