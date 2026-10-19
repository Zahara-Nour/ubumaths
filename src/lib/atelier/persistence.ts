/**
 * Atelier — ranger et relire l'état local
 *
 * Sans compte, le navigateur est la seule mémoire de l'élève : ce module ne
 * doit donc jamais perdre son travail en silence. Chaque issue est nommée, et
 * l'appelant décide quoi lui dire (§5).
 *
 * Le stockage est **injecté** plutôt qu'importé : la logique se teste sans
 * navigateur, et `null` représente le cas « stockage refusé » — navigation
 * privée, site bloqué (§5 E1).
 *
 * @module atelier/persistence
 */

import { z } from 'zod';
import { MAX_FORMAT_ZONES, storedFormatSchema, type StoredFormat } from './cell-format';
import type { ObjectKind } from './types';
import { MAX_DEFINITION_LENGTH, MAX_INTERVAL_LENGTH } from './types';
import {
	MAX_CELL_LENGTH,
	MAX_TITLE_LENGTH,
	definitionFrom,
	entriesOf,
	readCellName,
	renameInFormula
} from './grid';
import { nextName } from './names';
import { renameInDefinition } from './parse';
import { sequenceDisplaySchema, storedDisplaySchema, type StoredDisplay } from './display';
import { COORDINATE_LIMIT } from '$lib/grapheur/types';

// =============================================================================
// Constantes
// =============================================================================

export const ATELIER_STORAGE_KEY = 'chiphre-atelier';

/**
 * L'atelier MIS DE CÔTÉ par « Remplacer mon atelier » ou « Charger » (R3, R5 de
 * `atelier-remplacer-phase0.md`) : une seule copie, rangée sous la même forme que
 * l'atelier personnel et relue par les mêmes schémas (B7). Voir `replace.ts`.
 */
export const SET_ASIDE_STORAGE_KEY = 'chiphre-atelier-de-cote';

/**
 * Version du format rangé.
 *
 * À incrémenter dès que la forme change. Un état d'une version PLUS RÉCENTE
 * n'est jamais relu ni écrasé : l'élève a peut-être ouvert l'atelier ailleurs
 * dans une version plus neuve, et son travail vaut mieux que le nôtre (§5 L2).
 *
 * Version 2 (2026-10-15, tableur intégré) : la colonne de chaque liste et les
 * cellules des colonnes sans nom. ⚠️ Sans elle, un onglet resté sur l'ancien
 * code relirait l'état en jetant la grille (Zod retire les clés inconnues),
 * puis l'enregistrerait. Une version 1 se relit : ses listes sont placées en
 * A, B… dans l'ordre des cartes.
 *
 * Version 3 (2026-10-18, géométrie v2) : les points et les courbes (`kind`
 * `point`, `curve`), et `y` devenu réservé — un objet `y` rangé avant est
 * renommé à la relecture (`migrateReservedNames`, Q2). Sans elle, un onglet
 * resté sur l'ancien code écarterait les points et les courbes, puis
 * enregistrerait l'atelier sans eux.
 *
 * Version 4 (2026-10-18, géométrie v2, PR 3) : `inFigure`, la courbe d'une
 * fonction montrée dans la vue Géométrie (K1). Sans elle, un onglet resté sur
 * la version 3 relirait l'atelier en retirant le champ (Zod), puis
 * l'enregistrerait sans lui. Une version 3 se relit : rien n'y est affiché.
 */
export const ATELIER_STATE_VERSION = 4;

/**
 * Au-delà, on refuse d'enregistrer plutôt que d'écrire un état qu'on ne saura
 * pas relire. Large : un atelier au plafond D8 (8 listes de 200 valeurs) tient
 * sous 100 ko, et `localStorage` en offre environ 5 Mo.
 */
const MAX_SERIALIZED_LENGTH = 500_000;

// =============================================================================
// Forme rangée
// =============================================================================

/**
 * Ce qu'on range d'un objet : de quoi le reconstruire, rien de plus.
 *
 * Statut, message et manquants ne sont PAS rangés — ils se recalculent à la
 * relecture. Les ranger, c'est risquer de relire un verdict devenu faux.
 */
