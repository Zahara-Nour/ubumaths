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
	import { Star, Trophy, Package } from 'lucide-svelte';
	import { format } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import gidouilleImg from '$lib/assets/images/gidouille.png';

	// Props
	let { event }: { event: RewardEvent } = $props();

	// Lucide icon mapping (only for types that use Lucide icons)
	const lucideIconMap: Partial<Record<RewardType, typeof Star>> = {
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

	// Icon background colors by reward_type (only for lucide icon types)
	const iconBgColors: Partial<Record<RewardType, string>> = {
		achievement: 'bg-blue-100 dark:bg-blue-900/30',
		item: 'bg-green-100 dark:bg-green-900/30'
	};

	// Icon colors by reward_type (only for lucide icon types)
	const iconColors: Partial<Record<RewardType, string>> = {
		achievement: 'text-blue-600 dark:text-blue-400',
		item: 'text-green-600 dark:text-green-400'
	};

	// Computed values
	let LucideIcon = $derived(lucideIconMap[event.reward_type]);
	let eventTypeColor = $derived(eventTypeColors[event.event_type]);
	let eventTypeLabel = $derived(eventTypeLabels[event.event_type]);
	let iconBgColor = $derived(iconBgColors[event.reward_type] ?? '');
	let iconColor = $derived(iconColors[event.reward_type] ?? '');

	// Format absolute date (e.g. "mardi 2 décembre 2025")
	let formattedDate = $derived(
		format(new Date(event.created_at), 'EEEE d MMMM yyyy', { locale: fr })
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
	<Card.Content class="flex items-center gap-3 px-4 py-2.5">
		<!-- Icon (matches QuickActions visuals) -->
		{#if event.reward_type === 'gidouilles'}
			<div class="flex h-8 w-8 shrink-0 items-center justify-center">
				<img src={gidouilleImg} alt="Gidouille" class="h-6 w-6" />
			</div>
		{:else if event.reward_type === 'vip_card'}
			<div
				class="flex h-8 w-6 shrink-0 items-center justify-center overflow-hidden rounded-sm border border-amber-400 bg-gradient-to-br from-amber-400 via-yellow-500 to-amber-600 shadow-sm"
			>
				<span
					class="text-[8px] font-black tracking-tight text-white"
					style="text-shadow: 0.5px 0.5px 1px rgba(0,0,0,0.3)">VIP</span
				>
			</div>
		{:else if event.reward_type === 'bonus'}
			<div class="flex h-8 w-8 shrink-0 items-center justify-center">
				<Star class="h-6 w-6 fill-amber-400 text-amber-400" />
			</div>
		{:else if event.reward_type === 'warning'}
			<div
				class="flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-red-500 text-white shadow-sm"
			>
				<span class="text-sm leading-none font-bold">!</span>
			</div>
		{:else if LucideIcon}
			<div
				class={cn('flex h-8 w-8 shrink-0 items-center justify-center rounded-full', iconBgColor)}
			>
				<LucideIcon class={cn('h-4 w-4', iconColor)} />
			</div>
		{/if}

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<div class="flex flex-wrap items-center gap-1.5">
				<Badge class={cn('text-xs', eventTypeColor)} variant="secondary">
					{eventTypeLabel}
				</Badge>
				{#if event.item_name}
					<Badge variant="outline" class="text-xs">
						{event.item_name}
					</Badge>
				{/if}
				<span class="text-sm text-foreground">{event.description}</span>
				<span class="text-xs text-muted-foreground">{formattedDate}</span>
			</div>
		</div>

		<!-- Amount (for gidouilles/bonus) -->
		{#if showAmount}
			<div class={cn('shrink-0 text-right font-bold', amountClass)}>
				<span class="text-base">
					{amountPrefix}{Math.abs(event.amount ?? 0)}
				</span>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
