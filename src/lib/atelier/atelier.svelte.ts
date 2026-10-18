/**
 * Atelier — le modèle, avec sa réactivité
 *
 * L'atelier POSSÈDE l'état ; les vues (Calcul, Graphe, Données) n'en sont que
 * des projections (décision figée n° 1 du cadrage). Les runes portent l'état
 * directement : une classe pure ne peut pas notifier Svelte, et les deux
 * contournements — miroir d'état ou compteur `version` — coûtent la
 * granularité du recalcul (précédent documenté : `GeometryCanvas.svelte`).
 *
 * ⚠️ `structuredClone` jette sur un proxy `$state` : toute sérialisation
 * (URL, stockage local) doit passer par `$state.snapshot()`.
 *
 * Spécification : `docs/archive/wip/atelier-recherche-eleve-phase0.md` §2.
 *
 * @module atelier/atelier
 */

import { SvelteMap } from 'svelte/reactivity';
import {
	MAX_DEFINITION_LENGTH,
	MAX_FIGURE_OBJECTS,
	MAX_LISTS,
	isCurve,
	isFigureObject,
	isFunction,
	isList,
	isPoint,
	isSequence,
	isValue,
	parametersOf
} from './types';
import { constantOf } from './constant';
import type {
	AtelierObject,
	CurveDisplay,
	MissingReference,
	ObjectKind,
	ObjectStatus,
	ListObject,
	PointDisplay,
	SequenceDisplay,
	SequenceObject,
	Slider,
	StrokeDisplay,
	ValueObject
} from './types';
import {
	validateName,
	nextName,
	nameRejectionMessage,
	derivativeOf,
	hasObjectNameShape,
	derivativeName,
	displayName,
	reciprocalName,
	reciprocalOf
} from './names';
import {
	citedReciprocalInterval,
	citesReciprocal,
	reciprocalOfFunction,
	type ReciprocalOutcome
} from './reciprocal';
import type { Provenance } from './parse';
import {
	bareNamesOf,
	parseDefinition,
	pointCoordinatesOf,
	readNumber,
	referencesOf,
	renameInDefinition
} from './parse';
import { z } from 'zod';
import { COORDINATE_LIMIT } from '$lib/grapheur/types';
import type { ListChartKind } from './chart';
import {
	ATELIER_STATE_VERSION,
	migrateReservedNames,
	type AtelierState,
	type StoredObject
} from './persistence';
import { expressionOf, graphLatexOf, substitutedAstOf, termsOf } from './engine';
import { isUnit } from '$lib/mathAST/guards';
import { findNodes } from '$lib/mathAST/transforms';
import {
	compactDisplay,
	fullDisplay,
	newDisplay,
	newPointDisplay,
	sameFigureDisplay,
	newSequenceDisplay,
	newStrokeDisplay,
	plainFigureDisplay,
	plainSequenceDisplay,
	pointDisplaySchema,
	readDisplayPatch,
	readFigureDisplayPatch,
	readSequenceDisplayPatch,
	sequenceDisplaySchema,
	strokeDisplaySchema,
	type StoredDisplay
} from './display';
import { astOf as astOfDefinition } from './parse';
import { INTERNAL_LETTER, letterRejection, typedLetterOf } from './letter';
import {
	checkInterval,
	citedIntervals,
	ONLY_FUNCTIONS,
	readInterval,
	type CheckedInterval
} from './interval';
import type { Domain } from '$lib/mathAST/domain/types';
import { getVariables } from '$lib/mathAST/eval/substitute';
import { listCitedMessage } from './list-cited';
import { figureCitedMessage, figureFullMessage } from './geometry';
import { partsOf, specOf, type ConstructionSpec } from './construction-spec';
import { DEFAULT_ANGLE_UNIT, type AngleUnit } from './angle-unit';
import type { MathNode } from '$lib/mathAST/types';
import { quantityProblem } from '$lib/mathAST/cli/quantities';
import {
	citesMeasure,
	hasBareAngle,
	hasMeasureCall,
	measureCallNames,
	measuredAst,
	measuredText,
	renamePairs,
	withoutMeasureCalls,
	withoutMeasures,
	type MeasuredText
} from './measures';
import { bareLineShortcut, readConstruction, renameInConstruction } from './construction-read';
import {
	constructionOf,
	isConstruction,
	kindsOf,
	positionSliderFor,
	positionTextOf,
	positionValueOf,
	withPosition,
	type ConstructionMemo
} from './construction';
import {
	computeGrid,
	gridTexts,
	isFormula,
	normalizeFormula,
	plainValue,
	referencesIn,
	shiftFormula,
	type CellValue,
	type GridState
} from './formula';
import {
	cellName,
	cellTextFromStored,
	columnLetter,
	columnOfLetter,
	definitionFrom,
	entriesOf,
	GRID_COLUMNS,
	GRID_ROWS,
	hasTitleRow,
	isInGrid,
	MAX_CELL_LENGTH,
	MAX_TITLE_LENGTH,
	readCellName,
	spreadText,
	storedCellText,
	type CellEdit
} from './grid';
import { transformAST } from '$lib/mathAST/visitor';
import {
	CLEAR_PATCH,
	formatOf,
	isRemoval,
	normalizeFormats,
	sameFormats,
	MAX_FORMAT_ZONES,
	patchOf,
	patchRefusal,
	storedOf,
	styleAt as cellStyleAt,
	zoneInGrid,
	type CellStyle,
	type FormatZone,
	type GridZone,
	type StoredFormat,
	type StylePatch
} from './cell-format';
import { planTabulation, type TabulationRequest } from './tabulate';

// =============================================================================
// Types de retour
// =============================================================================

/** Un refus, avec son message déjà en français — l'UI l'affiche tel quel. */
export interface Refused {
	readonly ok: false;
	readonly message: string;
}

export interface Created {
	readonly ok: true;
	readonly object: AtelierObject;
	/** La dérivée existait déjà : rien n'a été créé (phase 0 `/grapheur` §2 L1). */
	readonly existed?: boolean;
}

export interface Renamed {
	readonly ok: true;
	/** Les autres objets dont la définition a été réécrite (§2.2 N1). */
	readonly updated: readonly string[];
}

export interface Removed {
	readonly ok: true;
	/** Les objets qui dépendaient du supprimé et passent en erreur (§2.4 L1). */
	readonly broken: readonly string[];
}

/**
 * Le reçu d'une suppression en cascade : ce qui est parti, et de quoi
 * l'annuler (`undoRemoval`). Opaque pour l'appelant, qui le rend tel quel.
 */
export interface RemovedWithDependents {
	readonly ok: true;
	/** L'objet puis ses dépendants, dans l'ordre des cartes. */
	readonly removed: readonly string[];
}

/** De quoi remettre l'atelier tel qu'il était avant une suppression en cascade. */
interface RemovalUndo {
	readonly receipt: RemovedWithDependents;
	/** `revision` juste après la suppression : si elle a bougé, on n'annule plus (L4). */
	readonly revision: number;
	readonly items: AtelierObject[];
	readonly charts: [string, ListChartState][];
	/** Les cellules sans nom d'avant : retirer un nom y verse la colonne (T3). */
	readonly cells: [string, string][];
	/** Les titres d'avant : supprimer une liste vide sa colonne, titre compris. */
	readonly titles: [number, string][];
}

export interface Updated {
	readonly ok: true;
	readonly object: AtelierObject;
	/** Les objets recalculés en cascade (§2.3 N1). */
	readonly recomputed: readonly string[];
}

/** Un objet qu'une restauration n'a pas pu recréer, et pourquoi. */
export interface SkippedObject {
	readonly name: string;
	readonly reason: string;
}

/**
 * Ce qu'une restauration a pu faire.
 *
 * `skipped` non vide se **montre à l'élève** : c'est du travail qui n'a pas été
 * retrouvé, pas un détail technique.
 */
export interface RestoreReport {
	readonly restored: number;
	readonly skipped: readonly SkippedObject[];
	/**
	 * Les objets renommés à la relecture parce que leur nom est devenu réservé
	 * (`y`, G5 et Q2 de la géométrie) — à dire à l'élève, jamais à taire.
	 */
	readonly renamed: ReadonlyArray<{ readonly from: string; readonly to: string }>;
}

/** La carte `f⁻¹` créée ou mise à jour, avec ce que le calcul a donné (la ligne de Calcul). */
export interface ReciprocalCreated {
	readonly ok: true;
	readonly object: AtelierObject;
	/** La carte existait : même intervalle (`same`) ou nouvel intervalle (`updated`). */
	readonly existed?: 'same' | 'updated';
	readonly outcome: Extract<ReciprocalOutcome, { ok: true }>;
}

/** Ce qu'il faut pour créer un objet. Sans `name`, l'atelier en propose un. */
export interface CreateInput {
	readonly kind: ObjectKind;
	readonly definition?: string;
	readonly name?: string;
	/**
	 * Pour une fonction : la lettre de l'élève (`f(t) = …`), affichage seulement.
	 * ⚠️ `definition` est déjà en x (voir `letter.ts`).
	 */
	readonly letter?: string;
	/**
	 * Pour une fonction : l'ensemble écrit après « sur » (`interval.ts`), jugé à
	 * la création — illisible, vide ou hors du domaine, la création est refusée.
	 */
	readonly interval?: string;
	/** Pour une carte `f⁻¹` : l'intervalle tapé dans `.réciproque f sur I` (relecture). */
	readonly reciprocalOn?: string;
	/** Pour une suite : mode, rang et premier terme déjà connus (relecture, Calcul). */
	readonly sequence?: Partial<Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'>>;
	/**
	 * Pour une liste : la colonne voulue (relecture, fusion, colonne nommée). Prise,
	 * ou absente : la première colonne libre.
	 */
	readonly column?: number;
}

// =============================================================================
// Constantes
// =============================================================================

/** Bornes d'un curseur neuf — décision D3, reprises du grapheur. */
const DEFAULT_SLIDER = { min: -10, max: 10, step: 0.1 } as const;

/** Plus grand rang de départ accepté : au-delà, rien ne s'afficherait. */
const MAX_FIRST_INDEX = 1000;

/** Le trait d'une dérivée selon son ordre : `f′`, `f″`, `f‴`. */
const DERIVATIVE_LINE_STYLES = ['dashed', 'dotted', 'dashdot'] as const;

/** Ce qu'un réglage de suite peut changer (S1, U1). */
const sequencePatchSchema = z
	.object({
		mode: z.enum(['explicit', 'recurrence']),
		firstIndex: z.number().int().min(0).max(MAX_FIRST_INDEX),
		firstTerm: z
			.string()
			.trim()
			.max(20)
			.refine((t) => readNumber(t) !== null || hasObjectNameShape(t))
	})
	.partial()
	.strict();

/** Pourquoi une suite ne peut pas se tracer en escalier, ou `null`. */
export function cobwebRefusal(
	sequence: SequenceObject,
	functionNames: readonly string[]
): string | null {
	if (sequence.mode !== 'recurrence') {
		return `L'escalier demande une récurrence : « ${sequence.name} » est une suite explicite.`;
	}
	// Les noms de fonctions, et celui de la suite : sans eux, `p(n)` se lisait
	// p·(n) et l'escalier était refusé à tort (revue du lot 5b)
	const ast = astOfDefinition(sequence.definition, sequence.provenance, [
		...functionNames,
		sequence.name
	]);
	// ⚠️ Le `n` de `u_n` / `u(n)` ne compte pas : seul un n HORS du terme
	// précédent rend l'escalier impossible (sinon `0,5u_n + 3` était refusée)
	const withoutSelf =
		ast === null
			? null
			: transformAST(ast, {
					enterSubscript: (node) =>
						node.base.type === 'variable' && node.base.name === sequence.name
							? { type: 'variable', name: 'self' }
							: undefined,
					enterFunction: (node) =>
						node.name === sequence.name ? { type: 'variable', name: 'self' } : undefined
				});
	if (withoutSelf !== null && getVariables(withoutSelf).has('n')) {
		return `L'escalier demande une récurrence qui ne dépend que du terme précédent : « ${sequence.name} » dépend aussi de n.`;
	}
	return null;
}

/** Ce qu'une suite rangée porte de son mode, de son rang et de son premier terme. */
export function sequenceInputOf(
	stored: StoredObject
): Partial<Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'>> {
	return {
		...(stored.mode !== undefined && { mode: stored.mode }),
		...(stored.firstIndex !== undefined && { firstIndex: stored.firstIndex }),
		...(stored.firstTerm !== undefined && { firstTerm: stored.firstTerm })
	};
}

/** Les réglages d'une suite relus, validés ; un champ illisible garde sa valeur. */
function sequenceSettings(
	input: Partial<Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'>>,
	built: SequenceObject
): Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'> {
	const read = sequencePatchSchema.safeParse(input);
	const data = read.success ? read.data : {};
	return {
		mode: data.mode ?? built.mode,
		firstIndex: data.firstIndex ?? built.firstIndex,
		firstTerm: data.firstTerm ?? built.firstTerm
	};
}

/** Ce qu'un réglage de curseur peut changer — mêmes bornes que le grapheur. */
const sliderPatchSchema = z
	.object({
		min: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
		max: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
		step: z.number().positive().max(COORDINATE_LIMIT)
	})
	.partial()
	.strict();

function isDefaultSlider(slider: Slider): boolean {
	return (
		slider.min === DEFAULT_SLIDER.min &&
		slider.max === DEFAULT_SLIDER.max &&
		slider.step === DEFAULT_SLIDER.step
	);
}

/**
 * Le curseur élargi pour contenir la valeur tapée (§4 L1) : `a = 25` sur un
 * curseur [−10 ; 10] le porte à [−10 ; 25] plutôt que de coller le pouce au bord.
 */
function widenedSlider(slider: Slider, value: number | null): Slider {
	if (value === null) return { ...slider };
	// ⚠️ Jamais au-delà de ±1e9 (revue du lot 4) : `a = 1e300` donnait un curseur
	// dont le cran valait l'infini, et le pouce écrivait « NaN » dans `a`
	const limited = Math.max(-COORDINATE_LIMIT, Math.min(COORDINATE_LIMIT, value));
	return { ...slider, min: Math.min(slider.min, limited), max: Math.max(slider.max, limited) };
}

// `constantOf` vit dans `constant.ts` (le moteur s'en sert aussi, sans import
// circulaire) ; réexportée pour les composants qui la prenaient ici
export { constantOf } from './constant';

/**
 * Le nombre écrit par le curseur : arrondi au pas (pas de 0,30000000000000004)
 * et avec la virgule, comme l'élève l'écrit (lu 0,5 — mesuré).
 */
function formatSliderValue(value: number, step: number): string {
	// Les décimales du pas, lues sur sa notation scientifique : `String(1e-7)`
	// vaut « 1e-7 » et donnait 0 décimale (revue du lot 4, M1). Arrondi aux
	// DÉCIMALES du pas — le curseur, lui, pose déjà la valeur sur un cran.
	const [mantissa, exponent] = step.toExponential().split('e');
	const decimals = Math.min(
		12,
		Math.max(0, (mantissa.split('.')[1] ?? '').length - Number(exponent))
	);
	const rounded = Number(value.toFixed(decimals));
	return String(rounded === 0 ? 0 : rounded).replace('.', ',');
}

const CIRCULAR = 'Définition circulaire : cet objet finit par se définir lui-même.';

/** Un angle est une grandeur (° ou rad) : une fonction ne s'en sert pas encore. */
const ANGLE_IN_FUNCTION =
	'Une mesure d’angle est une grandeur (en ° ou en rad) : une fonction ne s’en sert pas. Utilise son cosinus ou son sinus, ou une valeur sans unité.';

const GRID_FULL = 'La grille est pleine : vide une colonne pour créer une liste.';

/** Les gestes de la grille qu'on peut annuler (T6) : au-delà, les plus anciens partent. */
export const MAX_GRID_UNDO = 100;

const GRID_CHANGED_SINCE =
	'La grille a changé depuis (une carte, Calcul…) : ce geste ne peut plus être annulé.';

/**
 * Un geste de la grille (saisie, collage, effacement, titre) : chaque case et
 * chaque titre, avant et après. Annuler remet `before`, rétablir remet `after`.
 */
interface GridGesture {
	readonly cells: readonly { column: number; row: number; before: string; after: string }[];
	readonly titles: readonly { column: number; before: string; after: string }[];
	/** « Relancer » (lot 5, Q-L5-3) : la graine d'avant et d'après. */
	readonly seed?: { readonly before: number; readonly after: number };
	/** Une mise en forme (reprise de V4) : les zones d'avant et d'après. */
	readonly formats?: {
		readonly before: readonly FormatZone[];
		readonly after: readonly FormatZone[];
	};
}

/**
 * Pourquoi ces entrées ne peuvent pas devenir la colonne d'une liste, ou `null`.
 *
 * ⚠️ Une définition plus longue que `MAX_DEFINITION_LENGTH` est écartée à la
 * relecture (`persistence.ts`) : la liste ET ses cellules disparaîtraient au
 * rechargement suivant (revue). 200 modalités de 20 caractères suffisent.
 */
function definitionTooLong(column: number, entries: readonly string[]): string | null {
	const length = definitionFrom(entries).length;
	if (length <= MAX_DEFINITION_LENGTH) return null;
	return `La colonne ${columnLetter(column)} ferait ${length} caractères : une liste en garde ${MAX_DEFINITION_LENGTH} au plus pour pouvoir être enregistrée.`;
}

/** Valeur d'un curseur neuf — même convention que `addParameter` du grapheur. */
const OFFER_DEFINITION = '1';

/**
 * Une FONCTION ou une SUITE citée comme un nombre (`f(x) = a x` avec
 * `a(x) = x^2`, V58) : le moteur ne sait pas ce que vaut `a` seul, et
 * `.dériver f` répondait `a`. La suggestion suit la variable de l'objet qui
 * cite (`a(t)`, `a(n)`) ; une valeur n'en a pas.
 */
function functionAsNumberMessage(cited: AtelierObject, user: AtelierObject): string {
	const what = cited.kind === 'sequence' ? 'suite' : 'fonction';
	const variable = isFunction(user) ? (user.letter ?? 'x') : isSequence(user) ? 'n' : null;
	// Une suite dans une fonction ou une valeur : ses termes, pas u(x)
	const asTerm = cited.kind === 'sequence' && !isSequence(user);
	const hint = asTerm
		? `Écris un de ses termes, comme ${cited.name}(2)`
		: variable === null
			? `Écris une de ses valeurs, comme ${cited.name}(2)`
			: `Écris ${cited.name}(${variable})`;
	return `« ${cited.name} » est une ${what} : « ${user.name} » ne peut pas s'en servir comme d'un nombre. ${hint}, ou donne un autre nom à la lettre.`;
}

