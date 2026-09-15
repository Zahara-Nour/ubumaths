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

		this.items[index] = { ...this.items[index], name: to } as AtelierObject;

		// Les définitions qui citaient l'ancien nom suivent : c'est ce qu'attend
		// un élève, et on le lui dit en rendant la liste.
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
		this.items[index] = this.build(name, this.items[index].kind, definition);
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
				refs.filter((r) => living.has(r.name)).map((r) => r.name)
			);
			missing.set(
				o.name,
				refs.filter((r) => !living.has(r.name))
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

		this.items = this.items.map((o) => {
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
