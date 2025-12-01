<script lang="ts">
	import type { Snippet } from 'svelte';
	import { page } from '$app/state';
	import { Badge } from '$lib/components/ui/badge';

	let { children }: { children: Snippet } = $props();

	const debugPages = [
		{ href: '/dashboard/admin/debug/database', label: 'Database' },
		{ href: '/dashboard/admin/debug/session', label: 'Session' },
		{ href: '/dashboard/admin/debug/rls', label: 'RLS Policies' },
		{ href: '/dashboard/admin/debug/avatar', label: 'Avatar' },
		{ href: '/dashboard/admin/debug/wheel', label: 'Wheel' },
		{ href: '/dashboard/admin/debug/question-display', label: 'QuestionDisplay' },
		{ href: '/dashboard/admin/debug/rich-text', label: 'RichTextEditor' },
		{ href: '/dashboard/admin/debug/typst-preview', label: 'Typst PDF' },
		{ href: '/dashboard/admin/debug/latex-preview', label: 'LaTeX PDF' },
		{ href: '/dashboard/admin/debug/latex-transpiler', label: 'LaTeX Transpiler' },
		{ href: '/dashboard/admin/debug/mathfield', label: 'MathField' }
	];

	function isActivePage(href: string): boolean {
		return page.url.pathname === href;
	}
</script>

<div class="space-y-6">
	<!-- Debug Section Header with Tab Navigation -->
	<div class="border-b border-border pb-4">
		<div class="mb-4 flex items-center gap-3">
			<h1 class="text-3xl font-bold text-foreground">Admin Debug Tools</h1>
			<Badge
				variant="outline"
				class="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
			>
				Admin Only
			</Badge>
		</div>

		<!-- Tab Navigation -->
		<nav class="flex gap-2 overflow-x-auto">
			{#each debugPages as debugPage (debugPage.href)}
				<a
					href={debugPage.href}
					class="rounded-lg px-4 py-2 text-sm font-medium whitespace-nowrap transition-colors {isActivePage(
						debugPage.href
					)
						? 'bg-primary text-primary-foreground'
						: 'bg-muted/50 text-muted-foreground hover:bg-muted hover:text-foreground'}"
				>
					{debugPage.label}
				</a>
			{/each}
		</nav>
	</div>

	<!-- Debug Page Content -->
	{@render children()}
</div>
