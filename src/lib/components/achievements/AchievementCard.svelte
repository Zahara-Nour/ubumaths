<!--
	AchievementCard Component
	=========================
	Displays an individual achievement with its unlock status, progress, and details.

	Props:
	- achievement: Achievement data from the achievements table
	- unlocked: Whether the achievement has been unlocked
	- unlockedAt: ISO date string of when it was unlocked
	- progress: Progress percentage (0-100) for progressive achievements
	- compact: Compact mode for list views
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { Lock, Trophy, Star, Sparkles, Crown, Gem } from 'lucide-svelte';
	import type { Achievement, AchievementRarity } from '$lib/types/achievements';
	import { cn } from '$lib/utils';

	interface Props {
		achievement: Achievement;
		unlocked: boolean;
		unlockedAt?: string | null;
		progress?: number | null;
		compact?: boolean;
	}

	let {
		achievement,
		unlocked,
		unlockedAt = null,
		progress = null,
		compact = false
	}: Props = $props();

	// Rarity-based styling configuration
	const rarityConfig: Record<
		AchievementRarity,
		{
			bgColor: string;
			textColor: string;
			borderColor: string;
			iconColor: string;
			label: string;
			icon: typeof Trophy;
		}
	> = {
		common: {
			bgColor: 'bg-gray-100 dark:bg-gray-800',
			textColor: 'text-gray-700 dark:text-gray-300',
			borderColor: 'border-gray-300 dark:border-gray-600',
			iconColor: 'text-gray-500 dark:text-gray-400',
			label: 'Commun',
			icon: Trophy
		},
		uncommon: {
			bgColor: 'bg-green-100 dark:bg-green-900/30',
			textColor: 'text-green-700 dark:text-green-300',
			borderColor: 'border-green-400 dark:border-green-600',
			iconColor: 'text-green-500 dark:text-green-400',
			label: 'Peu commun',
			icon: Star
		},
		rare: {
			bgColor: 'bg-blue-100 dark:bg-blue-900/30',
			textColor: 'text-blue-700 dark:text-blue-300',
			borderColor: 'border-blue-400 dark:border-blue-600',
			iconColor: 'text-blue-500 dark:text-blue-400',
			label: 'Rare',
			icon: Sparkles
		},
		epic: {
			bgColor: 'bg-purple-100 dark:bg-purple-900/30',
			textColor: 'text-purple-700 dark:text-purple-300',
			borderColor: 'border-purple-400 dark:border-purple-600',
			iconColor: 'text-purple-500 dark:text-purple-400',
			label: 'Epique',
			icon: Crown
		},
		legendary: {
			bgColor: 'bg-amber-100 dark:bg-amber-900/30',
			textColor: 'text-amber-700 dark:text-amber-300',
			borderColor: 'border-amber-400 dark:border-amber-600',
			iconColor: 'text-amber-500 dark:text-amber-400',
			label: 'Legendaire',
			icon: Gem
		}
	};

	// Get rarity from metadata or default to 'common'
	let rarity = $derived<AchievementRarity>(achievement.metadata?.rarity ?? 'common');
	let config = $derived(rarityConfig[rarity]);
	let RarityIcon = $derived(config.icon);

	// Points from metadata or column
	let points = $derived(achievement.metadata?.points ?? achievement.points ?? 0);

	// Format unlock date
	let formattedDate = $derived.by(() => {
		if (!unlockedAt) return null;
		try {
			return new Date(unlockedAt).toLocaleDateString('fr-FR', {
				day: 'numeric',
				month: 'short',
				year: 'numeric'
			});
		} catch {
			return null;
		}
	});

	// Category labels in French
	const categoryLabels: Record<string, string> = {
		speed: 'Vitesse',
		accuracy: 'Precision',
		streak: 'Serie',
		mastery: 'Maitrise',
		participation: 'Participation',
		social: 'Social',
		collection: 'Collection'
	};

	let categoryLabel = $derived(categoryLabels[achievement.category] ?? achievement.category);

	// Determine if achievement is progressive (has progress but not unlocked)
	let isProgressive = $derived(progress !== null && !unlocked);
</script>

