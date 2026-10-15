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
import { loadAtelier, saveAtelier, type AtelierState } from './persistence';
import { nextName, derivativeOf, displayName, reciprocalName, reciprocalOf } from './names';
import { columnLetter, columnOfLetter, definitionFrom, entriesOf, readCellName } from './grid';
import { remapColumns } from './formula';

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

export function mergeInto(atelier: Atelier, state: AtelierState): MergeReport {
	let added = 0;
	// Chaque colonne reçue va dans une colonne libre, de gauche à droite (T7)
	const free = atelier.freeColumns;
	const placed = new Map(arrivingColumns(state).map((slot, index) => [slot, free[index]]));
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
		if (chosen === wanted) added++;
		else renamed.push({ from: wanted, to: chosen });

		// L'état d'affichage suit l'objet : un atelier reçu avec ses courbes
		// tracées s'ouvre avec ses courbes tracées, et de leurs couleurs. Les
		// réglages AVANT le tracé, sinon `setPlotted` en attribuerait de neufs.
		if (stored.display) atelier.adoptDisplay(chosen, stored.display);
		if (stored.sequenceDisplay) atelier.adoptSequenceDisplay(chosen, stored.sequenceDisplay);
		if (stored.slider) atelier.adoptSlider(chosen, stored.slider);
		if (stored.plotted) atelier.setPlotted(chosen, true);
	}

	// Les cellules sans nom, dans la colonne que leur colonne d'origine a reçue
	const cells = Object.entries(state.grid?.cells ?? {}).flatMap(([address, text]) => {
		const at = readCellName(address);
		const column = at === null ? undefined : placed.get(columnLetter(at.column));
		return at === null || column === undefined ? [] : [{ column, row: at.row, text: follow(text) }];
	});
	for (const [letter, title] of Object.entries(state.grid?.titles ?? {})) {
		const column = placed.get(letter);
		if (column !== undefined) atelier.setTitle(column, title);
	}

	// Un refus se dit dans le rapport, jamais en silence (revue)
	const written = cells.length > 0 ? atelier.editCells(cells) : null;
	if (written !== null && !written.ok) refused.push({ name: 'grille', reason: written.message });

	return { added, renamed, refused };
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
	if (loaded.kind === 'loaded') personal.restore(loaded.state);
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
	return { ok: true, report };
}
