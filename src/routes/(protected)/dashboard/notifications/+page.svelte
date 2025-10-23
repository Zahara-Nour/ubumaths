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
	import { Bell } from 'lucide-svelte';
	import { goto } from '$app/navigation';
	import { onMount } from 'svelte';

	const notifications = $derived(notificationStore.notifications);
	const isLoading = $derived(notificationStore.isLoading);
	const hasNotifications = $derived(notifications.length > 0);

	// Fetch all unread notifications on mount
	onMount(() => {
		notificationStore.fetchUnread();
	});

	// Handle mark as read
	async function handleMarkAsRead(notificationId: string) {
		await notificationStore.markAsRead(notificationId);
	}

	// Handle mark all as read
	async function handleMarkAllAsRead() {
		await notificationStore.markAllAsRead();
	}

	// Handle notification click (with action)
	async function handleNotificationClick(notification: NotificationWithDetails) {
		// Mark as read
		await notificationStore.markAsRead(notification.id);

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
	<div class="flex items-center justify-between">
		<div>
			<h1 class="text-3xl font-bold tracking-tight">Notifications</h1>
			<p class="mt-2 text-muted-foreground">Toutes vos notifications non lues</p>
		</div>

		{#if hasNotifications}
			<Button onclick={handleMarkAllAsRead}>Tout marquer comme lu</Button>
		{/if}
	</div>

	<!-- Loading state -->
	{#if isLoading}
		<div class="flex items-center justify-center py-12">
			<div class="text-center">
				<div
					class="mx-auto h-12 w-12 animate-spin rounded-full border-4 border-primary border-t-transparent"
				></div>
				<p class="mt-4 text-sm text-muted-foreground">Chargement...</p>
			</div>
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
									class="prose prose-sm max-w-none dark:prose-invert {getPriorityColors(
										notification
									).text}"
								>
									{@html notification.message}
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