{#if compact}
	<!-- Compact Mode -->
	<div
		class={cn(
			'flex items-center gap-3 rounded-lg border p-3 transition-all',
			unlocked
				? `${config.borderColor} ${config.bgColor}`
				: 'border-muted bg-muted/30 opacity-60 grayscale'
		)}
		role="article"
		aria-label={unlocked
			? `Achievement debloquer: ${achievement.name}`
			: `Achievement verrouille: ${achievement.name}`}
	>
		<!-- Icon -->
		<div
			class={cn(
				'flex h-10 w-10 shrink-0 items-center justify-center rounded-lg text-2xl',
				unlocked ? config.bgColor : 'bg-muted'
			)}
			aria-hidden="true"
		>
			{#if unlocked}
				{achievement.icon}
			{:else}
				<Lock class="h-5 w-5 text-muted-foreground" />
			{/if}
		</div>

		<!-- Content -->
		<div class="min-w-0 flex-1">
			<div class="flex items-center gap-2">
				<span
					class={cn('truncate font-medium', unlocked ? 'text-foreground' : 'text-muted-foreground')}
				>
					{achievement.name}
				</span>
				{#if unlocked}
					<Badge class={cn('shrink-0 text-xs', config.bgColor, config.textColor)}>
						{points} pts
					</Badge>
				{/if}
			</div>
			{#if isProgressive}
				<div class="mt-1 flex items-center gap-2">
					<Progress value={progress} max={100} class="h-1.5 flex-1" />
					<span class="text-xs text-muted-foreground">{progress}%</span>
				</div>
			{/if}
		</div>
	</div>
{:else}
	<!-- Full Card Mode -->
	<Card.Root
		class={cn(
			'relative overflow-hidden transition-all',
			unlocked ? `border-2 ${config.borderColor}` : 'border-muted opacity-75'
		)}
	>
		<!-- Rarity indicator stripe -->
		{#if unlocked}
			<div
				class={cn('absolute top-0 left-0 h-full w-1', config.bgColor.replace('bg-', 'bg-'))}
				style="background: linear-gradient(to bottom, {rarity === 'legendary'
					? '#f59e0b, #fbbf24'
					: rarity === 'epic'
						? '#9333ea, #a855f7'
						: rarity === 'rare'
							? '#3b82f6, #60a5fa'
							: rarity === 'uncommon'
								? '#22c55e, #4ade80'
								: '#6b7280, #9ca3af'});"
			></div>
		{/if}

		<Card.Header class={cn('pb-3', unlocked ? 'pl-4' : '')}>
			<div class="flex items-start gap-4">
				<!-- Achievement Icon -->
				<div
					class={cn(
						'flex h-16 w-16 shrink-0 items-center justify-center rounded-xl text-4xl transition-all',
						unlocked ? config.bgColor : 'bg-muted grayscale'
					)}
					role="img"
					aria-label={unlocked ? `Icone: ${achievement.icon}` : 'Achievement verrouille'}
				>
					{#if unlocked}
						{achievement.icon}
					{:else}
						<Lock class="h-8 w-8 text-muted-foreground" />
					{/if}
				</div>

				<!-- Title and badges -->
				<div class="min-w-0 flex-1">
					<div class="mb-2 flex flex-wrap items-center gap-2">
						<!-- Rarity badge -->
						<Badge class={cn('text-xs', config.bgColor, config.textColor)}>
							<RarityIcon class="mr-1 h-3 w-3" />
							{config.label}
						</Badge>
						<!-- Category badge -->
						<Badge variant="outline" class="text-xs">
							{categoryLabel}
						</Badge>
					</div>
					<Card.Title class={cn('text-lg', !unlocked && 'text-muted-foreground')}>
						{achievement.name}
					</Card.Title>
				</div>
			</div>
		</Card.Header>

		<Card.Content class={cn(unlocked ? 'pl-4' : '')}>
			<!-- Description -->
			<p class={cn('text-sm', unlocked ? 'text-muted-foreground' : 'text-muted-foreground/50')}>
				{#if unlocked || !achievement.metadata?.hidden}
					{achievement.description}
				{:else}
					???
				{/if}
			</p>

			<!-- Progress bar for progressive achievements -->
			{#if isProgressive}
				<div class="mt-4">
					<div class="mb-2 flex items-center justify-between text-sm">
						<span class="text-muted-foreground">Progression</span>
						<span class="font-medium">{progress}%</span>
					</div>
					<Progress value={progress} max={100} class="h-2" />
				</div>
			{/if}

			<!-- Points and unlock info -->
			{#if unlocked}
				<div class="mt-4 flex items-center justify-between">
					<div class="flex items-center gap-2 text-sm">
						<Trophy class={cn('h-4 w-4', config.iconColor)} />
						<span class="font-semibold">{points} points</span>
					</div>
					{#if formattedDate}
						<span class="text-xs text-muted-foreground">
							Debloquer le {formattedDate}
						</span>
					{/if}
				</div>
			{:else if progress === null}
				<!-- Locked state hint -->
				<div class="mt-4 flex items-center gap-2 text-sm text-muted-foreground">
					<Lock class="h-4 w-4" />
					<span>Non debloquer</span>
				</div>
			{/if}
		</Card.Content>

		<!-- Context badge (bottom right) -->
		{#if achievement.context}
			<div class="absolute right-3 bottom-3">
				<Badge variant="secondary" class="text-xs capitalize opacity-60">
					{achievement.context}
				</Badge>
			</div>
		{/if}
	</Card.Root>
{/if}
