<script lang="ts">
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

<aside class="bg-surface-100-900 hidden w-64 border-r border-surface-300-700 shadow-sm lg:block">
	<nav class="flex flex-col gap-2 p-4">
		{#each items as item}
			<a
				href={item.href}
				class="text-on-surface-token hover:bg-surface-200-800 flex items-center gap-3 rounded-lg px-4 py-3 transition-colors hover:text-primary-500"
			>
				{#if item.icon}
					<span class="text-xl">{item.icon}</span>
				{/if}
				<span class="font-medium">{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