/** Une unité écrite dans une définition : `5[km]`, `\unit{km}`, celle que montre le champ. */
const UNIT_WRITTEN = /\[|\\unit\{|\\operatorname\{\\mathrm\{/;

const brokenMessage = (culprits: readonly string[]) =>
	culprits.length === 1
		? `Dépend de « ${culprits[0]} », qui est en erreur.`
		: `Dépend de ${culprits.map((n) => `« ${n} »`).join(', ')}, en erreur.`;

/**
 * Au-delà de ce nombre de manquants, le message compte au lieu d'énumérer.
 *
 * « En attente de b, o, j, u, r, t, l, m, d » est illisible — et c'est ce que
 * produit un collage raté (§2.5 N7). Le détail reste porté par `missing`, que
 * l'interface montre au survol.
 */
const MAX_LISTED_MISSING = 3;

/**
 * « En attente de … » — une aide, jamais un reproche (décision D9).
 *
 * ⚠️ Le mot « inconnu » est écarté à dessein : en maths, une inconnue est ce
 * qu'on cherche dans une équation. L'employer ici pour un nom non défini serait
 * un faux ami, dans un outil qui s'adresse justement à des élèves.
 */
const pendingMessage = (missing: readonly MissingReference[]) => {
	if (missing.length === 1) {
		return `En attente de « ${missing[0].name} », qui n'est pas encore défini.`;
	}
	if (missing.length <= MAX_LISTED_MISSING) {
		const names = missing.map((m) => `« ${m.name} »`).join(', ');
		return `En attente de ${names}, qui ne sont pas encore définis.`;
	}
	return `En attente de ${missing.length} noms qui ne sont pas encore définis.`;
};

// =============================================================================
// Atelier
// =============================================================================

/** Le diagramme affiché sous une liste : partenaire des effectifs, genre (Q88) */
export interface ListChartState {
	readonly partner: string | null;
	/** Absent = bâtons (v1) */
	readonly kind?: ListChartKind;
}

export class Atelier {
	/** Les objets, dans leur ordre de création. */
	private items = $state<AtelierObject[]>([]);

	/**
	 * Compteur de modifications — la SEULE source de « quelque chose a changé ».
	 *
	 * ⚠️ Sans lui, chaque endroit qui modifie l'atelier devait penser à prévenir
	 * la session ; un seul oubli et le travail de l'élève n'était plus enregistré.
	 * C'est arrivé : les créations depuis le panneau ne déclenchaient aucune
	 * sauvegarde. Un `$effect` qui lit `revision` couvre tout, y compris les
	 * actions qui n'existent pas encore.
	 */
	revision = $state(0);

	/**
	 * Diagrammes affichés sous les listes, vue Données (outils statistiques,
	 * Q36) : liste → partenaire des effectifs, ou null.
	 *
	 * ⚠️ État d'AFFICHAGE, volontairement hors de `serialize()` (Q37) : il ne
	 * touche ni à la sauvegarde ni au lien de partage. Il ne passe pas non plus
	 * par `revision`, qui déclencherait un enregistrement pour rien.
	 */
	private charts = new SvelteMap<string, ListChartState>();

	/**
	 * Le repère de la vue Figure (géométrie v2, G4 et F3) : affiché par défaut —
	 * au lot 1, tout objet de la figure a des coordonnées ou une équation.
	 * Même statut que `charts` : affichage seulement, hors de `serialize()` et
	 * de `revision` ; `restore()` le rend à son défaut.
	 */
	#figureFrame = $state(true);

	/**
	 * Les cellules des colonnes SANS nom de la grille (vue Données), par adresse
	 * (`C3`). Celles d'une colonne nommée sont les entrées de la définition de
	 * sa liste (`grid.ts`) : chaque cellule a un seul propriétaire. Rangées avec
	 * l'atelier (`serialize`), contrairement aux diagrammes.
	 */
	private cells = new SvelteMap<string, string>();

	/** Les titres des colonnes (T4), texte libre, de toute colonne — nommée ou non. */
	private titles = new SvelteMap<number, string>();

	/**
	 * L'historique de la grille (T6, exception à D6 limitée à la grille) : pas
	 * rangé, perdu au rechargement. `gridHistory` dit à la vue ce qui se peut.
	 */
	#undo: GridGesture[] = [];
	#redo: GridGesture[] = [];
	/** Le geste en cours de composition (un collage : cases PUIS titres), sinon `null`. */
	#gesture: {
		cells: GridGesture['cells'][number][];
		titles: GridGesture['titles'][number][];
		seed?: { before: number; after: number };
		formats?: { before: readonly FormatZone[]; after: readonly FormatZone[] };
	} | null = null;
	/**
	 * La mise en forme de la grille (reprise de V4, 2026-10-18) : des zones, dans
	 * l'ordre où elles ont été posées — la dernière qui touche une case l'emporte.
	 * Elle ne change que l'affichage (`cell-format.ts`).
	 */
	#formats = $state.raw<readonly FormatZone[]>([]);
	/** Annuler ou rétablir écrit sans s'enregistrer comme un nouveau geste. */
	#replaying = false;
	gridHistory = $state({ undo: 0, redo: 0 });

	/**
	 * Les valeurs des FORMULES de la grille (tableur, lot 2), par adresse :
	 * recalculées à chaque changement de cellule ou d'objet (`#recomputeGrid`).
	 */
	#values = $state.raw<ReadonlyMap<string, CellValue>>(new Map());
	/** Le recalcul précédent : le suivant ne refait que les formules concernées (phase 0 §3). */
	#gridState: GridState | undefined = undefined;
	/**
	 * La graine des tirages de la grille (ALEA, lot 5) : un tirage ne dépend que
	 * d'elle et de sa place (T8, Q-L5-5) ; rangée, elle redonne les mêmes tirages
	 * au rechargement et dans le lien (Q-L5-4). « Relancer » la change.
	 */
	#seed = newGridSeed();
	/** Le nombre de formules évaluées par le dernier recalcul (0 : aucune n'était concernée). */
	lastGridComputed = 0;
	/** La grille réécrit une colonne nommée : la règle T2 ne s'applique pas à elle-même. */
	#gridWriting = false;

	/** Les entrées de chaque colonne nommée, une par ligne, relues une fois par changement. */
	#entriesByColumn = $derived.by(() => {
		const byColumn = new Map<number, string[]>();
		for (const o of this.items) if (isList(o)) byColumn.set(o.column, entriesOf(o.definition));
		return byColumn;
	});

	/** La dernière suppression en cascade, tant qu'elle peut s'annuler (lot B, N4). */
	#lastRemoval: RemovalUndo | null = null;

	/**
	 * Les lois des variables aléatoires (décision de David, 2026-10-09) :
	 * variable → ligne de tête du bloc ```loi (`X ~ B(10 ; 0,3)`), posée par
	 * `.binomiale`, `.geometrique`, `.uniforme`, `.exponentielle`, `.normale`,
	 * pour que `P(X ⩽ 3)` tapé seul se calcule.
	 *
	 * ⚠️ Hors de `serialize()` : rien de rangé d'une visite à l'autre, et ce
	 * n'est PAS un objet de l'atelier (aucune liste créée, Q142) — X peut
	 * nommer en même temps un objet et une variable aléatoire. Pas réactif :
	 * aucune vue ne l'affiche. `restore()` (vider, rejouer, charger) l'oublie.
	 */
	#laws = new Map<string, string>();

	/** Les objets dont la ligne est fautive, posés par `recomputeAll` (V58). */
	#miswritten: ReadonlySet<string> = new Set();

	/**
	 * L'objet est-il en erreur à cause de SA ligne — illisible, circulaire, ou
	 * une fonction citée comme un nombre (V58) ? Faux pour un objet qui suit
	 * un autre objet en erreur, ou que l'atelier ne sait pas encore traiter :
	 * ce n'est pas sa définition qu'il faut corriger.
	 */
	isMiswritten(name: string): boolean {
		return this.#miswritten.has(name);
	}

	get objects(): readonly AtelierObject[] {
		return this.items;
	}

	/** Les noms pris, tous types confondus (décision D1). */
	/**
	 * Les noms portés par une FONCTION ou une SUITE.
	 *
	 * ⚠️ Le parseur en a besoin pour lire `k'` : sans déclaration, `mathAST`
	 * n'accepte l'apostrophe que sur `f g h u v w`. Et on ne lui donne que les
	 * noms réels — tout déclarer casserait la lecture de `zzz(x)`.
	 */
	get functionNames(): readonly string[] {
		// `f^-1` n'est pas un nom que le parseur sait lire : la carte `f⁻¹` ne se
		// cite pas (lot 3 de la réciproque)
		return this.items
			.filter((o) => (o.kind === 'function' || o.kind === 'sequence') && !reciprocalOf(o.name))
			.map((o) => o.name);
	}

	get names(): readonly string[] {
		return this.items.map((o) => o.name);
	}

	get(name: string): AtelierObject | undefined {
		return this.items.find((o) => o.name === name);
	}

	/** Retenir la loi de `variable` : remplace la précédente (2026-10-09) */
	rememberLaw(variable: string, head: string): void {
		this.#laws.set(variable, head);
	}

	/** La ligne de tête de la loi de `variable`, si une commande l'a définie */
	lawOf(variable: string): string | undefined {
		return this.#laws.get(variable);
	}

	// ---------------------------------------------------------------------------
	// Création
	// ---------------------------------------------------------------------------

	create(input: CreateInput, provenance: Provenance = 'url'): Created | Refused {
		const definition = input.definition ?? '';

		// Plafonds du v1 (décision D8) : ils existent pour qu'un atelier tienne
		// dans une URL, qui est le seul moyen de partager sans compte.
		if (input.kind === 'list' && this.items.filter((o) => o.kind === 'list').length >= MAX_LISTS) {
			return {
				ok: false,
				message: `Un atelier ne peut pas contenir plus de ${MAX_LISTS} listes.`
			};
		}
		// M2 (Q3) : points et courbes réunis, même esprit que D8
		if (
			(input.kind === 'point' || input.kind === 'curve') &&
			this.items.filter(isFigureObject).length >= MAX_FIGURE_OBJECTS
		) {
			return { ok: false, message: figureFullMessage(MAX_FIGURE_OBJECTS) };
		}
		// Une liste EST une colonne de la grille (T1) : la voulue si elle est libre,
		// sinon la première libre
		let column: number | undefined;
		if (input.kind === 'list') {
			// Une colonne DEMANDÉE (relecture, fusion, colonne nommée) peut porter un
			// titre : il est le sien ; la recherche d'une colonne libre les évite
			column =
				input.column !== undefined && this.#holdsNoData(input.column)
					? input.column
					: this.#firstFreeColumn();
			if (column === undefined) return { ok: false, message: GRID_FULL };
		}

		let name: string;
		if (input.name === undefined) {
			// #329 : ne pas se nommer comme un objet que la définition cite déjà,
			// sinon l'atelier fabrique lui-même la circularité qu'il dénonce.
			const cited = this.#cited(input.kind, definition, provenance).map((r) => r.name);
			name = nextName(input.kind, this.names, cited);
		} else if (derivativeOf(input.name) !== null) {
			// La carte `f′` n'a qu'une définition possible : elle-même, que le
			// parseur lit comme la dérivée de `f`. Toute autre est refusée — une
			// dérivée se calcule, elle ne se définit pas (§2 E1).
			if (input.kind !== 'function' || definition !== `${input.name}(x)`) {
				return {
					ok: false,
					message: `${displayName(input.name)} est la dérivée de ${derivativeOf(input.name)!.base} : elle se calcule, elle ne se définit pas.`
				};
			}
			if (this.names.includes(input.name)) {
				return { ok: false, message: nameRejectionMessage('taken', input.name) };
			}
			name = input.name;
		} else if (reciprocalOf(input.name) !== null) {
			// La carte `f⁻¹` se CALCULE depuis f (`#reciprocals`) : une définition
			// rangée (lien, sauvegarde) est ignorée, l'intervalle tapé est gardé
			if (input.kind !== 'function') {
				return {
					ok: false,
					message: `${displayName(input.name)} est la réciproque de ${reciprocalOf(input.name)} : elle se calcule, elle ne se définit pas.`
				};
			}
			if (this.names.includes(input.name)) {
				return { ok: false, message: nameRejectionMessage('taken', input.name) };
			}
			this.items.push({
				...this.build(input.name, 'function', '', 'text'),
				...(input.reciprocalOn !== undefined && { reciprocalOn: input.reciprocalOn })
			} as AtelierObject);
			this.recomputeAll();
			return { ok: true, object: this.get(input.name)! };
		} else {
			const rejection = validateName(input.name, this.names);
			if (rejection) return { ok: false, message: nameRejectionMessage(rejection, input.name) };
			const asLetter = this.#letterUse(input.name);
			if (asLetter !== null) return { ok: false, message: asLetter };
			name = input.name;
		}

		const letter = input.kind === 'function' ? input.letter : undefined;
		if (letter !== undefined) {
			const refused = letterRejection(letter, name, this.names);
			if (refused !== null) return { ok: false, message: refused };
		}

		let interval: string | undefined;
		if (input.interval !== undefined) {
			const checked = this.#checkedInterval(
				input.kind,
				input.interval,
				definition,
				provenance,
				letter
			);
			if (!checked.ok) return { ok: false, message: checked.message };
			interval = checked.interval;
		}

		const built = this.build(name, input.kind, definition, provenance, letter, interval, column);
		this.items.push(
			isSequence(built) && input.sequence
				? { ...built, ...sequenceSettings(input.sequence, built) }
				: built
		);
		this.recomputeAll();
		return { ok: true, object: this.get(name)! };
	}

	/**
	 * Créer la carte de la dérivée de `name` : `f` donne `f′`, `f′` donne `f″`.
	 *
	 * Phase 0 `/grapheur` §2 (décision G6) : un objet nommé `f'`, défini par
	 * `f'(x)` — c'est-à-dire VIVANT : il suit `f`, puisque le parseur relit la
	 * dérivée de `f` à chaque calcul. Tracé d'office si `f` l'est (D2). Déjà là,
	 * il est rendu tel quel (L1, `existed`).
	 */
	createDerivative(name: string): Created | Refused {
		const base = this.get(name);
		if (base === undefined) return { ok: false, message: `« ${displayName(name)} » n'existe pas.` };
		if (base.kind !== 'function') {
			return { ok: false, message: `Seule une fonction se dérive : « ${name} » n'en est pas une.` };
		}
		if (reciprocalOf(name) !== null) {
			return {
				ok: false,
				message: `${displayName(name)} n'a pas de carte dérivée : tape .dériver suivi de sa formule.`
			};
		}
		// Une fonction à paramètre (`f(x) = a x`) se dérive comme `.dériver f`
		// (Q4, David, 2026-10-14) : sa carte f′ attend a, comme f
		const parameterized = parametersOf(base) !== null;
		if (base.status !== 'ok' && !parameterized) {
			// Le message de l'objet d'abord : une fonction EN ATTENTE n'est pas
			// illisible, elle attend un nom (`a`) — le dire autrement serait faux
			return {
				ok: false,
				message:
					base.definition.trim() === ''
						? `« ${displayName(name)} » est vide : il n'y a rien à dériver.`
						: (base.message ??
							`« ${displayName(name)} » ne se lit pas : il faut la corriger avant de la dériver.`)
			};
		}

		const derived = derivativeName(name);
		const existing = this.get(derived);
		if (existing !== undefined) return { ok: true, object: existing, existed: true };

		const created = this.create(
			{ kind: 'function', name: derived, definition: `${derived}(x)` },
			'text'
		);
		if (!created.ok) return created;
		// E3 : une dérivée qui ne se calcule pas ne laisse pas de carte en erreur
		// (`recomputeAll` l'a passée en erreur : voir `#underivable`)
		const card = this.get(derived);
		if (card === undefined || (card.status !== 'ok' && parametersOf(card) === null)) {
			this.remove(derived);
			return { ok: false, message: `La dérivée de « ${displayName(name)} » ne se calcule pas.` };
		}
		if (base.plotted) this.setPlotted(derived, true);
		// Comme le tracé : `f′` naît là où `f` est montrée (K3)
		if (isFunction(base) && base.inFigure) this.setInFigure(derived, true);
		return { ok: true, object: this.get(derived)! };
	}

	/**
	 * La réciproque de f telle que `f⁻¹` tapé dans Calcul la calcule, à la volée
	 * (`engine.ts`) : sur l'intervalle tapé pour la carte `f⁻¹` quand elle
	 * existe, pour que la carte et `f⁻¹(5)` disent la même chose.
	 */
	reciprocalOutcome(base: string): ReciprocalOutcome {
		const card = this.get(reciprocalName(base));
		return reciprocalOfFunction(
			this,
			base,
			card !== undefined && isFunction(card) ? card.reciprocalOn : undefined
		);
	}

	/**
	 * Créer — ou mettre à jour — la carte `f⁻¹` (lot 3 de
	 * `docs/wip/atelier-reciproque-phase0.md`, R1).
	 *
	 * Refusée sans carte quand f n'a pas de réciproque (constante, non bijective,
	 * le moteur ne sait pas) : le refus dit pourquoi. La carte SUIT f
	 * (`#reciprocals`) ; elle est tracée d'office si f l'est, comme `f′`.
	 *
	 * @param on - l'intervalle tapé après « sur » ; croisé avec celui de f
	 */
	createReciprocal(base: string, on?: string): ReciprocalCreated | (Refused & { formulas?: true }) {
		// Sans « sur » (le bouton), la carte existante garde l'intervalle tapé avant
		const existing = this.get(reciprocalName(base));
		const wanted =
			on ?? (existing !== undefined && isFunction(existing) ? existing.reciprocalOn : undefined);
		const outcome = reciprocalOfFunction(this, base, wanted);
		if (!outcome.ok) return outcome;
		// `sur ℝ` ne restreint rien : rien à ranger
		const owner = this.get(base)!;
		const read = wanted === undefined ? null : readInterval(wanted, typedLetterOf(this, owner));
		const kept = read === null || (read.ok && read.domain === null) ? undefined : wanted!.trim();
		const name = reciprocalName(base);
		const index = this.items.findIndex((o) => o.name === name);
		if (index !== -1) {
			const current = this.items[index];
			const same = isFunction(current) && current.reciprocalOn === kept;
			if (!same && isFunction(current)) {
				const { reciprocalOn: _dropped, ...rest } = current;
				this.items[index] = kept === undefined ? rest : { ...rest, reciprocalOn: kept };
				this.recomputeAll();
			}
			return { ok: true, object: this.get(name)!, existed: same ? 'same' : 'updated', outcome };
		}
		const created = this.create({
			kind: 'function',
			name,
			...(kept !== undefined && { reciprocalOn: kept })
		});
		if (!created.ok) return created;
		if (owner.plotted) this.setPlotted(name, true);
		if (isFunction(owner) && owner.inFigure) this.setInFigure(name, true);
		return { ok: true, object: this.get(name)!, outcome };
	}

	// ---------------------------------------------------------------------------
	// Curseurs (phase 0 `/grapheur` §4)
	// ---------------------------------------------------------------------------

	/**
	 * Régler les bornes et le pas du curseur d'une valeur (K1).
	 *
	 * Refusé avec sa raison, l'ancien réglage gardé (E1). Pas de recalcul : un
	 * réglage de curseur ne change aucune valeur — seul le compteur bouge, pour
	 * la sauvegarde.
	 */
	setSlider(name: string, patch: Partial<Slider>): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isValue(current) || current.slider === undefined) {
			return {
				ok: false,
				message:
					current !== undefined && isValue(current) && current.unit !== undefined
						? `« ${name} » est une grandeur en ${current.unit} : un curseur n’aurait pas de sens ici.`
						: `« ${name} » n'a pas de curseur.`
			};
		}
		const read = sliderPatchSchema.safeParse(patch);
		if (!read.success) return { ok: false, message: 'Ce réglage du curseur n’est pas valable.' };
		// Le curseur ENTIER est revalidé, pas seulement le patch (revue du lot 4)
		const whole = sliderPatchSchema.required().safeParse({ ...current.slider, ...read.data });
		if (!whole.success) return { ok: false, message: 'Ce réglage du curseur n’est pas valable.' };
		const next = whole.data;
		if (next.min >= next.max) {
			return { ok: false, message: 'Le minimum doit être plus petit que le maximum.' };
		}
		if (next.step > next.max - next.min) {
			return { ok: false, message: 'Le pas doit tenir entre les deux bornes.' };
		}
		this.items[index] = { ...current, slider: next };

		// A2, tranché par David (2026-10-04) : des bornes resserrées sous la valeur
		// la RAMÈNENT dedans — sinon le pouce, collé au bord, montrait une valeur
		// fausse, et la relecture rélargissait en silence. Une valeur calculée
		// n'est pas touchée : le curseur effacerait sa formule.
		const value = constantOf(current.definition, current.provenance, this.functionNames);
		if (value !== null && (value < next.min || value > next.max)) {
			const clamped = Math.min(next.max, Math.max(next.min, value));
			this.update(name, formatSliderValue(clamped, next.step), 'text');
			return { ok: true };
		}
		this.revision++;
		return { ok: true };
	}

	/**
	 * Bouger le curseur : la valeur devient ce nombre, arrondi au pas et gardé
	 * dans les bornes (K2). Les fonctions qui la citent suivent.
	 *
	 * ⚠️ Refusé sur une valeur CALCULÉE (`a = b + 1`) : y écrire un nombre
	 * effacerait la formule de l'élève.
	 */
	slideTo(name: string, value: number): Updated | Refused {
		const current = this.get(name);
		if (current === undefined || !isValue(current) || current.slider === undefined) {
			return { ok: false, message: `« ${name} » n'a pas de curseur.` };
		}
		if (!Number.isFinite(value)) return { ok: false, message: 'Cette valeur n’est pas un nombre.' };
		if (constantOf(current.definition, current.provenance, this.functionNames) === null) {
			return {
				ok: false,
				message: `« ${name} » est calculée à partir d'autres objets : le curseur effacerait sa formule.`
			};
		}
		const { min, max, step } = current.slider;
		const clamped = Math.min(max, Math.max(min, value));
		const written = formatSliderValue(clamped, step);
		// Un cran qui ne change rien ne recalcule rien (revue du lot 4, M6)
		if (written === current.definition) {
			return { ok: true, object: current, recomputed: [] };
		}
		return this.update(name, written, 'text');
	}

	/**
	 * Le curseur de position d'un `point_sur` à position écrite (PR 3, L5), ou
	 * `null` : bornes de l'objet ([0 ; 1] sur un segment, [0 ; 360] sur un cercle).
	 * Lu sur la définition, jamais rangé — la sauvegarde ne change pas.
	 */
	positionSliderOf(name: string): Slider | null {
		return positionSliderFor(this, name);
	}

	/** La position écrite d'un `point_sur`, en nombre, ou `null`. */
	positionOf(name: string): number | null {
		return positionValueOf(this, name);
	}

	/**
	 * Glisser la position d'un `point_sur` : le nombre écrit devient celui-ci,
	 * arrondi au pas et gardé dans les bornes — comme `slideTo` pour une valeur.
	 * Ce qui cite le point suit.
	 */
	slidePosition(name: string, value: number): Updated | Refused {
		const current = this.get(name);
		const slider = this.positionSliderOf(name);
		if (current === undefined || slider === null) {
			return { ok: false, message: `« ${name} » n’a pas de curseur de position.` };
		}
		if (!Number.isFinite(value)) return { ok: false, message: 'Cette valeur n’est pas un nombre.' };
		const clamped = Math.min(slider.max, Math.max(slider.min, value));
		const written = formatSliderValue(clamped, slider.step);
		// Un cran qui ne change pas le nombre ÉCRIT ne réécrit rien ; `1/3` glissé à 0,33, si
		if (written === positionTextOf(this, name)) {
			return { ok: true, object: current, recomputed: [] };
		}
		const definition = withPosition(current.definition, current.provenance ?? 'url', written);
		if (definition === null) {
			return { ok: false, message: `« ${name} » n’a pas de curseur de position.` };
		}
		return this.update(name, definition, 'text');
	}

	/**
	 * Relever (`.relever`, géométrie lot 2, PR 4) : poser tour à tour chaque
	 * définition de `name` (une valeur, la position d'un `point_sur`), tout
	 * recalculer et lire ce qu'il faut — `null` pour un pas que l'atelier refuse.
	 *
	 * ⚠️ L'atelier est ensuite rendu EXACTEMENT tel qu'il était, tous les objets
	 * et pas seulement `name` : `update` élargit le curseur d'une valeur posée
	 * hors de ses bornes, et la rendre par `update` le laisserait élargi.
	 */
	sweep<T>(name: string, definitions: readonly string[], read: () => T): (T | null)[] {
		if (this.get(name) === undefined) return [];
		// Une copie du TABLEAU suffit : un objet n'est jamais modifié en place,
		// `update` le remplace. ⚠️ Pas `$state.snapshot` : hors navigateur, il
		// rend le tableau lui-même, que le premier pas modifiait (mesuré)
		const saved = [...this.items];
		try {
			return definitions.map((definition) =>
				this.update(name, definition, 'text').ok ? read() : null
			);
		} finally {
			this.items = saved;
			this.recomputeAll();
		}
	}

	// ---------------------------------------------------------------------------
	// Renommage
	// ---------------------------------------------------------------------------

	/**
	 * L'ensemble à ranger pour une fonction (I3 : dans son domaine), ou le refus.
	 * `sur ℝ` ne range rien. Une valeur, une suite, une liste n'en ont pas.
	 */
	#checkedInterval(
		kind: ObjectKind,
		written: string,
		definition: string,
		provenance: Provenance,
		letter: string | undefined
	): CheckedInterval {
		if (kind !== 'function') return { ok: false, message: ONLY_FUNCTIONS };
		return checkInterval(written, definition, provenance, this.functionNames, letter);
	}

	/**
	 * Le refus d'un nom qui est la LETTRE d'une fonction (`t` après `f(t)`), ou
	 * `null`. Sinon la carte de `f` montrerait `t` pour deux choses à la fois.
	 */
	#letterUse(name: string): string | null {
		const owner = this.items.find((o) => isFunction(o) && o.letter === name);
		return owner === undefined
			? null
			: `« ${name} » est la variable de ${owner.name}(${name}) : choisis un autre nom.`;
	}

	/**
	 * Les objets que cite une définition. ⚠️ Une LISTE n'en cite aucun : c'est
	 * du texte brut. Lue comme une expression, `fille ; garçon` citait `fille`
	 * et `garçon`, et la liste restait « en attente » d'objets inexistants (Q84).
	 */
	#cited(
		kind: AtelierObject['kind'],
		definition: string,
		provenance?: Provenance
	): MissingReference[] {
		if (kind === 'list') return [];
		// Une construction (lot 2) : les objets qu'elle nomme, et ce que citent ses nombres
		const construction = this.#constructionSpec(kind, definition, provenance);
		if (construction !== null) {
			const { names, scalars } = partsOf(construction);
			const found = new Map<string, MissingReference>(
				names.map((name) => [name, { name, as: 'value' }])
			);
			// Un nombre d'une construction peut être une mesure (`cercle(A ; AM)`, revue PR 2)
			for (const scalar of scalars) {
				for (const ref of this.#cited('value', scalar, 'text')) {
					if (!found.has(ref.name)) found.set(ref.name, ref);
				}
			}
			return [...found.values()];
		}
		// Un point cite ce que citent ses deux coordonnées : le couple, lui, ne se
		// lit pas comme une expression
		if (kind === 'point')
			return this.#inCoordinates(definition, (c) => this.#cited('value', c, provenance));
		// Une mesure (lot 2, L4) : les noms de ses appels, et le reste lu comme un calcul
		if (hasMeasureCall(definition, provenance ?? 'url')) {
			const found = new Map<string, MissingReference>(
				referencesOf(
					withoutMeasureCalls(definition, provenance ?? 'url'),
					provenance,
					this.functionNames
				).map((r) => [r.name, r])
			);
			for (const name of measureCallNames(definition, provenance ?? 'url')) {
				if (!found.has(name)) found.set(name, { name, as: 'value' });
			}
			return [...found.values()];
		}
		return referencesOf(definition, provenance, this.functionNames);
	}

	/** La construction que décrit cette définition (sans contrôle de type), ou `null`. */
	#constructionSpec(
		kind: AtelierObject['kind'],
		definition: string,
		provenance: Provenance | undefined
	): ConstructionSpec | null {
		if (kind !== 'point' && kind !== 'curve') return null;
		const read = specOf(definition, provenance ?? 'url');
		return read !== null && read.ok ? read.spec : null;
	}

	/** Ce que rend `read` sur chaque coordonnée d'un point, sans doublon de nom. */
	#inCoordinates<T extends string | MissingReference>(
		definition: string,
		read: (coordinate: string) => readonly T[]
	): T[] {
		const found = new Map<string, T>();
		for (const coordinate of pointCoordinatesOf(definition) ?? []) {
			for (const item of read(coordinate)) {
				const key = typeof item === 'string' ? item : item.name;
				// Un appel l'emporte sur la lecture « valeur », comme dans `referencesOf`
				if (!found.has(key) || (typeof item !== 'string' && item.as === 'function')) {
					found.set(key, item);
				}
			}
		}
		return [...found.values()];
	}

	/** Les noms qu'une définition emploie comme un nombre (V58), coordonnées d'un point comprises. */
	#bareNamesOf(o: AtelierObject): string[] {
		// Une construction : seuls ses NOMBRES emploient un nom comme un nombre
		const construction = this.#constructionSpec(o.kind, o.definition, o.provenance);
		if (construction !== null) {
			return partsOf(construction).scalars.flatMap((scalar) =>
				bareNamesOf(scalar, 'text', this.functionNames)
			);
		}
		return o.kind === 'point'
			? this.#inCoordinates(o.definition, (c) => bareNamesOf(c, o.provenance, this.functionNames))
			: bareNamesOf(
					withoutMeasureCalls(o.definition, o.provenance ?? 'url'),
					o.provenance,
					this.functionNames
				);
	}

	/**
	 * La définition après renommage. ⚠️ Une liste n'est JAMAIS réécrite (Q87) :
	 * renommer un objet `A` changeait `A ; B ; A ; O`, une liste de groupes
	 * sanguins.
	 */
	#renamedIn(object: AtelierObject, from: string, to: string): string {
		if (object.kind === 'list') return object.definition;
		// `(AB)` : une expression régulière de mots n'y voit pas l'identifiant A
		const construction =
			object.kind === 'point' || object.kind === 'curve' || object.kind === 'value'
				? renameInConstruction(object.definition, object.provenance ?? 'url', from, to)
				: null;
		const renamed = construction ?? renameInDefinition(object.definition, from, to);
		// `AM` (lot 2, L4) : une longueur entre deux points, qu'une expression régulière
		// de mots lit comme l'identifiant AM. Appelé APRÈS que `from` s'appelle `to`
		if (object.kind !== 'value' && object.kind !== 'function' && object.kind !== 'sequence') {
			return renamed;
		}
		const isPoint = (name: string) => this.get(name === from ? to : name)?.kind === 'point';
		return renamePairs(renamed, from, to, isPoint);
	}

	rename(from: string, to: string): Renamed | Refused {
		const index = this.items.findIndex((o) => o.name === from);
		if (index === -1) return { ok: false, message: `« ${from} » n'existe pas.` };

		// Revue du lot 3a, C3 : `f′` suit `f`, elle n'a pas de nom à elle
		const ownDerivative = derivativeOf(from);
		if (ownDerivative !== null) {
			return {
				ok: false,
				message: `${displayName(from)} suit ${ownDerivative.base} : c'est ${ownDerivative.base} qu'on renomme, et sa dérivée suit.`
			};
		}
		const ownReciprocal = reciprocalOf(from);
		if (ownReciprocal !== null) {
			return {
				ok: false,
				message: `${displayName(from)} suit ${ownReciprocal} : c'est ${ownReciprocal} qu'on renomme, et sa réciproque suit.`
			};
		}
		if (this.names.includes(reciprocalName(from)) && this.names.includes(reciprocalName(to))) {
			return {
				ok: false,
				message: `${displayName(reciprocalName(to))} existe déjà : renommer « ${from} » en « ${to} » en ferait deux.`
			};
		}
		// Revue du lot 3a, B2 : les dérivées de `from` prennent le nom de `to` —
		// jamais celui d'un objet qui existe déjà (une `f′` restée orpheline)
		for (const o of this.items) {
			const derivative = derivativeOf(o.name);
			if (derivative?.base !== from) continue;
			const target = `${to}${"'".repeat(derivative.order)}`;
			if (this.names.includes(target)) {
				return {
					ok: false,
					message: `${displayName(target)} existe déjà : renommer « ${from} » en « ${to} » en ferait deux.`
				};
			}
		}

		const others = this.names.filter((n) => n !== from);
		const rejection = validateName(to, others);
		if (rejection) return { ok: false, message: nameRejectionMessage(rejection, to) };
		const asLetter = this.#letterUse(to);
		if (asLetter !== null) return { ok: false, message: asLetter };

		// L'objet renommé voit sa PROPRE définition réécrite lui aussi : une suite
		// récurrente se cite elle-même (`u(n+1) = 2·u(n)`), et l'oublier la
		// laisserait en attente de son ancien nom.
		this.items[index] = {
			...this.items[index],
			name: to,
			definition: this.#renamedIn(this.items[index], from, to)
		} as AtelierObject;

		// Les dérivées suivent leur fonction : `f′` devient `h′` (sinon la carte
		// `f′` resterait en attente d'une fonction `f` qui n'existe plus)
		this.items.forEach((o, i) => {
			const derivative = derivativeOf(o.name);
			if (derivative?.base !== from) return;
			const renamed = `${to}${"'".repeat(derivative.order)}`;
			this.items[i] = { ...o, name: renamed, definition: `${renamed}(x)` } as AtelierObject;
		});
		// La réciproque aussi : `f⁻¹` devient `h⁻¹` (sa formule se recalcule)
		this.items.forEach((o, i) => {
			if (reciprocalOf(o.name) === from) this.items[i] = { ...o, name: reciprocalName(to) };
		});

		// Les définitions qui citaient l'ancien nom suivent : c'est ce qu'attend
		// un élève, et on le lui dit en rendant la liste. L'objet renommé n'y
		// figure pas — il n'a pas été « mis à jour », il a été renommé.
		const updated: string[] = [];
		this.items.forEach((o, i) => {
			if (o.name === to || derivativeOf(o.name)?.base === to || reciprocalOf(o.name) !== null) {
				return;
			}
			const rewritten = this.#renamedIn(o, from, to);
			// Le premier terme d'une suite peut citer la valeur renommée (S1)
			const firstTerm = isSequence(o) && o.firstTerm === from ? to : undefined;
			if (rewritten !== o.definition || firstTerm !== undefined) {
				this.items[i] = {
					...o,
					definition: rewritten,
					...(firstTerm !== undefined && { firstTerm })
				} as AtelierObject;
				updated.push(o.name);
			}
		});

		// Les diagrammes suivent le nouveau nom, de la liste comme de la partenaire
		for (const [list, chart] of [...this.charts]) {
			const partner = chart.partner === from ? to : chart.partner;
			this.charts.delete(list);
			this.charts.set(list === from ? to : list, { ...chart, partner });
		}

		this.recomputeAll();
		return { ok: true, updated };
	}

	// ---------------------------------------------------------------------------
	// Modification
	// ---------------------------------------------------------------------------

	/**
	 * @param letter - Pour une fonction : la lettre de l'élève, ou `undefined`
	 *   pour garder la sienne. ⚠️ `definition` est déjà en x (`letter.ts`).
	 * @param interval - Pour une fonction : l'ensemble écrit après « sur », `null`
	 *   pour le retirer (I6), `undefined` pour garder le sien.
	 */
	update(
		name: string,
		definition: string,
		provenance: Provenance = 'url',
		letter?: string,
		interval?: string | null
	): Updated | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return { ok: false, message: `« ${name} » n'existe pas.` };
		// T2 (tableur) : une colonne qui contient des formules se modifie dans la
		// grille, jamais par sa carte ni par `L = …`
		const current = this.items[index];
		if (isList(current) && !this.#gridWriting && entriesOf(current.definition).some(isFormula)) {
			return {
				ok: false,
				message: `${name} est calculée dans la grille : modifie ses cellules dans l’onglet Données.`
			};
		}
		if (letter !== undefined) {
			const refused = letterRejection(
				letter,
				name,
				this.names.filter((n) => n !== name)
			);
			if (refused !== null) return { ok: false, message: refused };
		}

		const dependents = this.allDependents(name);
		// ⚠️ `build()` fabrique un objet NEUF : ce qui relève de l'affichage doit
		// être reporté à la main, sinon modifier une fonction fait disparaître sa
		// courbe. Même famille que le curseur écrasé (revue #334, point 7) : tout
		// état d'affichage ajouté ici devra être reporté là.
		const previous = this.items[index];
		const keptLetter = letter ?? (isFunction(previous) ? previous.letter : undefined);
		const wanted =
			interval === undefined ? (isFunction(previous) ? previous.interval : undefined) : interval;
		let keptInterval: string | undefined;
		if (wanted !== null && wanted !== undefined) {
			const checked = this.#checkedInterval(
				previous.kind,
				wanted,
				definition,
				provenance,
				keptLetter
			);
			if (!checked.ok) return { ok: false, message: checked.message };
			keptInterval = checked.interval;
		}
		const rebuilt = this.build(
			name,
			previous.kind,
			definition,
			provenance,
			keptLetter,
			keptInterval,
			// Une liste redéfinie (carte, `L = …`) garde sa colonne : T2
			isList(previous) ? previous.column : undefined
		);
		// K3 (dette n° 2) : le curseur réglé survit à la définition — `build()`
		// en fabrique un neuf, qu'on remplace par l'ancien, élargi si besoin (L1)
		const keptSlider =
			isValue(previous) && previous.slider && isValue(rebuilt) && rebuilt.slider
				? widenedSlider(previous.slider, constantOf(definition, provenance, this.functionNames))
				: undefined;
		// Le rang et le premier terme d'une suite survivent à la définition. Son
		// mode, lui, est REDÉDUIT (revue du lot 5a, B1) : garder « récurrence »
		// sur `u(n) = 2n + 1` faisait valoir u(3) = 5 au lieu de 7, sans un mot.
		// Une récurrence constante (`u(n+1) = 3`) se demande explicitement.
		const keptSequence =
			isSequence(previous) && isSequence(rebuilt)
				? {
						// Tranché par David (revue du lot 5b) : le mode CHOISI est gardé,
						// sauf si la définition se met à se citer (→ récurrence). Calcul dit
						// le mode par la forme tapée (`u(n) =` / `u(n+1) =`) : c'est là que
						// le cas B1 du lot 5a (u(3) = 5 au lieu de 7) est réglé.
						mode: rebuilt.mode === 'recurrence' ? rebuilt.mode : previous.mode,
						firstIndex: previous.firstIndex,
						firstTerm: previous.firstTerm
					}
				: undefined;
		this.items[index] = {
			...rebuilt,
			...keptSequence,
			...(previous.plotted && { plotted: true }),
			...(isFunction(previous) && isFunction(rebuilt) && previous.inFigure && { inFigure: true }),
			// Un point ou une courbe garde son dessin (lot 4b) : la définition change, pas la couleur
			...((isFunction(previous) || isSequence(previous) || isFigureObject(previous)) &&
				previous.display && { display: previous.display }),
			...(keptSlider && { slider: keptSlider }),
			// Le curseur affiché à la main reste affiché, tant que la valeur en a un
			...(isValue(previous) && previous.sliderShown && keptSlider && { sliderShown: true })
		} as AtelierObject;
		this.#dropImpossibleCobweb(index);
		this.recomputeAll();

		return { ok: true, object: this.get(name)!, recomputed: dependents };
	}

	// ---------------------------------------------------------------------------
	// Suppression
	// ---------------------------------------------------------------------------

	remove(name: string): Removed | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return { ok: false, message: `« ${name} » n'existe pas.` };

		const broken = this.allDependents(name);
		this.items.splice(index, 1);
		this.#forgetGridHistory();
		this.charts.delete(name);
		// Les diagrammes dont elle donnait les effectifs disparaissent avec elle :
		// sinon, une liste recréée sous ce nom s'y rattacherait en silence
		for (const [list, chart] of [...this.charts]) {
			if (chart.partner === name) this.charts.delete(list);
		}
		this.recomputeAll();

		return { ok: true, broken };
	}

	/**
	 * Ce qu'emporterait la suppression de `name` : ses dépendants, directs ou en
	 * chaîne, dans l'ordre des cartes (lot B, N2 et L1).
	 */
	removalOf(name: string): readonly string[] {
		const dependents = new Set(this.allDependents(name));
		// Un cycle (`f` cite `g` qui cite `f`) ramène `name` parmi ses propres
		// dépendants : il serait annoncé et compté deux fois (revue du lot B)
		dependents.delete(name);
		return this.items.filter((o) => dependents.has(o.name)).map((o) => o.name);
	}

	/**
	 * Supprimer `name` ET ses dépendants (décision de David, 2026-10-05 : ils ne
	 * restent plus « en attente »). La confirmation est l'affaire de la vue.
	 *
	 * Le reçu rendu permet UNE annulation, tant que rien d'autre n'a changé.
	 */
	removeWithDependents(name: string): RemovedWithDependents | Refused {
		return this.#removeWithDependents(name);
	}

	/**
	 * @param unnamed - Retirer le NOM d'une colonne : ce qui fait partie du même
	 *   geste (y verser ses cellules), fait avant de noter la révision — sinon
	 *   « Annuler » se croirait dépassé par un changement venu d'ailleurs. Sans
	 *   lui, c'est une suppression : les colonnes des listes supprimées sont
	 *   vidées, titre compris (T3).
	 */
	#removeWithDependents(name: string, unnamed?: () => void): RemovedWithDependents | Refused {
		if (this.get(name) === undefined) {
			return { ok: false, message: `« ${displayName(name)} » n'existe pas.` };
		}
		const removed = [name, ...this.removalOf(name)];
		const gone = new Set(removed);
		// Copié AVANT : `items` est un `$state`, ses objets des proxies
		const items = $state.snapshot(this.items) as AtelierObject[];
		const charts = [...this.charts].filter(
			([list, c]) => gone.has(list) || gone.has(c.partner ?? '')
		);
		const cells = [...this.cells];
		const titles = [...this.titles];
		const columns = this.items.flatMap((o) => (isList(o) && gone.has(o.name) ? [o.column] : []));

		this.items = this.items.filter((o) => !gone.has(o.name));
		for (const [list] of charts) this.charts.delete(list);
		this.recomputeAll();
		if (unnamed !== undefined) unnamed();
		else for (const column of columns) this.titles.delete(column);
		// Une suppression FERME l'historique de la grille : annuler un geste plus
		// ancien changerait la révision, et la suppression ne pourrait plus
		// s'annuler — ses objets seraient perdus (revue de la PR 3a)
		this.#forgetGridHistory();

		const receipt: RemovedWithDependents = { ok: true, removed };
		this.#lastRemoval = {
			receipt,
			revision: this.revision,
			items,
			charts: $state.snapshot(charts) as [string, ListChartState][],
			cells,
			titles
		};
		return receipt;
	}

	/**
	 * Annuler la suppression de ce reçu. Refusé — et rien ne bouge — si une autre
	 * suppression l'a suivie, si elle est déjà annulée, ou si l'atelier a changé
	 * depuis : on ne restaure jamais par-dessus un nom repris (L4).
	 */
	undoRemoval(receipt: RemovedWithDependents): boolean {
		const undo = this.#lastRemoval;
		if (undo === null || undo.receipt !== receipt || undo.revision !== this.revision) return false;
		this.#lastRemoval = null;
		this.items = undo.items;
		// Les cellules sans nom d'avant : une colonne dont on avait retiré le nom
		// redevient la liste, sans garder une copie de ses cellules dans la grille
		this.cells.clear();
		for (const [address, text] of undo.cells) this.cells.set(address, text);
		this.titles.clear();
		for (const [column, title] of undo.titles) this.titles.set(column, title);
		// Un diagramme remis entre-temps (hors `revision`, Q37) prime sur l'ancien
		for (const [list, chart] of undo.charts) {
			if (!this.charts.has(list)) this.charts.set(list, chart);
		}
		this.recomputeAll();
		return true;
	}

	// ---------------------------------------------------------------------------
	// Repère de la vue Figure
	// ---------------------------------------------------------------------------

	/** Le repère de la vue Figure est-il affiché ? (F3) */
	get figureFrame(): boolean {
		return this.#figureFrame;
	}

	/** Afficher ou masquer le repère de la vue Figure (F3) — sans rien enregistrer. */
	setFigureFrame(shown: boolean): void {
		this.#figureFrame = shown;
	}

	/**
	 * L'unité des mesures d'angle (réglage « Angles », 2026-10-18) : un réglage de
	 * ce navigateur, hors `serialize()`, comme le repère de la vue Figure.
	 */
	#angleUnit = $state<AngleUnit>(DEFAULT_ANGLE_UNIT);

	get angleUnit(): AngleUnit {
		return this.#angleUnit;
	}

	/**
	 * Le mode de la console (exact / décimal), que la carte d'une mesure recopie
	 * pour dire ce que dit Calcul (`valueAnswerOf`, revue de la PR 2). Posé par le
	 * pupitre après chaque saisie ; hors `serialize()`.
	 */
	#calcMode = $state<'exact' | 'decimal'>('exact');

	get calcMode(): 'exact' | 'decimal' {
		return this.#calcMode;
	}

	setCalcMode(mode: 'exact' | 'decimal'): void {
		this.#calcMode = mode;
	}

	/** Changer l'unité des angles recalcule les mesures d'angle (`T = angle(…)`). */
	setAngleUnit(unit: AngleUnit): void {
		if (unit === this.#angleUnit) return;
		this.#angleUnit = unit;
		this.recomputeAll();
	}

	// ---------------------------------------------------------------------------
	// Diagrammes des listes (vue Données)
	// ---------------------------------------------------------------------------

	/** Le diagramme affiché sous cette liste, s'il y en a un. */
	chartOf(name: string): ListChartState | undefined {
		const chart = this.charts.get(name);
		if (chart?.kind === undefined) return chart;
		// Une liste redevenue numérique n'a que des bâtons : un « circulaire »
		// resté collé faisait mentir le bouton (revue)
		const list = this.get(name);
		const qualitative = list !== undefined && isList(list) && list.categories !== undefined;
		return qualitative ? chart : { partner: chart.partner };
	}

	/**
	 * Afficher ou retirer le diagramme d'une liste. Le même geste avec une autre
	 * partenaire remplace le diagramme au lieu de le retirer.
	 *
	 * @returns le diagramme est-il affiché après le geste ?
	 */
	toggleChart(name: string, partner: string | null, kind: ListChartKind = 'barres'): boolean {
		const shown = this.chartOf(name);
		if (shown?.partner === partner && (shown.kind ?? 'barres') === kind) {
			this.charts.delete(name);
			return false;
		}
		// Le genre n'est noté que pour un circulaire : les bâtons gardent leur forme v1
		this.charts.set(name, { partner, ...(kind !== 'barres' && { kind }) });
		return true;
	}

	// ---------------------------------------------------------------------------
	// Grille (vue Données) — tableur intégré, lot 1
	// ---------------------------------------------------------------------------

	/** La colonne de la liste `name`, ou `undefined` si ce n'est pas une liste. */
	columnOf(name: string): number | undefined {
		const object = this.get(name);
		return object !== undefined && isList(object) ? object.column : undefined;
	}

	/** La liste qui occupe cette colonne, s'il y en a une. */
	listAt(column: number): ListObject | undefined {
		return this.items.find((o): o is ListObject => isList(o) && o.column === column);
	}

	/**
	 * Ce que vaut une cellule : rien, un nombre (exact ou approché), un mot, ou
	 * une erreur avec sa phrase. Une formule vaut ce que le moteur a calculé.
	 */
	cellValue(column: number, row: number): CellValue {
		const text = this.cell(column, row);
		if (!isFormula(text)) return plainValue(text);
		return this.#values.get(cellName(column, row)) ?? { kind: 'empty' };
	}

	/**
	 * Le nombre de formules, HORS de la colonne de la liste `name`, qui se
	 * videront si la liste est supprimée (T3, T5) : celles qui citent une de ses
	 * cases remplies, et celles qui en dépendent en chaîne — la confirmation le dit.
	 */
	citingCells(name: string): number {
		const column = this.columnOf(name);
		if (column === undefined) return 0;
		const letter = columnLetter(column);
		const texts = gridTexts(this.#entriesByColumn, this.cells);
		// Les cases de la colonne qui ont aujourd'hui une valeur : elles disparaîtront
		const vanishing = new Set([...texts.keys()].filter((address) => address.startsWith(letter)));
		// Puis, de proche en proche, les formules d'AUTRES colonnes qui en dépendent
		// (C1 = B1, B1 = A1 : les deux se vident) — seulement celles qui ont une
		// valeur aujourd'hui : une formule déjà vide ne change pas (revue)
		const counted = new Set<string>();
		let grew = true;
		while (grew) {
			grew = false;
			for (const [address, text] of texts) {
				if (vanishing.has(address) || address.startsWith(letter)) continue;
				if (!referencesIn(text).some((ref) => vanishing.has(ref))) continue;
				vanishing.add(address);
				const at = readCellName(address);
				if (at !== null && this.cellValue(at.column, at.row).kind !== 'empty') counted.add(address);
				grew = true;
			}
		}
		return counted.size;
	}

	/** Le texte brut d'une cellule (ligne 1 à 200), `''` si elle est vide. */
	cell(column: number, row: number): string {
		const entries = this.#entriesByColumn.get(column);
		if (entries !== undefined) return entries[row - 1] ?? '';
		return this.cells.get(cellName(column, row)) ?? '';
	}

	/** Le titre d'une colonne (T4), `''` sans titre. */
	titleOf(column: number): string {
		return this.titles.get(column) ?? '';
	}

	/** Poser le titre d'une colonne ; vide, le retirer. */
	setTitle(column: number, text: string): { ok: true } | Refused {
		if (!isInGrid(column, 1)) {
			return { ok: false, message: 'Cette colonne est hors de la grille (A à Z).' };
		}
		const title = text.trim();
		if (title.length > MAX_TITLE_LENGTH) {
			return { ok: false, message: `Un titre garde au plus ${MAX_TITLE_LENGTH} caractères.` };
		}
		if (title === this.titleOf(column)) return { ok: true };
		this.#record({ cells: [], titles: [{ column, before: this.titleOf(column), after: title }] });
		if (title === '') this.titles.delete(column);
		else this.titles.set(column, title);
		this.revision++;
		return { ok: true };
	}

	/**
	 * Coller un tableau à partir d'une cellule (§4), tout ou rien. Une première
	 * ligne de mots au-dessus de nombres devient les titres des colonnes (T4).
	 * Un tableau qui déborde de A1-Z200 est refusé ENTIER, avec sa taille :
	 * jamais tronqué en silence (Q3).
	 */
	pasteTable(
		column: number,
		row: number,
		table: readonly (readonly string[])[],
		/**
		 * Copié DANS la grille, depuis cette case : les formules se décalent comme
		 * une recopie (Q-L2-4), et aucune ligne de titres n'est devinée.
		 */
		origin?: { readonly column: number; readonly row: number },
		/** Copié DANS la grille : la mise en forme de chaque case copiée (Q-MF-4). */
		styles?: readonly (readonly CellStyle[])[]
	): { ok: true } | Refused {
		if (origin !== undefined) {
			table = table.map((cells) =>
				cells.map((text) => shiftFormula(text, column - origin.column, row - origin.row))
			);
		}
		const titles = origin === undefined && hasTitleRow(table) ? table[0] : null;
		const body = titles === null ? table : table.slice(1);
		const width = Math.max(titles?.length ?? 0, ...body.map((cells) => cells.length));
		if (width === 0) return { ok: true };
		if (column + width > GRID_COLUMNS) {
			return {
				ok: false,
				message: `${width} colonnes à partir de la colonne ${columnLetter(column)} : la grille s’arrête à la colonne Z. Rien n’a été collé.`
			};
		}
		if (row + body.length - 1 > GRID_ROWS) {
			return {
				ok: false,
				message: `${body.length} lignes à partir de la ligne ${row} : la grille en garde ${GRID_ROWS}. Rien n’a été collé.`
			};
		}
		const single = body.length === 1 && body[0].length === 1 && titles === null;
		// Une case seule avec « ; » se répartit vers le bas, comme tapée (P2). Dans
		// un tableau, une case avec « ; » est refusée : la relire `3,4` en ferait
		// un faux nombre, la répartir écraserait les lignes du dessous (revue)
		// (une formule garde son « ; » : il sépare des arguments, `=max(1 ; A1)`)
		const withSemicolon = single
			? undefined
			: body.flat().find((text) => text.includes(';') && !isFormula(text));
		if (withSemicolon !== undefined) {
			return {
				ok: false,
				message: `La case « ${withSemicolon} » contient un « ; » : sépare les cases par des tabulations (copie depuis un tableur). Rien n’a été collé.`
			};
		}
		// Jamais tronqué en silence (Q3) : un titre trop long refuse le collage
		const longTitle = titles?.find((title) => title.trim().length > MAX_TITLE_LENGTH);
		if (longTitle !== undefined) {
			return {
				ok: false,
				message: `Le titre « ${longTitle.trim().slice(0, 20)}… » dépasse ${MAX_TITLE_LENGTH} caractères. Rien n’a été collé.`
			};
		}
		// Les retours à la ligne d'une case (Excel) deviennent des espaces
		const edits = body.flatMap((cells, i) =>
			cells.map((text, j) => ({
				column: column + j,
				row: row + i,
				text: text.replace(/\s*\n\s*/g, ' ').trim()
			}))
		);
		// La mise en forme copiée suit le collage (Q-MF-4) ; le plafond se juge
		// AVANT d'écrire : tout ou rien (revue)
		const pasted: FormatZone[] = [];
		styles?.forEach((line, i) =>
			line.forEach((style, j) => {
				const target = { left: column + j, right: column + j, top: row + i, bottom: row + i };
				pasted.push({ zone: target, patch: patchOf(style) });
			})
		);
		if (this.#formatsWith(pasted) === null) return { ok: false, message: FORMATS_FULL };
		// Cases, titres, mise en forme : UN geste, qu'une seule annulation défait (T6)
		return this.#grouped(() => {
			const written = this.editCells(edits);
			if (!written.ok) return written;
			titles?.forEach((title, j) => {
				if (title.trim() !== '') this.setTitle(column + j, title);
			});
			return this.#addFormats(pasted);
		});
	}

	/**
	 * Recopier vers le bas (§5) : la première ligne de la zone, sur toutes les
	 * suivantes ; les références relatives se décalent, `$` les fige, une valeur
	 * se recopie telle quelle. Un seul geste (T6), tout ou rien.
	 */
	fillDown(zone: {
		readonly left: number;
		readonly right: number;
		readonly top: number;
		readonly bottom: number;
	}): { ok: true } | Refused {
		if (zone.bottom > GRID_ROWS) {
			return {
				ok: false,
				message: `Recopier jusqu’à la ligne ${zone.bottom} : la grille en garde ${GRID_ROWS}. Rien n’a été recopié.`
			};
		}
		const edits: CellEdit[] = [];
		for (let column = zone.left; column <= zone.right; column++) {
			const source = this.cell(column, zone.top);
			for (let row = zone.top + 1; row <= zone.bottom; row++) {
				edits.push({ column, row, text: shiftFormula(source, 0, row - zone.top) });
			}
		}
		if (edits.length === 0) return { ok: true };
		// La mise en forme de la première ligne suit la recopie (Q-MF-4), dans le même geste
		const styles: FormatZone[] = [];
		for (let column = zone.left; column <= zone.right; column++) {
			const target = { left: column, right: column, top: zone.top + 1, bottom: zone.bottom };
			styles.push({ zone: target, patch: patchOf(this.styleAt(column, zone.top)) });
		}
		// Tout ou rien : le plafond de mise en forme se juge AVANT d'écrire (revue)
		if (this.#formatsWith(styles) === null) return { ok: false, message: FORMATS_FULL };
		return this.#grouped(() => {
			const written = this.editCells(edits);
			if (!written.ok) return written;
			return this.#addFormats(styles);
		});
	}

	// ---------------------------------------------------------------------------
	// Mise en forme (reprise de V4, 2026-10-18)
	// ---------------------------------------------------------------------------

	/** Le style d'une case (`{}` sans mise en forme). */
	styleAt(column: number, row: number): CellStyle {
		return cellStyleAt(this.#formats, column, row);
	}

	/** Les zones de mise en forme, dans l'ordre (lues par la vue et par la fusion). */
	get formats(): readonly FormatZone[] {
		return this.#formats;
	}

	/** Mettre en forme une zone (Q-MF-2) : un geste de la grille, annulable (T6). */
	applyStyle(zone: GridZone, patch: StylePatch): { ok: true } | Refused {
		if (!zoneInGrid(zone)) return { ok: false, message: 'Cette zone sort de la grille.' };
		const refusal = patchRefusal(patch);
		if (refusal !== null) return { ok: false, message: refusal };
		return this.#addFormats([{ zone, patch }]);
	}

	/** « Effacer la mise en forme » de la zone. */
	clearStyle(zone: GridZone): { ok: true } | Refused {
		return this.applyStyle(zone, CLEAR_PATCH);
	}

	/**
	 * Des zones reçues d'un autre atelier (T7, `mergeInto`) : posées comme un geste,
	 * sans contrôle du patch déjà validé au rangement.
	 */
	adoptFormats(formats: readonly FormatZone[]): { ok: true } | Refused {
		return formats.length === 0 ? { ok: true } : this.#addFormats(formats);
	}

	/**
	 * Ajouter des zones, puis ranger la mise en forme sous sa forme CANONIQUE
	 * (`normalizeFormats`) : effacer retire vraiment, un bloc collé redevient un
	 * rectangle, un geste sans effet n'est pas noté (revue de la PR 1).
	 */
	#addFormats(added: readonly FormatZone[]): { ok: true } | Refused {
		const after = this.#formatsWith(added);
		if (after === null) return { ok: false, message: FORMATS_FULL };
		if (sameFormats(after, this.#formats)) return { ok: true };
		this.#record({ cells: [], titles: [], formats: { before: this.#formats, after } });
		this.#setFormats(after);
		return { ok: true };
	}

	/** La mise en forme canonique avec ces zones en plus, ou `null` au-delà du plafond. */
	#formatsWith(added: readonly FormatZone[]): FormatZone[] | null {
		if (added.length === 0) return [...this.#formats];
		const after = normalizeFormats([...this.#formats, ...added]);
		// « Effacer » passe toujours : effacer une case découpe un rectangle et peut
		// dépasser le plafond, et l'élève doit pouvoir s'en sortir (contre-revue)
		if (added.every((zone) => isRemoval(zone.patch))) return after;
		return after.length > MAX_FORMAT_ZONES ? null : after;
	}

	/**
	 * Faire de `run` UN geste de la grille (une seule annulation) : la fusion d'un
	 * atelier reçu écrit cases et mise en forme ensemble (revue).
	 */
	asOneGesture<T>(run: () => T): T {
		return this.#grouped(run);
	}

	#setFormats(formats: readonly FormatZone[]): void {
		this.#formats = formats;
		this.revision++;
	}

	/**
	 * Tabuler une fonction (lot 3) : deux colonnes de formules dans les deux
	 * premières colonnes libres — abscisses `-2`, `=A1+0,5`…, images `=f(A1)`… —
	 * titrées `x` et `f(x)`. Un seul geste (T6), tout ou rien ; jamais
	 * d'écrasement (Q-L3-4 : tabuler deux fois écrit deux nouvelles colonnes).
	 */
	tabulate(request: TabulationRequest):
		| {
				ok: true;
				columns: [number, number];
				rows: number;
				note: string | null;
		  }
		| Refused {
		const object = this.get(request.name);
		const [x = 0, image = 1] = this.freeColumns;
		const letter = object === undefined ? INTERNAL_LETTER : typedLetterOf(this, object);
		const plan = planTabulation(object, request, letter, { x, image });
		if (!plan.ok) return plan;
		if (this.freeColumns.length < 2) {
			return { ok: false, message: 'Il faut deux colonnes libres dans la grille.' };
		}
		const written = this.#grouped(() => {
			const edited = this.editCells(plan.edits);
			if (!edited.ok) return edited;
			this.setTitle(x, plan.titles[0]);
			this.setTitle(image, plan.titles[1]);
			return { ok: true } as const;
		});
		if (!written.ok) return written;
		// La dernière abscisse telle que la case la montre (`12/7`), jamais un flottant
		const last = this.cellValue(x, plan.rows);
		const note =
			plan.shortOf === null || last.kind !== 'number'
				? null
				: `Le pas ne tombe pas juste sur ${plan.shortOf} : le tableau s’arrête à ${last.shown}.`;
		return { ok: true, columns: [x, image], rows: plan.rows, note };
	}

	// ---------------------------------------------------------------------------
	// Annuler dans la grille (T6)
	// ---------------------------------------------------------------------------

	/** Annuler le dernier geste de la grille. Refusé si une de ses cases a changé ailleurs depuis. */
	undoGrid(): { ok: true } | Refused {
		return this.#replay(this.#undo, this.#redo, 'before', 'Rien à annuler dans la grille.');
	}

	/** Rétablir le dernier geste annulé. */
	redoGrid(): { ok: true } | Refused {
		return this.#replay(this.#redo, this.#undo, 'after', 'Rien à rétablir dans la grille.');
	}

	#replay(
		from: GridGesture[],
		to: GridGesture[],
		target: 'before' | 'after',
		nothing: string
	): { ok: true } | Refused {
		const gesture = from.pop();
		if (gesture === undefined) return { ok: false, message: nothing };
		const current = target === 'before' ? 'after' : 'before';
		// Jamais par-dessus un changement venu d'ailleurs (une carte, `L = …`) :
		// l'historique ne décrit plus la grille, il est oublié
		const untouched =
			gesture.cells.every((c) => this.cell(c.column, c.row) === c[current]) &&
			gesture.titles.every((t) => this.titleOf(t.column) === t[current]) &&
			(gesture.seed === undefined || this.#seed === gesture.seed[current]) &&
			(gesture.formats === undefined || this.#formats === gesture.formats[current]);
		if (!untouched) {
			this.#forgetGridHistory();
			return { ok: false, message: GRID_CHANGED_SINCE };
		}
		this.#replaying = true;
		try {
			const written = this.editCells(
				gesture.cells.map((c) => ({ column: c.column, row: c.row, text: c[target] }))
			);
			if (!written.ok) {
				this.#forgetGridHistory();
				return written;
			}
			for (const t of gesture.titles) this.setTitle(t.column, t[target]);
			if (gesture.seed !== undefined) this.#setSeed(gesture.seed[target]);
			if (gesture.formats !== undefined) this.#setFormats(gesture.formats[target]);
		} finally {
			this.#replaying = false;
		}
		to.push(gesture);
		this.#countHistory();
		return { ok: true };
	}

	/** Noter un geste : dans celui en cours de composition, sinon comme un nouveau. */
	#record(part: GridGesture): void {
		const empty =
			part.cells.length === 0 &&
			part.titles.length === 0 &&
			part.seed === undefined &&
			part.formats === undefined;
		if (this.#replaying || empty) return;
		if (this.#gesture !== null) {
			this.#gesture.cells.push(...part.cells);
			this.#gesture.titles.push(...part.titles);
			// Une graine dans un geste composé : la première d'avant, la dernière d'après
			if (part.seed !== undefined) {
				this.#gesture.seed = {
					before: this.#gesture.seed?.before ?? part.seed.before,
					after: part.seed.after
				};
			}
			if (part.formats !== undefined) {
				this.#gesture.formats = {
					before: this.#gesture.formats?.before ?? part.formats.before,
					after: part.formats.after
				};
			}
			return;
		}
		this.#undo.push(part);
		if (this.#undo.length > MAX_GRID_UNDO) this.#undo.shift();
		this.#redo = [];
		this.#countHistory();
	}

	/** Composer un seul geste de tout ce que `run` écrit. */
	#grouped<T>(run: () => T): T {
		if (this.#gesture !== null) return run();
		this.#gesture = { cells: [], titles: [] };
		try {
			return run();
		} finally {
			const gesture = this.#gesture;
			this.#gesture = null;
			this.#record(gesture);
		}
	}

	#forgetGridHistory(): void {
		this.#undo = [];
		this.#redo = [];
		this.#countHistory();
	}

	#countHistory(): void {
		this.gridHistory = { undo: this.#undo.length, redo: this.#redo.length };
	}

	/**
	 * La zone utilisée : colonnes jusqu'à la dernière nommée ou remplie, lignes
	 * jusqu'à la dernière remplie. La vue y ajoute sa marge.
	 */
	get usedExtent(): { readonly columns: number; readonly rows: number } {
		let columns = 0;
		let rows = 0;
		for (const [column, entries] of this.#entriesByColumn) {
			columns = Math.max(columns, column + 1);
			rows = Math.max(rows, entries.length);
		}
		for (const address of this.cells.keys()) {
			const at = readCellName(address);
			if (at === null) continue;
			columns = Math.max(columns, at.column + 1);
			rows = Math.max(rows, at.row);
		}
		return { columns, rows };
	}

	/**
	 * Écrire des cellules, en un seul geste (saisie, collage, effacement). Un
	 * texte avec « ; » se répartit vers le bas (P2). Tout ou rien : une cellule
	 * hors de la grille ou trop longue refuse le geste entier.
	 */
	editCells(edits: readonly CellEdit[]): { ok: true } | Refused {
		// `=a2+1` → `=A2+1` (lot 2) ; une formule n'est jamais répartie (P2)
		const spread = edits.flatMap((edit) =>
			spreadText(edit.row, edit.text).map((piece) => ({
				column: edit.column,
				row: piece.row,
				text: normalizeFormula(piece.text)
			}))
		);
		for (const edit of spread) {
			if (edit.row > GRID_ROWS && Number.isInteger(edit.row)) {
				return {
					ok: false,
					message: `Ces valeurs dépassent la ligne ${GRID_ROWS} : la grille en garde ${GRID_ROWS}.`
				};
			}
			if (!isInGrid(edit.column, edit.row)) {
				return { ok: false, message: 'Cette cellule est hors de la grille (A1 à Z200).' };
			}
			if (edit.text.length > MAX_CELL_LENGTH) {
				return {
					ok: false,
					message: `Une cellule garde au plus ${MAX_CELL_LENGTH} caractères.`
				};
			}
		}

		// Un geste sans effet ne compte pas : il ferait monter `revision`, et
		// « Annuler » une suppression deviendrait impossible (revue)
		// Une case écrite deux fois dans le geste (`1 ; 2` en A1, puis 9 en A2) :
		// la dernière écriture compte, une seule fois (revue de la PR 3a)
		const latest = new Map(spread.map((edit) => [cellName(edit.column, edit.row), edit]));
		const changes = [...latest.values()].filter(
			(edit) => this.cell(edit.column, edit.row) !== edit.text
		);

		// Les colonnes nommées : une réécriture de la liste par colonne touchée,
		// vérifiée AVANT d'écrire quoi que ce soit (tout ou rien)
		const rewritten = new Map<number, string[]>();
		for (const edit of changes) {
			const list = this.listAt(edit.column);
			if (list === undefined) continue;
			const entries = rewritten.get(edit.column) ?? [...entriesOf(list.definition)];
			while (entries.length < edit.row) entries.push('');
			entries[edit.row - 1] = edit.text;
			rewritten.set(edit.column, entries);
		}
		for (const [column, entries] of rewritten) {
			const tooLong = definitionTooLong(column, entries);
			if (tooLong !== null) return { ok: false, message: tooLong };
		}

		this.#record({
			cells: changes.map((edit) => ({
				column: edit.column,
				row: edit.row,
				before: this.cell(edit.column, edit.row),
				after: edit.text
			})),
			titles: []
		});

		let unnamedChanged = false;
		for (const edit of changes) {
			if (this.listAt(edit.column) !== undefined) continue;
			const address = cellName(edit.column, edit.row);
			if (edit.text === '') this.cells.delete(address);
			else this.cells.set(address, edit.text);
			unnamedChanged = true;
		}
		this.#gridWriting = true;
		try {
			for (const [column, entries] of rewritten) {
				this.update(this.listAt(column)!.name, definitionFrom(entries));
			}
		} finally {
			this.#gridWriting = false;
		}
		// Une colonne sans nom ne touche aucun objet : pas de recalcul des objets,
		// mais les formules (lot 2) et la sauvegarde doivent l'entendre
		if (unnamedChanged && rewritten.size === 0) {
			this.#recomputeGrid();
			this.revision++;
		}
		return { ok: true };
	}

	/**
	 * Nommer une colonne : elle devient la liste `name`, avec ses cellules
	 * (phase 0 §1). Les refus de nom sont ceux d'aujourd'hui (`create`).
	 */
	nameColumn(column: number, name: string): Created | Refused {
		if (!isInGrid(column, 1)) {
			return { ok: false, message: 'Cette colonne est hors de la grille (A à Z).' };
		}
		const named = this.listAt(column);
		if (named !== undefined) {
			return {
				ok: false,
				message: `La colonne ${columnLetter(column)} est déjà la liste ${named.name}.`
			};
		}
		// Les cellules passent à la liste : retirées de la grille AVANT la création,
		// sinon la colonne ne serait pas libre ; remises si la création est refusée
		const entries: string[] = [];
		const moved: [string, string][] = [];
		for (let row = 1; row <= GRID_ROWS; row++) {
			const address = cellName(column, row);
			const text = this.cells.get(address);
			if (text === undefined) continue;
			while (entries.length < row - 1) entries.push('');
			entries.push(text);
			moved.push([address, text]);
		}
		// Rangée trop longue, la liste serait écartée au rechargement — avec ses cellules
		const tooLong = definitionTooLong(column, entries);
		if (tooLong !== null) return { ok: false, message: tooLong };
		for (const [address] of moved) this.cells.delete(address);
		const created = this.create({
			kind: 'list',
			name,
			definition: definitionFrom(entries),
			column
		});
		if (!created.ok) for (const [address, text] of moved) this.cells.set(address, text);
		return created;
	}

	/**
	 * Retirer le nom d'une colonne : la liste disparaît (suppression en cascade,
	 * à confirmer par la vue), ses cellules restent dans la grille. Le reçu
	 * s'annule comme toute suppression (`undoRemoval`).
	 */
	unnameColumn(column: number): RemovedWithDependents | Refused {
		const list = this.listAt(column);
		if (list === undefined) {
			return { ok: false, message: `La colonne ${columnLetter(column)} n'a pas de nom.` };
		}
		const entries = entriesOf(list.definition);
		return this.#removeWithDependents(list.name, () => {
			entries.forEach((text, index) => {
				if (text !== '') this.cells.set(cellName(column, index + 1), text);
			});
		});
	}

	/** Ni liste, ni cellule sans nom : une liste peut s'y poser (un titre reste le sien). */
	#holdsNoData(column: number): boolean {
		if (!isInGrid(column, 1) || this.listAt(column) !== undefined) return false;
		for (const address of this.cells.keys()) {
			if (readCellName(address)?.column === column) return false;
		}
		return true;
	}

	/** Libre : ni liste, ni cellule sans nom, ni titre. */
	#isFreeColumn(column: number): boolean {
		return this.#holdsNoData(column) && !this.titles.has(column);
	}

	#firstFreeColumn(): number | undefined {
		for (let column = 0; column < GRID_COLUMNS; column++) {
			if (this.#isFreeColumn(column)) return column;
		}
		return undefined;
	}

	/** Les colonnes libres, de gauche à droite (fusion d'un atelier reçu, T7). */
	get freeColumns(): readonly number[] {
		const free: number[] = [];
		for (let column = 0; column < GRID_COLUMNS; column++) {
			if (this.#isFreeColumn(column)) free.push(column);
		}
		return free;
	}

	// ---------------------------------------------------------------------------
	// Ranger et relire (§5)
	// ---------------------------------------------------------------------------

	/**
	 * Ce qu'il faut ranger pour reconstruire cet atelier.
	 *
	 * ⚠️ **Ne jamais rendre `this.items` directement.** `structuredClone` — et
	 * tout ce qui sérialise en profondeur — jette `DataCloneError` sur un proxy
	 * `$state` ; le projet l'a déjà payé en production (configuration d'école,
	 * 2026-09-02). Ici chaque champ est recopié, donc ce qui sort est fait de
	 * chaînes ordinaires, clonables.
	 *
	 * `$state.snapshot()` serait redondant tant que seules des primitives sont
	 * recopiées — mesuré : le test reste vert sans lui. Il deviendrait nécessaire
	 * le jour où un champ non primitif entrerait ici (un curseur, un tableau de
	 * valeurs). Vérifié par `serialize.svelte.test.ts`, **dans un navigateur** :
	 * en node les proxies ne sont pas les mêmes objets et rien ne jette.
	 *
	 * Statut, message et manquants ne sont PAS rangés : ils se recalculent à la
	 * relecture. Les ranger reviendrait à relire un verdict devenu faux — par
	 * exemple « en attente de `a` » alors que `a` a été défini entre-temps.
	 */
	serialize(): AtelierState {
		const objects: StoredObject[] = this.items.map((o) => ({
			name: o.name,
			kind: o.kind,
			definition: reciprocalOf(o.name) === null ? o.definition : '',
			// Rangé seulement quand il est vrai : un atelier sans courbe tracée ne
			// paie pas ce champ dans l'URL, qui est le mécanisme de partage.
			...(o.plotted ? { plotted: true } : {}),
			// 𝒞f dans la vue Géométrie (K1) : rangé seulement quand c'est vrai, comme `plotted`
			...(isFunction(o) && o.inFigure ? { inFigure: true } : {}),
			// Recopié champ par champ : `display` est un objet, donc un proxy
			// `$state` — tel quel, `structuredClone` jetterait (voir plus haut).
			...(isFunction(o) && o.display ? { display: compactDisplay(o.display) } : {}),
			// La lettre de l'élève (`f(t)`) : absente pour x, qui ne pèse rien
			...(isFunction(o) && o.letter ? { letter: o.letter } : {}),
			// L'ensemble écrit après « sur » : absent sans intervalle. Celui d'une
			// dérivée se relit sur sa fonction (`#inheritIntervals`)
			// Celui d'une réciproque est son ensemble de départ, recalculé (`#reciprocals`)
			...(isFunction(o) &&
			o.interval !== undefined &&
			derivativeOf(o.name) === null &&
			reciprocalOf(o.name) === null
				? { interval: o.interval }
				: {}),
			// La carte `f⁻¹` range l'intervalle TAPÉ, jamais sa formule (elle se recalcule)
			...(isFunction(o) && o.reciprocalOn !== undefined ? { reciprocalOn: o.reciprocalOn } : {}),
			// Seulement s'il a été réglé : un curseur par défaut ne pèse rien dans le lien
			...(isValue(o) && o.slider && !isDefaultSlider(o.slider)
				? { slider: { min: o.slider.min, max: o.slider.max, step: o.slider.step } }
				: {}),
			// Le curseur affiché depuis le menu : seulement quand il l'est (pas de version neuve)
			...(isValue(o) && o.sliderShown ? { sliderShown: true } : {}),
			// Le mode toujours (une récurrence constante ne se devine pas), le rang
			// et le premier terme seulement s'ils diffèrent du défaut
			...(isSequence(o) && o.display ? { sequenceDisplay: plainSequenceDisplay(o.display) } : {}),
			// Point ou courbe de la figure (lot 4b) : absent tant que rien n'est réglé
			...(isFigureObject(o) && o.display ? { figureDisplay: plainFigureDisplay(o.display) } : {}),
			...(isSequence(o)
				? {
						mode: o.mode,
						...(o.firstIndex !== 0 && { firstIndex: o.firstIndex }),
						...(o.firstTerm !== '0' && { firstTerm: o.firstTerm })
					}
				: {}),
			// La colonne d'une liste : ses cellules sont sa définition (tableur, T1)
			...(isList(o) ? { column: columnLetter(o.column) } : {})
		}));
		// Les cellules des colonnes sans nom, absentes quand il n'y en a pas : un
		// atelier sans grille ne paie rien dans le lien
		const cells = Object.fromEntries(
			[...this.cells].map(([address, text]) => [address, storedCellText(text)])
		);
		const titles = Object.fromEntries(
			[...this.titles].map(([column, title]) => [columnLetter(column), title])
		);
		// La graine, seulement s'il y a du hasard : une grille sans ALEA ne paie rien
		const random = [...gridTexts(this.#entriesByColumn, this.cells).values()].some(
			(text) => isFormula(text) && /ALEA/i.test(text)
		);
		const grid = {
			...(this.cells.size > 0 && { cells }),
			...(this.titles.size > 0 && { titles }),
			...(random && { seed: this.#seed }),
			...(this.#formats.length > 0 && { formats: this.#formats.map(storedOf) })
		};
		return {
			version: ATELIER_STATE_VERSION,
			objects,
			...(Object.keys(grid).length > 0 && { grid })
		};
	}

	/**
	 * Remplacer le contenu de l'atelier par un état rangé.
	 *
	 * Les objets refusés sont **écartés un par un** — un seul nom invalide ne
	 * doit pas coûter tout l'atelier — mais ⚠️ **jamais en silence** : le rapport
	 * rendu les nomme avec leur raison. Sans compte, cet atelier est la seule
	 * mémoire de l'élève ; ce qu'on ne sait pas restaurer doit au moins être dit.
	 *
	 * Les états sont recalculés, jamais relus.
	 */
	restore(stored: AtelierState): RestoreReport {
		// Q2 de la géométrie : un objet `y` (nom réservé depuis) est renommé, et
		// les définitions qui le citent suivent — l'appelant le dit à l'élève
		const { state, renamed } = migrateReservedNames(stored);
		this.#seed = state.grid?.seed ?? newGridSeed();
		const read = restoredFormats(state.grid?.formats ?? []);
		this.#formats = read.formats;
		this.items = [];
		this.charts.clear();
		this.#figureFrame = true;
		this.cells.clear();
		this.titles.clear();
		this.#forgetGridHistory();
		this.#laws.clear();
		const skipped: SkippedObject[] = [];
		// Une mise en forme trop riche (lien forgé ou ancien) : la plus longue partie
		// qui tient, et on le dit (contre-revue : elle disparaissait en silence)
		if (read.lost) {
			skipped.push({
				name: 'une partie de la mise en forme',
				reason: `Au-delà de ${MAX_FORMAT_ZONES} zones de mise en forme.`
			});
		}

		// Les titres d'abord : ils appartiennent à leur colonne, nommée ou non
		for (const [letter, title] of Object.entries(state.grid?.titles ?? {})) {
			const column = columnOfLetter(letter);
			if (column !== null) this.titles.set(column, title);
		}

		// Les cellules sans nom AVANT les listes, hors des colonnes qu'une liste
		// réclame : une liste rangée sans colonne (version 1) prend alors une
		// colonne vraiment libre, et une cellule posée sur la colonne d'une liste
		// (état abîmé) n'a pas de propriétaire possible — la liste gagne
		const claimed = new Set(
			state.objects.flatMap((o) =>
				o.kind === 'list' && o.column !== undefined ? [columnOfLetter(o.column)] : []
			)
		);
		for (const [address, text] of Object.entries(state.grid?.cells ?? {})) {
			const at = readCellName(address);
			if (at !== null && !claimed.has(at.column)) this.cells.set(address, cellTextFromStored(text));
		}

		for (const stored of state.objects) {
			const input: CreateInput = {
				kind: stored.kind,
				name: stored.name,
				definition: stored.definition,
				...(stored.kind === 'function' && stored.letter && { letter: stored.letter }),
				...(stored.kind === 'function' && stored.interval && { interval: stored.interval }),
				...(stored.kind === 'function' &&
					stored.reciprocalOn && { reciprocalOn: stored.reciprocalOn }),
				...(stored.kind === 'sequence' && { sequence: sequenceInputOf(stored) }),
				// Version 1 : sans colonne, la liste prend la première libre (ordre des cartes)
				...(stored.kind === 'list' &&
					stored.column !== undefined && { column: columnOfLetter(stored.column) ?? undefined })
			};
			let attempt = input;
			let result = this.create(attempt);
			// Un ensemble refusé (lien abîmé, domaine changé) : la fonction est gardée
			// sur son domaine — perdre f pour son intervalle serait disproportionné
			if (!result.ok && attempt.interval !== undefined) {
				attempt = { ...attempt, interval: undefined };
				result = this.create(attempt);
			}
			// Une lettre refusée (`e`, `n`, le nom de la fonction) : la fonction est
			// gardée en x — sa définition rangée l'est déjà (`persistence.ts`). Les
			// relances s'ENCHAÎNENT : ensemble et lettre refusés, f reste (revue)
			if (!result.ok && attempt.letter !== undefined) {
				attempt = { ...attempt, letter: undefined };
				result = this.create(attempt);
			}
			if (!result.ok) {
				skipped.push({ name: stored.name, reason: result.message });
				continue;
			}
			// Les réglages AVANT le tracé : sinon `setPlotted` attribuerait une
			// couleur neuve à une courbe qui avait déjà la sienne.
			if (stored.display) this.adoptDisplay(stored.name, stored.display);
			if (stored.sequenceDisplay) this.adoptSequenceDisplay(stored.name, stored.sequenceDisplay);
			if (stored.figureDisplay) this.adoptFigureDisplay(stored.name, stored.figureDisplay);
			if (stored.slider) this.adoptSlider(stored.name, stored.slider);
			if (stored.sliderShown) this.setSliderShown(stored.name, true);
			if (stored.plotted) this.setPlotted(stored.name, true);
			if (stored.inFigure) this.setInFigure(stored.name, true);
		}

		this.recomputeAll();
		return { restored: this.items.length, skipped, renamed };
	}

	/**
	 * Afficher — ou retirer — la courbe de cette fonction dans la vue Géométrie
	 * (géométrie v2, K1). Comme `setPlotted`, le modèle ne juge pas : une
	 * fonction en attente peut être marquée, la vue ne dessine que ce qui est `ok`.
	 * Rien pour un autre type d'objet.
	 */
	setInFigure(name: string, shown: boolean): void {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return;
		const current = this.items[index];
		if (!isFunction(current) || (current.inFigure === true) === shown) return;
		this.items[index] = { ...current, inFigure: shown };
		this.recomputeAll();
	}

	/**
	 * Afficher — ou retirer — cet objet de la vue Graphe.
	 *
	 * Le modèle ne juge pas : marquer un objet en attente est permis, c'est la
	 * vue qui décide de ce qu'elle sait dessiner. Sinon l'élève cliquerait
	 * « Tracer » sans rien voir se passer, une fois de plus.
	 */
	setPlotted(name: string, plotted: boolean, withList?: string): void {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return;
		// Un point, une courbe ne vont jamais dans Graphe (G0) : la vue Figure les montrera
		if (isFigureObject(this.items[index])) return;
		// `plottedWith` ne vaut que pour une liste ; posé ici pour que la
		// synchronisation n'ait rien à redeviner.
		const current = this.items[index];
		// Une fonction reçoit ses réglages à son PREMIER tracé, et les garde
		// ensuite, retirée ou non (phase 0 `/grapheur` §1 L1).
		const display =
			plotted && isFunction(current) && current.display === undefined
				? this.#firstDisplay(name)
				: plotted && isSequence(current) && current.display === undefined
					? newSequenceDisplay(this.#displays())
					: undefined;
		this.items[index] = {
			...current,
			plotted,
			...(withList !== undefined && { plottedWith: withList }),
			...(display && { display })
		} as AtelierObject;
		// `f′` tracée avant `f` s'aligne sur la couleur que `f` reçoit ici
		if (display !== undefined && isFunction(current)) {
			this.#recolorDerivatives(name, display.color);
		}
		this.recomputeAll();
	}

	/**
	 * Modifier les réglages d'affichage d'une fonction (couleur, tangente, aire…).
	 *
	 * Le patch est validé ici et non par l'appelant : la carte, une relecture et
	 * un lien passent tous par cette porte, et doivent obéir à la même règle.
	 * Une fonction jamais tracée reçoit d'abord les réglages d'une courbe neuve.
	 */
	setDisplay(name: string, patch: Partial<CurveDisplay>): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return { ok: false, message: `« ${name} » n'existe pas.` };
		const current = this.items[index];
		if (!isFunction(current)) {
			return { ok: false, message: 'Seule une fonction a des réglages de courbe.' };
		}
		const read = readDisplayPatch(patch);
		if (!read.ok) return { ok: false, message: read.message };
		// Rien à changer, rien à sauvegarder
		if (Object.keys(read.patch).length === 0) return { ok: true };

		const base = current.display ?? this.#firstDisplay(name);
		const display = { ...base, ...read.patch };
		this.items[index] = { ...current, display };
		// Ses dérivées suivent sa couleur (décision de David, 2026-10-05) — y
		// compris quand `f` reçoit ici ses premiers réglages. Les relectures
		// (`restore`, `mergeInto`) posent par `adoptDisplay` et ne passent pas ici
		if (current.display?.color !== display.color) this.#recolorDerivatives(name, display.color);
		// ⚠️ Pas de `recomputeAll` : un réglage ne change aucun statut, et le
		// curseur de la tangente en enverrait un par mouvement. Seul le compteur
		// bouge — c'est lui que la sauvegarde et le tracé écoutent.
		this.revision++;
		return { ok: true };
	}

	/**
	 * Afficher — ou cacher — le curseur d'une valeur qui n'est pas un paramètre
	 * (Affichage → Curseur, lot 4a). Retenu avec l'atelier (décision de David du
	 * 2026-10-18). Refusé pour une valeur sans curseur (grandeur, mesure).
	 */
	setSliderShown(name: string, shown: boolean): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isValue(current) || current.slider === undefined) {
			return { ok: false, message: `« ${name} » n'a pas de curseur.` };
		}
		if ((current.sliderShown === true) === shown) return { ok: true };
		const { sliderShown: _, ...rest } = current;
		this.items[index] = shown ? { ...rest, sliderShown: true } : rest;
		// Un affichage : aucun statut ne change, seul le compteur (la sauvegarde l'écoute)
		this.revision++;
		return { ok: true };
	}

	/** Poser un curseur relu (sauvegarde, lien) sans recalcul. */
	adoptSlider(name: string, slider: Slider): void {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isValue(current) || current.slider === undefined) return;
		// ⚠️ Validé ICI, et pas seulement par le schéma de relecture : `restore` et
		// `mergeInto` reçoivent aussi des états qui n'y sont pas passés. Un curseur
		// incohérent est oublié, le défaut reste (revue du lot 4, A3)
		const read = sliderPatchSchema.required().safeParse(slider);
		if (!read.success || read.data.min >= read.data.max) return;
		if (read.data.step > read.data.max - read.data.min) return;
		this.items[index] = {
			...current,
			slider: widenedSlider(
				read.data,
				constantOf(current.definition, current.provenance, this.functionNames)
			)
		};
	}

	/**
	 * Poser des réglages relus (sauvegarde, lien) sans recalcul : l'appelant
	 * recalcule une fois à la fin.
	 */
	adoptDisplay(name: string, stored: StoredDisplay): void {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isFunction(current)) return;
		this.items[index] = { ...current, display: fullDisplay(stored) };
	}

	/**
	 * Les réglages d'une fonction à son premier tracé. Une dérivée prend la
	 * couleur de sa fonction, et un trait qui dit son ordre (comme la case
	 * « f′ » de l'ancien grapheur) : `f′` en tirets, `f″` en pointillés.
	 */
	#firstDisplay(name: string): CurveDisplay {
		const fresh = newDisplay(this.#displays());
		const derivative = derivativeOf(name);
		if (derivative === null) return fresh;
		const lineStyle = DERIVATIVE_LINE_STYLES[derivative.order - 1] ?? 'dashed';
		const base = this.get(derivative.base);
		const color = base !== undefined && isFunction(base) ? base.display?.color : undefined;
		return { ...fresh, lineStyle, ...(color !== undefined && { color }) };
	}

	/** Donner à toutes les dérivées déjà tracées de `name` sa nouvelle couleur. */
	#recolorDerivatives(name: string, color: CurveDisplay['color']): void {
		this.items = this.items.map((o) =>
			isFunction(o) && o.display !== undefined && derivativeOf(o.name)?.base === name
				? { ...o, display: { ...o.display, color } }
				: o
		);
	}

	/** Les couples couleur/style déjà pris (fonctions et suites) — pour ne pas les doubler. */
	#displays(): Pick<CurveDisplay, 'color' | 'lineStyle'>[] {
		return this.items.flatMap((o) =>
			(isFunction(o) || isSequence(o)) && o.display ? [o.display] : []
		);
	}

	/**
	 * Régler le tracé d'une suite (U2) : couleur, style, nuage ou escalier.
	 *
	 * L'escalier est refusé, avec sa raison, sur une suite explicite ou une
	 * récurrence qui dépend de n : il porte uₙ₊₁ en fonction de uₙ, et rien
	 * d'autre — c'est la règle du grapheur.
	 */
	setSequenceDisplay(name: string, patch: Partial<SequenceDisplay>): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isSequence(current)) {
			return { ok: false, message: `« ${name} » n'est pas une suite.` };
		}
		const read = readSequenceDisplayPatch(patch);
		if (!read.ok) return { ok: false, message: read.message };
		if (read.patch.representation === 'cobweb') {
			const reason = cobwebRefusal(current, this.functionNames);
			if (reason !== null) return { ok: false, message: reason };
		}
		if (Object.keys(read.patch).length === 0) return { ok: true };
		const base = current.display ?? newSequenceDisplay(this.#displays());
		this.items[index] = { ...current, display: { ...base, ...read.patch } };
		this.revision++;
		return { ok: true };
	}

	/** Poser un réglage de suite relu (sauvegarde, lien), validé. */
	adoptSequenceDisplay(name: string, stored: unknown): void {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isSequence(current)) return;
		const read = sequenceDisplaySchema.safeParse(stored);
		if (!read.success) return;
		this.items[index] = { ...current, display: read.data };
	}

	/**
	 * Régler le dessin d'un point (couleur, taille, étiquette) ou d'une courbe de
	 * la figure (couleur, trait) — lot 4b de la refonte.
	 *
	 * Même porte que `setDisplay` : le patch est validé ici, un réglage qui n'est
	 * pas celui de l'objet est refusé. Le premier réglage part de ce qui est
	 * DESSINÉ (taille moyenne, trait continu, couleur par défaut de la figure) :
	 * régler la taille seule ne repeint pas le point. Un réglage qui ne change
	 * rien (la taille déjà active) n'enregistre rien. La vue Géométrie le lit par
	 * `syncFigure`.
	 */
	setFigureDisplay(
		name: string,
		patch: Partial<PointDisplay> | Partial<StrokeDisplay>
	): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isFigureObject(current)) {
			return { ok: false, message: `« ${name} » n'est ni un point ni une courbe.` };
		}
		const read = readFigureDisplayPatch(current.kind, patch);
		if (!read.ok) return { ok: false, message: read.message };
		if (Object.keys(read.patch).length === 0) return { ok: true };
		if (isPoint(current)) {
			const base = current.display ?? newPointDisplay();
			const next = { ...base, ...read.patch } as PointDisplay;
			if (sameFigureDisplay(base, next)) return { ok: true };
			this.items[index] = { ...current, display: next };
		} else {
			const base = current.display ?? newStrokeDisplay();
			const next = { ...base, ...read.patch } as StrokeDisplay;
			if (sameFigureDisplay(base, next)) return { ok: true };
			this.items[index] = { ...current, display: next };
		}
		// Comme `setDisplay` : un réglage ne change aucun statut, seul le compteur bouge
		this.revision++;
		return { ok: true };
	}

	/** Poser un réglage de point ou de courbe relu (sauvegarde, lien), validé : abîmé, oublié. */
	adoptFigureDisplay(name: string, stored: unknown): void {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined) return;
		if (isPoint(current)) {
			const read = pointDisplaySchema.safeParse(stored);
			if (read.success) this.items[index] = { ...current, display: read.data };
		} else if (isCurve(current)) {
			// `.strict()` : le réglage d'un point posé sur une courbe n'est pas le sien
			const read = strokeDisplaySchema.strict().safeParse(stored);
			if (read.success) this.items[index] = { ...current, display: read.data };
		}
	}

	/** Les objets dont la définition cite `name`, directement. */
	dependents(name: string): readonly string[] {
		return this.items
			.filter((o) => o.name !== name && this.#refsOf(o).some((ref) => ref.name === name))
			.map((o) => o.name);
	}

	/**
	 * Tout ce qu'un objet cite : sa définition, ET le premier terme d'une
	 * récurrence quand c'est le nom d'une valeur (`u₀ = a`, décision S1) — sans
	 * quoi supprimer `a` laisserait la suite « ok » et muette.
	 */
	#refsOf(o: AtelierObject): MissingReference[] {
		// La carte `f⁻¹` dépend de f, et de rien d'autre : ses lettres (`(x − b)/a`)
		// sont celles que f cite déjà. Supprimer f l'emporte (#828)
		const base = reciprocalOf(o.name);
		if (base !== null) return [{ name: base, as: 'function' }];
		const refs = [...this.#cited(o.kind, o.definition, o.provenance)];
		if (isSequence(o) && o.mode === 'recurrence' && hasObjectNameShape(o.firstTerm)) {
			if (!refs.some((r) => r.name === o.firstTerm)) refs.push({ name: o.firstTerm, as: 'value' });
		}
		return refs;
	}

	/** La définition cite-t-elle la suite elle-même (`u_n`, `u(n)`) ? */
	#citesItself(name: string, definition: string, provenance: Provenance): boolean {
		return this.#cited('sequence', definition, provenance).some((r) => r.name === name);
	}

	/**
	 * Régler le mode, le rang du premier terme et le premier terme d'une suite
	 * (phase 0 `/grapheur` §5 U1, décisions S1 à S4).
	 *
	 * Le premier terme est un nombre ou le nom d'une valeur ; une valeur absente
	 * met la suite en attente, comme tout nom manquant.
	 */
	setSequence(
		name: string,
		patch: Partial<Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'>>
	): { ok: true } | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		const current = this.items[index];
		if (current === undefined || !isSequence(current)) {
			return { ok: false, message: `« ${name} » n'est pas une suite.` };
		}
		const read = sequencePatchSchema.safeParse(patch);
		if (!read.success) {
			return {
				ok: false,
				message:
					'Le rang doit être un entier positif, le premier terme un nombre ou le nom d’une valeur.'
			};
		}
		const next = { ...current, ...read.data };
		if (next.firstTerm === name) {
			return {
				ok: false,
				message: `Le premier terme de « ${name} » ne peut pas être la suite elle-même.`
			};
		}
		if (
			next.mode === 'explicit' &&
			this.#citesItself(name, next.definition, next.provenance ?? 'url')
		) {
			return {
				ok: false,
				message: `« ${name} » se cite elle-même : c'est une récurrence, pas une suite explicite.`
			};
		}
		this.items[index] = next;
		this.#dropImpossibleCobweb(index);
		this.recomputeAll();
		return { ok: true };
	}

	/**
	 * Une suite en escalier qui ne peut plus l'être — passée en explicite, ou
	 * récurrence qui dépend désormais de n — revient au nuage (revue de #1501 :
	 * le menu ne cochait plus rien, les marches restaient affichées, et le graphe
	 * dessinait un nuage). Même règle que le refus de `setSequenceDisplay`.
	 */
	#dropImpossibleCobweb(index: number): void {
		const current = this.items[index];
		if (!isSequence(current) || current.display?.representation !== 'cobweb') return;
		if (cobwebRefusal(current, this.functionNames) === null) return;
		this.items[index] = { ...current, display: { ...current.display, representation: 'ranks' } };
	}

	/**
	 * Accepter l'offre de curseur portée par un objet en attente (§2.5 N4).
	 *
	 * Refusée si personne n'attend ce nom comme valeur : une offre ne se
	 * fabrique pas, elle se saisit.
	 */
	createFromOffer(name: string): Created | Refused {
		const offered = this.items.some((o) =>
			(o.missing ?? []).some((m) => m.name === name && m.as === 'value')
		);
		if (!offered) {
			return { ok: false, message: `Aucun objet n'attend « ${name} ».` };
		}
		return this.create({ kind: 'value', name, definition: OFFER_DEFINITION });
	}

	// ---------------------------------------------------------------------------
	// Interne
	// ---------------------------------------------------------------------------

	/**
	 * Construire un objet à partir de sa définition.
	 *
	 * Le statut posé ici est provisoire : `recomputeAll`, toujours appelé
	 * ensuite, tranche entre les quatre états en tenant compte de tout
	 * l'atelier — erreurs, cycles, attentes propagées.
	 */
	private build(
		name: string,
		kind: ObjectKind,
		definition: string,
		provenance: Provenance = 'url',
		letter?: string,
		interval?: string,
		/** Pour une liste : sa colonne, déjà choisie par l'appelant (`create`, `update`). */
		column?: number
	): AtelierObject {
		const parsed = parseDefinition(kind, definition, provenance, this.functionNames);
		const base = {
			name,
			definition,
			provenance,
			status: (definition.trim() === '' ? 'incomplete' : 'ok') as ObjectStatus
		};

		switch (kind) {
			case 'list':
				return {
					...base,
					kind: 'list',
					column: column ?? 0,
					values: parsed.values ?? [],
					skipped: parsed.skipped ?? 0,
					rows: parsed.rows ?? [],
					...(parsed.categories && { categories: parsed.categories }),
					...(parsed.qualitativeBecause !== undefined && {
						qualitativeBecause: parsed.qualitativeBecause
					})
				} satisfies ListObject;
			case 'value': {
				// Décision D4 : une grandeur n'est pas pilotable par un curseur.
				const value: ValueObject = {
					...base,
					kind: 'value',
					// Une MESURE (`aire(A, B, C)`, `AM`, lot 2) n'a pas de curseur non plus : elle
					// suit ses points (critère convenu avec la refonte : `slider` absent)
					...(parsed.unit
						? { unit: parsed.unit }
						: this.#citesMeasure(definition, provenance)
							? {}
							: {
									slider: widenedSlider(
										DEFAULT_SLIDER,
										constantOf(definition, provenance, this.functionNames)
									)
								})
				};
				return value;
			}
			case 'function':
				return {
					...base,
					kind: 'function',
					variable: 'x',
					...(letter !== undefined && letter !== INTERNAL_LETTER && { letter }),
					...(interval !== undefined && { interval })
				};
			case 'sequence':
				// S4 : une définition qui se cite elle-même est une récurrence
				return {
					...base,
					kind: 'sequence',
					variable: 'n',
					mode: this.#citesItself(name, definition, provenance) ? 'recurrence' : 'explicit',
					firstIndex: 0,
					firstTerm: '0'
				} satisfies SequenceObject;
			// Géométrie (v2) : rien de plus que la définition, lue par `parseDefinition`
			case 'point':
				return { ...base, kind: 'point' };
			case 'curve':
				return { ...base, kind: 'curve' };
		}
	}

	/**
	 * Tous les objets qui dépendent de `name`, directement ou non.
	 *
	 * Le parcours marque ce qu'il a vu : une définition circulaire ne le fait
	 * pas boucler.
	 */
	private allDependents(name: string): string[] {
		const seen = new Set<string>();
		const queue = [name];
		while (queue.length > 0) {
			const current = queue.shift()!;
			for (const dependent of this.dependents(current)) {
				if (seen.has(dependent)) continue;
				seen.add(dependent);
				queue.push(dependent);
			}
		}
		return [...seen];
	}

	/**
	 * Recalculer l'état de tout l'atelier.
	 *
	 * Quatre états, dans leur ordre de priorité (décision D9) :
	 * `error` > `pending` > `incomplete` > `ok`. Une définition qu'on ne sait
	 * pas lire ne peut rien promettre, donc l'erreur prime sur l'attente.
	 */
	private recomputeAll(): void {
		this.#overFigureCap.clear();
		this.#shortcutKinds();
		const living = new Set(this.names);
		// Un objet encore vide ne peut rien fournir à ceux qui le citent : ils
		// l'attendent, exactement comme un nom absent. Sans ça, « g = f(x)+1 »
		// s'affichait « ok » pendant que `f` était vide — rien ne se traçait, et
		// rien ne l'expliquait : le silence même que D9 supprime.
		const empty = new Set(this.items.filter((o) => o.definition.trim() === '').map((o) => o.name));
		const usable = (name: string) => living.has(name) && !empty.has(name);

		const ownError = new Map<string, string | undefined>();
		const deps = new Map<string, string[]>();
		// Décision d : l'ensemble hérité des fonctions citées (`g(x) = f(x) + 1`)
		const intervals = citedIntervals(this.items, this.functionNames, (text, others) =>
			citedReciprocalInterval(this, text, INTERNAL_LETTER, others)
		);
		const missing = new Map<string, MissingReference[]>();
		// V58 : les objets dont la LIGNE est fautive (illisible, circulaire, une
		// fonction citée comme un nombre) — pas ceux qui suivent un autre objet
		const miswritten = new Set<string>();

		for (const o of this.items) {
			// La provenance de l'objet, pas un défaut : sinon une définition LaTeX
			// serait relue en texte à chaque recalcul.
			const unreadable = parseDefinition(
				o.kind,
				o.definition,
				o.provenance,
				this.functionNames
			).error;
			ownError.set(o.name, unreadable);
			if (!unreadable && this.#overFigureCap.has(o.name)) {
				ownError.set(o.name, figureFullMessage(MAX_FIGURE_OBJECTS));
				miswritten.add(o.name);
			}
			if (unreadable) miswritten.add(o.name);

			// Une suite qui se cite elle-même est une récurrence, pas un cycle :
			// `u(n+1) = 0,5·u(n) + 3` est une définition parfaitement saine.
			const refs = this.#refsOf(o).filter((r) => !(r.name === o.name && o.kind === 'sequence'));
			// Une construction NOMME des points et des droites : seuls ses nombres
			// se contrôlent comme un calcul (P9, #985) ; ses noms, par leur type (L8)
			const construction = this.#constructionSpec(o.kind, o.definition, o.provenance);
			const asNumbers =
				construction === null
					? this.#numberRefs(o, refs)
					: partsOf(construction).scalars.flatMap((scalar) =>
							referencesOf(
								withoutMeasures(scalar, 'text', this.#isPoint),
								'text',
								this.functionNames
							)
						);
			if (!ownError.get(o.name) && construction !== null) {
				const typed = specOf(o.definition, o.provenance ?? 'url', kindsOf(this));
				if (typed !== null && !typed.ok) {
					ownError.set(o.name, typed.message);
					miswritten.add(o.name);
				}
			}
			// Une liste citée comme un nombre (`a = L + 1`) : le refus de Calcul
			// (#985), jamais L lu comme une lettre libre
			if (!ownError.get(o.name)) {
				const cited = listCitedMessage(
					this.items,
					asNumbers.map((r) => r.name)
				);
				if (cited !== null) ownError.set(o.name, cited);
			}
			// Un point ou une courbe cité dans un calcul (`a = A + 1`) : le refus de
			// Calcul (P9), jamais A lu comme une lettre libre
			if (!ownError.get(o.name)) {
				const figure = figureCitedMessage(
					this.items,
					asNumbers.map((r) => r.name)
				);
				if (figure !== null) {
					ownError.set(o.name, figure);
					miswritten.add(o.name);
				}
			}
			// V58 : `a` lettre de f, puis `a(x) = x^2` — quel que soit l'ordre de
			// saisie, f ne vaut rien. Les cartes `f′`, `f⁻¹` suivent f, elles ne
			// citent rien de leur propre chef
			if (
				!ownError.get(o.name) &&
				o.kind !== 'list' &&
				derivativeOf(o.name) === null &&
				reciprocalOf(o.name) === null
			) {
				const asNumber = this.#bareNamesOf(o)
					.filter((n) => n !== o.name)
					.map((n) => this.get(n))
					.find((c) => c !== undefined && (c.kind === 'function' || c.kind === 'sequence'));
				if (asNumber !== undefined) {
					ownError.set(o.name, functionAsNumberMessage(asNumber, o));
					miswritten.add(o.name);
				}
			}
			// `g(x) = f(2x)` avec f sur un intervalle : pas encore su (décision c)
			if (!ownError.get(o.name) && intervals.refused.has(o.name)) {
				ownError.set(o.name, intervals.refused.get(o.name));
			}
			deps.set(
				o.name,
				refs.filter((r) => usable(r.name)).map((r) => r.name)
			);
			missing.set(
				o.name,
				refs.filter((r) => !usable(r.name))
			);
		}

		// Cycles : un parcours qui marque ce qu'il a vu ne boucle jamais.
		const visitState = new Map<string, 'visiting' | 'done'>();
		const inCycle = new Set<string>();
		const visit = (node: string, path: string[]): void => {
			if (visitState.get(node) === 'done') return;
			if (visitState.get(node) === 'visiting') {
				for (const n of path.slice(path.indexOf(node))) inCycle.add(n);
				return;
			}
			visitState.set(node, 'visiting');
			for (const next of deps.get(node) ?? []) visit(next, [...path, next]);
			visitState.set(node, 'done');
		};
		for (const name of this.names) visit(name, [name]);
		for (const name of inCycle) miswritten.add(name);
		this.#miswritten = miswritten;

		// Propagation, par points fixes. L'erreur se propage la première : elle
		// prime, donc un objet contaminé par une erreur n'est jamais « en attente ».
		const failing = new Set<string>();
		for (const [name, error] of ownError) if (error) failing.add(name);
		for (const name of inCycle) failing.add(name);
		this.spread((name) => (deps.get(name) ?? []).some((d) => failing.has(d)), failing);

		const waiting = new Map<string, MissingReference[]>();
		for (const o of this.items) {
			if (failing.has(o.name)) continue;
			const own = missing.get(o.name) ?? [];
			if (own.length > 0) waiting.set(o.name, [...own]);
		}
		// Dépendre d'un objet en attente, c'est attendre la même chose que lui.
		let changed = true;
		while (changed) {
			changed = false;
			for (const o of this.items) {
				if (failing.has(o.name)) continue;
				const inherited = (deps.get(o.name) ?? []).flatMap((d) => waiting.get(d) ?? []);
				if (inherited.length === 0) continue;
				const current = waiting.get(o.name) ?? [];
				const merged = [...current];
				for (const ref of inherited) {
					if (!merged.some((m) => m.name === ref.name)) merged.push(ref);
				}
				if (merged.length !== current.length) {
					waiting.set(o.name, merged);
					changed = true;
				}
			}
		}

		// Une passe de recalcul = une modification de l'atelier. C'est le passage
		// obligé de toute mutation, donc le seul endroit où compter.
		this.revision++;

		this.items = this.items.map((o) => {
			// `{ ...o }` conserve `plotted` : c'est un état d'affichage, il ne se
			// recalcule pas.
			const next = { ...o } as AtelierObject & {
				status: AtelierObject['status'];
				message?: string;
				missing?: readonly MissingReference[];
			};
			delete next.message;
			delete next.missing;

			const own = ownError.get(o.name);
			if (own) {
				next.status = 'error';
				next.message = own;
			} else if (inCycle.has(o.name)) {
				next.status = 'error';
				next.message = CIRCULAR;
			} else if (failing.has(o.name)) {
				next.status = 'error';
				next.message = brokenMessage((deps.get(o.name) ?? []).filter((d) => failing.has(d)));
			} else if (waiting.has(o.name)) {
				const refs = waiting.get(o.name)!;
				next.status = 'pending';
				next.message = pendingMessage(refs);
				next.missing = refs;
			} else if (o.definition.trim() === '') {
				next.status = 'incomplete';
			} else {
				next.status = 'ok';
			}
			return next;
		});

		this.#inheritIntervals(intervals.inherited);
		this.#constructions();
		this.#measures();
		this.#geometryWaits(deps);
		this.#quantityChecks(deps);
		this.#underivable();
		this.#sequenceChecks();
		this.#reciprocals();
		this.#recomputeGrid();
	}

	/**
	 * `(AB)` seul : une droite entre deux points, un produit entre deux valeurs —
	 * le TYPE de A et B tranche (décision de David, 2026-10-18, option a), et il
	 * peut changer après coup (`(AB)` tapé avant A et B, A supprimé puis recréé en
	 * valeur). L'objet suit : courbe pour deux points, ou un point et une valeur
	 * (la construction dit alors pourquoi elle refuse) ; valeur pour deux valeurs.
	 * Un nom encore absent ne tranche rien : l'objet garde son type et attend.
	 */
	#shortcutKinds(): void {
		this.items.forEach((o, i) => {
			if (o.kind !== 'curve' && o.kind !== 'value') return;
			const read = readConstruction(o.definition, o.provenance ?? 'url');
			if (read === null || !read.ok) return;
			const pair = bareLineShortcut(read.call);
			if (pair === null) return;
			const kinds = pair.map((name) => this.get(name)?.kind);
			if (kinds.some((kind) => kind === undefined)) return;
			const wanted = kinds.every((kind) => kind === 'value')
				? 'value'
				: kinds.every((kind) => kind === 'point' || kind === 'value')
					? 'curve'
					: o.kind;
			if (wanted === o.kind) return;
			// M2 : devenue droite, elle compte parmi les 50 objets de la figure (revue
			// de la PR 1). Au-delà, elle reste une valeur, en erreur avec le plafond
			if (wanted === 'curve' && this.items.filter(isFigureObject).length >= MAX_FIGURE_OBJECTS) {
				this.#overFigureCap.add(o.name);
				return;
			}
			this.items[i] = this.build(o.name, wanted, o.definition, o.provenance);
		});
	}

	/** Les valeurs qui SONT une grandeur d'angle, pour la révision courante. */
	#angles: { readonly revision: number; readonly names: ReadonlySet<string> } | null = null;

	/**
	 * Les valeurs qui SONT une grandeur d'angle (`T = angle(…)`, `2T`) — pas celles
	 * qui la prennent dans un cos, un sin, une tan (revue de la PR 2).
	 */
	angleQuantities(): ReadonlySet<string> {
		if (this.#angles !== null && this.#angles.revision === this.revision) return this.#angles.names;
		const names = new Set<string>();
		for (const o of this.items) {
			if (!isValue(o) || o.status !== 'ok') continue;
			const read = substitutedAstOf(this, o.name);
			if (read.ok && hasBareAngle(read.ast)) names.add(o.name);
		}
		this.#angles = { revision: this.revision, names };
		return names;
	}

	/** Les valeurs `(AB)` restées valeurs faute de place dans la figure (M2). */
	#overFigureCap = new Set<string>();

	/** Les mesures relues pour la révision courante (`readableDefinition`). */
	#measureMemo: { readonly revision: number; readonly byName: Map<string, MeasuredText> } | null =
		null;
	/** Les objets dont on calcule les mesures : un objet qui s'y cite lui-même n'y entre pas. */
	#measuring = new Set<string>();

	/** Le nom est-il celui d'un point de l'atelier ? */
	#isPoint = (name: string): boolean => this.get(name)?.kind === 'point';

	/** La définition cite-t-elle une mesure (appel, ou `AM` de deux points) ? */
	#citesMeasure(definition: string, provenance: Provenance | undefined): boolean {
		return citesMeasure(definition, provenance ?? 'url', this.#isPoint);
	}

	/**
	 * Les noms qu'un objet cite comme des NOMBRES (le refus P9 d'un point) : ceux
	 * d'une mesure n'en sont pas — `S = AM`, `aire(A, M, N)` citent des points.
	 */
	#numberRefs(o: AtelierObject, refs: MissingReference[]): MissingReference[] {
		const provenance = o.provenance ?? 'url';
		// Un point par ses coordonnées (`G = (aire(B, C, D) ; 0)`, revue de la PR 2)
		if (o.kind === 'point') {
			const left = new Set(
				(pointCoordinatesOf(o.definition) ?? []).flatMap((c) =>
					referencesOf(
						withoutMeasures(c, provenance, this.#isPoint),
						provenance,
						this.functionNames
					).map((r) => r.name)
				)
			);
			return refs.filter((r) => left.has(r.name));
		}
		if (o.kind !== 'value' && o.kind !== 'function' && o.kind !== 'sequence') return refs;
		if (!citesMeasure(o.definition, provenance, this.#isPoint)) return refs;
		const left = new Set(
			referencesOf(
				withoutMeasures(o.definition, provenance, this.#isPoint),
				provenance,
				this.functionNames
			).map((r) => r.name)
		);
		return refs.filter((r) => left.has(r.name));
	}

	/**
	 * Une mesure relue (lot 2, L4) : sa définition, chaque mesure remplacée par sa
	 * valeur exacte — `null` pour un objet qui n'en cite pas. Une fois par
	 * révision ; un objet qui se cite lui-même en cours de calcul n'en a pas.
	 */
	measuredOf(object: AtelierObject): MeasuredText | null {
		if (object.kind !== 'value' && object.kind !== 'function' && object.kind !== 'sequence') {
			return null;
		}
		const provenance = object.provenance ?? 'url';
		if (!citesMeasure(object.definition, provenance, this.#isPoint)) return null;
		if (this.#measureMemo === null || this.#measureMemo.revision !== this.revision) {
			this.#measureMemo = { revision: this.revision, byName: new Map() };
		}
		const memo = this.#measureMemo.byName;
		const known = memo.get(object.name);
		if (known !== undefined) return known;
		if (this.#measuring.has(object.name)) return null;
		this.#measuring.add(object.name);
		try {
			const read = measuredText(this, object.definition, provenance);
			memo.set(object.name, read);
			return read;
		} finally {
			this.#measuring.delete(object.name);
		}
	}

	/** Les textes dont on calcule les mesures : `A = (AM ; 0)` ne boucle pas. */
	#measuringTexts = new Set<string>();

	/**
	 * Un TEXTE (une coordonnée, le rayon d'un cercle), mesures remplacées par leur
	 * valeur — `engine.substitutedTextOf`. Un texte qui se mesure à partir de
	 * lui-même (une coordonnée de A qui cite AM) est refusé.
	 */
	measuredTextOf(text: string, provenance: Provenance): MeasuredText {
		const key = `${provenance}\u0000${text}`;
		if (!citesMeasure(text, provenance, this.#isPoint)) {
			return { ok: true, text, changed: false, approximate: false };
		}
		if (this.#measuringTexts.has(key)) {
			return { ok: false, message: CIRCULAR };
		}
		this.#measuringTexts.add(key);
		try {
			return measuredText(this, text, provenance);
		} finally {
			this.#measuringTexts.delete(key);
		}
	}

	/** Les objets dont la valeur n'est qu'approchée (revue de la PR 2), pour la révision courante. */
	#approximate: { readonly revision: number; readonly names: ReadonlySet<string> } | null = null;

	/**
	 * Les objets qui citent — eux-mêmes ou par un autre objet — une mesure
	 * APPROCHÉE (un angle non remarquable) : leur valeur se dit « ≈ », jamais en
	 * fraction exacte (`368699/10000`).
	 */
	approximateNames(): ReadonlySet<string> {
		if (this.#approximate !== null && this.#approximate.revision === this.revision) {
			return this.#approximate.names;
		}
		const names = new Set<string>();
		for (const o of this.items) {
			const read = this.measuredOf(o);
			if (read !== null && read.ok && read.approximate) names.add(o.name);
		}
		this.spread((name) => {
			const o = this.get(name);
			return o !== undefined && this.#refsOf(o).some((r) => names.has(r.name));
		}, names);
		this.#approximate = { revision: this.revision, names };
		return names;
	}

	/** Ce que lit le moteur : la définition, mesures remplacées par leur valeur (`engine.ts`). */
	readableDefinition(object: AtelierObject): string {
		const read = this.measuredOf(object);
		return read !== null && read.ok && read.changed ? read.text : object.definition;
	}

	/** Les arbres relus pour la révision courante (`definitionAst`). */
	#astMemo: { readonly revision: number; readonly byName: Map<string, MathNode | null> } | null =
		null;

	/**
	 * L'ARBRE d'une définition, chaque mesure remplacée par son nœud exact — angles
	 * en grandeur (revue de la PR 2 : relu par le texte, `(({1/2}\pi)[rad])` ne se
	 * lisait plus). C'est ce que lit le moteur (`engine.ts`).
	 */
	definitionAst(object: AtelierObject): MathNode | null {
		const provenance = object.provenance ?? 'url';
		const read = this.measuredOf(object);
		if (read === null || !read.ok || !read.changed) {
			return astOfDefinition(object.definition, provenance, this.functionNames);
		}
		if (this.#astMemo === null || this.#astMemo.revision !== this.revision) {
			this.#astMemo = { revision: this.revision, byName: new Map() };
		}
		const known = this.#astMemo.byName.get(object.name);
		if (known !== undefined) return known;
		if (this.#measuring.has(object.name)) return null;
		this.#measuring.add(object.name);
		try {
			const tree = measuredAst(this, object.definition, provenance, this.functionNames);
			const ast = tree.ok ? tree.ast : null;
			this.#astMemo.byName.set(object.name, ast);
			return ast;
		} finally {
			this.#measuring.delete(object.name);
		}
	}

	/** L'arbre d'un TEXTE (coordonnée, rayon), mesures remplacées — `engine.substitutedTextOf`. */
	textAst(
		text: string,
		provenance: Provenance
	):
		| { readonly ok: true; readonly ast: MathNode | null }
		| { readonly ok: false; readonly message: string } {
		if (!citesMeasure(text, provenance, this.#isPoint)) {
			return { ok: true, ast: astOfDefinition(text, provenance, this.functionNames) };
		}
		const key = `${provenance}\u0000${text}`;
		if (this.#measuringTexts.has(key)) return { ok: false, message: CIRCULAR };
		this.#measuringTexts.add(key);
		try {
			return measuredAst(this, text, provenance, this.functionNames);
		} finally {
			this.#measuringTexts.delete(key);
		}
	}

	/**
	 * Les mesures (lot 2, L4) : une mesure qui ne se calcule pas avec les valeurs
	 * du moment (polygone croisé, sommet confondu) met l'objet en erreur, avec la
	 * raison. Le curseur suit : une valeur devenue mesure le perd, une valeur qui
	 * cesse de l'être (ses points supprimés) le retrouve.
	 */
	#measures(): void {
		this.#measureMemo = null;
		this.#astMemo = null;
		this.items.forEach((o, i) => {
			if (isValue(o) && o.unit === undefined) {
				const measured = this.#citesMeasure(o.definition, o.provenance);
				if (measured && o.slider !== undefined) {
					const { slider: _dropped, ...rest } = o;
					void _dropped;
					this.items[i] = rest;
				} else if (!measured && o.slider === undefined) {
					this.items[i] = {
						...o,
						slider: widenedSlider(
							DEFAULT_SLIDER,
							constantOf(o.definition, o.provenance, this.functionNames)
						)
					};
				}
			}
			const current = this.items[i];
			if (current.status !== 'ok') return;
			const read = this.measuredOf(current);
			if (read !== null && !read.ok) {
				// Un point cité qui attend (PR 3) : la mesure attend avec lui
				const status = read.pending === true ? 'pending' : 'error';
				this.items[i] = { ...current, status, message: read.message } as AtelierObject;
			}
		});
		// Avec les statuts de ce passage : une grandeur d'angle, ce que Calcul refuserait
		this.#angles = null;
		this.items.forEach((o, i) => {
			if (
				o.status !== 'ok' ||
				(o.kind !== 'value' && o.kind !== 'function' && o.kind !== 'sequence')
			) {
				return;
			}
			const cites =
				this.measuredOf(o) !== null ||
				this.#refsOf(o).some((r) => this.angleQuantities().has(r.name));
			if (!cites) return;
			const tree = substitutedAstOf(this, o.name);
			if (!tree.ok) return;
			// Choix prudent (David, 2026-10-18 : un angle est une grandeur) : une fonction,
			// une suite ne prennent pas un angle BRUT — son cosinus, si
			const problem =
				o.kind !== 'value'
					? hasBareAngle(tree.ast)
						? ANGLE_IN_FUNCTION
						: null
					: quantityProblem(tree.ast);
			if (problem !== null) {
				this.items[i] = { ...o, status: 'error', message: problem } as AtelierObject;
				this.#angles = null;
			}
		});
	}

	/** Les constructions calculées pour la révision courante (`construction.ts`). */
	#constructionMemo: { readonly revision: number; readonly memo: ConstructionMemo } | null = null;

	/**
	 * Le mémo des constructions de CETTE révision : chaque construction se calcule
	 * une fois par passe, quel que soit le nombre d'objets qui la citent (revue de
	 * la PR 1 du lot 2) — recalcul, cartes, ligne de Calcul le partagent.
	 */
	constructionMemo(): ConstructionMemo {
		if (this.#constructionMemo === null || this.#constructionMemo.revision !== this.revision) {
			this.#constructionMemo = { revision: this.revision, memo: new Map() };
		}
		return this.#constructionMemo.memo;
	}

	/** La graine des tirages (lot 5), lue par le calcul de la grille. */
	get gridSeed(): number {
		return this.#seed;
	}

	/**
	 * « Relancer » (lot 5, T8) : une nouvelle graine, donc de nouveaux tirages pour
	 * toutes les cases à hasard, et ce qui les cite se recalcule.
	 */
	relaunch(): void {
		let next = newGridSeed();
		while (next === this.#seed) next = newGridSeed();
		// Un geste de la grille : Ctrl+Z retrouve les tirages d'avant (Q-L5-3)
		this.#record({ cells: [], titles: [], seed: { before: this.#seed, after: next } });
		this.#setSeed(next);
	}

	#setSeed(seed: number): void {
		this.#seed = seed;
		this.revision++;
		this.#recomputeGrid();
	}

	/**
	 * Le nombre de cases qui tirent au hasard (lot 5) : le bouton « Relancer »
	 * n'apparaît que s'il y en a (Q-L5-2), et l'annonce les compte.
	 */
	get randomCells(): number {
		let count = 0;
		for (const text of gridTexts(this.#entriesByColumn, this.cells).values()) {
			if (isFormula(text) && /ALEA/i.test(text)) count++;
		}
		return count;
	}

	/**
	 * Recalculer les formules de la grille (lot 2), puis les listes dont la
	 * colonne en contient : leurs valeurs sont celles des formules. Seules les
	 * formules concernées par un changement (texte, cellule citée, objet cité)
	 * sont recalculées (`computeGrid`, état précédent gardé).
	 *
	 * ⚠️ Appelé en DERNIER par `recomputeAll` : les formules lisent les objets
	 * avec leur statut définitif. Aucun objet ne lit la grille (Q1) : les listes
	 * se refont ici sans relancer `recomputeAll`.
	 */
	#recomputeGrid(): void {
		const texts = gridTexts(this.#entriesByColumn, this.cells);
		const state = computeGrid(texts, this, this.#gridState);
		this.#gridState = state;
		this.lastGridComputed = state.computed;
		if (state.computed > 0 || state.values.size !== this.#values.size) this.#values = state.values;

		// Les listes à formules se refont TOUJOURS (peu coûteux) : nommer une
		// colonne ne change ni ses textes ni l'empreinte, mais crée la liste

		let changed = false;
		const items = this.items.map((o) => {
			if (!isList(o) || !entriesOf(o.definition).some(isFormula)) return o;
			changed = true;
			return this.#formulaList(o);
		});
		if (changed) this.items = items;
	}

	/** Une liste dont la colonne contient des formules : leurs VALEURS, ligne par ligne. */
	#formulaList(list: ListObject): ListObject {
		let errors = 0;
		const shown = entriesOf(list.definition).map((text, i) => {
			if (!isFormula(text)) return text;
			const value = this.#values.get(cellName(list.column, i + 1));
			if (value?.kind === 'number') return String(value.value);
			if (value?.kind === 'error') errors++;
			return '';
		});
		const parsed = parseDefinition('list', shown.join(' ; '));
		const rebuilt: ListObject = {
			name: list.name,
			kind: 'list',
			column: list.column,
			definition: list.definition,
			provenance: list.provenance,
			status: parsed.error ? 'error' : 'ok',
			...(parsed.error !== undefined && { message: parsed.error }),
			...(list.plotted && { plotted: true }),
			...(list.plottedWith !== undefined && { plottedWith: list.plottedWith }),
			values: parsed.values ?? [],
			rows: parsed.rows ?? [],
			skipped: parsed.skipped ?? 0,
			...(parsed.categories && { categories: parsed.categories }),
			...(parsed.qualitativeBecause !== undefined && {
				qualitativeBecause: parsed.qualitativeBecause
			}),
			...(errors > 0 && { formulaErrors: errors })
		};
		return rebuilt;
	}

	/**
	 * La carte `f⁻¹` SUIT f (lot 3 de la réciproque) : recalculée à chaque
	 * passage, formule et ensemble de départ (son `interval`, pour le tracé et
	 * les calculs). f devenue non bijective, constante (a = 0)… : la carte passe
	 * en erreur avec le refus, sans formule — jamais une formule fausse.
	 *
	 * ⚠️ EN DERNIER : f doit avoir son statut définitif (`#sequenceChecks` peut
	 * encore la passer en erreur). Une f en attente ou en erreur a déjà propagé
	 * son statut à `f⁻¹` (elle en dépend, `#refsOf`).
	 */
	#reciprocals(): void {
		this.items.forEach((o, i) => {
			const base = reciprocalOf(o.name);
			if (base === null || !isFunction(o) || this.get(base)?.status !== 'ok') return;
			const computed = reciprocalOfFunction(this, base, o.reciprocalOn);
			const { interval: _interval, message: _message, ...rest } = o;
			const next: AtelierObject = computed.ok
				? {
						...rest,
						definition: computed.definition,
						provenance: 'text',
						status: 'ok',
						...(computed.interval !== undefined && { interval: computed.interval })
					}
				: { ...rest, definition: '', status: 'error', message: computed.message };
			const same =
				next.definition === o.definition &&
				next.status === o.status &&
				next.message === o.message &&
				(next as typeof o).interval === o.interval;
			if (!same) this.items[i] = next;
		});
	}

	/**
	 * La carte `f′` porte l'ensemble de f (lot 2 de
	 * `docs/wip/atelier-intervalle-phase0.md`) : recopié à chaque recalcul, il
	 * suit f quand son ensemble change ou disparaît (I6). Jamais sauvegardé.
	 *
	 * Décision d : toute fonction porte aussi l'ensemble hérité des fonctions
	 * qu'elle cite (`inheritedInterval`, calculé par `citedIntervals`).
	 */
	#inheritIntervals(inheritedDomains: ReadonlyMap<string, Domain>): void {
		this.items.forEach((o, i) => {
			if (!isFunction(o)) return;
			const domain = inheritedDomains.get(o.name);
			// Comparé par contenu : un objet neuf à chaque passage relancerait le
			// rendu de la carte et la synchronisation du tracé pour rien
			if (JSON.stringify(o.inheritedInterval) === JSON.stringify(domain)) return;
			const { inheritedInterval: _stale, ...rest } = o;
			this.items[i] = domain === undefined ? rest : { ...rest, inheritedInterval: domain };
		});
		this.items.forEach((o, i) => {
			const derivative = derivativeOf(o.name);
			if (derivative === null || !isFunction(o)) return;
			const base = this.get(derivative.base);
			const inherited = base !== undefined && isFunction(base) ? base.interval : undefined;
			if (o.interval === inherited) return;
			const { interval: _dropped, ...rest } = o;
			this.items[i] = inherited === undefined ? rest : { ...rest, interval: inherited };
		});
	}

	/**
	 * Ce qu'une suite ne sait pas faire se DIT dès la définition (revue du lot 5a) :
	 *
	 * - un objet qui cite une récurrence comme une fonction (`f(x) = u(x) + 1`)
	 *   ne calcule rien — le moteur répondait en anglais ;
	 * - une récurrence qui n'est pas d'ordre 1 (`u(n-1)`), ou dont le premier
	 *   terme n'a pas de valeur, n'attend pas le premier calcul pour échouer.
	 *
	 * ⚠️ APRÈS les statuts, comme `#underivable` : `termsOf` lit des objets « ok ».
	 */
	#sequenceChecks(): void {
		const recurrences = new Set(
			this.items.filter((o) => isSequence(o) && o.mode === 'recurrence').map((o) => o.name)
		);
		this.items.forEach((o, i) => {
			if (o.status !== 'ok') return;
			const cited = this.#cited(o.kind, o.definition, o.provenance)
				.map((r) => r.name)
				.find((r) => r !== o.name && recurrences.has(r));
			if (cited !== undefined) {
				this.items[i] = {
					...o,
					status: 'error',
					message: `« ${cited} » est une suite récurrente : « ${o.name} » ne peut pas s'en servir comme d'une fonction — ses termes se calculent un par un, comme ${cited}(5).`
				} as AtelierObject;
				return;
			}
			// Toute suite, explicite ou non : « ok » doit vouloir dire qu'elle se
			// calcule ET se trace — sinon la carte disait « ok » sur un graphique
			// vide (revue du lot 5b)
			if (isSequence(o)) {
				const terms = termsOf(this, o.name, o.firstIndex);
				const message = !terms.ok
					? terms.message
					: graphLatexOf(this, o.name) === null
						? `« ${o.name} » ne se calcule pas pour n = ${o.firstIndex}.`
						: null;
				if (message !== null) {
					this.items[i] = { ...o, status: 'error', message } as AtelierObject;
				}
			}
		});
	}

	/**
	 * Les constructions (lot 2, L1) : calculées par l'atelier, exactes. Ce qui ne
	 * se construit pas avec les valeurs du moment (deux points confondus, trois
	 * points alignés, une parallèle à un cercle) est en erreur et dit pourquoi ;
	 * ce qui en dépend aussi, jusqu'au point fixe (la propagation de
	 * `recomputeAll` est déjà passée).
	 */
	#constructions(): void {
		let changed = true;
		while (changed) {
			changed = false;
			// Un statut vient de changer : ce qui a été calculé avec l'ancien ne vaut plus
			this.#constructionMemo = null;
			this.#measureMemo = null;
			this.#astMemo = null;
			this.items.forEach((o, i) => {
				if (o.status !== 'ok' || !isConstruction(o)) return;
				const built = constructionOf(this, o.name);
				if (built.ok) return;
				// PR 3 : deux lignes qui ne se coupent pas (avec les valeurs du moment)
				// ATTENDENT — un curseur peut les faire se couper ; le reste est une erreur
				// Une infinité de points communs (deux cercles devenus égaux au glisser) aussi :
				// refusée à la saisie, elle ATTEND pendant le recalcul (revue de la PR 3)
				const status =
					built.reason === 'pending' || built.reason === 'infinite' ? 'pending' : 'error';
				this.items[i] = { ...o, status, message: built.message } as AtelierObject;
				changed = true;
			});
		}
	}

	/**
	 * Ce qui cite un objet mis en attente APRÈS la propagation de `recomputeAll`
	 * (PR 3 : une intersection vide, un point hors de son segment) attend avec
	 * lui, jusqu'au point fixe — une mesure `L = AE`, une fonction qui cite L.
	 * Sans `missing` : rien ne manque, il n'y a pas de curseur à offrir.
	 */
	#geometryWaits(deps: ReadonlyMap<string, readonly string[]>): void {
		const waiting = new Set(
			this.items.filter((o) => o.status === 'pending' && o.missing === undefined).map((o) => o.name)
		);
		if (waiting.size === 0) return;
		const before = new Set(waiting);
		this.spread(
			(name) =>
				this.get(name)?.status === 'ok' && (deps.get(name) ?? []).some((d) => waiting.has(d)),
			waiting
		);
		this.items.forEach((o, i) => {
			if (!waiting.has(o.name) || before.has(o.name)) return;
			const cause = (deps.get(o.name) ?? []).find((d) => waiting.has(d)) ?? '';
			this.items[i] = {
				...o,
				status: 'pending',
				message: `En attente de « ${cause} ».`
			} as AtelierObject;
		});
	}

	/**
	 * Une valeur dont les grandeurs ne se combinent pas (`3[min] + 2[km]`, ou
	 * `r + 2[m]` avec r = 3 s) est en erreur dès sa définition, avec le refus de
	 * Calcul ; ce qui la cite aussi, jusqu'au point fixe (demande de David du
	 * 2026-10-18 : avant, elle était « ok » et le refus attendait qu'on la cite).
	 */
	#quantityChecks(deps: ReadonlyMap<string, readonly string[]>): void {
		const cites = (name: string, names: ReadonlySet<string>) =>
			(deps.get(name) ?? []).some((d) => names.has(d));
		// Seules les valeurs qui portent une unité, écrite ou citée, sont relues :
		// relire toutes les valeurs à chaque recalcul coûtait ~65 ms pour 50 valeurs
		// (revue), à chaque cran d'un curseur
		const carrying = new Set(
			this.items
				.filter((o) => o.kind === 'value' && UNIT_WRITTEN.test(o.definition))
				.map((o) => o.name)
		);
		this.spread((n) => this.get(n)?.kind === 'value' && cites(n, carrying), carrying);

		const own = new Map<string, string>();
		for (const o of this.items) {
			if (o.status !== 'ok' || !carrying.has(o.name)) continue;
			const message = this.#quantityMessage(o.name);
			if (message !== null) own.set(o.name, message);
		}
		if (own.size === 0) return;

		// Ce qui cite une valeur en erreur, quel qu'en soit le type ; une valeur
		// fautive qui en cite une autre la désigne, quel que soit l'ordre de création
		const failing = new Set(own.keys());
		this.spread((n) => this.get(n)?.status === 'ok' && cites(n, failing), failing);
		this.items.forEach((o, i) => {
			if (!failing.has(o.name)) return;
			const culprits = (deps.get(o.name) ?? []).filter((d) => failing.has(d));
			const message = culprits.length > 0 ? brokenMessage(culprits) : own.get(o.name)!;
			this.items[i] = { ...o, status: 'error', message } as AtelierObject;
		});
	}

	/** Le refus de dimension d'une valeur, en français, ou `null`. */
	#quantityMessage(name: string): string | null {
		const substituted = expressionOf(this, name);
		if (!substituted.ok) return null;
		// Relue depuis le texte : sur l'arbre substitué, `quantityProblem` levait « components is not iterable » (mesuré)
		const ast = astOfDefinition(substituted.expression, 'url');
		// Une lettre libre (un curseur, une inconnue) : rien à juger ici
		if (ast === null || findNodes(ast, isUnit).length === 0) return null;
		if (getVariables(ast).size > 0) return null;
		return quantityProblem(ast);
	}

	/**
	 * Une carte `f′` dont la dérivée ne se calcule pas (`f` = |x|) passe en
	 * erreur, avec le message de `expressionOf` (revue du lot 3a, B1).
	 *
	 * ⚠️ APRÈS les statuts : `expressionOf` refuse un objet qui n'est pas « ok »,
	 * il faut donc que le statut de lecture soit posé. On ne remplace que les
	 * objets qui changent, pour ne pas re-rendre toute la liste.
	 */
	#underivable(): void {
		this.items.forEach((o, i) => {
			// `g(x) = f⁻¹(x)` aussi : f devenue non bijective, g dit pourquoi
			const follows = derivativeOf(o.name) !== null || citesReciprocal(this, o.definition);
			if (o.status !== 'ok' || !follows) return;
			const read = expressionOf(this, o.name);
			if (!read.ok) {
				this.items[i] = { ...o, status: 'error', message: read.message } as AtelierObject;
			}
		});
	}

	/** Étendre un ensemble jusqu'au point fixe, selon un critère de contagion. */
	private spread(caught: (name: string) => boolean, into: Set<string>): void {
		let changed = true;
		while (changed) {
			changed = false;
			for (const o of this.items) {
				if (into.has(o.name)) continue;
				if (caught(o.name)) {
					into.add(o.name);
					changed = true;
				}
			}
		}
	}
}

/**
 * La mise en forme relue, canonique et sous le plafond : la plus longue suite de
 * zones rangées qui y tient (par dichotomie), et si une partie a été perdue.
 */
function restoredFormats(stored: readonly StoredFormat[]): {
	formats: FormatZone[];
	lost: boolean;
} {
	const zones = stored.flatMap((one) => {
		const format = formatOf(one);
		return format === null ? [] : [format];
	});
	const whole = normalizeFormats(zones);
	if (whole.length <= MAX_FORMAT_ZONES) return { formats: whole, lost: false };
	let fits = 0;
	let tooMany = zones.length;
	while (tooMany - fits > 1) {
		const middle = Math.floor((fits + tooMany) / 2);
		if (normalizeFormats(zones.slice(0, middle)).length <= MAX_FORMAT_ZONES) fits = middle;
		else tooMany = middle;
	}
	return { formats: normalizeFormats(zones.slice(0, fits)), lost: true };
}

/** Le refus d'une mise en forme au-delà du plafond. */
const FORMATS_FULL = `La grille garde ${MAX_FORMAT_ZONES} zones de mise en forme : efface-en avant d’en poser d’autres.`;

/** Une graine de tirages : un entier de 32 bits. */
function newGridSeed(): number {
	return Math.floor(Math.random() * 2 ** 32);
}
