<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import {
		NOTIFICATION_TYPE_ICONS,
		NOTIFICATION_PRIORITY_COLORS,
		formatCreatorName,
		getRelativeTime,
		type NotificationWithDetails
	} from '$lib/types/notification';
	import { Button } from '$lib/components/ui/button';
	import { X, ChevronLeft, ChevronRight } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Show max 5 notifications in carousel
	const MAX_NOTIFICATIONS = 5;

	let currentIndex = $state(0);

	// Get notifications to display
	const notifications = $derived(notificationStore.getTopNotifications(MAX_NOTIFICATIONS));
	const hasNotifications = $derived(notifications.length > 0);
	const currentNotification = $derived(notifications[currentIndex] || null);
	const showCarousel = $derived(notifications.length > 1);

	// Navigation handlers
	function handlePrev() {
		currentIndex = (currentIndex - 1 + notifications.length) % notifications.length;
	}

	function handleNext() {
		currentIndex = (currentIndex + 1) % notifications.length;
	}

	// Mark as read and close
	async function handleDismiss() {
		if (!currentNotification) return;

		await notificationStore.markAsRead(currentNotification.id);

		// Reset index if we dismissed the last notification
		if (currentIndex >= notifications.length) {
			currentIndex = Math.max(0, notifications.length - 1);
		}
	}

	// Handle action button click
	async function handleAction() {
		if (!currentNotification?.action_url) return;

		// Capture values before async operation (derived value may change after await)
		const notificationId = currentNotification.id;
		const actionUrl = currentNotification.action_url;

		// Mark as read
		await notificationStore.markAsRead(notificationId);

		// Navigate to action URL (using then to handle promise)
		// Type assertion: action_url comes from database, assumed to be valid route
		goto(actionUrl as Parameters<typeof goto>[0]).then(() => {});
	}

	// Get priority colors
	function getPriorityColors(notification: NotificationWithDetails) {
		return NOTIFICATION_PRIORITY_COLORS[notification.priority];
	}

	// Get type icon
	function getTypeIcon(notification: NotificationWithDetails) {
		return NOTIFICATION_TYPE_ICONS[notification.type];
	}

	// Reset index when notifications change
	$effect(() => {
		if (currentIndex >= notifications.length && notifications.length > 0) {
			currentIndex = 0;
		}
	});
</script>

{#if hasNotifications && currentNotification}
	<div
		class="sticky top-0 z-50 border-b {getPriorityColors(currentNotification)
			.border} {getPriorityColors(currentNotification).bg} shadow-sm"
	>
		<div class="container mx-auto flex items-center justify-between gap-4 px-4 py-3">
			<!-- Left: Icon + Content -->
			<div class="flex flex-1 items-center gap-3">
				<!-- Type Icon -->
				<span class="text-2xl" aria-hidden="true">
					{getTypeIcon(currentNotification)}
				</span>

				<!-- Content -->
				<div class="flex-1">
					<div class="flex items-baseline gap-2">
						<!-- Creator name -->
						<span class="text-sm font-medium {getPriorityColors(currentNotification).text}">
							{formatCreatorName(currentNotification)}
						</span>

						<!-- Time -->
						<span class="text-xs opacity-60">
							{getRelativeTime(currentNotification.created_at)}
						</span>
					</div>

					<!-- Title -->
					<p class="font-semibold {getPriorityColors(currentNotification).text}">
						{currentNotification.title}
					</p>
				</div>
			</div>

			<!-- Center: Carousel Navigation (if multiple notifications) -->
			{#if showCarousel}
				<div class="flex items-center gap-2">
					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={handlePrev}
						aria-label="Notification précédente"
					>
						<ChevronLeft class="h-4 w-4" />
					</Button>

					<span class="text-sm font-medium {getPriorityColors(currentNotification).text}">
						{currentIndex + 1}/{notifications.length}
					</span>

					<Button
						variant="ghost"
						size="icon"
						class="h-8 w-8"
						onclick={handleNext}
						aria-label="Notification suivante"
					>
						<ChevronRight class="h-4 w-4" />
					</Button>
				</div>
			{/if}

			<!-- Right: Action Buttons -->
			<div class="flex items-center gap-2">
				<!-- Action button (if available) -->
				{#if currentNotification.action_label && currentNotification.action_url}
					<Button variant="outline" size="sm" onclick={handleAction}>
						{currentNotification.action_label}
					</Button>
				{/if}

				<!-- Mark as read button -->
				<Button variant="ghost" size="sm" onclick={handleDismiss}>Marquer comme lue</Button>

				<!-- Close button -->
				<Button
					variant="ghost"
					size="icon"
					class="h-8 w-8"
					onclick={handleDismiss}
					aria-label="Fermer"
				>
					<X class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</div>
{/if}
