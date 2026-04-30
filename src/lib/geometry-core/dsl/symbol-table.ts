/**
 * Symbol table for the DSL interpreter.
 *
 * Tracks named values: numbers, geometric element references, and lists.
 */

export type SymbolType =
	| 'nombre'
	| 'point'
	| 'segment'
	| 'droite'
	| 'demidroite'
	| 'cercle'
	| 'polygone'
	| 'angleMark'
	| 'segmentMark'
	| 'text'
	| 'mathText'
	| 'richText'
	| 'arc'
	| 'courbe'
	| 'tangente'
	| 'vecteur'
	| 'transformation'
	| 'lieu'
	| 'trace'
	| 'scalar'
	| 'polaire'
	| 'liste';

export interface SymbolEntry {
	readonly type: SymbolType;
	readonly figureId?: string;
	readonly value?: number;
	readonly list?: SymbolEntry[];
}

export class SymbolTable {
	private scopes: Map<string, SymbolEntry>[] = [new Map()];

	pushScope(): void {
		this.scopes.push(new Map());
	}

	popScope(): void {
		if (this.scopes.length <= 1) throw new Error('Cannot pop global scope');
		this.scopes.pop();
	}

	set(name: string, entry: SymbolEntry): void {
		this.scopes[this.scopes.length - 1].set(name, entry);
	}

	get(name: string): SymbolEntry | undefined {
		for (let i = this.scopes.length - 1; i >= 0; i--) {
			const entry = this.scopes[i].get(name);
			if (entry) return entry;
		}
		return undefined;
	}

	/** Set an indexed entry: P[0], P[1], etc. stored as a list in the parent scope. */
	setIndexed(name: string, index: number, entry: SymbolEntry): void {
		const existing = this.get(name);
		if (existing && existing.type === 'liste' && existing.list) {
			const newList = [...existing.list];
			newList[index] = entry;
			// Update in the scope where it was found
			for (let i = this.scopes.length - 1; i >= 0; i--) {
				if (this.scopes[i].has(name)) {
					this.scopes[i].set(name, { type: 'liste', list: newList });
					return;
				}
			}
		}
		// Create new list
		const list: SymbolEntry[] = [];
		list[index] = entry;
		this.set(name, { type: 'liste', list });
	}

	getIndexed(name: string, index: number): SymbolEntry | undefined {
		const entry = this.get(name);
		if (entry?.type === 'liste' && entry.list) {
			return entry.list[index];
		}
		return undefined;
	}

	/** Get all entries in the current (top) scope. */
	currentScope(): ReadonlyMap<string, SymbolEntry> {
		return this.scopes[this.scopes.length - 1];
	}

	/** Get all entries across all scopes (for serialization). */
	allEntries(): ReadonlyMap<string, SymbolEntry> {
		const result = new Map<string, SymbolEntry>();
		for (const scope of this.scopes) {
			for (const [key, value] of scope) {
				result.set(key, value);
			}
		}
		return result;
	}
}
