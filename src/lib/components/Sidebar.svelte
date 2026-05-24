<script lang="ts">
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import {
		Home,
		Gamepad2,
		FileSpreadsheet,
		BookOpen,
		PenTool,
		Terminal,
		Calculator,
		ListTodo,
		Laugh
		// CalculatorIcon,
		// LineChart
	} from 'lucide-svelte';
	import type { ComponentType } from 'svelte';
	import type { Tables } from '$lib/types/database';

	type NavSection = 'serious' | 'fun';
	type NavItem = {
		label: string;
		href: string;
		icon: ComponentType;
		roles?: string[];
		section?: NavSection;
	};

	// Props
	let {
		profile = null,
		items = [
			{ label: 'Accueil', href: '/', icon: Home },
			{ label: 'Jeux', href: '/games', icon: Gamepad2 },
			{
				label: 'Python',
				href: '/python',
				icon: Terminal,
				roles: ['student', 'teacher']
			},
			{ label: 'Upsilon', href: '/upsilon', icon: Calculator },
			{
				label: 'Worksheets',
				href: '/dashboard/teacher/contenu/worksheets',
				icon: FileSpreadsheet,
				roles: ['teacher']
			},
			{
				label: 'Mon travail',
				href: '/dashboard/student/work',
				icon: ListTodo,
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
			},
			{
				label: 'Zygomatics',
				href: '/presques-evaluations',
				icon: Laugh,
				section: 'fun'
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

	// Filter items based on user role, then split by section (serious | fun).
	// Items without an explicit section default to 'serious' to keep current
	// behaviour for existing callers.
	let visibleItems = $derived(
		items.filter((item) => {
			if (!item.roles) return true;
			if (!profile) return false;
			return item.roles.includes(profile.role);
		})
	);

	let seriousItems = $derived(
		visibleItems.filter((item) => (item.section ?? 'serious') === 'serious')
	);
	let funItems = $derived(visibleItems.filter((item) => item.section === 'fun'));

	// Check if a link is active
	function isActive(href: string) {
		return page.url.pathname === href;
	}
</script>

{#snippet itemLink(item: NavItem)}
	<a
		href={resolve(item.href as '/')}
		data-sveltekit-preload-data="tap"
		class="group flex w-16 flex-col items-center gap-1 rounded-lg px-2 py-3 transition-all duration-300 {isActive(
			item.href
		)
			? 'bg-primary/10 text-primary'
			: 'text-muted-foreground hover:bg-muted/60 hover:text-foreground'}"
		title={item.label}
	>
		<item.icon class="h-6 w-6 transition-transform duration-300 group-hover:scale-110" />
		<span class="text-center text-xs leading-tight font-medium">{item.label}</span>
	</a>
{/snippet}

<!-- RAIL SIDEBAR - Vertical icon navigation (Claude AI style) -->
<aside class="hidden w-20 border-r border-border bg-card/50 shadow-sm md:block dark:bg-card">
	<nav class="flex flex-col items-center gap-1 py-4">
		{#each seriousItems as item (item.href)}
			{@render itemLink(item)}
		{/each}

		{#if funItems.length > 0}
			<hr class="my-2 w-10 border-t border-border" />
			{#each funItems as item (item.href)}
				{@render itemLink(item)}
			{/each}
		{/if}
	</nav>
</aside>