const storedObjectSchema = z.object({
	// 12 : la carte `f⁻¹` s'appelle `f^-1`, `u_12^-1` (lot 3 de la réciproque)
	name: z.string().min(1).max(12),
	kind: z.enum(['value', 'function', 'sequence', 'list', 'point', 'curve']),
	definition: z.string().max(MAX_DEFINITION_LENGTH),
	/** Affiché dans la vue Graphe. Absent = non tracé. */
	plotted: z.boolean().optional(),
	/** 𝒞f affichée dans la vue Géométrie (K1, version 4). Absent = non affichée. */
	inFigure: z.boolean().optional().catch(undefined),
	/**
	 * La lettre d'une fonction (`f(t)`). Abîmée : oubliée, la fonction gardée et
	 * montrée en x — sa définition rangée l'est déjà.
	 */
	letter: z
		.string()
		.regex(/^[A-Za-z]$/)
		.optional()
		.catch(undefined),
	/**
	 * L'ensemble d'une fonction, tel qu'écrit après « sur » (`interval.ts`).
	 * Abîmé ou refusé à la relecture : oublié, la fonction gardée sur son domaine.
	 */
	interval: z.string().min(1).max(MAX_INTERVAL_LENGTH).optional().catch(undefined),
	/**
	 * Carte `f⁻¹` : l'intervalle tapé dans `.réciproque f sur I`. Sa formule n'est
	 * pas rangée, elle se recalcule depuis f. Abîmé : oublié, la carte reprend
	 * l'intervalle de f.
	 */
	reciprocalOn: z.string().min(1).max(MAX_INTERVAL_LENGTH).optional().catch(undefined),
	/**
	 * Réglages d'affichage d'une fonction. ⚠️ `.catch(undefined)` : un réglage
	 * abîmé est OUBLIÉ, l'objet est gardé — perdre `f` pour une couleur illisible
	 * serait disproportionné. Tracée, elle recevra une couleur neuve.
	 */
	display: storedDisplaySchema.optional().catch(undefined),
	/** Curseur réglé d'une valeur. Abîmé : oublié, l'objet gardé (même règle). */
	slider: z
		.object({
			min: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
			max: z.number().min(-COORDINATE_LIMIT).max(COORDINATE_LIMIT),
			step: z.number().positive()
		})
		// Mêmes règles que `setSlider` : un lien ne doit pas faire entrer ce que
		// la carte refuserait (revue du lot 4, A3)
		.refine((s) => s.min < s.max && s.step <= s.max - s.min)
		.optional()
		.catch(undefined),
	/**
	 * Curseur d'une valeur affiché depuis le menu (lot 4a, décision de David du
	 * 2026-10-18). Rangé seulement quand il est affiché : pas de nouvelle version,
	 * même contrepartie que `figureDisplay` (un onglet resté sur l'ancien code
	 * l'oublie — un affichage, jamais un objet).
	 */
	sliderShown: z.literal(true).optional().catch(undefined),
	/**
	 * Mode, rang et premier terme d'une suite (lot 5). Absents des suites rangées
	 * avant : le mode se retrouve à la relecture (S4). Validés à la création.
	 */
	mode: z.enum(['explicit', 'recurrence']).optional().catch(undefined),
	firstIndex: z.number().int().min(0).max(1000).optional().catch(undefined),
	firstTerm: z.string().max(20).optional().catch(undefined),
	/** Réglages du tracé d'une suite (lot 5b). Abîmés : oubliés, l'objet gardé. */
	sequenceDisplay: sequenceDisplaySchema.optional().catch(undefined),
	/**
	 * Le dessin d'un point (couleur, taille, étiquette) ou d'une courbe de la
	 * figure (couleur, trait) — lot 4b de la refonte. Jugé par l'objet à la
	 * relecture (`adoptFigureDisplay`), selon son type : ici, seulement sa forme.
	 *
	 * ⚠️ Pas de nouvelle version d'état : absent tant que rien n'est réglé, un
	 * ancien état se relit tel quel. Contrepartie, la même que la lecture
	 * graphique (#1497) : un onglet resté sur l'ancien code l'oublie (Zod retire
	 * la clé) — un réglage de couleur, jamais un objet.
	 */
	figureDisplay: z.record(z.string(), z.unknown()).optional().catch(undefined),
	/**
	 * La colonne d'une liste dans la grille (`A` à `Z`, version 2). Absente ou
	 * abîmée : la liste prend la première colonne libre.
	 */
	column: z
		.string()
		.regex(/^[A-Z]$/)
		.optional()
		.catch(undefined)
});

