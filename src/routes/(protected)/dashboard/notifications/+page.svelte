<script lang="ts">
	import { notificationStore } from '$lib/stores/notifications.svelte';
	import {
		NOTIFICATION_TYPE_ICONS,
		NOTIFICATION_PRIORITY_COLORS,
		NOTIFICATION_TYPE_LABELS,
		NOTIFICATION_PRIORITY_LABELS,
		formatCreatorName,
		getRelativeTime,
		type NotificationWithDetails
	} from '$lib/types/notification';
	import { Button } from '$lib/components/ui/button';
	import { sanitizeNotificationHtml } from '$lib/utils/sanitize-notification';
	import {
		formatDailySummaryFromMetadata,
		isDailySummaryMetadata
	} from '$lib/utils/notification-formatters';
	import { Bell, Loader2 } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	/**
	 * Get the display message for a notification.
	 * For daily_summary notifications with metadata, format from metadata.
	 * Otherwise, use the stored message.
	 */
	function getNotificationMessage(notification: NotificationWithDetails): string {
		// Daily summary notifications: format from metadata if available
		if (
			notification.system_event_type === 'daily_summary' &&
			notification.metadata &&
			isDailySummaryMetadata(notification.metadata)
		) {
			return formatDailySummaryFromMetadata(notification.metadata);
		}
		// Default: use stored message
		return notification.message;
	}

	const notifications = $derived(notificationStore.notifications);
	const isLoading = $derived(notificationStore.isLoading);
	const hasNotifications = $derived(notifications.length > 0);
	const hasMore = $derived(notificationStore.hasMore);
	const unreadCount = $derived(notificationStore.unreadCount);

	// Fetch all unread notifications on mount
	onMount(() => {
		notificationStore.fetchUnread();
	});

	// Handle mark as read (optimistic UI - no await needed)
	function handleMarkAsRead(notificationId: string) {
		notificationStore.markAsRead(notificationId);
	}

	// Handle mark all as read (optimistic UI - no await needed)
	function handleMarkAllAsRead() {
		notificationStore.markAllAsRead();
	}

	// Handle load more
	function handleLoadMore() {
		notificationStore.loadMore();
	}

	// Handle notification click (with action) (optimistic UI - no await needed)
	function handleNotificationClick(notification: NotificationWithDetails) {
		// Mark as read (optimistic, fire-and-forget)
		notificationStore.markAsRead(notification.id);

		// Navigate if action URL exists
		if (notification.action_url) {
			goto(notification.action_url);
		}
	}

	// Get priority colors for notification
	function getPriorityColors(notification: NotificationWithDetails) {
		return NOTIFICATION_PRIORITY_COLORS[notification.priority];
	}

	// Get type icon
	function getTypeIcon(notification: NotificationWithDetails) {
		return NOTIFICATION_TYPE_ICONS[notification.type];
	}
</script>

<svelte:head>
	<title>Notifications - UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<!-- Header -->
	<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
			<p class="mt-2 text-muted-foreground">
				{#if unreadCount > 0}
					{notifications.length} / {unreadCount} affichées
				{:else}
					Toutes vos notifications non lues
				{/if}
			</p>
		</div>

		{#if hasNotifications}
			<Button onclick={handleMarkAllAsRead}>Tout marquer comme lu</Button>
		{/if}
	</div>

	<!-- Initial loading skeleton -->
	{#if isLoading && notifications.length === 0}
		<div class="space-y-3">
			{#each Array(3) as _, i (i)}
				<div class="h-32 animate-pulse rounded-lg bg-muted"></div>
			{/each}
		</div>
	{:else if hasNotifications}
		<!-- Notifications list -->
		<div class="space-y-3">
			{#each notifications as notification (notification.id)}
				<div
					class="group overflow-hidden rounded-lg border {getPriorityColors(notification)
						.border} {getPriorityColors(notification).bg} shadow-sm transition-all hover:shadow-md"
				>
					<button
						type="button"
						class="w-full px-6 py-4 text-left"
						onclick={() => handleNotificationClick(notification)}
					>
						<div class="flex items-start gap-4">
							<!-- Type icon -->
							<div class="flex-shrink-0">
								<span class="text-3xl" aria-hidden="true">
									{getTypeIcon(notification)}
								</span>
							</div>

							<!-- Content -->
							<div class="flex-1 space-y-2">
								<!-- Header: Creator, Type, Priority, Time -->
								<div class="flex flex-wrap items-center gap-2">
									<span class="font-semibold {getPriorityColors(notification).text}">
										{formatCreatorName(notification)}
									</span>

									<span class="text-sm text-muted-foreground">•</span>

									<span class="text-sm {getPriorityColors(notification).text}">
										{NOTIFICATION_TYPE_LABELS[notification.type]}
									</span>

									{#if notification.priority !== 'normal'}
										<span
											class="rounded-full px-2 py-0.5 text-xs font-medium {getPriorityColors(
												notification
											).border} {getPriorityColors(notification).text}"
										>
											{NOTIFICATION_PRIORITY_LABELS[notification.priority]}
										</span>
									{/if}

									<span class="ml-auto text-sm text-muted-foreground">
										{getRelativeTime(notification.created_at)}
									</span>
								</div>

								<!-- Title -->
								<h3 class="text-lg font-bold {getPriorityColors(notification).text}">
									{notification.title}
								</h3>

								<!-- Message (HTML) -->
								<div
									class="prose prose-sm max-w-none whitespace-pre-line dark:prose-invert {getPriorityColors(
										notification
									).text}"
								>
									{@html sanitizeNotificationHtml(getNotificationMessage(notification))}
								</div>

								<!-- Action button (if present) -->
								{#if notification.action_label && notification.action_url}
									<div class="pt-2">
										<Button
											variant="outline"
											size="sm"
											onclick={(e) => {
												e.stopPropagation();
												handleNotificationClick(notification);
											}}
										>
											{notification.action_label} →
										</Button>
									</div>
								{/if}
							</div>

							<!-- Mark as read button -->
							<div class="flex-shrink-0">
								<Button
									variant="outline"
									size="sm"
									class="opacity-0 transition-opacity group-hover:opacity-100"
									onclick={(e) => {
										e.stopPropagation();
										handleMarkAsRead(notification.id);
									}}
								>
									Marquer comme lue
								</Button>
							</div>
						</div>
					</button>
				</div>
			{/each}
		</div>

		<!-- Load More button or end indicator -->
		{#if hasMore}
			<div class="mt-6 flex justify-center">
				<Button
					onclick={handleLoadMore}
					disabled={isLoading}
					variant="outline"
					class="w-full sm:w-auto"
				>
					{#if isLoading}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
						Chargement...
					{:else}
						Charger plus de notifications
					{/if}
				</Button>
			</div>
		{:else if notifications.length > 0}
			<!-- End of list indicator -->
			<div class="mt-6 text-center text-sm text-muted-foreground">
				Toutes les notifications chargées ({unreadCount} au total)
			</div>
		{/if}
	{:else}
		<!-- Empty state -->
		<div class="rounded-lg border border-dashed bg-muted/50 px-6 py-12 text-center">
			<Bell class="mx-auto h-16 w-16 text-muted-foreground/50" />
			<h3 class="mt-4 text-lg font-semibold">Aucune notification</h3>
			<p class="mt-2 text-sm text-muted-foreground">
				Vous n'avez aucune notification non lue pour le moment.
			</p>
		</div>
	{/if}
</div>
