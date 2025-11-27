<script lang="ts">
	/**
	 * MigrationTree Component
	 * =======================
	 *
	 * Displays a hierarchical tree of question categories for migration review.
	 * Structure: Theme > Domain > Subdomain
	 *
	 * Features:
	 * - Collapsible tree nodes
	 * - Progress indicators per category
	 * - Click subdomain to navigate to detail view
	 * - Icons for different node types
	 */

	import { goto } from '$app/navigation';
	import { SvelteSet } from 'svelte/reactivity';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import CategoryProgress from './CategoryProgress.svelte';
	import { ChevronRight, Folder, FolderOpen, BookOpen, FileText, Layers } from 'lucide-svelte';

	// Import types from shared type definitions
	import type { TreeNode } from '$lib/types/migration';

	interface Props {
		data: TreeNode[];
		class?: string;
	}

	let { data, class: className }: Props = $props();

	// Track expanded state for each node using SvelteSet (already reactive)
	let expandedThemes = new SvelteSet<string>();
	let expandedDomains = new SvelteSet<string>();

	// Toggle functions
	function toggleTheme(themeName: string) {
		if (expandedThemes.has(themeName)) {
			expandedThemes.delete(themeName);
		} else {
			expandedThemes.add(themeName);
		}
	}

	function toggleDomain(domainKey: string) {
		if (expandedDomains.has(domainKey)) {
			expandedDomains.delete(domainKey);
		} else {
			expandedDomains.add(domainKey);
		}
	}

	// Navigate to subdomain detail page
	function navigateToSubdomain(node: TreeNode) {
		if (node.path) {
			// Extract theme/domain/subdomain from path
			// Path format: "by-category/{theme}/{domain}/{subdomain}"
			const parts = node.path.split('/');
			if (parts.length >= 4) {
				const [_byCategory, theme, domain, subdomain] = parts;
				// Encode each part separately for URL
				const encodedTheme = encodeURIComponent(theme);
				const encodedDomain = encodeURIComponent(domain);
				const encodedSubdomain = encodeURIComponent(subdomain);
				goto(
					`/dashboard/admin/migration/${encodedTheme}/${encodedDomain}/${encodedSubdomain}`
				).then(() => {});
			}
		}
	}

	// Expand all nodes
	function expandAll() {
		for (const theme of data) {
			expandedThemes.add(theme.name);
			for (const domain of theme.children || []) {
				expandedDomains.add(`${theme.name}/${domain.name}`);
			}
		}
	}

	// Collapse all nodes
	function collapseAll() {
		expandedThemes.clear();
		expandedDomains.clear();
	}
</script>

<div class={cn('space-y-1', className)}>
	<!-- Expand/Collapse controls -->
	<div class="mb-4 flex gap-2">
		<button
			onclick={expandAll}
			class="text-xs text-muted-foreground hover:text-foreground hover:underline"
		>
			Tout developper
		</button>
		<span class="text-muted-foreground">|</span>
		<button
			onclick={collapseAll}
			class="text-xs text-muted-foreground hover:text-foreground hover:underline"
		>
			Tout reduire
		</button>
	</div>

	<!-- Tree structure -->
	{#each data as theme (theme.name)}
		{@const isThemeExpanded = expandedThemes.has(theme.name)}

		<div class="rounded-lg border bg-card">
			<!-- Theme header -->
			<button
				onclick={() => toggleTheme(theme.name)}
				class="flex w-full items-center gap-2 rounded-lg px-3 py-2.5 text-left transition-colors hover:bg-muted/50"
			>
				<ChevronRight
					class={cn('h-4 w-4 shrink-0 transition-transform duration-200', {
						'rotate-90': isThemeExpanded
					})}
				/>
				{#if isThemeExpanded}
					<FolderOpen class="h-5 w-5 shrink-0 text-primary" />
				{:else}
					<Folder class="h-5 w-5 shrink-0 text-primary" />
				{/if}
				<span class="flex-1 font-medium">{theme.name}</span>
				<Badge variant="secondary" class="ml-2">
					{theme.levelCount} niveau{theme.levelCount > 1 ? 'x' : ''}
				</Badge>
				<CategoryProgress
					total={theme.progress.total}
					approved={theme.progress.approved}
					pending={theme.progress.pending}
					rejected={theme.progress.rejected}
					compact
				/>
			</button>

			<!-- Theme content (domains) -->
			{#if isThemeExpanded && theme.children}
				<div class="border-t pb-2">
					{#each theme.children as domain (domain.name)}
						{@const domainKey = `${theme.name}/${domain.name}`}
						{@const isDomainExpanded = expandedDomains.has(domainKey)}

						<div class="ml-6">
							<!-- Domain header -->
							<button
								onclick={() => toggleDomain(domainKey)}
								class="flex w-full items-center gap-2 px-3 py-2 text-left transition-colors hover:bg-muted/50"
							>
								<ChevronRight
									class={cn('h-4 w-4 shrink-0 transition-transform duration-200', {
										'rotate-90': isDomainExpanded
									})}
								/>
								<BookOpen class="h-4 w-4 shrink-0 text-muted-foreground" />
								<span class="flex-1 text-sm">{domain.name}</span>
								<Badge variant="outline" class="text-xs">
									{domain.levelCount}
								</Badge>
								<CategoryProgress
									total={domain.progress.total}
									approved={domain.progress.approved}
									pending={domain.progress.pending}
									rejected={domain.progress.rejected}
									compact
								/>
							</button>

							<!-- Domain content (subdomains) -->
							{#if isDomainExpanded && domain.children}
								<div class="ml-6 border-l border-dashed pl-4">
									{#each domain.children as subdomain (subdomain.name)}
										<button
											onclick={() => navigateToSubdomain(subdomain)}
											class="flex w-full items-center gap-2 rounded-md px-3 py-1.5 text-left transition-colors hover:bg-muted"
										>
											<FileText class="h-4 w-4 shrink-0 text-muted-foreground" />
											<span class="flex-1 text-sm text-muted-foreground hover:text-foreground">
												{subdomain.name}
											</span>
											{#if subdomain.levels && subdomain.levels.length > 0}
												<span class="text-xs text-muted-foreground">
													({subdomain.levels.length} niveau{subdomain.levels.length > 1 ? 'x' : ''})
												</span>
											{/if}
											<CategoryProgress
												total={subdomain.progress.total}
												approved={subdomain.progress.approved}
												pending={subdomain.progress.pending}
												rejected={subdomain.progress.rejected}
												compact
											/>
										</button>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</div>
	{/each}

	{#if data.length === 0}
		<div class="rounded-lg border border-dashed p-8 text-center">
			<Layers class="mx-auto h-12 w-12 text-muted-foreground/50" />
			<p class="mt-2 text-sm text-muted-foreground">Aucune donnee de migration disponible</p>
		</div>
	{/if}
</div>
