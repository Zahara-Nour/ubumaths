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
 * Spécification : `docs/wip/atelier-recherche-eleve-phase0.md` §2.
 *
 * @module atelier/atelier
 */

import { SvelteMap } from 'svelte/reactivity';
import { MAX_LISTS, isFunction, isList, isSequence, isValue } from './types';
import { constantOf } from './constant';
import type {
	AtelierObject,
	CurveDisplay,
	MissingReference,
	ObjectKind,
	ObjectStatus,
	ListObject,
	SequenceObject,
	Slider,
	ValueObject
} from './types';
import {
	validateName,
	nextName,
	nameRejectionMessage,
	derivativeOf,
	hasObjectNameShape,
	derivativeName,
	displayName
} from './names';
import type { Provenance } from './parse';
import { parseDefinition, readNumber, referencesOf, renameInDefinition } from './parse';
import { z } from 'zod';
import { COORDINATE_LIMIT } from '$lib/grapheur/types';
import type { ListChartKind } from './chart';
import { ATELIER_STATE_VERSION, type AtelierState, type StoredObject } from './persistence';
import { expressionOf } from './engine';
import {
	compactDisplay,
	fullDisplay,
	newDisplay,
	readDisplayPatch,
	type StoredDisplay
} from './display';

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
}

/** Ce qu'il faut pour créer un objet. Sans `name`, l'atelier en propose un. */
export interface CreateInput {
	readonly kind: ObjectKind;
	readonly definition?: string;
	readonly name?: string;
	/** Pour une suite : mode, rang et premier terme déjà connus (relecture, Calcul). */
	readonly sequence?: Partial<Pick<SequenceObject, 'mode' | 'firstIndex' | 'firstTerm'>>;
}

// =============================================================================
// Constantes
// =============================================================================

/** Bornes d'un curseur neuf — décision D3, reprises du grapheur. */
const DEFAULT_SLIDER = { min: -10, max: 10, step: 0.1 } as const;

/** Plus grand rang de départ accepté : au-delà, rien ne s'afficherait. */
const MAX_FIRST_INDEX = 1000;

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

