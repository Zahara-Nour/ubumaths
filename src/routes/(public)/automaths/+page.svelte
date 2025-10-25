<script lang="ts">
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Accordion from '$lib/components/ui/accordion';
	import QuestionPreviewCard from '$lib/components/QuestionPreviewCard.svelte';
	import CartFloatingButton from '$lib/components/CartFloatingButton.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Initialize cache with server-loaded templates (SSR support)
	$effect(() => {
		if (data.templates && data.templates.length > 0) {
			questionTemplatesCache.initializeFromServer(data.templates);
		}
	});

	// Selected theme (starts as first theme if available)
	let selectedTheme = $state<string | undefined>(undefined);

	// Initialize selected theme when data is available
	$effect(() => {
		if (!selectedTheme && data.themes && data.themes.length > 0) {
			selectedTheme = data.themes[0];
		}
	});

	// Get domains for selected theme
	let availableDomains = $derived(
		selectedTheme && data.hierarchy
			? data.hierarchy.find((t) => t.theme === selectedTheme)?.domains || []
			: []
	);

	// Selected domain state
	let selectedDomain = $state<string | undefined>(undefined);

	// Initialize selected domain when availableDomains changes
	$effect(() => {
		if (availableDomains.length > 0 && !selectedDomain) {
			selectedDomain = availableDomains[0]?.domain;
		}
	});

	// Get subdomains for selected domain
	let availableSubdomains = $derived(
		selectedDomain && availableDomains
			? availableDomains.find((d) => d.domain === selectedDomain)?.subdomains || []
			: []
	);

	/**
	 * Handle theme change
	 */
	function handleThemeChange(value: string | undefined) {
		selectedTheme = value;
		// Reset domain when theme changes
		const newDomains =
			value && data.hierarchy ? data.hierarchy.find((t) => t.theme === value)?.domains || [] : [];
		selectedDomain = newDomains.length > 0 ? newDomains[0]?.domain : undefined;
	}

	/**
	 * Handle domain tab change
	 */
	function handleDomainChange(value: string | undefined) {
		selectedDomain = value;
	}

	/**
	 * Get subdomain display name
	 */
	function getSubdomainLabel(subdomain: string | null): string {
		return subdomain || 'Général';
	}
</script>

<svelte:head>
	<title>Automaths - Banque de questions | UbuMaths</title>
	<meta
		name="description"
		content="Sélectionnez des questions de mathématiques pour créer des exercices personnalisés."
	/>
</svelte:head>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Automaths</h1>
	</div>

	{#if !data.themes || data.themes.length === 0}
		<!-- Empty state -->
		<div class="flex min-h-96 items-center justify-center rounded-lg border border-dashed p-12">
			<div class="text-center">
				<h2 class="text-xl font-semibold text-muted-foreground">
					Aucune question disponible pour le moment
				</h2>
				<p class="mt-2 text-sm text-muted-foreground">Les questions publiées apparaîtront ici.</p>
			</div>
		</div>
	{:else}
		<!-- Theme selector -->
		<div class="mb-6 flex justify-items-center gap-4">
			<label for="theme-select" class="mb-2 block text-sm font-medium"> Thème : </label>
			<select
				id="theme-select"
				bind:value={selectedTheme}
				onchange={(e) => handleThemeChange(e.currentTarget.value)}
				class="w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus:ring-2 focus:ring-ring focus:ring-offset-2 focus:outline-none sm:w-80"
			>
				<option value="" disabled selected={!selectedTheme}>Choisir un thème...</option>
				{#each data.themes || [] as theme (theme)}
					<option value={theme}>{theme}</option>
				{/each}
			</select>
		</div>

		{#if selectedTheme && availableDomains.length > 0}
			<!-- Domain tabs -->
			<Tabs.Root value={selectedDomain} onValueChange={handleDomainChange}>
				<Tabs.List class="mb-6 flex-wrap border border-border !bg-transparent">
					{#each availableDomains as domain (domain.domain)}
						<Tabs.Trigger value={domain.domain} class="flex items-center gap-2">
							{domain.domain}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>

				{#each availableDomains as domain (domain.domain)}
					<Tabs.Content value={domain.domain} class="space-y-6 bg-transparent">
						{#if availableSubdomains.length === 0}
							<p class="text-center text-muted-foreground">
								Aucun sous-domaine disponible pour ce domaine.
							</p>
						{:else}
							<!-- Subdomain accordions -->
							<Accordion.Root
								type="multiple"
								class="space-y-4 rounded-lg border-border bg-background"
							>
								{#each availableSubdomains as subdomainGroup (subdomainGroup.subdomain)}
									<Accordion.Item
										value={subdomainGroup.subdomain || 'general'}
										class="rounded-lg border !border-b-0 bg-background"
									>
										<Accordion.Trigger
											class="bg-background px-4 hover:bg-muted/50 hover:no-underline"
										>
											<div class="flex w-full items-center justify-between pr-4">
												<div class="flex items-center gap-3">
													<span class="font-medium text-foreground">
														{getSubdomainLabel(subdomainGroup.subdomain)}
													</span>
												</div>
											</div>
										</Accordion.Trigger>
										<Accordion.Content class="bg-background px-4 pt-2 pb-4">
											<!-- Questions gallery -->
											<div class="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
												{#each subdomainGroup.questions as question (question.id)}
													<QuestionPreviewCard
														template={question.template}
														preview={question.preview}
													/>
												{/each}
											</div>
										</Accordion.Content>
									</Accordion.Item>
								{/each}
							</Accordion.Root>
						{/if}
					</Tabs.Content>
				{/each}
			</Tabs.Root>
		{/if}
	{/if}
</div>

<!-- Floating cart button -->
<CartFloatingButton />
