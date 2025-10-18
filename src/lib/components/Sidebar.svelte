<script lang="ts">
	import { page } from '$app/stores';
	import { Home, BookOpen, PenTool, Library, Gamepad2 } from 'lucide-svelte';

	// Default navigation items
	let {
		items = [
			{ label: 'Accueil', href: '/', icon: Home },
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
<aside class="hidden w-20 border-r border-border bg-card/50 shadow-sm lg:block dark:bg-card">
	<nav class="flex flex-col items-center gap-1 py-4">
		{#each items as item}
			<a
				href={item.href}
				data-sveltekit-preload-data="tap"
				class="group flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
					item.href
				)
					? 'bg-primary/10 text-primary'
					: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
				title={item.label}
			>
				<!-- Svelte 5: Components are dynamic by default, no need for svelte:component -->
				<item.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
				<span class="text-center text-xs leading-tight font-medium">{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
