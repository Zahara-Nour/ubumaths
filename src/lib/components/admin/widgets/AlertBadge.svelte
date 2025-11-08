<script lang="ts">
	import { cn } from '$lib/utils';

	// Props
	type Props = {
		count: number;
		severity: 'info' | 'warning' | 'critical';
		label: string;
		pulse?: boolean;
	};

	let { count, severity, label, pulse = false }: Props = $props();

	// Derived values
	const severityClasses = $derived.by(() => {
		switch (severity) {
			case 'info':
				return {
					badge: 'bg-blue-100 text-blue-800 border-blue-200',
					ring: 'bg-blue-400'
				};
			case 'warning':
				return {
					badge: 'bg-orange-100 text-orange-800 border-orange-200',
					ring: 'bg-orange-400'
				};
			case 'critical':
				return {
					badge: 'bg-red-100 text-red-800 border-red-200',
					ring: 'bg-red-400'
				};
		}
	});
</script>

<div class="relative inline-flex items-center">
	<span
		class={cn(
			'inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-xs font-semibold',
			severityClasses.badge
		)}
	>
		<span>{label}</span>
		<span class="font-bold">{count}</span>
	</span>

	{#if pulse}
		<span
			class={cn('absolute inset-0 animate-ping rounded-full opacity-75', severityClasses.ring)}
			aria-hidden="true"
		/>
	{/if}
</div>
