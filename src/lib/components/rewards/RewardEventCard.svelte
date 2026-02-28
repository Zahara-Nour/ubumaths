<!--
	RewardEventCard.svelte
	======================

	Displays a single reward event in the student journal.
	Shows icon, description, amount, and relative timestamp.
-->

<script lang="ts">
	import type { RewardEvent, RewardType } from '$lib/types/reward-journal';
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
	let iconBgColor = $derived(iconBgColors[event.reward_type] ?? '');
	let iconColor = $derived(iconColors[event.reward_type] ?? '');

	// Format absolute date (e.g. "mardi 2 décembre 2025")
	let formattedDate = $derived(
		format(new Date(event.created_at), 'EEEE d MMMM yyyy', { locale: fr })
	);

	// Amount display logic
	let isPositiveAmount = $derived(
		event.event_type === 'earned' ||
			event.event_type === 'awarded' ||
			event.event_type === 'unlocked'
	);

	let displayAmount = $derived(Math.abs(event.amount ?? 1));

	let amountClass = $derived(
		isPositiveAmount ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
	);

	let amountPrefix = $derived(isPositiveAmount ? '+' : '-');

	// Description override for warnings
	let displayDescription = $derived.by(() => {
		if (event.reward_type !== 'warning') return event.description;

		// Warning awarded: no description needed (badge already shows the type)
		if (event.event_type === 'awarded') return '';

		// Warning removed: indicate source
		if (event.event_type === 'removed') {
			const isVipCard = event.created_by === event.student_id;
			return isVipCard ? 'Carte VIP' : 'Par le professeur';
		}

		return event.description;
	});
</script>

<Card.Root class="transition-shadow hover:shadow-md">
	<Card.Content class="flex items-center gap-3 px-4 py-2.5">
		<!-- Icon -->
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
			{#if event.item_name}
				<Badge variant="outline" class="mb-1 text-xs">
					{event.item_name}
				</Badge>
			{/if}
			{#if displayDescription}
				<p class="text-sm text-foreground">{displayDescription}</p>
			{/if}
		</div>

		<!-- Right side: amount and date -->
		<div class="shrink-0 text-right">
			<div class={cn('font-bold', amountClass)}>
				<span class="text-base">
					{amountPrefix}{displayAmount}
				</span>
			</div>
			<span class="text-xs text-muted-foreground">{formattedDate}</span>
		</div>
	</Card.Content>
</Card.Root>