/** Valeur d'un curseur neuf — même convention que `addParameter` du grapheur. */
const OFFER_DEFINITION = '1';

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
	 * Liste partenaire choisie sur la carte d'une liste (Q46) : liste → partenaire.
	 *
	 * ⚠️ Ici plutôt que dans la carte (Q48) : retenue par son NOM dans la carte,
	 * elle revenait en silence à celle par défaut après un renommage. Même
	 * statut que `charts` : affichage seulement, hors de `serialize()`.
	 */
	private partnerChoices = new SvelteMap<string, string>();

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
		return this.items
			.filter((o) => o.kind === 'function' || o.kind === 'sequence')
			.map((o) => o.name);
	}

	get names(): readonly string[] {
		return this.items.map((o) => o.name);
	}

	get(name: string): AtelierObject | undefined {
		return this.items.find((o) => o.name === name);
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
		} else {
			const rejection = validateName(input.name, this.names);
			if (rejection) return { ok: false, message: nameRejectionMessage(rejection, input.name) };
			name = input.name;
		}

		const built = this.build(name, input.kind, definition, provenance);
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
		if (base.status !== 'ok') {
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
		if (this.get(derived)?.status !== 'ok') {
			this.remove(derived);
			return { ok: false, message: `La dérivée de « ${displayName(name)} » ne se calcule pas.` };
		}
		if (base.plotted) this.setPlotted(derived, true);
		return { ok: true, object: this.get(derived)! };
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

	// ---------------------------------------------------------------------------
	// Renommage
	// ---------------------------------------------------------------------------

	/**
	 * Les objets que cite une définition. ⚠️ Une LISTE n'en cite aucun : c'est
	 * du texte brut. Lue comme une expression, `fille ; garçon` citait `fille`
	 * et `garçon`, et la liste restait « en attente » d'objets inexistants (Q84).
	 */
	#cited(kind: AtelierObject['kind'], definition: string, provenance?: Provenance) {
		return kind === 'list' ? [] : referencesOf(definition, provenance, this.functionNames);
	}

	/**
	 * La définition après renommage. ⚠️ Une liste n'est JAMAIS réécrite (Q87) :
	 * renommer un objet `A` changeait `A ; B ; A ; O`, une liste de groupes
	 * sanguins.
	 */
	#renamedIn(object: AtelierObject, from: string, to: string): string {
		return object.kind === 'list'
			? object.definition
			: renameInDefinition(object.definition, from, to);
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

		// Les définitions qui citaient l'ancien nom suivent : c'est ce qu'attend
		// un élève, et on le lui dit en rendant la liste. L'objet renommé n'y
		// figure pas — il n'a pas été « mis à jour », il a été renommé.
		const updated: string[] = [];
		this.items.forEach((o, i) => {
			if (o.name === to || derivativeOf(o.name)?.base === to) return;
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
		for (const [list, partner] of [...this.partnerChoices]) {
			this.partnerChoices.delete(list);
			this.partnerChoices.set(list === from ? to : list, partner === from ? to : partner);
		}

		this.recomputeAll();
		return { ok: true, updated };
	}

	// ---------------------------------------------------------------------------
	// Modification
	// ---------------------------------------------------------------------------

	update(name: string, definition: string, provenance: Provenance = 'url'): Updated | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return { ok: false, message: `« ${name} » n'existe pas.` };

		const dependents = this.allDependents(name);
		// ⚠️ `build()` fabrique un objet NEUF : ce qui relève de l'affichage doit
		// être reporté à la main, sinon modifier une fonction fait disparaître sa
		// courbe. Même famille que le curseur écrasé (revue #334, point 7) : tout
		// état d'affichage ajouté ici devra être reporté là.
		const previous = this.items[index];
		const rebuilt = this.build(name, previous.kind, definition, provenance);
		// K3 (dette n° 2) : le curseur réglé survit à la définition — `build()`
		// en fabrique un neuf, qu'on remplace par l'ancien, élargi si besoin (L1)
		const keptSlider =
			isValue(previous) && previous.slider && isValue(rebuilt) && rebuilt.slider
				? widenedSlider(previous.slider, constantOf(definition, provenance, this.functionNames))
				: undefined;
		// Le rang et le premier terme d'une suite survivent à la définition ; son
		// mode aussi, sauf si elle se met à se citer elle-même (récurrence, S4)
		const keptSequence =
			isSequence(previous) && isSequence(rebuilt)
				? {
						mode: rebuilt.mode === 'recurrence' ? rebuilt.mode : previous.mode,
						firstIndex: previous.firstIndex,
						firstTerm: previous.firstTerm
					}
				: undefined;
		this.items[index] = {
			...rebuilt,
			...keptSequence,
			...(previous.plotted && { plotted: true }),
			...(isFunction(previous) && previous.display && { display: previous.display }),
			...(keptSlider && { slider: keptSlider })
		} as AtelierObject;
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
		this.charts.delete(name);
		// Les diagrammes dont elle donnait les effectifs disparaissent avec elle :
		// sinon, une liste recréée sous ce nom s'y rattacherait en silence
		for (const [list, chart] of [...this.charts]) {
			if (chart.partner === name) this.charts.delete(list);
		}
		this.partnerChoices.delete(name);
		for (const [list, partner] of [...this.partnerChoices]) {
			if (partner === name) this.partnerChoices.delete(list);
		}
		this.recomputeAll();

		return { ok: true, broken };
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

	/** La partenaire choisie sur la carte de cette liste, s'il y en a une. */
	partnerChoiceOf(name: string): string | undefined {
		return this.partnerChoices.get(name);
	}

	choosePartner(name: string, partner: string): void {
		this.partnerChoices.set(name, partner);
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
			definition: o.definition,
			// Rangé seulement quand il est vrai : un atelier sans courbe tracée ne
			// paie pas ce champ dans l'URL, qui est le mécanisme de partage.
			...(o.plotted ? { plotted: true } : {}),
			// Recopié champ par champ : `display` est un objet, donc un proxy
			// `$state` — tel quel, `structuredClone` jetterait (voir plus haut).
			...(isFunction(o) && o.display ? { display: compactDisplay(o.display) } : {}),
			// Seulement s'il a été réglé : un curseur par défaut ne pèse rien dans le lien
			...(isValue(o) && o.slider && !isDefaultSlider(o.slider)
				? { slider: { min: o.slider.min, max: o.slider.max, step: o.slider.step } }
				: {}),
			// Le mode toujours (une récurrence constante ne se devine pas), le rang
			// et le premier terme seulement s'ils diffèrent du défaut
			...(isSequence(o)
				? {
						mode: o.mode,
						...(o.firstIndex !== 0 && { firstIndex: o.firstIndex }),
						...(o.firstTerm !== '0' && { firstTerm: o.firstTerm })
					}
				: {})
		}));
		return { version: ATELIER_STATE_VERSION, objects };
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
	restore(state: AtelierState): RestoreReport {
		this.items = [];
		this.charts.clear();
		this.partnerChoices.clear();
		const skipped: SkippedObject[] = [];

		for (const stored of state.objects) {
			const result = this.create({
				kind: stored.kind,
				name: stored.name,
				definition: stored.definition,
				...(stored.kind === 'sequence' && { sequence: sequenceInputOf(stored) })
			});
			if (!result.ok) {
				skipped.push({ name: stored.name, reason: result.message });
				continue;
			}
			// Les réglages AVANT le tracé : sinon `setPlotted` attribuerait une
			// couleur neuve à une courbe qui avait déjà la sienne.
			if (stored.display) this.adoptDisplay(stored.name, stored.display);
			if (stored.slider) this.adoptSlider(stored.name, stored.slider);
			if (stored.plotted) this.setPlotted(stored.name, true);
		}

		this.recomputeAll();
		return { restored: this.items.length, skipped };
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
		// `plottedWith` ne vaut que pour une liste ; posé ici pour que la
		// synchronisation n'ait rien à redeviner.
		const current = this.items[index];
		// Une fonction reçoit ses réglages à son PREMIER tracé, et les garde
		// ensuite, retirée ou non (phase 0 `/grapheur` §1 L1).
		const display =
			plotted && isFunction(current) && current.display === undefined
				? newDisplay(this.#displays())
				: undefined;
		this.items[index] = {
			...current,
			plotted,
			...(withList !== undefined && { plottedWith: withList }),
			...(display && { display })
		} as AtelierObject;
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

		const base = current.display ?? newDisplay(this.#displays());
		this.items[index] = { ...current, display: { ...base, ...read.patch } };
		// ⚠️ Pas de `recomputeAll` : un réglage ne change aucun statut, et le
		// curseur de la tangente en enverrait un par mouvement. Seul le compteur
		// bouge — c'est lui que la sauvegarde et le tracé écoutent.
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

	/** Les réglages déjà pris par les autres fonctions — pour ne pas les doubler. */
	#displays(): CurveDisplay[] {
		return this.items.flatMap((o) => (isFunction(o) && o.display ? [o.display] : []));
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
		this.recomputeAll();
		return { ok: true };
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
		provenance: Provenance = 'url'
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
					values: parsed.values ?? [],
					skipped: parsed.skipped ?? 0,
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
					...(parsed.unit
						? { unit: parsed.unit }
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
				return { ...base, kind: 'function', variable: 'x' };
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
		const living = new Set(this.names);
		// Un objet encore vide ne peut rien fournir à ceux qui le citent : ils
		// l'attendent, exactement comme un nom absent. Sans ça, « g = f(x)+1 »
		// s'affichait « ok » pendant que `f` était vide — rien ne se traçait, et
		// rien ne l'expliquait : le silence même que D9 supprime.
		const empty = new Set(this.items.filter((o) => o.definition.trim() === '').map((o) => o.name));
		const usable = (name: string) => living.has(name) && !empty.has(name);

		const ownError = new Map<string, string | undefined>();
		const deps = new Map<string, string[]>();
		const missing = new Map<string, MissingReference[]>();

		for (const o of this.items) {
			// La provenance de l'objet, pas un défaut : sinon une définition LaTeX
			// serait relue en texte à chaque recalcul.
			ownError.set(
				o.name,
				parseDefinition(o.kind, o.definition, o.provenance, this.functionNames).error
			);

			// Une suite qui se cite elle-même est une récurrence, pas un cycle :
			// `u(n+1) = 0,5·u(n) + 3` est une définition parfaitement saine.
			const refs = this.#refsOf(o).filter((r) => !(r.name === o.name && o.kind === 'sequence'));
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

		this.#underivable();
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
			if (o.status !== 'ok' || derivativeOf(o.name) === null) return;
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
