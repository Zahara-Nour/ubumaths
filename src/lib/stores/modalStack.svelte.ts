import type { Component } from 'svelte';

/**
 * Modal Stack Store
 * ================
 *
 * Generic modal navigation system using a stack-based approach.
 *
 * Features:
 * - Push modals onto stack for navigation flow
 * - Pop to return to previous modal
 * - PopTo to jump back to specific modal by ID
 * - Clear entire stack
 * - OnReturn callbacks when returning to a modal
 * - Dismissal control (canDismiss flag)
 *
 * Usage:
 * ```typescript
 * import { modalStack } from '#lib/stores/modalStack.svelte.ts';
 * import MyModal from './MyModal.svelte';
 *
 * // Push a modal
 * const id = modalStack.push({
 *   component: MyModal,
 *   props: { userId: '123' },
 *   canDismiss: true,
 *   onReturn: () => console.log('This modal was closed/completed')
 * });
 *
 * // Navigate back
 * modalStack.pop();
 *
 * // Jump to specific modal
 * modalStack.popTo(id);
 *
 * // Clear all modals
 * modalStack.clear();
 * ```
 */

/** Props d'une modale, vues par la pile : la paire composant / props est vérifiée à `push`. */
type ModalProps = Record<string, unknown>;

export interface ModalEntry {
	id: string; // UUID for identifying this modal instance
	component: Component<ModalProps>; // The Svelte component to render
	props: ModalProps; // Props to pass to the component
	onReturn?: () => void; // Callback fired when THIS modal is popped/closed (used as onComplete)
	canDismiss?: boolean; // If false, block Escape/backdrop clicks
}

class ModalStackStore {
	private stack = $state<ModalEntry[]>([]);

	/**
	 * Push a modal onto the stack
	 * @param entry Modal configuration (without id)
	 * @returns Generated UUID for this modal instance
	 */
	// `object` et pas `ModalProps` : une `interface Props` n'a pas de signature d'index et ne
	// satisferait pas `Record<string, unknown>` (P retomberait alors sur ModalProps).
	push<P extends object>(
		entry: Omit<ModalEntry, 'id' | 'component' | 'props'> & {
			component: Component<P>;
			props: NoInfer<P>;
		}
	): string {
		const id = crypto.randomUUID();
		const modalEntry: ModalEntry = {
			...entry,
			// Les props ont été vérifiées contre le composant dans la signature ci-dessus ; la
			// pile, qui mêle des modales différentes, ne garde que la forme commune.
			component: entry.component as unknown as Component<ModalProps>,
			props: entry.props as ModalProps,
			id
		};
		this.stack.push(modalEntry);
		return id;
	}

	/**
	 * Pop the top modal from the stack
	 * Calls onReturn callback of the POPPED modal (before removing it)
	 * @returns The popped modal entry or undefined if stack was empty
	 */
	pop(): ModalEntry | undefined {
		// Call onReturn of the modal BEFORE popping it (so it can clean up)
		if (this.stack.length > 0) {
			const currentTop = this.stack[this.stack.length - 1];
			if (currentTop.onReturn) {
				currentTop.onReturn();
			}
		}

		const popped = this.stack.pop();

		return popped;
	}

	/**
	 * Pop modals until we reach the modal with the given ID
	 * That modal remains in the stack as the new top
	 * Comme `pop` : chaque modale RETIRÉE reçoit son `onReturn`, de la plus haute à la
	 * plus basse ; la modale gardée n'en reçoit aucun (écart L50).
	 * @param id The ID of the modal to pop back to
	 */
	popTo(id: string): void {
		const index = this.stack.findIndex((entry) => entry.id === id);
		if (index === -1) return;

		while (this.stack.length > index + 1) {
			this.pop();
		}
	}

	/**
	 * Clear the entire modal stack
	 */
	clear(): void {
		this.stack = [];
	}

	/**
	 * Get the current (top) modal
	 */
	get current(): ModalEntry | null {
		if (this.stack.length === 0) {
			return null;
		}
		return this.stack[this.stack.length - 1];
	}

	/**
	 * Get the current depth of the modal stack
	 */
	get depth(): number {
		return this.stack.length;
	}

	/**
	 * Check if the modal stack is empty
	 */
	get isEmpty(): boolean {
		return this.stack.length === 0;
	}
}

export const modalStack = new ModalStackStore();