/**
 * L'enveloppe, volontairement permissive : elle ne juge QUE la forme générale.
 * Le tri des objets se fait un par un, pour n'en perdre qu'un à la fois — et
 * celui des cellules une par une (`salvageGrid`).
 */
export const atelierShellSchema = z.object({
	version: z.number().int().positive(),
	objects: z.array(z.unknown()),
	grid: z.unknown().optional()
});

/** Une cellule rangée : son adresse dans la grille (`B3`), son texte brut. */
const storedCellSchema = z.tuple([
	z.string().refine((name) => readCellName(name) !== null),
	// Sans « ; » : la saisie le répartit vers le bas (P2), une cellule rangée n'en a
	// jamais — un lien forgé qui en porte s'afficherait autrement selon le chemin
	z
		.string()
		.max(MAX_CELL_LENGTH)
		.refine((text) => !text.includes(';'))
]);

/** La graine des tirages : un entier de 32 bits (règle 1, bornes). */
const seedSchema = z
	.number()
	.int()
	.min(0)
	.max(2 ** 32 - 1);

/** Un titre rangé : sa colonne (`B`), son texte non vide. */
const storedTitleSchema = z.tuple([
	z.string().regex(/^[A-Z]$/),
	z.string().trim().min(1).max(MAX_TITLE_LENGTH)
]);

export interface StoredObject {
	readonly name: string;
	readonly kind: ObjectKind;
	readonly definition: string;
	readonly plotted?: boolean;
	/** 𝒞f affichée dans la vue Géométrie (K1). */
	readonly inFigure?: boolean;
	/** La lettre de l'élève d'une fonction (`f(t)`), absente pour x. */
	readonly letter?: string;
	/** L'ensemble d'une fonction (`[0;+∞[`), absent sans « sur ». */
	readonly interval?: string;
	/** Carte `f⁻¹` : l'intervalle tapé dans `.réciproque f sur I`. */
	readonly reciprocalOn?: string;
	readonly display?: StoredDisplay;
	readonly slider?: { readonly min: number; readonly max: number; readonly step: number };
	/** Curseur d'une valeur affiché depuis le menu, absent quand il est caché. */
	readonly sliderShown?: true;
	readonly mode?: 'explicit' | 'recurrence';
	readonly firstIndex?: number;
	readonly firstTerm?: string;
	readonly sequenceDisplay?: unknown;
	/** Le dessin d'un point ou d'une courbe de la figure (lot 4b), validé à la relecture. */
	readonly figureDisplay?: unknown;
	/** La colonne d'une liste (`A` à `Z`). */
	readonly column?: string;
}

/** Les cellules des colonnes SANS nom ; celles d'une liste sont dans sa définition. */
export interface StoredGrid {
	readonly cells?: Readonly<Record<string, string>>;
	/** Les titres des colonnes (T4), par lettre (`B`). */
	readonly titles?: Readonly<Record<string, string>>;
	/** Dans un LIEN seulement : les formules y sont écrites en relatif (`toRelative`). */
	readonly relative?: boolean;
	/** La graine des tirages (ALEA, lot 5) : mêmes tirages au rechargement et dans le lien. */
	readonly seed?: number;
	/** La mise en forme (reprise de V4), par zone, dans l'ordre où elle a été posée. */
	readonly formats?: readonly StoredFormat[];
}

export interface AtelierState {
	readonly version: number;
	readonly objects: readonly StoredObject[];
	/** Absente en version 1, et quand aucune colonne sans nom n'a de cellule. */
	readonly grid?: StoredGrid;
}

// =============================================================================
// Issues
// =============================================================================

export type LoadOutcome =
	| { readonly kind: 'empty' }
	| {
			readonly kind: 'loaded';
			readonly state: AtelierState;
			/** Objets abîmés qu'on n'a pas su relire — à signaler, jamais à taire. */
			readonly dropped: number;
	  }
	/** §5 L2 — plus récent que nous : on ne relit pas, et on n'écrase pas. */
	| { readonly kind: 'too-recent'; readonly version: number; readonly raw: string }
	/** §5 L3 — illisible : atelier vide et message, jamais d'écran blanc. */
	| { readonly kind: 'corrupt'; readonly message: string }
	/** §5 E1 — stockage refusé : tout marche, rien n'est conservé. */
	| { readonly kind: 'unavailable' };

