<script lang="ts">
	import { page } from '$app/stores';
	import { Home, BookOpen, PenTool, Library, Gamepad2 } from 'lucide-svelte';

	// Default navigation items
	let {
		items = [
			{ label: 'Accueil', href: '/', icon: Home },
			{ label: 'Exercices', href: '/exercises', icon: BookOpen },
			{ label: 'Pratique', href: '/practice', icon: PenTool },
			{ label: 'Ressources', href: '/resources', icon: Library },
			{ label: 'Jeux', href: '/games', icon: Gamepad2 }
		]
	}: {
		items?: Array<{ label: string; href: string; icon: any }>;
	} = $props();

	// Check if a link is active
	function isActive(href: string) {
		return $page.url.pathname === href;
	}
</script>

<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
<aside class="hidden bg-card/50 dark:bg-card border-r border-border w-20 shadow-sm lg:block">
	<nav class="flex flex-col items-center gap-1 py-4">
		{#each items as item}
			<a
				href={item.href}
				class="flex flex-col items-center gap-1 px-2 py-3 rounded-lg transition-all duration-300 w-16 group {isActive(item.href)
					? 'bg-primary/10 text-primary'
					: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
				title={item.label}
			>
				<svelte:component
					this={item.icon}
					class="w-6 h-6 group-hover:scale-110 transition-transform duration-300"
				/>
				<span class="text-xs text-center leading-tight font-medium">{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
