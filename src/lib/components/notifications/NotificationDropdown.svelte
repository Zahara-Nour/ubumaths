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
	import * as Popover from '$lib/components/ui/popover';
	import { Bell } from 'lucide-svelte';
	import { goto } from '$app/navigation';

	// Get top 5 notifications for dropdown
	const MAX_DROPDOWN_NOTIFICATIONS = 5;
	const notifications = $derived(notificationStore.getTopNotifications(MAX_DROPDOWN_NOTIFICATIONS));
	const unreadCount = $derived(notificationStore.unreadCount);
	const hasNotifications = $derived(notifications.length > 0);
	const hasMore = $derived(unreadCount > MAX_DROPDOWN_NOTIFICATIONS);

	// State for popover
	let isOpen = $state(false);

	// Handle mark as read
	async function handleMarkAsRead(notificationId: string) {
		await notificationStore.markAsRead(notificationId);
	}

	// Handle mark all as read
	async function handleMarkAllAsRead() {
		await notificationStore.markAllAsRead();
		isOpen = false;
	}

	// Handle notification click (with action)
	async function handleNotificationClick(notification: NotificationWithDetails) {
		// Mark as read
		await notificationStore.markAsRead(notification.id);

		// Close popover
		isOpen = false;

		// Navigate if action URL exists (using then to handle promise)
		if (notification.action_url) {
			goto(notification.action_url).then(() => {});
		}
	}

	// Handle "View all" click
	function handleViewAll() {
		isOpen = false;
		// Using then to handle promise
		goto('/dashboard/notifications').then(() => {});
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

<Popover.Root bind:open={isOpen}>
	<Popover.Trigger>
		{#snippet child({ props })}
			<Button
				{...props}
				variant="ghost"
				class="group relative flex h-auto w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {unreadCount >
				0
					? 'text-primary'
					: 'text-muted-foreground hover:text-foreground'}"
				title="Notifications"
			>
				<div class="relative">
					<Bell
						class="h-6 w-6 transition-transform duration-300 group-hover:scale-110"
						aria-hidden="true"
					/>
					{#if unreadCount > 0}
						<span
							class="absolute -top-1.5 -right-1.5 flex h-5 w-5 items-center justify-center rounded-full bg-red-500 text-[10px] font-bold text-white ring-2 ring-background"
							aria-label="{unreadCount} notification{unreadCount > 1
								? 's'
								: ''} non lue{unreadCount > 1 ? 's' : ''}"
						>
							{unreadCount > 9 ? '9+' : unreadCount}
						</span>
					{/if}
				</div>
				<span class="text-center text-xs leading-tight font-medium">Notifications</span>
			</Button>
		{/snippet}
	</Popover.Trigger>

	<Popover.Content class="w-96 p-0" side="right" align="start" sideOffset={16}>
		<!-- Header -->
		<div class="flex items-center justify-between border-b px-4 py-3">
			<h3 class="font-semibold">Notifications</h3>
			{#if hasNotifications}
				<Button variant="ghost" size="sm" onclick={handleMarkAllAsRead}>Tout marquer lu</Button>
			{/if}
		</div>

		<!-- Notifications list -->
		<div class="max-h-[400px] overflow-y-auto">
			{#if hasNotifications}
				{#each notifications as notification (notification.id)}
					<div
						class="group border-b border-border last:border-0 {getPriorityColors(notification)
							.bg} hover:brightness-95 dark:hover:brightness-110"
					>
						<button
							type="button"
							class="w-full px-4 py-3 text-left"
							onclick={() => handleNotificationClick(notification)}
						>
							<div class="flex items-start gap-3">
								<!-- Type icon -->
								<span class="text-xl" aria-hidden="true">
									{getTypeIcon(notification)}
								</span>

								<!-- Content -->
								<div class="flex-1 space-y-1">
									<!-- Creator & time -->
									<div class="flex items-baseline gap-2">
										<span class="text-sm font-medium {getPriorityColors(notification).text}">
											{formatCreatorName(notification)}
										</span>
										<span class="text-xs text-muted-foreground">
											{getRelativeTime(notification.created_at)}
										</span>
									</div>

									<!-- Title -->
									<p class="text-sm font-semibold {getPriorityColors(notification).text}">
										{notification.title}
									</p>

									<!-- Action label (if present) -->
									{#if notification.action_label}
										<p class="text-xs text-primary">→ {notification.action_label}</p>
									{/if}
								</div>

								<!-- Mark as read button -->
								<Button
									variant="ghost"
									size="sm"
									class="opacity-0 transition-opacity group-hover:opacity-100"
									onclick={(e) => {
										e.stopPropagation();
										handleMarkAsRead(notification.id);
									}}
								>
									Lue
								</Button>
							</div>
						</button>
					</div>
				{/each}

				<!-- View all link -->
				<div class="border-t bg-muted/50 px-4 py-2 text-center">
					<Button variant="link" size="sm" onclick={handleViewAll}>
						{#if hasMore}
							Voir toutes les notifications ({unreadCount})
						{:else}
							Voir toutes les notifications
						{/if}
					</Button>
				</div>
			{:else}
				<!-- Empty state -->
				<div class="px-4 py-12 text-center text-muted-foreground">
					<Bell class="mx-auto mb-3 h-12 w-12 opacity-50" />
					<p class="text-sm">Aucune notification</p>
				</div>
			{/if}
		</div>
	</Popover.Content>
</Popover.Root>