export type SaveOutcome =
	| { readonly kind: 'saved' }
	/** §5 L1 — plus de place : prévenir, jamais réduire en douce. */
	| { readonly kind: 'quota'; readonly message: string }
	/** §5 L2 — un état plus récent occupe la place. */
	| { readonly kind: 'refused-newer'; readonly version: number }
	/** Trop gros pour être relu ensuite : on refuse AVANT d'écrire. */
	| { readonly kind: 'too-large'; readonly message: string }
	| { readonly kind: 'unavailable' };

// =============================================================================
// Lire
// =============================================================================

/**
 * @param key - La clé à relire : l'atelier personnel par défaut, ou la copie mise
 *   de côté (`SET_ASIDE_STORAGE_KEY`), relue par les mêmes schémas (B7).
 */
export function loadAtelier(
	storage: Storage | null,
	key: string = ATELIER_STORAGE_KEY
): LoadOutcome {
	if (!storage) return { kind: 'unavailable' };

	let raw: string | null;
	try {
		raw = storage.getItem(key);
	} catch {
		// Un navigateur peut refuser jusqu'à la lecture (site bloqué).
		return { kind: 'unavailable' };
	}
	if (raw === null) return { kind: 'empty' };

	let parsed: unknown;
	try {
		parsed = JSON.parse(raw);
	} catch {
		return { kind: 'corrupt', message: "L'atelier enregistré est illisible." };
	}

	// La version se lit AVANT la validation : un format plus récent a le droit
	// d'avoir une forme qu'on ne connaît pas encore.
	const version = (parsed as { version?: unknown })?.version;
	if (typeof version === 'number' && version > ATELIER_STATE_VERSION) {
		return { kind: 'too-recent', version, raw };
	}

	// ⚠️ On récupère objet par objet, JAMAIS en bloc. Un seul objet abîmé ne doit
	// pas coûter tout l'atelier à l'élève : c'est sa seule mémoire, il n'a pas de
	// compte pour le retrouver ailleurs.
	const shell = atelierShellSchema.safeParse(parsed);
	if (!shell.success) {
		return { kind: 'corrupt', message: "L'atelier enregistré n'a pas la forme attendue." };
	}

	const { state, dropped } = salvageState(shell.data);
	return { kind: 'loaded', state, dropped };
}

/**
 * Trier les objets un par un, en comptant ceux qu'on n'a pas su relire.
 *
 * Jamais de rejet en bloc : un objet abîmé ne doit pas coûter tout l'atelier.
 */
export function salvageObjects(candidates: readonly unknown[]): {
	objects: StoredObject[];
	dropped: number;
} {
	const objects: StoredObject[] = [];
	let dropped = 0;
	for (const candidate of candidates) {
		const one = storedObjectSchema.safeParse(candidate);
		if (one.success) objects.push(one.data);
		else dropped++;
	}
	return { objects, dropped };
}

/**
 * Trier les cellules une par une : une adresse hors de A1-Z200, un texte trop
 * long ou qui n'est pas du texte écarte la cellule, jamais la grille.
 */
export function salvageGrid(candidate: unknown): { grid: StoredGrid; dropped: number } {
	let dropped = 0;
	const kept = <T extends readonly [string, string]>(
		entries: unknown,
		schema: z.ZodType<T>,
		empty: (text: string) => boolean
	): Record<string, string> => {
		const result: Record<string, string> = {};
		if (entries === null || typeof entries !== 'object' || Array.isArray(entries)) return result;
		for (const entry of Object.entries(entries)) {
			const one = schema.safeParse(entry);
			if (one.success && !empty(one.data[1])) result[one.data[0]] = one.data[1];
			else if (!one.success) dropped++;
		}
		return result;
	};
	const raw = candidate as
		{ cells?: unknown; titles?: unknown; seed?: unknown; formats?: unknown } | null | undefined;
	const cells = kept(raw?.cells, storedCellSchema, (text) => text.trim() === '');
	const titles = kept(raw?.titles, storedTitleSchema, () => false);
	// Une graine illisible est écartée : les tirages seront neufs, la grille reste
	const seed = seedSchema.safeParse(raw?.seed);
	const grid: StoredGrid = {
		...(Object.keys(cells).length > 0 && { cells }),
		...(Object.keys(titles).length > 0 && { titles }),
		...(seed.success && { seed: seed.data }),
		...salvageFormats(raw?.formats)
	};
	return { grid, dropped: dropped + formatsDropped(raw?.formats) };
}

