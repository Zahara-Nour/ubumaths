<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Accordion from '$lib/components/ui/accordion';
	import CatalogueGallery from '$lib/components/questions/CatalogueGallery.svelte';
	import CartFloatingButton from '$lib/components/CartFloatingButton.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { buildCatalogue } from '$lib/questions/catalogue';

	// Le catalogue se range dans le navigateur, depuis le cache des modèles (lu
	// une fois par onglet) ; aucun aperçu n'est calculé par le serveur.
	let hierarchy = $derived(buildCatalogue(questionTemplatesCache.templates));
	let themes = $derived(hierarchy.map((t) => t.theme));

	// Selected theme (starts as first theme if available)
	let selectedTheme = $state<string | undefined>(undefined);

	// Initialize selected theme when data is available
	$effect(() => {
		if (!selectedTheme && themes.length > 0) {
			selectedTheme = themes[0];
		}
	});

	// Get domains for selected theme
	let availableDomains = $derived(
		selectedTheme ? hierarchy.find((t) => t.theme === selectedTheme)?.domains || [] : []
	);

	// Selected domain state
	let selectedDomain = $state<string | undefined>(undefined);

	// Rubriques dépliées du domaine affiché (valeurs des Accordion.Item)
	let openSubdomains = $state<string[]>([]);

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
		const newDomains = value ? hierarchy.find((t) => t.theme === value)?.domains || [] : [];
		selectedDomain = newDomains.length > 0 ? newDomains[0]?.domain : undefined;
		openSubdomains = [];
	}

	/**
	 * Handle domain tab change
	 */
	function handleDomainChange(value: string | undefined) {
		selectedDomain = value;
		openSubdomains = [];
	}

	/**
	 * Get subdomain display name
	 */
	function getSubdomainLabel(subdomain: string | null): string {
		return subdomain || 'Général';
	}

	onMount(() => {
		void questionTemplatesCache.fetchTemplates();
	});
</script>

<SeoHead
	title="Automaths - Banque de questions | Chiphre"
	description="Banque de questions de mathématiques : composez une série d’exercices et lancez-la en classe, en entraînement, en flash-cards ou en course aux nombres."
/>

<div class="container mx-auto max-w-7xl px-4 py-8">
	<!-- Header -->
	<div class="mb-8 space-y-2">
		<h1 class="text-3xl font-bold tracking-tight">Automaths</h1>
	</div>

	{#if !questionTemplatesCache.isLoaded && questionTemplatesCache.error}
		<div
			class="flex min-h-96 items-center justify-center rounded-lg border border-dashed p-12"
			role="alert"
		>
			<div class="text-center">
				<h2 class="text-xl font-semibold text-muted-foreground">
					Impossible de charger les questions
				</h2>
				<p class="mt-2 text-sm text-muted-foreground">
					Vérifie ta connexion, puis recharge la page.
				</p>
			</div>
		</div>
	{:else if !questionTemplatesCache.isLoaded}
		<p class="text-center text-muted-foreground">Chargement des questions…</p>
	{:else if themes.length === 0}
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
				{#each themes as theme (theme)}
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
						<!-- bits-ui garde les onglets inactifs dans le DOM (hidden) : seul l'onglet
						     choisi porte les rubriques, sinon chaque domaine les répéterait -->
						{#if domain.domain === selectedDomain && availableSubdomains.length === 0}
							<p class="text-center text-muted-foreground">
								Aucun sous-domaine disponible pour ce domaine.
							</p>
						{:else if domain.domain === selectedDomain}
							<!-- Subdomain accordions -->
							<Accordion.Root
								type="multiple"
								bind:value={openSubdomains}
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
											<!-- bits-ui rend aussi le contenu FERMÉ (hidden) : la galerie, et
											     ses aperçus, ne sont montés qu'à l'ouverture de la rubrique -->
											{#if openSubdomains.includes(subdomainGroup.subdomain || 'general')}
												<CatalogueGallery templates={subdomainGroup.templates} />
											{/if}
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
