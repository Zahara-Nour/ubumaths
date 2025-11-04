/**
 * VIP Card Modal Utilities
 * =========================
 * Helper functions for opening VIP card-related modals
 */

import { modalStack } from '$lib/stores/modalStack.svelte';
import VipCardDrawModal from '$lib/components/rewards/VipCardDrawModal.svelte';

/**
 * Options for opening a VIP card draw modal
 */
interface DrawCardsOptions {
	studentId: string;
	count: number;
	paymentMethod: 'gidouilles' | 'vip_card';
	gidouillesCost?: number;
	vipCardInstanceId?: string;
	studentName?: string;
	classId?: string; // Optional: for cache optimistic updates
	onComplete?: () => void; // Called when returning to caller modal
}

/**
 * Open a modal that draws VIP cards for a student
 *
 * @param options - Configuration for the draw modal
 * @returns Modal ID for tracking
 *
 * @example
 * ```typescript
 * // Draw 3 cards with gidouilles payment
 * openVipCardDrawModal({
 *   studentId: '123',
 *   count: 3,
 *   paymentMethod: 'gidouilles',
 *   gidouillesCost: 15,
 *   studentName: 'Alice',
 *   onComplete: () => console.log('Cards drawn!')
 * });
 *
 * // Draw 2 cards using a VIP card
 * openVipCardDrawModal({
 *   studentId: '123',
 *   count: 2,
 *   paymentMethod: 'vip_card',
 *   vipCardInstanceId: 'card-instance-uuid',
 *   studentName: 'Bob'
 * });
 * ```
 */
export function openVipCardDrawModal(options: DrawCardsOptions): string {
	return modalStack.push({
		component: VipCardDrawModal,
		props: {
			studentId: options.studentId,
			count: options.count,
			paymentMethod: options.paymentMethod,
			gidouillesCost: options.gidouillesCost,
			vipCardInstanceId: options.vipCardInstanceId,
			studentName: options.studentName,
			classId: options.classId
		},
		canDismiss: false, // Block Escape during animation
		onReturn: options.onComplete
	});
}