/** Les mises en forme lisibles, une par une : une seule forgée n'emporte pas les autres. */
function salvageFormats(candidate: unknown): { formats?: StoredFormat[] } {
	if (!Array.isArray(candidate)) return {};
	// Bornées (règle 1) : un lien forgé de 15 000 zones figeait l'onglet (revue)
	const kept = candidate.slice(0, MAX_FORMAT_ZONES).flatMap((entry) => {
		const one = storedFormatSchema.safeParse(entry);
		return one.success ? [one.data as StoredFormat] : [];
	});
	return kept.length > 0 ? { formats: kept } : {};
}

function formatsDropped(candidate: unknown): number {
	if (!Array.isArray(candidate)) return 0;
	const read = candidate.slice(0, MAX_FORMAT_ZONES);
	const unread = candidate.length - read.length;
	return unread + read.filter((entry) => !storedFormatSchema.safeParse(entry).success).length;
}

/** L'état relu d'une enveloppe validée : objets puis cellules, chacun trié à part. */
export function salvageState(shell: z.infer<typeof atelierShellSchema>): {
	state: AtelierState;
	dropped: number;
} {
	const { objects, dropped } = salvageObjects(shell.objects);
	const { grid, dropped: lostCells } = salvageGrid(shell.grid);
	// Sans cellule ni titre, pas de grille : l'état relu est celui qui a été rangé
	const kept = Object.keys(grid).length > 0 ? { grid } : {};
	return { state: { version: shell.version, objects, ...kept }, dropped: dropped + lostCells };
}

// =============================================================================
// Migrer
// =============================================================================

