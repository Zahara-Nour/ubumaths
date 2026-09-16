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

import { MAX_LISTS } from './types';
import type {
	AtelierObject,
	MissingReference,
	ObjectKind,
	ObjectStatus,
	ListObject,
	ValueObject
} from './types';
import { validateName, nextName, nameRejectionMessage } from './names';
import { parseDefinition, referencesOf, renameInDefinition } from './parse';
import { ATELIER_STATE_VERSION, type AtelierState, type StoredObject } from './persistence';

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
}

// =============================================================================
// Constantes
// =============================================================================

/** Bornes d'un curseur neuf — décision D3, reprises du grapheur. */
const DEFAULT_SLIDER = { min: -10, max: 10, step: 0.1 } as const;

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

	get objects(): readonly AtelierObject[] {
		return this.items;
	}

	/** Les noms pris, tous types confondus (décision D1). */
	get names(): readonly string[] {
		return this.items.map((o) => o.name);
	}

	get(name: string): AtelierObject | undefined {
		return this.items.find((o) => o.name === name);
	}

	// ---------------------------------------------------------------------------
	// Création
	// ---------------------------------------------------------------------------

	create(input: CreateInput): Created | Refused {
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
			const cited = referencesOf(definition).map((r) => r.name);
			name = nextName(input.kind, this.names, cited);
		} else {
			const rejection = validateName(input.name, this.names);
			if (rejection) return { ok: false, message: nameRejectionMessage(rejection, input.name) };
			name = input.name;
		}

		this.items.push(this.build(name, input.kind, definition));
		this.recomputeAll();
		return { ok: true, object: this.get(name)! };
	}

	// ---------------------------------------------------------------------------
	// Renommage
	// ---------------------------------------------------------------------------

	rename(from: string, to: string): Renamed | Refused {
		const index = this.items.findIndex((o) => o.name === from);
		if (index === -1) return { ok: false, message: `« ${from} » n'existe pas.` };

		const others = this.names.filter((n) => n !== from);
		const rejection = validateName(to, others);
		if (rejection) return { ok: false, message: nameRejectionMessage(rejection, to) };

		// L'objet renommé voit sa PROPRE définition réécrite lui aussi : une suite
		// récurrente se cite elle-même (`u(n+1) = 2·u(n)`), et l'oublier la
		// laisserait en attente de son ancien nom.
		this.items[index] = {
			...this.items[index],
			name: to,
			definition: renameInDefinition(this.items[index].definition, from, to)
		} as AtelierObject;

		// Les définitions qui citaient l'ancien nom suivent : c'est ce qu'attend
		// un élève, et on le lui dit en rendant la liste. L'objet renommé n'y
		// figure pas — il n'a pas été « mis à jour », il a été renommé.
		const updated: string[] = [];
		this.items.forEach((o, i) => {
			if (o.name === to) return;
			const rewritten = renameInDefinition(o.definition, from, to);
			if (rewritten !== o.definition) {
				this.items[i] = { ...o, definition: rewritten } as AtelierObject;
				updated.push(o.name);
			}
		});

		this.recomputeAll();
		return { ok: true, updated };
	}

	// ---------------------------------------------------------------------------
	// Modification
	// ---------------------------------------------------------------------------

	update(name: string, definition: string): Updated | Refused {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return { ok: false, message: `« ${name} » n'existe pas.` };

		const dependents = this.allDependents(name);
		// ⚠️ `build()` fabrique un objet NEUF : ce qui relève de l'affichage doit
		// être reporté à la main, sinon modifier une fonction fait disparaître sa
		// courbe. Même famille que le curseur écrasé (revue #334, point 7) : tout
		// état d'affichage ajouté ici devra être reporté là.
		const previous = this.items[index];
		const rebuilt = this.build(name, previous.kind, definition);
		this.items[index] = (
			previous.plotted ? { ...rebuilt, plotted: true } : rebuilt
		) as AtelierObject;
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
		this.recomputeAll();

		return { ok: true, broken };
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
			...(o.plotted ? { plotted: true } : {})
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
		const skipped: SkippedObject[] = [];

		for (const stored of state.objects) {
			const result = this.create({
				kind: stored.kind,
				name: stored.name,
				definition: stored.definition
			});
			if (!result.ok) skipped.push({ name: stored.name, reason: result.message });
			else if (stored.plotted) this.setPlotted(stored.name, true);
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
	setPlotted(name: string, plotted: boolean): void {
		const index = this.items.findIndex((o) => o.name === name);
		if (index === -1) return;
		this.items[index] = { ...this.items[index], plotted } as AtelierObject;
		this.recomputeAll();
	}

	/** Les objets dont la définition cite `name`, directement. */
	dependents(name: string): readonly string[] {
		return this.items
			.filter((o) => o.name !== name && referencesOf(o.definition).some((ref) => ref.name === name))
			.map((o) => o.name);
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
	private build(name: string, kind: ObjectKind, definition: string): AtelierObject {
		const parsed = parseDefinition(kind, definition);
		const base = {
			name,
			definition,
			status: (definition.trim() === '' ? 'incomplete' : 'ok') as ObjectStatus
		};

		switch (kind) {
			case 'list':
				return {
					...base,
					kind: 'list',
					values: parsed.values ?? [],
					skipped: parsed.skipped ?? 0
				} satisfies ListObject;
			case 'value': {
				// Décision D4 : une grandeur n'est pas pilotable par un curseur.
				const value: ValueObject = {
					...base,
					kind: 'value',
					...(parsed.unit ? { unit: parsed.unit } : { slider: { ...DEFAULT_SLIDER } })
				};
				return value;
			}
			case 'function':
				return { ...base, kind: 'function', variable: 'x' };
			case 'sequence':
				return { ...base, kind: 'sequence', variable: 'n' };
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
			ownError.set(o.name, parseDefinition(o.kind, o.definition).error);

			// Une suite qui se cite elle-même est une récurrence, pas un cycle :
			// `u(n+1) = 0,5·u(n) + 3` est une définition parfaitement saine.
			const refs = referencesOf(o.definition).filter(
				(r) => !(r.name === o.name && o.kind === 'sequence')
			);
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
