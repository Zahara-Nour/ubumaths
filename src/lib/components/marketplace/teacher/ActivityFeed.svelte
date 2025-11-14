<script lang="ts">
	import { onMount } from 'svelte';
	import { Card } from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { ScrollArea } from '$lib/components/ui/scroll-area';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Package,
		Coins,
		FileText,
		CheckCircle,
		Clock,
		TrendingUp,
		RefreshCw
	} from 'lucide-svelte';

	interface ActivityDetails {
		title?: string;
		description?: string;
		listing_title?: string;
		listing_type?: string;
		offered_gidouilles?: number;
		wanted_gidouilles?: number;
		offered_cards?: string[];
		wanted_cards?: string[];
		proposal_count?: number;
		total_gidouilles?: number;
		total_cards?: number;
		partner_name?: string;
		[key: string]: unknown;
	}

	interface Activity {
		id: string;
		type: 'listing' | 'proposal' | 'trade' | 'trade_completed';
		timestamp: string;
		student_id: string;
		student_name?: string;
		details: ActivityDetails;
	}

	let {
		activities: initialActivities = [],
		classId = '',
		limit = 20,
		compact = false
	}: {
		activities?: Activity[];
		classId?: string;
		limit?: number;
		compact?: boolean;
	} = $props();

	// State
	let activities = $state<Activity[]>(initialActivities);
	let isLoading = $state(false);
	let autoRefresh = $state(false);
	let refreshInterval: ReturnType<typeof setInterval> | null = null;

	// Fetch activities
	async function fetchActivities() {
		if (compact && initialActivities.length > 0) {
			// In compact mode with initial data, don't fetch
			return;
		}

		isLoading = true;
		try {
			const params = new URLSearchParams();
			params.set('limit', limit.toString());
			if (classId) params.set('class_id', classId);

			const response = await fetch(`/api/marketplace/admin/activity?${params}`);
			if (!response.ok) {
				throw new Error("Erreur lors de la récupération de l'activité");
			}

			const data = await response.json();
			activities = data.activities;
		} catch (err) {
			console.error('Error fetching activities:', err);
			if (!compact) {
				toaster.error("Erreur lors du chargement de l'activité");
			}
			activities = [];
		} finally {
			isLoading = false;
		}
	}

	// Toggle auto-refresh
	function toggleAutoRefresh() {
		autoRefresh = !autoRefresh;
		if (autoRefresh) {
			refreshInterval = setInterval(fetchActivities, 10000); // Refresh every 10 seconds
			toaster.success('Actualisation automatique activée');
		} else {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
			toaster.info('Actualisation automatique désactivée');
		}
	}

	// Format relative time
	function formatRelativeTime(timestamp: string): string {
		const now = new Date();
		const then = new Date(timestamp);
		const diffMs = now.getTime() - then.getTime();
		const diffMins = Math.floor(diffMs / 60000);
		const diffHours = Math.floor(diffMs / 3600000);
		const diffDays = Math.floor(diffMs / 86400000);

		if (diffMins < 1) return "À l'instant";
		if (diffMins < 60) return `Il y a ${diffMins} minute${diffMins > 1 ? 's' : ''}`;
		if (diffHours < 24) return `Il y a ${diffHours} heure${diffHours > 1 ? 's' : ''}`;
		if (diffDays < 7) return `Il y a ${diffDays} jour${diffDays > 1 ? 's' : ''}`;

		return then.toLocaleDateString('fr-FR', {
			day: '2-digit',
			month: 'short',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get activity icon
	function getActivityIcon(type: string) {
		switch (type) {
			case 'listing':
				return FileText;
			case 'proposal':
				return TrendingUp;
			case 'trade':
				return Package;
			case 'trade_completed':
				return CheckCircle;
			default:
				return Package;
		}
	}

	// Get activity title
	function getActivityTitle(activity: Activity): string {
		switch (activity.type) {
			case 'listing':
				return activity.details.listing_type === 'sell'
					? 'Nouvelle annonce de vente'
					: "Nouvelle annonce d'achat";
			case 'proposal':
				return 'Nouvelle proposition';
			case 'trade':
				return 'Nouvel échange';
			case 'trade_completed':
				return 'Échange terminé';
			default:
				return 'Activité';
		}
	}

	// Get activity description
	function getActivityDescription(activity: Activity): string {
		switch (activity.type) {
			case 'listing':
				return `${activity.student_name} a créé l'annonce "${activity.details.title}"`;
			case 'proposal':
				return `${activity.student_name} a proposé ${activity.details.offered_gidouilles || 0} gidouilles`;
			case 'trade':
				return `${activity.student_name} a initié un échange avec ${activity.details.partner_name}`;
			case 'trade_completed': {
				const gidouilles =
					(activity.details.initiator_gidouilles || 0) + (activity.details.partner_gidouilles || 0);
				const cards =
					(activity.details.initiator_cards_count || 0) +
					(activity.details.partner_cards_count || 0);
				return `${activity.student_name} et ${activity.details.partner_name} ont échangé ${gidouilles} gidouilles et ${cards} cartes`;
			}
			default:
				return '';
		}
	}

	// Get activity color
	function getActivityColor(type: string): string {
		switch (type) {
			case 'listing':
				return 'text-blue-600 bg-blue-100';
			case 'proposal':
				return 'text-purple-600 bg-purple-100';
			case 'trade':
				return 'text-orange-600 bg-orange-100';
			case 'trade_completed':
				return 'text-green-600 bg-green-100';
			default:
				return 'text-gray-600 bg-gray-100';
		}
	}

	// Load activities on mount if not in compact mode with initial data
	onMount(() => {
		if (!compact || initialActivities.length === 0) {
			fetchActivities();
		}

		// Cleanup interval on unmount
		return () => {
			if (refreshInterval) {
				clearInterval(refreshInterval);
				refreshInterval = null;
			}
		};
	});

	// Refetch when classId changes
	$effect(() => {
		if (classId !== undefined && !compact) {
			fetchActivities();
		}
	});
</script>

<div class="space-y-4">
	{#if !compact}
		<div class="flex items-center justify-between">
			<h3 class="text-lg font-semibold">Activité récente</h3>
			<div class="flex gap-2">
				<Button variant="outline" size="sm" onclick={fetchActivities} disabled={isLoading}>
					<RefreshCw class={`mr-2 h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
					Actualiser
				</Button>
				<Button variant={autoRefresh ? 'default' : 'outline'} size="sm" onclick={toggleAutoRefresh}>
					{#if autoRefresh}
						<Clock class="mr-2 h-4 w-4 animate-pulse" />
						Auto
					{:else}
						<Clock class="mr-2 h-4 w-4" />
						Auto
					{/if}
				</Button>
			</div>
		</div>
	{/if}

	<ScrollArea class={compact ? 'h-[300px]' : 'h-[500px]'}>
		<div class="space-y-3 pr-4">
			{#if isLoading && activities.length === 0}
				{#each Array(5) as _, i (i)}
					<div class="flex animate-pulse gap-3 p-3">
						<div class="h-10 w-10 rounded-full bg-gray-200" />
						<div class="flex-1 space-y-2">
							<div class="h-4 w-48 rounded bg-gray-200" />
							<div class="h-3 w-32 rounded bg-gray-200" />
						</div>
					</div>
				{/each}
			{:else if activities.length === 0}
				<div class="py-8 text-center">
					<Package class="mx-auto mb-2 h-8 w-8 text-muted-foreground" />
					<p class="text-muted-foreground">Aucune activité récente</p>
				</div>
			{:else}
				{#each activities as activity (activity.id)}
					{@const Icon = getActivityIcon(activity.type)}
					<Card class="p-3">
						<div class="flex gap-3">
							<div
								class={`flex h-10 w-10 items-center justify-center rounded-full ${getActivityColor(activity.type)}`}
							>
								<Icon class="h-5 w-5" />
							</div>
							<div class="flex-1 space-y-1">
								<div class="flex items-start justify-between">
									<div class="flex-1 space-y-1">
										<p class="text-sm font-medium">
											{getActivityTitle(activity)}
										</p>
										<p class="text-sm text-muted-foreground">
											{getActivityDescription(activity)}
										</p>
									</div>
									{#if !compact}
										<Badge variant="outline" class="ml-2 whitespace-nowrap">
											{formatRelativeTime(activity.timestamp)}
										</Badge>
									{/if}
								</div>
								{#if compact}
									<p class="text-xs text-muted-foreground">
										{formatRelativeTime(activity.timestamp)}
									</p>
								{/if}

								<!-- Additional details based on type -->
								{#if activity.type === 'listing' && activity.details}
									<div class="flex gap-4 text-xs text-muted-foreground">
										{#if activity.details.offered_gidouilles > 0}
											<span class="flex items-center gap-1">
												<Coins class="h-3 w-3" />
												{activity.details.offered_gidouilles} offerts
											</span>
										{/if}
										{#if activity.details.wanted_gidouilles > 0}
											<span class="flex items-center gap-1">
												<Coins class="h-3 w-3" />
												{activity.details.wanted_gidouilles} demandés
											</span>
										{/if}
									</div>
								{/if}

								{#if activity.type === 'trade_completed' && activity.details}
									<div class="flex gap-4 text-xs">
										{#if activity.details.initiator_gidouilles > 0 || activity.details.partner_gidouilles > 0}
											<span class="flex items-center gap-1 text-green-600">
												<Coins class="h-3 w-3" />
												{activity.details.initiator_gidouilles +
													activity.details.partner_gidouilles} gidouilles
											</span>
										{/if}
										{#if activity.details.initiator_cards_count > 0 || activity.details.partner_cards_count > 0}
											<span class="flex items-center gap-1 text-blue-600">
												<Package class="h-3 w-3" />
												{activity.details.initiator_cards_count +
													activity.details.partner_cards_count} cartes
											</span>
										{/if}
									</div>
								{/if}
							</div>
						</div>
					</Card>
				{/each}
			{/if}
		</div>
	</ScrollArea>
</div>
