<!--
	RewardEventCard.svelte
	======================

	Displays a single reward event in the student journal.
	Shows icon, description, amount, and relative timestamp.
-->

<script lang="ts">
	import type { RewardEvent, RewardType, RewardEventType } from '$lib/types/reward-journal';
	import { cn } from '$lib/utils';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Coins, Star, Crown, Trophy, Package } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	// Props
	let { event }: { event: RewardEvent } = $props();

	// Icon mapping by reward_type
	const iconMap: Record<RewardType, typeof Coins> = {
		gidouilles: Coins,
		bonus: Star,
		vip_card: Crown,
		achievement: Trophy,
		item: Package
	};

	// Color mapping by event_type
	const eventTypeColors: Record<RewardEventType, string> = {
		earned: 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-400',
		spent: 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-400',
		traded: 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-400',
		used: 'bg-purple-100 text-purple-800 dark:bg-purple-900/30 dark:text-purple-400',
		expired: 'bg-gray-100 text-gray-800 dark:bg-gray-900/30 dark:text-gray-400',
		unlocked: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-400',
		purchased: 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-400',
		awarded: 'bg-emerald-100 text-emerald-800 dark:bg-emerald-900/30 dark:text-emerald-400',
		removed: 'bg-rose-100 text-rose-800 dark:bg-rose-900/30 dark:text-rose-400'
	};

	// French labels for event types
	const eventTypeLabels: Record<RewardEventType, string> = {
		earned: 'Gagn\u00e9',
		spent: 'D\u00e9pens\u00e9',
		traded: '\u00c9chang\u00e9',
		used: 'Utilis\u00e9',
		expired: 'Expir\u00e9',
		unlocked: 'D\u00e9bloqu\u00e9',
		purchased: 'Achet\u00e9',
		awarded: 'Attribu\u00e9',
		removed: 'Retir\u00e9'
	};

	// Icon background colors by reward_type
	const iconBgColors: Record<RewardType, string> = {
		gidouilles: 'bg-yellow-100 dark:bg-yellow-900/30',
		bonus: 'bg-purple-100 dark:bg-purple-900/30',
		vip_card: 'bg-amber-100 dark:bg-amber-900/30',
		achievement: 'bg-blue-100 dark:bg-blue-900/30',
		item: 'bg-green-100 dark:bg-green-900/30'
	};

	// Icon colors by reward_type
	const iconColors: Record<RewardType, string> = {
		gidouilles: 'text-yellow-600 dark:text-yellow-400',
		bonus: 'text-purple-600 dark:text-purple-400',
		vip_card: 'text-amber-600 dark:text-amber-400',
		achievement: 'text-blue-600 dark:text-blue-400',
		item: 'text-green-600 dark:text-green-400'
	};

	// Computed values
	let IconComponent = $derived(iconMap[event.reward_type]);
	let eventTypeColor = $derived(eventTypeColors[event.event_type]);
	let eventTypeLabel = $derived(eventTypeLabels[event.event_type]);
	let iconBgColor = $derived(iconBgColors[event.reward_type]);
	let iconColor = $derived(iconColors[event.reward_type]);

	// Format relative time
	let relativeTime = $derived(
		formatDistanceToNow(new Date(event.created_at), {
			addSuffix: true,
			locale: fr
		})
	);

	// Amount display logic
	let showAmount = $derived(
		event.amount !== null && (event.reward_type === 'gidouilles' || event.reward_type === 'bonus')
	);

	let isPositiveAmount = $derived(
		event.event_type === 'earned' ||
			event.event_type === 'awarded' ||
			event.event_type === 'unlocked'
	);

	let amountClass = $derived(
		isPositiveAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
	);

	let amountPrefix = $derived(isPositiveAmount ? '+' : '-');
</script>

<Card.Root class="transition-shadow hover:shadow-md">
	<Card.Content class="flex items-start gap-4 p-4">
		<!-- Icon -->
		<div
			class={cn('flex h-10 w-10 shrink-0 items-center justify-center rounded-full', iconBgColor)}
		>
			<IconComponent class={cn('h-5 w-5', iconColor)} />
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<div class="mb-1 flex flex-wrap items-center gap-2">
				<Badge class={cn('text-xs', eventTypeColor)} variant="secondary">
					{eventTypeLabel}
				</Badge>
				{#if event.item_name}
					<Badge variant="outline" class="text-xs">
						{event.item_name}
					</Badge>
				{/if}
			</div>

			<p class="text-sm text-foreground">
				{event.description}
			</p>

			<p class="mt-1 text-xs text-muted-foreground">
				{relativeTime}
			</p>
		</div>

		<!-- Amount (for gidouilles/bonus) -->
		{#if showAmount}
			<div class={cn('shrink-0 text-right font-bold', amountClass)}>
				<span class="text-lg">
					{amountPrefix}{Math.abs(event.amount ?? 0)}
				</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
