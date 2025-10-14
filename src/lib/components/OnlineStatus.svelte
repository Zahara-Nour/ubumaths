<script lang="ts">
	import { cn } from '$lib/utils';

	interface Props {
		status: 'online' | 'offline';
		showLabel?: boolean;
		size?: 'sm' | 'md' | 'lg';
	}

	let { status = 'offline', showLabel = false, size = 'md' }: Props = $props();

	const sizeClasses = {
		sm: 'w-2 h-2',
		md: 'w-3 h-3',
		lg: 'w-4 h-4'
	};

	const statusColors = {
		online: 'bg-green-500',
		offline: 'bg-gray-400'
	};

	const statusLabels = {
		online: 'En ligne',
		offline: 'Hors ligne'
	};
</script>

<div class="flex items-center gap-2">
	<span
		class={cn(
			'inline-block rounded-full',
			sizeClasses[size],
			statusColors[status],
			status === 'online' && 'animate-pulse'
		)}
		title={statusLabels[status]}
	></span>
	{#if showLabel}
		<span class="text-sm text-muted-foreground">
			{statusLabels[status]}
		</span>
	{/if}
</div>
