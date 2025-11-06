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
 * import { modalStack } from '$lib/stores/modalStack.svelte';
 * import MyModal from './MyModal.svelte';
 *
 * // Push a modal
 * const id = modalStack.push({
 *   component: MyModal,
 *   props: { userId: '123' },
 *   canDismiss: true,
 *   onReturn: () => console.log('Returned to this modal')
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

export interface ModalEntry {
	id: string; // UUID for identifying this modal instance
	component: Component; // The Svelte component to render
	props: Record<string, unknown>; // Props to pass to the component
	onReturn?: () => void; // Callback when returning to this modal
	canDismiss?: boolean; // If false, block Escape/backdrop clicks
}

class ModalStackStore {
	private stack = $state<ModalEntry[]>([]);

	/**
	 * Push a modal onto the stack
	 * @param entry Modal configuration (without id)
	 * @returns Generated UUID for this modal instance
	 */
	push(entry: Omit<ModalEntry, 'id'>): string {
		const id = crypto.randomUUID();
		const modalEntry: ModalEntry = {
			...entry,
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
	 * @param id The ID of the modal to pop back to
	 */
	popTo(id: string): void {
		// Find the index of the modal with this ID
		const index = this.stack.findIndex((entry) => entry.id === id);

		if (index === -1) {
			// Modal not found, do nothing
			return;
		}

		// Remove all modals after this one
		this.stack.splice(index + 1);

		// Call onReturn callback of the modal we popped to
		if (this.stack.length > 0) {
			const target = this.stack[this.stack.length - 1];
			if (target.onReturn) {
				target.onReturn();
			}
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
