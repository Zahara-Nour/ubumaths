/**
 * Atelier — garder dans son atelier ce qu'on a reçu
 *
 * Décision Q2 (2026-09-16) : sur une collision de noms, **l'arrivant est
 * renommé**, et on dit ce qui a été fait.
 *
 * ⚠️ Jamais d'écrasement silencieux — c'est la règle du §2.2, et elle vaut ici
 * comme partout ailleurs dans l'atelier. Les deux autres voies étaient un écran
 * par collision (insupportable au-delà de deux) et le refus pur (l'élève ne
 * peut alors rien garder de ce qu'il a reçu).
 *
 * @module atelier/merge
 */

import { Atelier, sequenceInputOf } from './atelier.svelte';
import { loadAtelier, migrateReservedNames, saveAtelier, type AtelierState } from './persistence';
import { nextName, derivativeOf, displayName, reciprocalName, reciprocalOf } from './names';
import {
	cellTextFromStored,
	columnLetter,
	columnOfLetter,
	definitionFrom,
	entriesOf,
	readCellName,
	renameInFormula,
	type CellEdit
} from './grid';
import { remapColumns } from './formula';
import { formatOf, normalizeFormats, type FormatZone } from './cell-format';

// =============================================================================
// Types
// =============================================================================

/** Ce qu'une fusion a fait — à montrer, jamais à taire. */
export interface MergeReport {
	/** Objets ajoutés sous leur nom d'origine. */
	readonly added: number;
	/** Objets ajoutés sous un autre nom, parce que le leur était pris. */
	readonly renamed: ReadonlyArray<{ readonly from: string; readonly to: string }>;
	/** Objets refusés, et pourquoi — un plafond atteint, par exemple. */
	readonly refused: ReadonlyArray<{ readonly name: string; readonly reason: string }>;
	/**
	 * Des cases à hasard sont arrivées (ALEA, lot 5) : la graine reste la nôtre,
	 * leurs tirages sont donc refaits — à dire (phase 0 §4).
	 */
	readonly redrawn: boolean;
	/**
	 * Les objets de l'atelier PERSONNEL renommés à sa relecture (`y` devenu
	 * réservé, Q2 de la géométrie) : enregistrés sous leur nouveau nom, donc à
	 * dire — sans quoi l'élève retrouverait `a` à la place de son `y`, en silence.
	 */
	readonly migrated?: ReadonlyArray<{ readonly from: string; readonly to: string }>;
}

// =============================================================================
// Fonctions
// =============================================================================

/**
 * Verser dans l'atelier ce qu'une URL portait.
 *
 * ⚠️ Les noms sont réservés **au fur et à mesure** : deux arrivants qui
 * réclament le même nom ne peuvent pas recevoir le même remplacement, sinon le
 * second écraserait le premier — l'écrasement qu'on cherche justement à éviter.
 */
/**
 * Les colonnes qu'occupe un atelier reçu, dans l'ordre : une par liste (sa
 * colonne rangée, ou une place à elle en version 1), une par colonne sans nom
 * remplie. Chacune ira dans une colonne libre de l'atelier qui reçoit (T7).
 */
function arrivingColumns(state: AtelierState): string[] {
	const slots: string[] = [];
	const add = (slot: string) => {
		if (!slots.includes(slot)) slots.push(slot);
	};
	state.objects.forEach((stored, index) => {
		if (stored.kind === 'list') add(stored.column ?? `liste ${index}`);
	});
	for (const address of Object.keys(state.grid?.cells ?? {})) {
		const at = readCellName(address);
		if (at !== null) add(columnLetter(at.column));
	}
	// Une colonne qui n'a qu'un titre est une colonne aussi (T4)
	for (const letter of Object.keys(state.grid?.titles ?? {})) {
		if (columnOfLetter(letter) !== null) add(letter);
	}
	// De gauche à droite, pour que la grille reçue garde son ordre
	return slots.sort((a, b) => columnRank(a) - columnRank(b));
}

/** La mise en forme reçue, sous sa forme canonique (seulement ce qui se voit). */
function receivedFormats(state: AtelierState): FormatZone[] {
	return normalizeFormats(
		(state.grid?.formats ?? []).flatMap((stored) => {
			const format = formatOf(stored);
			return format === null ? [] : [format];
		})
	);
}

