/**
 * Bonus Modal Utilities
 * =====================
 * Helper functions for opening bonus-related modals
 */

import { modalStack } from '$lib/stores/modalStack.svelte';
import BonusReasonModal from '$lib/components/teacher/BonusReasonModal.svelte';

/**
 * Options for opening a bonus reason modal
 */
interface BonusReasonModalOptions {
	studentName: string;
	onConfirm: (reason: string) => void;
	onCancel?: () => void;
}

/**
 * Open a modal to select a reason for awarding a bonus
 *
 * @param options - Configuration for the bonus reason modal
 * @returns Modal ID for tracking
 *
 * @example
 * ```typescript
 * openBonusReasonModal({
 *   studentName: 'Alice',
 *   onConfirm: (reason) => {
 *     console.log('Bonus reason:', reason);
 *     // Proceed with bonus addition
 *   },
 *   onCancel: () => {
 *     console.log('Cancelled');
 *   }
 * });
 * ```
 */
export function openBonusReasonModal(options: BonusReasonModalOptions): string {
	return modalStack.push({
		component: BonusReasonModal,
		props: {
			studentName: options.studentName,
			onConfirm: (reason: string) => {
				modalStack.pop();
				options.onConfirm(reason);
			},
			onCancel: () => {
				modalStack.pop();
				options.onCancel?.();
			}
		},
		canDismiss: true
	});
}