/** `y` et les cartes qui le suivent : `y′`, `y″`, `y⁻¹` (rangés `y'`, `y''`, `y^-1`). */
const RESERVED_Y = /^y('*|\^-1)$/;

/**
 * Renommer l'objet `y` d'un atelier rangé avant que `y` soit réservé (G5 de la
 * géométrie, Q2 (a) du 2026-10-18) : à la première lettre libre de son type,
 * ses cartes `y′`, `y⁻¹` avec lui, et tout ce qui le cite réécrit — définitions,
 * premier terme d'une suite, formules de la grille. Jamais de perte : l'appelant
 * dit à l'élève ce qui a changé (`renamed`).
 *
 * Appliquée à toute relecture, quelle que soit la version : un état récent n'a
 * jamais d'objet `y`, et un lien forgé qui en porte un est relu de même.
 *
 * @param taken - Les noms déjà pris ailleurs (fusion dans l'atelier personnel)
 */
export function migrateReservedNames(
	state: AtelierState,
	taken: readonly string[] = []
): { state: AtelierState; renamed: ReadonlyArray<{ from: string; to: string }> } {
	const owner = state.objects.find((o) => o.name === 'y');
	if (owner === undefined && !state.objects.some((o) => RESERVED_Y.test(o.name))) {
		return { state, renamed: [] };
	}
	const to = nextName(owner?.kind ?? 'function', [...state.objects.map((o) => o.name), ...taken]);
	const renames = new Map([['y', to]]);
	const objects = state.objects.map((o): StoredObject => {
		const match = RESERVED_Y.exec(o.name);
		const name = match === null ? o.name : `${to}${match[1]}`;
		// Une courbe n'est jamais réécrite : son y est la variable de l'équation
		const definition =
			o.kind === 'curve'
				? o.definition
				: o.kind === 'list'
					? definitionFrom(entriesOf(o.definition).map((text) => renameInFormula(text, renames)))
					: renameInDefinition(o.definition, 'y', to);
		return {
			...o,
			name,
			definition,
			...(o.firstTerm === 'y' && { firstTerm: to })
		};
	});
	const cells = state.grid?.cells;
	const grid =
		state.grid === undefined
			? {}
			: {
					grid: {
						...state.grid,
						...(cells !== undefined && {
							cells: Object.fromEntries(
								Object.entries(cells).map(([address, text]) => [
									address,
									renameInFormula(text, renames)
								])
							)
						})
					}
				};
	return {
		state: { ...state, objects, ...grid },
		renamed: [{ from: 'y', to }]
	};
}

// =============================================================================
// Ranger
// =============================================================================

/**
 * Le stockage est-il plein ? Firefox n'emploie pas le même nom ni le même code
 * que les autres — s'en tenir à « QuotaExceededError » faisait afficher le
 * message « rien ne sera conservé » à la place de « exporte ou supprime ».
 */
export function isQuotaExceeded(error: unknown): boolean {
	return (
		error instanceof DOMException &&
		(error.name === 'QuotaExceededError' ||
			error.name === 'NS_ERROR_DOM_QUOTA_REACHED' ||
			error.code === 22 ||
			error.code === 1014)
	);
}

/** @param key - Comme pour `loadAtelier` : l'atelier personnel par défaut. */
export function saveAtelier(
	storage: Storage | null,
	state: AtelierState,
	key: string = ATELIER_STORAGE_KEY
): SaveOutcome {
	if (!storage) return { kind: 'unavailable' };

	// Ne jamais écraser plus récent que soi (§5 L2).
	const existing = loadAtelier(storage, key);
	if (existing.kind === 'too-recent') {
		return { kind: 'refused-newer', version: existing.version };
	}
	if (existing.kind === 'unavailable') return { kind: 'unavailable' };

	// ⚠️ Ne jamais ranger ce qu'on ne saura pas relire. Sans ce garde, un atelier
	// trop gros s'enregistrait « avec succès » puis revenait vide au rechargement :
	// l'élève perdait tout après qu'on lui a dit que c'était sauvegardé.
	const serialized = JSON.stringify(state);
	if (serialized.length > MAX_SERIALIZED_LENGTH) {
		return {
			kind: 'too-large',
			message: `L'atelier est trop volumineux pour être enregistré (${Math.round(serialized.length / 1000)} ko). Exporte-le dans un fichier, ou supprime des objets.`
		};
	}

	try {
		storage.setItem(key, serialized);
		return { kind: 'saved' };
	} catch (error) {
		if (isQuotaExceeded(error)) {
			// ⚠️ On ne réduit PAS l'atelier pour faire tenir : le store de la
			// calculatrice le fait et vide l'historique sans rien dire. Ici c'est
			// le travail de l'élève, il doit savoir et choisir.
			return {
				kind: 'quota',
				message:
					"Il n'y a plus de place pour enregistrer l'atelier. Exporte-le dans un fichier, ou supprime des objets."
			};
		}
		return { kind: 'unavailable' };
	}
}

// =============================================================================
// Un autre onglet a écrit (§5 L4)
// =============================================================================

export type ForeignWriteOutcome =
	/** L'atelier a changé ailleurs, et voici ce qui y est désormais rangé. */
	| { readonly kind: 'changed'; readonly state: AtelierState; readonly message: string }
	/** Un autre onglet a effacé l'atelier. */
	| { readonly kind: 'cleared'; readonly message: string }
	/** Ce qui a été écrit ailleurs est illisible d'ici. */
	| { readonly kind: 'corrupt'; readonly message: string }
	/** L'écriture ne nous concerne pas. */
	| { readonly kind: 'ignored' };

/**
 * Lire ce qu'un autre onglet vient d'écrire.
 *
 * Le navigateur émet `storage` dans les AUTRES pages de la même origine, jamais
 * dans celle qui écrit : recevoir cet événement signifie donc littéralement
 * « quelqu'un d'autre a touché à l'atelier ».
 *
 * ⚠️ **Le dernier qui écrit gagne, et on ne fusionne pas** — mais on prévient.
 * C'est la différence avec le grapheur, où deux onglets s'écrasent aujourd'hui
 * en silence. L'état reçu est rendu à l'appelant, qui peut proposer de le
 * reprendre plutôt que d'imposer un choix.
 */
export function readForeignWrite(event: StorageEvent): ForeignWriteOutcome {
	if (event.key !== ATELIER_STORAGE_KEY) return { kind: 'ignored' };

	if (event.newValue === null) {
		return {
			kind: 'cleared',
			message: "L'atelier a été vidé dans un autre onglet."
		};
	}

	let parsed: unknown;
	try {
		parsed = JSON.parse(event.newValue);
	} catch {
		return {
			kind: 'corrupt',
			message: 'Un autre onglet a enregistré un atelier que celui-ci ne sait pas lire.'
		};
	}

	const shell = atelierShellSchema.safeParse(parsed);
	if (!shell.success) {
		return {
			kind: 'corrupt',
			message: 'Un autre onglet a enregistré un atelier que celui-ci ne sait pas lire.'
		};
	}

	// Même tolérance qu'à la lecture : un objet abîmé ne coûte pas le reste.
	const { state } = salvageState(shell.data);
	return {
		kind: 'changed',
		state,
		message: "L'atelier a été modifié dans un autre onglet."
	};
}
