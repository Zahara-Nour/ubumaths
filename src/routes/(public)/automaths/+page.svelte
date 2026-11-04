<script lang="ts">
	import { onMount } from 'svelte';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Accordion from '$lib/components/ui/accordion';
	import MySelect from '$lib/components/MySelect.svelte';
	import CatalogueGallery from '$lib/components/questions/CatalogueGallery.svelte';
	import CartFloatingButton from '$lib/components/CartFloatingButton.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import { buildCatalogue, type CatalogueRubric } from '$lib/questions/catalogue';

	// Valeur d'accordéon de la rubrique « Général » (elle n'a pas de nœud)
	const GENERAL_RUBRIC_VALUE = 'general';
	const UNCLASSIFIED_VALUE = 'non-classes';

	// Le catalogue se range dans le navigateur, selon l'arbre des notions reçu
	// avec les modèles (lus une fois par onglet) ; aucun aperçu n'est calculé
	// par le serveur.
	let catalogue = $derived(
		buildCatalogue(questionTemplatesCache.templates, questionTemplatesCache.nodes)
	);
	let branchItems = $derived(catalogue.branches.map((b) => ({ value: b.id, label: b.name })));

	// Branche choisie (la première tant que rien n'est choisi)
	let chosenBranchId = $state<string | undefined>(undefined);
	let selectedBranch = $derived(
		catalogue.branches.find((b) => b.id === chosenBranchId) ?? catalogue.branches[0]
	);

	// Notion choisie dans la branche (la première tant que rien n'est choisi)
	let chosenNotionId = $state<string | undefined>(undefined);
	let selectedNotion = $derived(
		selectedBranch?.notions.find((n) => n.id === chosenNotionId) ?? selectedBranch?.notions[0]
	);

	// Rubriques dépliées de la notion affichée (valeurs des Accordion.Item)
	let openRubrics = $state<string[]>([]);
	let openUnclassified = $state<string[]>([]);

	function rubricValue(rubric: CatalogueRubric): string {
		return rubric.id ?? GENERAL_RUBRIC_VALUE;
	}

	function handleBranchChange(value: string) {
		chosenBranchId = value;
		chosenNotionId = undefined;
		openRubrics = [];
	}

	function handleNotionChange(value: string | undefined) {
		chosenNotionId = value;
		openRubrics = [];
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
	{:else if catalogue.branches.length === 0 && catalogue.unclassified.length === 0}
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
		{#if selectedBranch}
			<!-- Branche -->
			<div class="mb-6 flex items-center gap-4">
				<label for="branch-select" class="shrink-0 text-sm font-medium whitespace-nowrap"
					>Branche :</label
				>
				<MySelect
					id="branch-select"
					items={branchItems}
					value={selectedBranch.id}
					onValueChange={handleBranchChange}
					triggerClass="w-full sm:w-80"
				/>
			</div>

			<!-- Notions -->
			<Tabs.Root value={selectedNotion?.id} onValueChange={handleNotionChange}>
				<Tabs.List class="mb-6 flex-wrap border border-border !bg-transparent">
					{#each selectedBranch.notions as notion (notion.id)}
						<Tabs.Trigger value={notion.id} class="flex items-center gap-2">
							{notion.name}
						</Tabs.Trigger>
					{/each}
				</Tabs.List>

				{#each selectedBranch.notions as notion (notion.id)}
					<Tabs.Content value={notion.id} class="space-y-6 bg-transparent">
						<!-- bits-ui garde les onglets inactifs dans le DOM (hidden) : seul l'onglet
						     choisi porte les rubriques, sinon chaque notion les répéterait -->
						{#if notion.id === selectedNotion?.id}
							<Accordion.Root
								type="multiple"
								bind:value={openRubrics}
								class="space-y-4 rounded-lg border-border bg-background"
							>
								{#each notion.rubrics as rubric (rubricValue(rubric))}
									<Accordion.Item
										value={rubricValue(rubric)}
										class="rounded-lg border !border-b-0 bg-background"
									>
										<Accordion.Trigger
											class="bg-background px-4 hover:bg-muted/50 hover:no-underline"
										>
											<span class="font-medium text-foreground">{rubric.name}</span>
										</Accordion.Trigger>
										<Accordion.Content class="bg-background px-4 pt-2 pb-4">
											<!-- bits-ui rend aussi le contenu FERMÉ (hidden) : la galerie, et
											     ses aperçus, ne sont montés qu'à l'ouverture de la rubrique -->
											{#if openRubrics.includes(rubricValue(rubric))}
												<CatalogueGallery templates={rubric.templates} />
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

		{#if catalogue.unclassified.length > 0}
			<!-- Modèles hors de l'arbre lu : ne devrait pas arriver, jamais perdus pour autant.
			     Repliés : leurs aperçus ne se calculent qu'à l'ouverture. -->
			<Accordion.Root type="multiple" bind:value={openUnclassified} class="mt-10">
				<Accordion.Item value={UNCLASSIFIED_VALUE} class="rounded-lg border !border-b-0">
					<Accordion.Trigger class="px-4 hover:bg-muted/50 hover:no-underline">
						<span class="font-medium text-foreground">
							Non classés ({catalogue.unclassified.length})
						</span>
					</Accordion.Trigger>
					<Accordion.Content class="px-4 pt-2 pb-4">
						{#if openUnclassified.includes(UNCLASSIFIED_VALUE)}
							<CatalogueGallery templates={catalogue.unclassified} />
						{/if}
					</Accordion.Content>
				</Accordion.Item>
			</Accordion.Root>
		{/if}
	{/if}
</div>

<!-- Floating cart button -->
<CartFloatingButton />
