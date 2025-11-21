<!--
	AchievementProgress Component
	============================
	Displays the progress towards an achievement with animated progress bar.

	Props:
	- currentValue: Current progress value
	- targetValue: Target value to reach
	- label: Optional label displayed above the progress bar
	- showPercentage: Show percentage next to progress (default: true)
	- size: Progress bar size 'sm' | 'md' | 'lg' (default: 'md')
	- color: Color scheme 'default' | 'success' | 'warning' (default: 'default')
	- animated: Enable animation on value change (default: true)
-->

<script lang="ts">
	import { cn } from '$lib/utils';

	// Types
	type Size = 'sm' | 'md' | 'lg';
	type Color = 'default' | 'success' | 'warning';

	interface Props {
		currentValue: number;
		targetValue: number;
		label?: string;
		showPercentage?: boolean;
		size?: Size;
		color?: Color;
		animated?: boolean;
	}

	// Props
	let {
		currentValue,
		targetValue,
		label = '',
		showPercentage = true,
		size = 'md',
		color = 'default',
		animated = true
	}: Props = $props();

	// Computed values - handle division by zero
	let percentage = $derived(
		targetValue > 0 ? Math.min(100, Math.round((currentValue / targetValue) * 100)) : 0
	);
	let isComplete = $derived(currentValue >= targetValue);

	// Size configuration
	const sizeConfig: Record<Size, { height: string; text: string; labelText: string }> = {
		sm: { height: 'h-1.5', text: 'text-xs', labelText: 'text-xs' },
		md: { height: 'h-2.5', text: 'text-sm', labelText: 'text-sm' },
		lg: { height: 'h-4', text: 'text-base', labelText: 'text-base' }
	};

	// Color configuration
	const colorConfig: Record<Color, { bg: string; indicator: string }> = {
		default: {
			bg: 'bg-primary/20',
			indicator: 'bg-primary'
		},
		success: {
			bg: 'bg-green-500/20 dark:bg-green-400/20',
			indicator: 'bg-green-500 dark:bg-green-400'
		},
		warning: {
			bg: 'bg-amber-500/20 dark:bg-amber-400/20',
			indicator: 'bg-amber-500 dark:bg-amber-400'
		}
	};

	let sizeStyles = $derived(sizeConfig[size]);
	let colorStyles = $derived(colorConfig[color]);
</script>

<div class="w-full" role="group" aria-label={label || 'Progression'}>
	<!-- Label and percentage row -->
	{#if label || showPercentage}
		<div class="mb-1.5 flex items-center justify-between gap-2">
			{#if label}
				<span class={cn('font-medium text-foreground', sizeStyles.labelText)}>
					{label}
				</span>
			{/if}
			{#if showPercentage}
				<span
					class={cn(
						'text-muted-foreground tabular-nums',
						sizeStyles.text,
						isComplete && 'font-semibold text-green-600 dark:text-green-400'
					)}
				>
					{percentage}%
				</span>
			{/if}
		</div>
	{/if}

	<!-- Progress bar -->
	<div
		class={cn('relative w-full overflow-hidden rounded-full', sizeStyles.height, colorStyles.bg)}
		role="progressbar"
		aria-valuenow={currentValue}
		aria-valuemin={0}
		aria-valuemax={targetValue}
		aria-label={label || `Progression: ${percentage}%`}
	>
		<div
			class={cn(
				'h-full rounded-full',
				colorStyles.indicator,
				animated && 'transition-all duration-500 ease-out'
			)}
			style="width: {percentage}%"
		></div>
	</div>

	<!-- Value display row -->
	<div class="mt-1.5 flex items-center justify-between">
		<span class={cn('text-muted-foreground tabular-nums', sizeStyles.text)}>
			{currentValue} / {targetValue}
		</span>
		{#if isComplete}
			<span class={cn('font-medium text-green-600 dark:text-green-400', sizeStyles.text)}>
				Complet
			</span>
		{/if}
	</div>
</div>
