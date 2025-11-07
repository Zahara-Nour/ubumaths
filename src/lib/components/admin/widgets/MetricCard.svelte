<script lang="ts">
	import { ArrowUp, ArrowDown, type Icon } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	// Props
	type Props = {
		label: string;
		value: number | string;
		trend?: number;
		status?: 'ok' | 'warning' | 'critical';
		icon?: typeof Icon;
		link?: string;
	};

	let { label, value, trend, status, icon: IconComponent, link }: Props = $props();

	// Derived values
	const formattedValue = $derived.by(() => {
		if (typeof value === 'number') {
			return new Intl.NumberFormat('fr-FR').format(value);
		}
		return value;
	});

	const statusClasses = $derived.by(() => {
		switch (status) {
			case 'ok':
				return 'bg-gradient-to-br from-green-50 to-green-100/50 border-green-200';
			case 'warning':
				return 'bg-gradient-to-br from-orange-50 to-orange-100/50 border-orange-200';
			case 'critical':
				return 'bg-gradient-to-br from-red-50 to-red-100/50 border-red-200';
			default:
				return 'bg-white border-gray-200';
		}
	});

	const trendColor = $derived.by(() => {
		if (!trend) return '';
		return trend > 0 ? 'text-green-600' : 'text-red-600';
	});

	const handleClick = () => {
		if (link) {
			window.location.href = link;
		}
	};
</script>

<Card.Root
	class={cn(
		'transition-all duration-200 hover:shadow-md',
		statusClasses(),
		link ? 'cursor-pointer' : ''
	)}
	onclick={handleClick}
>
	<Card.Content class="p-6">
		<div class="flex items-start justify-between">
			<div class="flex-1">
				<p class="text-sm font-medium text-gray-600">{label}</p>
				<p class="mt-2 text-3xl font-bold text-gray-900">{formattedValue()}</p>

				{#if trend !== undefined}
					<div class="mt-2 flex items-center gap-1 {trendColor()}">
						{#if trend > 0}
							<ArrowUp class="h-4 w-4" />
						{:else}
							<ArrowDown class="h-4 w-4" />
						{/if}
						<span class="text-sm font-medium">{Math.abs(trend).toFixed(1)}%</span>
					</div>
				{/if}
			</div>

			{#if IconComponent}
				<div
					class={cn(
						'rounded-lg p-3',
						status === 'ok' && 'bg-green-100 text-green-600',
						status === 'warning' && 'bg-orange-100 text-orange-600',
						status === 'critical' && 'bg-red-100 text-red-600',
						!status && 'bg-gray-100 text-gray-600'
					)}
				>
					<IconComponent class="h-6 w-6" />
				</div>
			{/if}
		</div>
	</Card.Content>
</Card.Root>
