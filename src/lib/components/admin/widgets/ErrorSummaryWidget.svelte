<script lang="ts">
	import { AlertTriangle, TrendingUp } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tooltip from '$lib/components/ui/tooltip';
	import { cn } from '$lib/utils';

	// Props
	type Props = {
		criticalErrors: number;
		unresolvedErrors: number;
		lastHourErrors: number;
		errorRate: number;
	};

	let { criticalErrors, unresolvedErrors, lastHourErrors, errorRate }: Props = $props();

	// Derived values
	const hasCriticalErrors = $derived(criticalErrors > 0);
	const hasHighUnresolvedErrors = $derived(unresolvedErrors > 10);
	const formattedErrorRate = $derived((errorRate * 100).toFixed(2));

	const handleClick = () => {
		window.location.href = '/dashboard/admin/errors';
	};
</script>

<Card.Root
	class={cn(
		'cursor-pointer transition-all duration-200 hover:shadow-md',
		hasCriticalErrors && 'border-red-200 bg-red-50/30',
		!hasCriticalErrors && hasHighUnresolvedErrors && 'border-orange-200 bg-orange-50/30'
	)}
	onclick={handleClick}
>
	<Card.Content class="p-6">
		<div class="mb-4 flex items-start justify-between">
			<div class="flex items-center gap-2">
				<AlertTriangle
					class={cn(
						'h-5 w-5',
						hasCriticalErrors && 'text-red-600',
						!hasCriticalErrors && hasHighUnresolvedErrors && 'text-orange-600',
						!hasCriticalErrors && !hasHighUnresolvedErrors && 'text-gray-600'
					)}
				/>
				<h3 class="text-sm font-semibold text-gray-900">Erreurs système</h3>
			</div>

			{#if hasCriticalErrors}
				<div class="relative">
					<span
						class="inline-flex items-center rounded-full bg-red-100 px-2.5 py-0.5 text-xs font-medium text-red-800"
					>
						Critique
					</span>
					<span
						class="absolute inset-0 animate-ping rounded-full bg-red-400 opacity-75"
						aria-hidden="true"
					></span>
				</div>
			{:else if hasHighUnresolvedErrors}
				<span
					class="inline-flex items-center rounded-full bg-orange-100 px-2.5 py-0.5 text-xs font-medium text-orange-800"
				>
					Attention
				</span>
			{/if}
		</div>

		<div class="space-y-3">
			<!-- Critical errors -->
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<div class="flex items-center justify-between" {...builder}>
						<span class="text-sm text-gray-600">Erreurs critiques (24h)</span>
						<span
							class={cn('text-lg font-bold', hasCriticalErrors ? 'text-red-600' : 'text-gray-900')}
						>
							{criticalErrors}
						</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Erreurs critiques détectées dans les dernières 24 heures</p>
				</Tooltip.Content>
			</Tooltip.Root>

			<!-- Unresolved errors -->
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<div class="flex items-center justify-between" {...builder}>
						<span class="text-sm text-gray-600">Erreurs non résolues</span>
						<span
							class={cn(
								'text-lg font-bold',
								hasHighUnresolvedErrors ? 'text-orange-600' : 'text-gray-900'
							)}
						>
							{unresolvedErrors}
						</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Nombre total d'erreurs non marquées comme résolues</p>
				</Tooltip.Content>
			</Tooltip.Root>

			<!-- Last hour errors -->
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<div class="flex items-center justify-between" {...builder}>
						<span class="text-sm text-gray-600">Dernière heure</span>
						<span class="text-lg font-bold text-gray-900">{lastHourErrors}</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Erreurs survenues dans la dernière heure</p>
				</Tooltip.Content>
			</Tooltip.Root>

			<!-- Error rate -->
			<Tooltip.Root>
				<Tooltip.Trigger asChild let:builder>
					<div class="flex items-center justify-between" {...builder}>
						<div class="flex items-center gap-1">
							<TrendingUp class="h-4 w-4 text-gray-500" />
							<span class="text-sm text-gray-600">Taux d'erreur</span>
						</div>
						<span class="text-lg font-bold text-gray-900">{formattedErrorRate}%</span>
					</div>
				</Tooltip.Trigger>
				<Tooltip.Content>
					<p>Pourcentage de requêtes ayant généré une erreur</p>
				</Tooltip.Content>
			</Tooltip.Root>
		</div>

		<div class="mt-4 border-t border-gray-200 pt-3">
			<p class="text-center text-xs text-gray-500">Cliquez pour voir le tableau de bord complet</p>
		</div>
	</Card.Content>
</Card.Root>
