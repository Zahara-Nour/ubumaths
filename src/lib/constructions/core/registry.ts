/**
 * Registry - Extensible registries for objects, instruments, and actions
 *
 * This module provides centralized registries for dynamically managing
 * renderers and executors. It consolidates the registration patterns
 * from objects, instruments, and actions into a unified system.
 *
 * @module constructions/core/registry
 */

import type { ObjectDef, ActionDef, InstrumentType } from '../types';
import type { ObjectRenderer } from '../objects/base';
import type { InstrumentRenderer } from '../instruments/base';
import type { ActionExecutor, ActionContext, InterpolationState } from '../actions/base';

// =============================================================================
// Generic Registry Class
// =============================================================================

/**
 * Generic registry for storing and retrieving items by key
 *
 * Provides a type-safe way to register and look up items, with support
 * for iteration and existence checks.
 *
 * @template K - Key type
 * @template V - Value type
 */
export class Registry<K extends string, V> {
	private readonly items = new Map<K, V>();
	private readonly name: string;

	/**
	 * Create a new registry
	 *
	 * @param name - Name of the registry (for error messages)
	 */
	constructor(name: string) {
		this.name = name;
	}

	/**
	 * Register an item
	 *
	 * @param key - Key to register under
	 * @param value - Value to register
	 */
	register(key: K, value: V): void {
		this.items.set(key, value);
	}

	/**
	 * Get an item by key
	 *
	 * @param key - Key to look up
	 * @returns Value or undefined if not found
	 */
	get(key: K): V | undefined {
		return this.items.get(key);
	}

	/**
	 * Check if a key is registered
	 *
	 * @param key - Key to check
	 * @returns True if registered
	 */
	has(key: K): boolean {
		return this.items.has(key);
	}

	/**
	 * Get all registered keys
	 *
	 * @returns Array of registered keys
	 */
	keys(): K[] {
		return [...this.items.keys()];
	}

	/**
	 * Get all registered values
	 *
	 * @returns Array of registered values
	 */
	values(): V[] {
		return [...this.items.values()];
	}

	/**
	 * Get all entries
	 *
	 * @returns Array of [key, value] pairs
	 */
	entries(): [K, V][] {
		return [...this.items.entries()];
	}

	/**
	 * Get the number of registered items
	 */
	get size(): number {
		return this.items.size;
	}

	/**
	 * Clear all registered items
	 */
	clear(): void {
		this.items.clear();
	}

	/**
	 * Get the registry name
	 */
	getName(): string {
		return this.name;
	}
}

// =============================================================================
// Object Registry
// =============================================================================

/**
 * Registry for object renderers
 *
 * Manages registration and lookup of ObjectRenderer implementations
 * by their object kind (point, segment, circle, etc.).
 */
export class ObjectRegistry extends Registry<ObjectDef['kind'], ObjectRenderer> {
	constructor() {
		super('ObjectRegistry');
	}

	/**
	 * Register an object renderer
	 *
	 * @param renderer - Object renderer to register (uses renderer.kind as key)
	 */
	registerRenderer<T extends ObjectDef>(renderer: ObjectRenderer<T>): void {
		this.register(renderer.kind, renderer as ObjectRenderer);
	}

	/**
	 * Get a renderer by object kind
	 *
	 * @param kind - Object kind
	 * @returns ObjectRenderer or undefined
	 */
	getRenderer(kind: ObjectDef['kind']): ObjectRenderer | undefined {
		return this.get(kind);
	}
}

// =============================================================================
// Instrument Registry
// =============================================================================

/**
 * Registry for instrument renderers
 *
 * Manages registration and lookup of InstrumentRenderer implementations
 * by instrument type (ruler, compass, protractor, etc.).
 */
export class InstrumentRegistry extends Registry<InstrumentType, InstrumentRenderer> {
	constructor() {
		super('InstrumentRegistry');
	}

	/**
	 * Register an instrument renderer
	 *
	 * @param type - Instrument type
	 * @param renderer - Instrument renderer to register
	 */
	registerRenderer(type: InstrumentType, renderer: InstrumentRenderer): void {
		this.register(type, renderer);
	}

	/**
	 * Get a renderer by instrument type
	 *
	 * @param type - Instrument type
	 * @returns InstrumentRenderer or undefined
	 */
	getRenderer(type: InstrumentType): InstrumentRenderer | undefined {
		return this.get(type);
	}
}

// =============================================================================
// Action Registry (Enhanced)
// =============================================================================

/**
 * Enhanced registry for action executors
 *
 * Provides registration, lookup, and execution of ActionExecutor implementations.
 * This is an enhanced version of the basic ActionRegistry in actions/index.ts,
 * with additional features for the unified registry system.
 */
