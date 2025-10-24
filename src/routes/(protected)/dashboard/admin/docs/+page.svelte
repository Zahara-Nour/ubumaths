<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Input } from '$lib/components/ui/input';
	import { Button } from '$lib/components/ui/button';
	import { addHeaderIds } from '$lib/utils/markdown';

	let { data } = $props();

	let searchQuery = $state(data.searchQuery || '');
	let expandedCategories = $state<Set<string>>(new Set(['features', 'guides']));

	function toggleCategory(categoryPath: string) {
		if (expandedCategories.has(categoryPath)) {
			expandedCategories.delete(categoryPath);
		} else {
			expandedCategories.add(categoryPath);
		}
		expandedCategories = new Set(expandedCategories);
	}

	function handleSearch() {
		if (searchQuery.trim()) {
			goto(`/dashboard/admin/docs?q=${encodeURIComponent(searchQuery)}`);
		} else {
			goto('/dashboard/admin/docs');
		}
	}

	function getDocUrl(categoryPath: string, docPath: string) {
		return `/dashboard/admin/docs/${categoryPath}/${docPath.replace('.md', '')}`;
	}

	// Add IDs to headers for anchor links
	const htmlWithIds = data.defaultDoc ? addHeaderIds(data.defaultDoc.html) : '';
</script>

<svelte:head>
	<title>Documentation - Admin | UbuMaths</title>
	<!-- Highlight.js theme -->
	<link
		rel="stylesheet"
		href="https://cdnjs.cloudflare.com/ajax/libs/highlight.js/11.11.1/styles/github-dark.min.css"
	/>
</svelte:head>

<div class="container mx-auto p-6">
	<div class="mb-6">
		<h1 class="text-3xl font-bold">📚 Documentation</h1>
		<p class="text-muted-foreground mt-2">
			Documentation complète d'UbuMaths - Architecture, guides, et références
		</p>
	</div>

	<!-- Search -->
	<div class="mb-6 flex gap-2">
		<Input
			type="search"
			placeholder="Rechercher dans la documentation..."
			bind:value={searchQuery}
			onkeydown={(e) => e.key === 'Enter' && handleSearch()}
			class="flex-1"
		/>
		<Button onclick={handleSearch}>Rechercher</Button>
	</div>

	<div class="grid grid-cols-1 lg:grid-cols-4 gap-6">
		<!-- Sidebar -->
		<aside class="lg:col-span-1">
			<div class="sticky top-6 space-y-4">
				<div class="space-y-2">
					<h2 class="font-semibold text-lg">Navigation</h2>
					<div class="h-px bg-border mb-4"></div>

					{#each data.categories as category}
						<div>
							<button
								onclick={() => toggleCategory(category.path)}
								class="flex items-center justify-between w-full p-2 hover:bg-accent rounded-md text-left"
							>
								<span class="flex items-center gap-2">
									<span>{category.icon}</span>
									<span class="font-medium">{category.name}</span>
								</span>
								<span class="text-muted-foreground text-sm">
									{expandedCategories.has(category.path) ? '▼' : '▶'}
								</span>
							</button>

							{#if expandedCategories.has(category.path)}
								<div class="ml-4 mt-1 space-y-0.5">
									{#each category.docs as doc}
										{@const depth = (doc.path.match(/\//g) || []).length}
										{@const isReadme = doc.path.endsWith('README.md')}
										<a
											href={getDocUrl(category.path, doc.path)}
											style="padding-left: {depth * 0.75 + 0.5}rem"
											class="block py-1.5 px-2 text-sm hover:bg-accent rounded-md transition-colors {data.currentPath ===
											`${category.path}/${doc.path}`
												? 'bg-accent font-medium text-foreground'
												: 'text-muted-foreground hover:text-foreground'} {isReadme
												? 'font-semibold'
												: ''}"
										>
											<span class="flex items-center gap-2">
												{#if isReadme}
													<span class="text-xs">📄</span>
												{/if}
												<span>{doc.title}</span>
												{#if doc.status}
													<span class="text-xs opacity-60">({doc.status})</span>
												{/if}
											</span>
										</a>
									{/each}
								</div>
							{/if}
						</div>
					{/each}
				</div>
			</div>
		</aside>

		<!-- Main content -->
		<main class="lg:col-span-3">
			<div class="bg-card border rounded-lg p-6">
				{#if data.searchQuery}
					<div class="mb-4">
						<p class="text-sm text-muted-foreground">
							Recherche : <strong>{data.searchQuery}</strong>
						</p>
						<Button variant="outline" size="sm" onclick={() => goto('/dashboard/admin/docs')}>
							Effacer
						</Button>
					</div>
				{/if}

				<!-- Table of Contents -->
				{#if data.defaultDoc && data.defaultDoc.toc.length > 0}
					<details class="mb-6 p-4 border rounded-md" open>
						<summary class="font-semibold cursor-pointer">📋 Table des matières</summary>
						<ul class="mt-2 space-y-1">
							{#each data.defaultDoc.toc as item}
								<li style="margin-left: {(item.level - 2) * 1}rem">
									<a
										href="#{item.id}"
										class="text-sm text-primary hover:underline"
									>
										{item.text}
									</a>
								</li>
							{/each}
						</ul>
					</details>
				{/if}

				<!-- Rendered markdown -->
				<article class="prose prose-slate dark:prose-invert max-w-none">
					{@html htmlWithIds}
				</article>
			</div>
		</main>
	</div>
</div>

<style>
	/* Custom styles for markdown content */
	:global(.prose) {
		--tw-prose-body: hsl(var(--foreground));
		--tw-prose-headings: hsl(var(--foreground));
		--tw-prose-links: hsl(var(--primary));
		--tw-prose-bold: hsl(var(--foreground));
		--tw-prose-code: hsl(var(--foreground));
		--tw-prose-pre-bg: hsl(var(--muted));
		--tw-prose-th-borders: hsl(var(--border));
		--tw-prose-td-borders: hsl(var(--border));
	}

	:global(.prose code) {
		background-color: hsl(var(--muted));
		padding: 0.2rem 0.4rem;
		border-radius: 0.25rem;
		font-size: 0.875em;
	}

	:global(.prose pre) {
		background-color: #0d1117 !important;
		border: 1px solid hsl(var(--border));
	}

	:global(.prose pre code) {
		background-color: transparent;
		padding: 0;
	}

	:global(.prose a) {
		color: hsl(var(--primary));
		text-decoration: none;
	}

	:global(.prose a:hover) {
		text-decoration: underline;
	}

	:global(.prose table) {
		width: 100%;
		border-collapse: collapse;
		margin: 1rem 0;
	}

	:global(.prose th),
	:global(.prose td) {
		border: 1px solid hsl(var(--border));
		padding: 0.5rem;
		text-align: left;
	}

	:global(.prose th) {
		background-color: hsl(var(--muted));
		font-weight: 600;
	}

	:global(.prose img) {
		border-radius: 0.5rem;
		border: 1px solid hsl(var(--border));
	}

	:global(.prose blockquote) {
		border-left: 4px solid hsl(var(--primary));
		padding-left: 1rem;
		font-style: italic;
		color: hsl(var(--muted-foreground));
	}

	/* Syntax highlighting adjustments */
	:global(.hljs) {
		background: #0d1117 !important;
		color: #c9d1d9 !important;
		padding: 1rem !important;
		border-radius: 0.5rem;
		overflow-x: auto;
	}
</style>
