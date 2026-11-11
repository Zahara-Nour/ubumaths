<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SeoHead from '$lib/seo/SeoHead.svelte';
	import * as Tabs from '$lib/components/ui/tabs';
	import * as Accordion from '$lib/components/ui/accordion';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import CatalogueGallery from '$lib/components/questions/CatalogueGallery.svelte';
	import CartFloatingButton from '$lib/components/CartFloatingButton.svelte';
	import { questionTemplatesCache } from '$lib/stores/questionTemplates.svelte';
	import {
		buildCatalogue,
		filterTemplatesByGrade,
		type CatalogueRubric
	} from '$lib/questions/catalogue';
	import { GRADE_CODES, GRADES, isGradeCode, type GradeCode } from '$lib/types/grades';

	// Valeur d'accordéon de la rubrique « Général » (elle n'a pas de nœud)
	const GENERAL_RUBRIC_VALUE = 'general';
	const UNCLASSIFIED_VALUE = 'non-classes';
	// Valeur du menu « Niveau » quand aucun niveau n'est choisi
	const ALL_GRADES_VALUE = 'tous';
	// Paramètres d'adresse du filtre : un rechargement ou un lien le conserve
	const GRADE_PARAM = 'niveau';
	const LOWER_GRADES_PARAM = 'inferieurs';
	const GRADE_ITEMS = [
		{ value: ALL_GRADES_VALUE, label: 'Tous les niveaux' },
		...GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].displayName }))
	];

	// Filtre par niveau, repris de l'adresse au chargement (niveau inconnu : ignoré)
	const initialGrade = page.url.searchParams.get(GRADE_PARAM);
	let chosenGrade = $state<GradeCode | null>(isGradeCode(initialGrade) ? initialGrade : null);
	let withLowerGrades = $state(page.url.searchParams.get(LOWER_GRADES_PARAM) === '1');

	let filteredTemplates = $derived(
		filterTemplatesByGrade(questionTemplatesCache.templates, chosenGrade, withLowerGrades)
	);

	// Le catalogue se range dans le navigateur, selon l'arbre des notions reçu
	// avec les modèles (lus une fois par onglet) ; aucun aperçu n'est calculé
	// par le serveur.
	let catalogue = $derived(buildCatalogue(filteredTemplates, questionTemplatesCache.nodes));
	let hasAnyTemplate = $derived(questionTemplatesCache.templates.length > 0);
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

	/** Écrit le filtre dans l'adresse, sans nouvelle entrée d'historique */
	function writeGradeFilterToUrl() {
		const url = new URL(page.url);
		if (chosenGrade) url.searchParams.set(GRADE_PARAM, chosenGrade);
		else url.searchParams.delete(GRADE_PARAM);
		if (chosenGrade && withLowerGrades) url.searchParams.set(LOWER_GRADES_PARAM, '1');
		else url.searchParams.delete(LOWER_GRADES_PARAM);
		replaceState(`${resolve('/automaths')}${url.search}`, page.state);
	}

	function handleGradeChange(value: string) {
		chosenGrade = isGradeCode(value) ? value : null;
		writeGradeFilterToUrl();
	}

	function handleLowerGradesChange(checked: boolean) {
		withLowerGrades = checked;
		writeGradeFilterToUrl();
	}

	onMount(() => {
		void questionTemplatesCache.fetchTemplates();
	});
</script>

<SeoHead
	title="Automaths - Banque de questions | Chiphre"
	description="Banque de questions de mathématiques : composez une série d’exercices et lancez-la en classe, en contrôle blanc, en flash-cards ou en course aux nombres."
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
	{:else if !hasAnyTemplate}
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
		<div class="mb-6 flex flex-wrap items-center gap-x-8 gap-y-4">
			{#if selectedBranch}
				<!-- Branche -->
				<div class="flex items-center gap-4">
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
			{/if}

			<!-- Niveau : seul, ou avec les niveaux inférieurs -->
			<div class="flex flex-wrap items-center gap-4">
				<label for="grade-select" class="shrink-0 text-sm font-medium whitespace-nowrap"
					>Niveau :</label
				>
				<MySelect
					id="grade-select"
					items={GRADE_ITEMS}
					value={chosenGrade ?? ALL_GRADES_VALUE}
					onValueChange={handleGradeChange}
					triggerAriaLabel={`Niveau : ${chosenGrade ? GRADES[chosenGrade].displayName : 'tous les niveaux'}`}
					fitContent
				/>
				{#if chosenGrade}
					<MyCheckbox
						checked={withLowerGrades}
						onchange={handleLowerGradesChange}
						label="et niveaux inférieurs"
					/>
				{/if}
			</div>
		</div>

		{#if catalogue.branches.length === 0 && catalogue.unclassified.length === 0}
			<p class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
				Aucune question pour ce niveau.
			</p>
		{/if}

		{#if selectedBranch}
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