export class EnhancedActionRegistry extends Registry<ActionDef['kind'], ActionExecutor> {
	constructor() {
		super('ActionRegistry');
	}

	/**
	 * Register an action executor
	 *
	 * @param executor - Action executor to register (uses executor.kind as key)
	 */
	registerExecutor<T extends ActionDef>(executor: ActionExecutor<T>): void {
		this.register(executor.kind, executor as ActionExecutor);
	}

	/**
	 * Get an executor by action kind
	 *
	 * @param kind - Action kind
	 * @returns ActionExecutor or undefined
	 */
	getExecutor<K extends ActionDef['kind']>(
		kind: K
	): ActionExecutor<Extract<ActionDef, { kind: K }>> | undefined {
		return this.get(kind) as ActionExecutor<Extract<ActionDef, { kind: K }>> | undefined;
	}

	/**
	 * Execute an action at a specific progress
	 *
	 * @param action - Action to execute
	 * @param progress - Progress value (0-1)
	 * @param context - Action context
	 * @returns Interpolation result
	 */
	execute(action: ActionDef, progress: number, context: ActionContext): InterpolationState {
		const executor = this.get(action.kind);
		if (!executor) {
			return {
				found: false,
				error: `No executor registered for action kind: ${action.kind}`
			};
		}

		return executor.execute(action, progress, context);
	}

	/**
	 * Get the duration of an action
	 *
	 * @param action - Action to get duration for
	 * @param context - Action context
	 * @returns Duration in milliseconds, or 0 if no executor found
	 */
	getDuration(action: ActionDef, context: ActionContext): number {
		const executor = this.get(action.kind);
		if (!executor) return 0;

		return executor.getDuration(action, context);
	}

	/**
	 * Reset all executors
	 *
	 * Call this when seeking to the beginning of the timeline.
	 * Clears any cached state in executors that implement reset().
	 */
	resetAll(): void {
		for (const executor of this.values()) {
			if ('reset' in executor && typeof executor.reset === 'function') {
				(executor as { reset: () => void }).reset();
			}
		}
	}
}

// =============================================================================
// Construction Registry (Combined)
// =============================================================================

/**
 * Combined registry for all construction components
 *
 * Provides a single access point for object renderers, instrument renderers,
 * and action executors. Useful for dependency injection and testing.
 */
export class ConstructionRegistry {
	readonly objects: ObjectRegistry;
	readonly instruments: InstrumentRegistry;
	readonly actions: EnhancedActionRegistry;

	constructor() {
		this.objects = new ObjectRegistry();
		this.instruments = new InstrumentRegistry();
		this.actions = new EnhancedActionRegistry();
	}

	/**
	 * Clear all registries
	 */
	clearAll(): void {
		this.objects.clear();
		this.instruments.clear();
		this.actions.clear();
	}
}

// =============================================================================
// Default Instances
// =============================================================================

/**
 * Default object registry instance
 *
 * Used by the construction system for looking up object renderers.
 */
export const objectRegistry = new ObjectRegistry();

/**
 * Default instrument registry instance
 *
 * Used by the construction system for looking up instrument renderers.
 */
export const instrumentRegistry = new InstrumentRegistry();

/**
 * Default action registry instance
 *
 * Used by the construction system for looking up action executors.
 */
export const actionRegistry = new EnhancedActionRegistry();

/**
 * Default combined registry instance
 *
 * Provides convenient access to all registries (objects, instruments, actions).
 * Use this for dependency injection or when you need all registries together.
 *
 * Note: For action-only operations, prefer using `defaultRegistry` from
 * `actions/index.ts` which is a pre-configured `ActionRegistry` with all
 * standard executors registered.
 */
export const constructionRegistry = new ConstructionRegistry();

// =============================================================================
// Factory Functions
// =============================================================================

/**
 * Create a new ConstructionRegistry
 *
 * @returns New ConstructionRegistry instance
 */
export function createRegistry(): ConstructionRegistry {
	return new ConstructionRegistry();
}

/**
 * Create a new ObjectRegistry
 *
 * @returns New ObjectRegistry instance
 */
export function createObjectRegistry(): ObjectRegistry {
	return new ObjectRegistry();
}

/**
 * Create a new InstrumentRegistry
 *
 * @returns New InstrumentRegistry instance
 */
export function createInstrumentRegistry(): InstrumentRegistry {
	return new InstrumentRegistry();
}

/**
 * Create a new EnhancedActionRegistry
 *
 * @returns New EnhancedActionRegistry instance
 */
export function createActionRegistry(): EnhancedActionRegistry {
	return new EnhancedActionRegistry();
}