/**
 * Les colonnes reçues qui n'ont QUE de la mise en forme (une colonne « Monnaie »
 * préparée, une ligne d'en-tête en gras qui déborde) : elles arrivent s'il reste
 * des colonnes libres, sans jamais faire refuser l'atelier reçu (revue).
 */
function formatOnlyColumns(state: AtelierState, arriving: readonly string[]): string[] {
	const letters = new Set<string>();
	for (const { zone } of receivedFormats(state)) {
		for (let column = zone.left; column <= zone.right; column++) {
			const letter = columnLetter(column);
			if (!arriving.includes(letter)) letters.add(letter);
		}
	}
	return [...letters].sort();
}

/** Une lettre de colonne, puis les listes de version 1 dans leur ordre. */
function columnRank(slot: string): number {
	const letter = columnOfLetter(slot);
	return letter !== null ? letter : 100 + Number(slot.slice('liste '.length));
}

/**
 * Pourquoi cet atelier reçu ne peut pas être versé, ou `null` : ses colonnes
 * doivent toutes trouver une colonne libre (T7). Tout ou rien — une grille
 * versée à moitié mélangerait les colonnes de l'élève et celles reçues.
 */
export function mergeRefusal(atelier: Atelier, state: AtelierState): string | null {
	const needed = arrivingColumns(state).length;
	const free = atelier.freeColumns.length;
	if (needed <= free) return null;
	return `Cet atelier a besoin de ${needed} colonnes libres dans ta grille, il en reste ${free} : rien n’a été versé.`;
}

