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

<aside class="hidden w-64 border-r border-border bg-background lg:block">
	<nav class="flex flex-col gap-1 p-3">
		{#each items as item}
			<a
				href={item.href}
				class={cn(
					'flex items-center gap-3 rounded-lg px-4 py-3 transition-all duration-300',
					'text-foreground hover:bg-muted/80 dark:hover:bg-muted/60',
					'font-medium text-sm',
					'group'
				)}
			>
				{#if item.icon}
					<span class="text-xl group-hover:scale-110 transition-transform duration-300">{item.icon}</span>
				{/if}
				<span>{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
