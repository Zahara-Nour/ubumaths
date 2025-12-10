<!--
	QuizSummary Component
	=====================

	End of quiz score display.
	Shows large score, color-coded by performance,
	with optional restart and close buttons.

	@module components/cours/QuizSummary
-->
<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';
	import { Trophy, RotateCcw, X, Star } from 'lucide-svelte';

	// Props
	interface Props {
		score: number;
		total: number;
		onRestart?: () => void;
		onClose?: () => void;
	}

	let { score, total, onRestart, onClose }: Props = $props();

	// Calculate percentage
	const percentage = $derived(total > 0 ? Math.round((score / total) * 100) : 0);

	// Determine performance level and colors
	const performanceLevel = $derived.by(() => {
		if (percentage >= 80) return 'excellent';
		if (percentage >= 50) return 'good';
		return 'needsWork';
	});

	// Color classes based on performance
	const colorClasses = $derived.by(() => {
		switch (performanceLevel) {
			case 'excellent':
				return {
					bg: 'bg-green-50 dark:bg-green-900/30',
					border: 'border-green-500',
					text: 'text-green-600 dark:text-green-400',
					ring: 'ring-green-500/30'
				};
			case 'good':
				return {
					bg: 'bg-orange-50 dark:bg-orange-900/30',
					border: 'border-orange-500',
					text: 'text-orange-600 dark:text-orange-400',
					ring: 'ring-orange-500/30'
				};
			default:
				return {
					bg: 'bg-red-50 dark:bg-red-900/30',
					border: 'border-red-500',
					text: 'text-red-600 dark:text-red-400',
					ring: 'ring-red-500/30'
				};
		}
	});

	// Message based on performance
	const message = $derived.by(() => {
		switch (performanceLevel) {
			case 'excellent':
				return 'Excellent travail !';
			case 'good':
				return 'Bon travail !';
			default:
				return 'Continue tes efforts !';
		}
	});

	// Subtitle message
	const subtitle = $derived.by(() => {
		switch (performanceLevel) {
			case 'excellent':
				return 'Tu maitrises bien ce chapitre.';
			case 'good':
				return 'Tu es sur la bonne voie.';
			default:
				return 'Revois le cours et reessaie.';
		}
	});
</script>

<Card.Root class={cn('border-2 text-center', colorClasses.bg, colorClasses.border)}>
	<Card.Header class="pb-2">
		<!-- Trophy/Star icon -->
		<div class="mb-4 flex justify-center">
			{#if performanceLevel === 'excellent'}
				<div class={cn('rounded-full p-4', colorClasses.bg, 'ring-4', colorClasses.ring)}>
					<Trophy class={cn('h-12 w-12', colorClasses.text)} />
				</div>
			{:else if performanceLevel === 'good'}
				<div class={cn('rounded-full p-4', colorClasses.bg, 'ring-4', colorClasses.ring)}>
					<Star class={cn('h-12 w-12', colorClasses.text)} />
				</div>
			{:else}
				<div class={cn('rounded-full p-4', colorClasses.bg, 'ring-4', colorClasses.ring)}>
					<RotateCcw class={cn('h-12 w-12', colorClasses.text)} />
				</div>
			{/if}
		</div>

		<!-- Title -->
		<Card.Title class="text-2xl">{message}</Card.Title>
		<Card.Description class="text-base">{subtitle}</Card.Description>
	</Card.Header>

	<Card.Content class="space-y-6">
		<!-- Large score display -->
		<div class="score-display">
			<div class={cn('text-6xl font-bold tabular-nums', colorClasses.text)}>
				{score}<span class="text-3xl text-muted-foreground">/{total}</span>
			</div>
			<div class={cn('mt-2 text-2xl font-semibold', colorClasses.text)}>
				{percentage}%
			</div>
		</div>

		<!-- Visual progress ring -->
		<div class="flex justify-center">
			<div class="relative h-32 w-32">
				<!-- Background circle -->
				<svg class="h-full w-full -rotate-90 transform" viewBox="0 0 100 100">
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						stroke-width="8"
						class="text-muted/30"
					/>
					<!-- Progress circle -->
					<circle
						cx="50"
						cy="50"
						r="45"
						fill="none"
						stroke="currentColor"
						stroke-width="8"
						stroke-linecap="round"
						stroke-dasharray={`${percentage * 2.83} 283`}
						class={colorClasses.text}
					/>
				</svg>
				<!-- Center text -->
				<div class="absolute inset-0 flex items-center justify-center">
					<span class={cn('text-2xl font-bold', colorClasses.text)}>{percentage}%</span>
				</div>
			</div>
		</div>

		<!-- Stars based on performance -->
		{#if performanceLevel === 'excellent'}
			<div class="flex justify-center gap-1">
				{#each Array(3) as _, i (i)}
					<Star class="h-8 w-8 fill-yellow-400 text-yellow-400" />
				{/each}
			</div>
		{:else if performanceLevel === 'good'}
			<div class="flex justify-center gap-1">
				{#each Array(2) as _, i (i)}
					<Star class="h-8 w-8 fill-yellow-400 text-yellow-400" />
				{/each}
				<Star class="h-8 w-8 text-muted-foreground/30" />
			</div>
		{:else}
			<div class="flex justify-center gap-1">
				<Star class="h-8 w-8 fill-yellow-400 text-yellow-400" />
				{#each Array(2) as _, i (i)}
					<Star class="h-8 w-8 text-muted-foreground/30" />
				{/each}
			</div>
		{/if}
	</Card.Content>

	<!-- Action buttons -->
	{#if onRestart || onClose}
		<Card.Footer class="flex flex-col justify-center gap-3 sm:flex-row">
			{#if onRestart}
				<Button onclick={onRestart} variant="outline" size="lg">
					<RotateCcw class="mr-2 h-4 w-4" />
					Recommencer
				</Button>
			{/if}
			{#if onClose}
				<Button onclick={onClose} size="lg">
					<X class="mr-2 h-4 w-4" />
					Fermer
				</Button>
			{/if}
		</Card.Footer>
	{/if}
</Card.Root>
