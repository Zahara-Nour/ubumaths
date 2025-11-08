<script lang="ts">
	import { ChevronDown, ChevronUp } from 'lucide-svelte';
	import * as Card from '$lib/components/ui/card';
	import { cn } from '$lib/utils';

	// Props
	type Props = {
		service: string;
		status: 'ok' | 'degraded' | 'down';
		latency?: number;
		lastCheck: string;
		message?: string;
	};

	let { service, status, latency, lastCheck, message }: Props = $props();

	// Local state
	let expanded = $state(false);

	// Derived values
	const statusConfig = $derived.by(() => {
		switch (status) {
			case 'ok':
				return {
					color: 'bg-green-500',
					label: 'Opérationnel',
					textColor: 'text-green-600'
				};
			case 'degraded':
				return {
					color: 'bg-orange-500',
					label: 'Dégradé',
					textColor: 'text-orange-600'
				};
			case 'down':
				return {
					color: 'bg-red-500',
					label: 'Hors ligne',
					textColor: 'text-red-600'
				};
		}
	});

	const shouldPulse = $derived(status === 'degraded' || status === 'down');

	const relativeTime = $derived.by(() => {
		const now = new Date();
		const checkTime = new Date(lastCheck);
		const diffMs = now.getTime() - checkTime.getTime();
		const diffMins = Math.floor(diffMs / 60000);

		if (diffMins < 1) return "à l'instant";
		if (diffMins === 1) return 'il y a 1 minute';
		if (diffMins < 60) return `il y a ${diffMins} minutes`;

		const diffHours = Math.floor(diffMins / 60);
		if (diffHours === 1) return 'il y a 1 heure';
		if (diffHours < 24) return `il y a ${diffHours} heures`;

		const diffDays = Math.floor(diffHours / 24);
		if (diffDays === 1) return 'il y a 1 jour';
		return `il y a ${diffDays} jours`;
	});

	const toggleExpanded = () => {
		expanded = !expanded;
	};
</script>

<Card.Root class="transition-shadow duration-200 hover:shadow-md">
	<Card.Content class="p-4">
		<div class="flex items-start justify-between">
			<div class="flex flex-1 items-center gap-3">
				<!-- Status indicator dot -->
				<div class="relative">
					<div class={cn('h-3 w-3 rounded-full', statusConfig.color)}></div>
					{#if shouldPulse}
						<div
							class={cn(
								'absolute inset-0 h-3 w-3 animate-ping rounded-full opacity-75',
								statusConfig.color
							)}
						></div>
					{/if}
				</div>

				<div class="min-w-0 flex-1">
					<div class="flex flex-wrap items-center gap-2">
						<h3 class="text-sm font-semibold text-gray-900">{service}</h3>
						<span class={cn('text-xs font-medium', statusConfig.textColor)}>
							{statusConfig.label}
						</span>
					</div>

					<div class="mt-1 flex items-center gap-3 text-xs text-gray-500">
						{#if latency !== undefined}
							<span>{latency}ms</span>
						{/if}
						<span>{relativeTime}</span>
					</div>
				</div>
			</div>

			<!-- Expand button if message exists -->
			{#if message}
				<button
					onclick={toggleExpanded}
					class="rounded p-1 transition-colors hover:bg-gray-100"
					aria-label={expanded ? 'Masquer les détails' : 'Afficher les détails'}
				>
					{#if expanded}
						<ChevronUp class="h-4 w-4 text-gray-600" />
					{:else}
						<ChevronDown class="h-4 w-4 text-gray-600" />
					{/if}
				</button>
			{/if}
		</div>

		<!-- Expandable message section -->
		{#if message && expanded}
			<div class="mt-3 border-t border-gray-200 pt-3">
				<p class="text-xs text-gray-600">{message}</p>
			</div>
		{/if}
	</Card.Content>
</Card.Root>
