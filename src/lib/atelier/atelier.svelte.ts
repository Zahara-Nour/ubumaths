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

import type { AtelierObject, ObjectKind, ListObject, ValueObject } from './types';
import { validateName, nextName, nameRejectionMessage } from './names';
import { parseDefinition, referencedNames, renameInDefinition } from './parse';

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

const brokenMessage = (missing: readonly string[]) =>
	missing.length === 1
		? `Dépend de « ${missing[0]} », qui est en erreur ou n'existe plus.`
		: `Dépend de ${missing.map((n) => `« ${n} »`).join(', ')}, en erreur ou disparus.`;

// =============================================================================
// Atelier
// =============================================================================

export class Atelier {
	/** Les objets, dans leur ordre de création. */
	private items = $state<AtelierObject[]>([]);

	/**
	 * Les noms qui ont existé dans cet atelier, même supprimés depuis.
	 *
	 * Sans cette mémoire, une définition qui cite un objet supprimé n'a plus
	 * aucune dépendance détectable — elle redeviendrait « correcte » alors
	 * qu'elle ne peut plus rien produire. On ne signale donc que ce qu'on SAIT
	 * avoir disparu : un nom jamais défini reste ignoré (voir la limite notée
	 * dans le doc de progression).
	 */
	private seen = new Set<string>();

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
			name = nextName(input.kind, this.names);
		} else {
			const rejection = validateName(input.name, this.names);
			if (rejection) return { ok: false, message: nameRejectionMessage(rejection, input.name) };
			name = input.name;
		}

		this.seen.add(name);
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

		this.seen.add(to);
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
			.filter((o) => o.name !== name && referencedNames(o.definition, this.names).includes(name))
			.map((o) => o.name);
	}

	// ---------------------------------------------------------------------------
	// Interne
	// ---------------------------------------------------------------------------

	/** Construire un objet à partir de sa définition, erreur de lecture comprise. */
	private build(name: string, kind: ObjectKind, definition: string): AtelierObject {
		const parsed = parseDefinition(kind, definition);
		const base = { name, definition, ...(parsed.error ? { error: parsed.error } : {}) };

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
	 * Recalculer les erreurs de tout l'atelier.
	 *
	 * Trois causes, dans cet ordre : la définition elle-même est illisible, elle
	 * participe d'un cycle, ou elle dépend d'un objet en erreur ou disparu.
	 */
	private recomputeAll(): void {
		const names = this.names;
		const living = new Set(names);
		// Les noms ayant existé comptent comme références : un objet supprimé
		// laisse ses dépendants cassés, il ne les rend pas sains.
		const referable = [...new Set([...names, ...this.seen])];

		// 1. Erreur propre à la définition — on repart de zéro à chaque passe.
		const own = new Map<string, string | undefined>();
		for (const o of this.items) {
			own.set(o.name, parseDefinition(o.kind, o.definition).error);
		}

		// 2. Cycles. Une suite qui se cite elle-même est une récurrence, pas un
		//    cycle : `u_{n+1} = 0,5·u_n + 3` est une définition parfaitement saine.
		const edges = new Map<string, string[]>();
		const missing = new Map<string, string[]>();
		for (const o of this.items) {
			const refs = referencedNames(o.definition, referable).filter(
				(r) => !(r === o.name && o.kind === 'sequence')
			);
			edges.set(
				o.name,
				refs.filter((r) => living.has(r))
			);
			missing.set(
				o.name,
				refs.filter((r) => !living.has(r))
			);
		}

		const state = new Map<string, 'visiting' | 'done'>();
		const inCycle = new Set<string>();
		const visit = (node: string, path: string[]): void => {
			if (state.get(node) === 'done') return;
			if (state.get(node) === 'visiting') {
				// On retombe sur un nœud du chemin courant : tout ce segment boucle.
				for (const n of path.slice(path.indexOf(node))) inCycle.add(n);
				return;
			}
			state.set(node, 'visiting');
			for (const next of edges.get(node) ?? []) visit(next, [...path, next]);
			state.set(node, 'done');
		};
		for (const name of names) visit(name, [name]);

		// 3. Contamination : dépendre d'un objet en erreur est une erreur.
		const failing = new Set<string>();
		for (const [name, error] of own) if (error) failing.add(name);
		for (const name of inCycle) failing.add(name);
		for (const [name, gone] of missing) if (gone.length > 0) failing.add(name);

		let changed = true;
		while (changed) {
			changed = false;
			for (const o of this.items) {
				if (failing.has(o.name)) continue;
				const refs = edges.get(o.name) ?? [];
				if (refs.some((r) => failing.has(r))) {
					failing.add(o.name);
					changed = true;
				}
			}
		}

		// Écriture finale, en une passe.
		this.items = this.items.map((o) => {
			let error: string | undefined;
			if (own.get(o.name)) error = own.get(o.name);
			else if (inCycle.has(o.name)) error = CIRCULAR;
			else if (failing.has(o.name)) {
				const gone = missing.get(o.name) ?? [];
				const culprits =
					gone.length > 0 ? gone : (edges.get(o.name) ?? []).filter((r) => failing.has(r));
				error = brokenMessage(culprits);
			}
			if (o.error === error) return o;
			const next = { ...o } as AtelierObject & { error?: string };
			if (error) next.error = error;
			else delete next.error;
			return next;
		});
	}
}
