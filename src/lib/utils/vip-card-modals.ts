/**
 * VIP Card Modal Utilities
 * =========================
 * Helper functions for opening VIP card-related modals
 */

import { modalStack } from '$lib/stores/modalStack.svelte';
import VipCardsModal from '$lib/components/VipCardsModal.svelte';
import VipCardDrawModal from '$lib/components/rewards/VipCardDrawModal.svelte';
import VipCardExchangeModal from '$lib/components/rewards/VipCardExchangeModal.svelte';
import RemoveWarningsModal from '$lib/components/rewards/RemoveWarningsModal.svelte';
import type { ExchangeCardAction } from '$lib/types/vip-card';

/**
 * Options for opening a VIP cards modal
 */
interface VipCardsModalOptions {
	studentId: string;
	studentName: string;
	classId: string;
	periodId: string;
	teacherView?: boolean;
	onComplete?: () => void;
}

/**
 * Open a modal that displays all VIP cards for a student
 *
 * @param options - Configuration for the VIP cards modal
 * @returns Modal ID for tracking
 *
 * @example
 * ```typescript
 * // Open student's VIP card collection (teacher view)
 * openVipCardsModal({
 *   studentId: '123',
 *   studentName: 'Alice',
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   teacherView: true,
 *   onComplete: () => console.log('Modal closed')
 * });
 * ```
 */
export function openVipCardsModal(options: VipCardsModalOptions): string {
	return modalStack.push({
		component: VipCardsModal,
		props: {
			studentId: options.studentId,
			studentName: options.studentName,
			classId: options.classId,
			periodId: options.periodId,
			teacherView: options.teacherView ?? false
		},
		canDismiss: true,
		onReturn: options.onComplete
	});
}

/**
 * Options for opening a VIP card draw modal
 */
interface DrawCardsOptions {
	studentId: string;
	count: number;
	paymentMethod: 'gidouilles' | 'vip_card';
	gidouillesCost?: number;
	vipCardInstanceId?: string;
	usedCardInstanceId?: string; // Card instance that was consumed (for cache removal)
	studentName?: string;
	classId?: string; // Optional: for cache optimistic updates
	filters?: import('$lib/types/vip-card').DrawCardsFilters; // Optional: filters for draw_cards action
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
			usedCardInstanceId: options.usedCardInstanceId,
			studentName: options.studentName,
			classId: options.classId,
			filters: options.filters
		},
		canDismiss: false, // Block Escape during animation
		onReturn: options.onComplete
	});
}

/**
 * Options for opening a VIP card exchange modal
 */
interface ExchangeCardsOptions {
	studentId: string;
	exchange: ExchangeCardAction;
	studentName?: string;
	classId?: string;
	onComplete?: () => void;
}

/**
 * Open a modal that exchanges VIP cards for a student
 *
 * @param options - Configuration for the exchange modal
 * @returns Modal ID for tracking
 *
 * @example
 * ```typescript
 * // Replace 3 random cards
 * openVipCardExchangeModal({
 *   studentId: '123',
 *   exchange: { mode: 'replace_random', count: 3 },
 *   studentName: 'Alice',
 *   classId: 'class-uuid',
 *   onComplete: () => console.log('Exchange complete!')
 * });
 * ```
 */
export function openVipCardExchangeModal(options: ExchangeCardsOptions): string {
	return modalStack.push({
		component: VipCardExchangeModal,
		props: {
			studentId: options.studentId,
			exchange: options.exchange,
			studentName: options.studentName,
			classId: options.classId
		},
		canDismiss: true,
		onReturn: options.onComplete
	});
}

/**
 * Options for opening a remove warnings modal
 */
interface RemoveWarningsOptions {
	studentId: string;
	classId: string;
	periodId: string;
	count: number;
	warningType?: 'C' | 'M' | 'R' | 'T';
	studentName?: string;
	onComplete?: () => void;
}

/**
 * Open a modal that removes warnings for a student
 *
 * @param options - Configuration for the remove warnings modal
 * @returns Modal ID for tracking
 *
 * @example
 * ```typescript
 * // Remove 2 warnings (any type)
 * openRemoveWarningsModal({
 *   studentId: '123',
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   count: 2,
 *   studentName: 'Bob',
 *   onComplete: () => console.log('Warnings removed!')
 * });
 *
 * // Remove 1 comportement warning
 * openRemoveWarningsModal({
 *   studentId: '123',
 *   classId: 'class-uuid',
 *   periodId: 'period-uuid',
 *   count: 1,
 *   warningType: 'C',
 *   studentName: 'Charlie'
 * });
 * ```
 */
export function openRemoveWarningsModal(options: RemoveWarningsOptions): string {
	return modalStack.push({
		component: RemoveWarningsModal,
		props: {
			studentId: options.studentId,
			classId: options.classId,
			periodId: options.periodId,
			count: options.count,
			warningType: options.warningType,
			studentName: options.studentName
		},
		canDismiss: true,
		onReturn: options.onComplete
	});
}
