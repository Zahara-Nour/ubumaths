<script lang="ts">
	import { page } from '$app/state';
	import {
		Home,
		Gamepad2,
		FileSpreadsheet,
		BookOpen,
		PenTool
		// Calculator,
		// Terminal,
		// CalculatorIcon,
		// LineChart
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import type { Tables } from '$lib/types/database';

	type NavItem = { label: string; href: string; icon: ComponentType; roles?: string[] };

	// Props
	let {
		profile = null,
		items = [
			{ label: 'Accueil', href: '/', icon: Home },
			{ label: 'Jeux', href: '/games', icon: Gamepad2 },
			{
				label: 'Worksheets',
				href: '/dashboard/teacher/worksheets',
				icon: FileSpreadsheet,
				roles: ['teacher']
			},
			{
				label: 'Mes Fiches',
				href: '/dashboard/student/worksheets',
				icon: FileSpreadsheet,
				roles: ['student']
			},
			{
				label: 'Cahier',
				href: '/dashboard/teacher/cahier-texte',
				icon: BookOpen,
				roles: ['teacher']
			},
			{
				label: 'Cahier',
				href: '/dashboard/student/cahier-texte',
				icon: BookOpen,
				roles: ['student']
			},
			{
				label: 'Whiteboard',
				href: '/whiteboard',
				icon: PenTool,
				roles: ['teacher']
			}
			// { label: 'Automaths', href: '/automaths', icon: Calculator },
			// { label: 'CAS', href: '/cas', icon: Terminal },
			// {
			// 	label: 'Calculatrice',
			// 	href: '/calculatrice',
			// 	icon: CalculatorIcon,
			// 	roles: ['student', 'teacher']
			// },
			// {
			// 	label: 'Grapheur',
			// 	href: '/grapheur',
			// 	icon: LineChart,
			// 	roles: ['student', 'teacher']
			// }
		]
	}: {
		profile?: Tables<'profiles'> | null;
		items?: NavItem[];
	} = $props();

	// Filter items based on user role
	let visibleItems = $derived(
		items.filter((item) => {
			// If no roles specified, show to everyone
			if (!item.roles) return true;
			// If roles specified, check if user has one of the required roles
			if (!profile) return false;
			return item.roles.includes(profile.role);
		})
	);

	// Check if a link is active
	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
<aside class="hidden w-20 border-r border-border bg-card/50 shadow-sm md:block dark:bg-card">
	<nav class="flex flex-col items-center gap-1 py-4">
		{#each visibleItems as item (item.href)}
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
				<!-- Svelte 5: Components are dynamic by default -->
				<item.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
				<span class="text-center text-xs leading-tight font-medium">{item.label}</span>
			</a>
		{/each}
	</nav>
</aside>
