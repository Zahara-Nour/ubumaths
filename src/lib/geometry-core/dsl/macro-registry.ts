/**
 * Macro registry for the DSL interpreter.
 *
 * Stores macro definitions and handles lookup.
 * Prevents recursion via a call stack depth check.
 */

import type { DslMacroDef } from './types';
import { DslRuntimeError } from './errors';

const MAX_CALL_DEPTH = 10;

export class MacroRegistry {
	private macros = new Map<string, DslMacroDef>();
	private callDepth = 0;
	/** Cached snapshot of macro names; invalidated on every `define()`. */
	private _allNames: ReadonlySet<string> | null = null;

	define(macro: DslMacroDef): void {
		this.macros.set(macro.name, macro);
		this._allNames = null;
	}

	get(name: string): DslMacroDef | undefined {
		return this.macros.get(name);
	}

	has(name: string): boolean {
		return this.macros.has(name);
	}

	/**
	 * All currently-defined macro names. Returned set is cached and shared —
	 * callers must treat it as read-only. Invalidated automatically by `define()`.
	 */
	allNames(): ReadonlySet<string> {
		if (this._allNames === null) {
			this._allNames = new Set(this.macros.keys());
		}
		return this._allNames;
	}

	enterCall(name: string, line: number): void {
		this.callDepth++;
		if (this.callDepth > MAX_CALL_DEPTH) {
			throw new DslRuntimeError(
				`Profondeur d'appel maximale atteinte (${MAX_CALL_DEPTH}). Recursion interdite pour "${name}"`,
				line
			);
		}
	}

	exitCall(): void {
		this.callDepth--;
	}

	/** True when executing inside a macro body (any depth). */
	get insideMacro(): boolean {
		return this.callDepth > 0;
	}

	/** True when inside a nested macro call (depth > 1). */
	get insideNestedMacro(): boolean {
		return this.callDepth > 1;
	}
}