export function mergeInto(atelier: Atelier, received: AtelierState): MergeReport {
	// Q2 de la géométrie : un objet `y` reçu (nom réservé depuis) prend une lettre
	// libre ICI comme là-bas — sinon un second renommage laisserait ceux qui le
	// citent sur l'ancien nom
	const migration = migrateReservedNames(received, atelier.names);
	const state = migration.state;
	const migratedFrom = new Map(migration.renamed.map((r) => [r.to, r.from]));
	const randomBefore = atelier.randomCells;
	let added = 0;
	// Chaque colonne reçue va dans une colonne libre, de gauche à droite (T7)
	const free = atelier.freeColumns;
	const arriving = arrivingColumns(state);
	// Les colonnes qui n'ont que de la mise en forme : autant qu'il reste de place
	// (les plus à droite cèdent d'abord), puis TOUTES rangées ensemble de gauche à
	// droite — la grille reçue garde son ordre (contre-revue)
	const room = Math.max(0, free.length - arriving.length);
	const decorative = formatOnlyColumns(state, arriving).slice(0, room);
	const columns = [...arriving, ...decorative].sort((a, b) => columnRank(a) - columnRank(b));
	const placed = new Map(columns.map((slot, index) => [slot, free[index]]));
	// Les colonnes reçues → leur place : les références des formules les suivent (T7)
	const moved = new Map<number, number>();
	for (const [slot, column] of placed) {
		const from = columnOfLetter(slot);
		if (from !== null && column !== undefined) moved.set(from, column);
	}
	const follow = (text: string) => remapColumns(text, moved);
	const renamed: Array<{ from: string; to: string }> = [];
	const refused: Array<{ name: string; reason: string }> = [];

	// Les fonctions renommées à l'arrivée : leurs dérivées doivent les suivre
	const arrivedAs = new Map<string, string>();
	/** Les objets effectivement créés (une f refusée n'emmène pas sa réciproque) */
	const landed = new Set<string>();
	/** Les listes créées : leurs formules suivront les objets renommés */
	const landedLists: { column: number; entries: string[] }[] = [];

	// Les fonctions AVANT leurs dérivées : supprimer puis recréer `f` range `f′`
	// devant elle, et `f′` aurait suivi la `f` locale (revue du lot 3a, C1)
	// (et avant leur réciproque `f⁻¹`, qui suit f de la même façon)
	const order = (name: string) =>
		derivativeOf(name)?.order ?? (reciprocalOf(name) !== null ? 1 : 0);
	const ordered = [...state.objects]
		.map((stored, index) => ({ stored, index }))
		.sort((a, b) => order(a.stored.name) - order(b.stored.name));

	for (const { stored, index } of ordered) {
		const taken = atelier.names;
		const wanted = stored.name;
		const derivative = derivativeOf(wanted);
		const reciprocal = reciprocalOf(wanted);
		let chosen: string;
		if (reciprocal !== null) {
			// `f⁻¹` suit f : arrivée sous le nom `g`, sa réciproque devient `g⁻¹`
			// Sa f n'est pas arrivée (refusée) : la rattacher à la f locale serait faux
			const base = landed.has(reciprocal) ? arrivedAs.get(reciprocal) : undefined;
			if (base === undefined) {
				refused.push({ name: wanted, reason: `${reciprocal} n'est pas arrivée.` });
				continue;
			}
			chosen = reciprocalName(base);
			if (taken.includes(chosen)) {
				refused.push({ name: wanted, reason: `${displayName(chosen)} existe déjà.` });
				continue;
			}
		} else if (derivative !== null) {
			// `f′` suit `f` : si `f` est arrivée sous le nom `g`, elle devient `g′`
			const base = arrivedAs.get(derivative.base) ?? derivative.base;
			chosen = `${base}${"'".repeat(derivative.order)}`;
			if (taken.includes(chosen)) {
				refused.push({ name: wanted, reason: `${displayName(chosen)} existe déjà.` });
				continue;
			}
		} else {
			chosen = taken.includes(wanted) ? nextName(stored.kind, taken) : wanted;
		}
		arrivedAs.set(wanted, chosen);

		const input = {
			kind: stored.kind,
			name: chosen,
			// La définition d'une dérivée est son propre nom : `g′(x)`, pas `f′(x)`
			definition:
				derivative !== null
					? `${chosen}(x)`
					: stored.kind === 'list'
						? definitionFrom(entriesOf(stored.definition).map(follow))
						: stored.definition,
			...(stored.kind === 'function' &&
				stored.reciprocalOn !== undefined && { reciprocalOn: stored.reciprocalOn }),
			...(stored.kind === 'sequence' && { sequence: sequenceInputOf(stored) }),
			...(stored.kind === 'list' && {
				column: placed.get(stored.column ?? `liste ${index}`)
			})
		};
		// Ce qui vient d'une URL a été écrit par nous : même lecture qu'au
		// rangement, pour que l'aller-retour ne change pas le sens (D10).
		// L'ensemble d'une fonction suit ; refusé, la fonction arrive sur son domaine.
		let created =
			stored.kind === 'function' && stored.interval !== undefined
				? atelier.create({ ...input, interval: stored.interval }, 'url')
				: atelier.create(input, 'url');
		if (!created.ok && stored.interval !== undefined) created = atelier.create(input, 'url');

		if (!created.ok) {
			refused.push({ name: wanted, reason: created.message });
			continue;
		}

		landed.add(wanted);
		const column = input.column;
		if (column !== undefined) {
			landedLists.push({ column, entries: entriesOf(input.definition) });
		}
		const typed = migratedFrom.get(wanted) ?? wanted;
		if (chosen === typed) added++;
		else renamed.push({ from: typed, to: chosen });

		// L'état d'affichage suit l'objet : un atelier reçu avec ses courbes
		// tracées s'ouvre avec ses courbes tracées, et de leurs couleurs. Les
		// réglages AVANT le tracé, sinon `setPlotted` en attribuerait de neufs.
		if (stored.display) atelier.adoptDisplay(chosen, stored.display);
		if (stored.sequenceDisplay) atelier.adoptSequenceDisplay(chosen, stored.sequenceDisplay);
		if (stored.figureDisplay) atelier.adoptFigureDisplay(chosen, stored.figureDisplay);
		if (stored.slider) atelier.adoptSlider(chosen, stored.slider);
		if (stored.plotted) atelier.setPlotted(chosen, true);
		if (stored.inFigure) atelier.setInFigure(chosen, true);
	}

	// Un objet renommé à l'arrivée (`f` → `g`) : les formules reçues l'appellent
	// sous son nouveau nom, sinon `=f(3)` calculerait avec la f locale, sans rien
	// dire (revue). Après la boucle : une liste peut arriver avant sa fonction.
	const renames = new Map(renamed.map((r) => [r.from, r.to]));
	const renameIn = (text: string) => renameInFormula(text, renames);
	const cells: CellEdit[] = landedLists.flatMap(({ column, entries }) =>
		entries.flatMap((text, i) => {
			const after = renameIn(text);
			return after === text ? [] : [{ column, row: i + 1, text: after }];
		})
	);

	// Les cellules sans nom, dans la colonne que leur colonne d'origine a reçue
	for (const [address, text] of Object.entries(state.grid?.cells ?? {})) {
		const at = readCellName(address);
		const column = at === null ? undefined : placed.get(columnLetter(at.column));
		if (at !== null && column !== undefined) {
			cells.push({ column, row: at.row, text: renameIn(follow(cellTextFromStored(text))) });
		}
	}
	// La mise en forme reçue suit ses colonnes, comme ses cases (T7) : chaque zone,
	// colonne par colonne, va là où sa colonne a été placée
	let unplaced = 0;
	const formats: FormatZone[] = receivedFormats(state).flatMap(({ zone, patch }) => {
		const moved: FormatZone[] = [];
		for (let column = zone.left; column <= zone.right; column++) {
			const target = placed.get(columnLetter(column));
			if (target === undefined) unplaced++;
			else moved.push({ zone: { ...zone, left: target, right: target }, patch });
		}
		return moved;
	});
	if (unplaced > 0) {
		refused.push({
			name: 'mise en forme',
			reason: 'Une partie de la mise en forme n’a pas trouvé de colonne libre.'
		});
	}

	// Titres, cases et mise en forme : UN geste, qu'un seul Ctrl+Z défait (revue)
	atelier.asOneGesture(() => {
		for (const [letter, title] of Object.entries(state.grid?.titles ?? {})) {
			const column = placed.get(letter);
			if (column !== undefined) atelier.setTitle(column, title);
		}
		// Un refus se dit dans le rapport, jamais en silence (revue)
		const written = cells.length > 0 ? atelier.editCells(cells) : null;
		if (written !== null && !written.ok) refused.push({ name: 'grille', reason: written.message });
		const styled = atelier.adoptFormats(formats);
		// Un seul refus « mise en forme » dans le rapport (contre-revue)
		if (!styled.ok && unplaced === 0)
			refused.push({ name: 'mise en forme', reason: styled.message });
	});

	// Tout ce qui est arrivé : cases sans nom ET entrées des listes nommées
	// Ce qui a vraiment été écrit (une grille refusée n'a rien tiré : revue)
	const redrawn = atelier.randomCells > randomBefore;
	return { added, renamed, refused, redrawn };
}

