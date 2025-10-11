<script lang="ts">
	import { cn } from '$lib/utils';

	// You can add navigation items as props
	let {
		items = [
			{ label: 'Home', href: '/', icon: '🏠' },
			{ label: 'Exercises', href: '/exercises', icon: '📝' },
			{ label: 'Practice', href: '/practice', icon: '✏️' },
			{ label: 'Resources', href: '/resources', icon: '📚' }
		]
	}: {
		items?: Array<{ label: string; href: string; icon?: string }>;
	} = $props();
</script>

<aside class="hidden w-64 border-r bg-background shadow-sm lg:block">
	<nav class="flex flex-col gap-2 p-4">
		{#each items as item}
			<a
				href={item.href}
				class={cn(
					'flex items-center gap-3 rounded-lg px-4 py-3 transition-colors',
					'text-foreground hover:bg-accent hover:text-accent-foreground',
					'font-medium'
				)}
			>
				{#if item.icon}
					<span class="text-xl">{item.icon}</span>
				{/if}
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