/**
 * « Garder dans mon atelier » : verser un atelier reçu dans l'atelier
 * PERSONNEL, celui du navigateur, et l'enregistrer.
 *
 * ⚠️ Revue du lot 6 (C1) : la barre de partage versait dans l'atelier affiché
 * — l'atelier ÉPHÉMÈRE du lien, qui contenait déjà ces objets. Il en sortait
 * des copies renommées, et rien n'était enregistré.
 */
export function keepReceived(
	storage: Storage | null,
	received: AtelierState
): { ok: true; report: MergeReport } | { ok: false; message: string } {
	const personal = new Atelier();
	const loaded = loadAtelier(storage);
	let migrated: MergeReport['migrated'] = [];
	if (loaded.kind === 'loaded') migrated = personal.restore(loaded.state).renamed;
	else if (
		loaded.kind === 'too-recent' ||
		loaded.kind === 'corrupt' ||
		loaded.kind === 'unavailable'
	) {
		return {
			ok: false,
			message: 'Ton atelier enregistré ne peut pas être ouvert ici : rien n’a été versé.'
		};
	}
	const refusal = mergeRefusal(personal, received);
	if (refusal !== null) return { ok: false, message: refusal };
	const report = mergeInto(personal, received);
	const saved = saveAtelier(storage, personal.serialize());
	if (saved.kind !== 'saved') {
		return { ok: false, message: 'Ton atelier n’a pas pu être enregistré : rien n’a été versé.' };
	}
	return { ok: true, report: migrated.length > 0 ? { ...report, migrated } : report };
}
