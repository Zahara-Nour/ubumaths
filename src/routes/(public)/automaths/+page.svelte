<script lang="ts">
	import { onMount } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SeoHead from '#lib/seo/SeoHead.svelte';
	import * as Tabs from '#lib/components/ui/tabs/index.ts';
	import * as Accordion from '#lib/components/ui/accordion/index.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import CatalogueGallery from '#lib/components/questions/CatalogueGallery.svelte';
	import CartFloatingButton from '#lib/components/CartFloatingButton.svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
	import {
		buildCatalogue,
		filterTemplatesByGrade,
		type CatalogueRubric
	} from '#lib/questions/catalogue.ts';
	import { initiallyOpenGroups, searchCatalogue } from '#lib/questions/catalogue-search.ts';
	import { GRADE_CODES, GRADES, isGradeCode, type GradeCode } from '#lib/types/grades.ts';

	// Valeur d'accordéon de la rubrique « Général » (elle n'a pas de nœud)
	const GENERAL_RUBRIC_VALUE = 'general';
	const UNCLASSIFIED_VALUE = 'non-classes';
	// Valeur du menu « Niveau » quand aucun niveau n'est choisi
	const ALL_GRADES_VALUE = 'tous';
	// Paramètres d'adresse du filtre : un rechargement ou un lien le conserve
	const GRADE_PARAM = 'niveau';
	const LOWER_GRADES_PARAM = 'inferieurs';
	const NOTION_PARAM = 'notion';
	const SEARCH_PARAM = 'q';
	// Délai entre la frappe et la recherche (les cartes ne se recalculent pas à chaque lettre)
	const SEARCH_DELAY_MS = 200;
	// Dernière adresse du catalogue, retenue le temps de la visite (onglet) :
	// revenu sans paramètre (retour du panier), on la reprend
	const MEMORY_KEY = 'chiphre_automaths_adresse';
	const GRADE_ITEMS = [
		{ value: ALL_GRADES_VALUE, label: 'Tous les niveaux' },
		...GRADE_CODES.map((code) => ({ value: code, label: GRADES[code].displayName }))
	];

	// Filtre et notion, repris de l'adresse au chargement (ou de la dernière
	// adresse de la visite) ; niveau ou notion inconnus : ignorés
	const initialParams = readInitialParams();
	const initialGrade = initialParams.get(GRADE_PARAM);
	let chosenGrade = $state<GradeCode | null>(isGradeCode(initialGrade) ? initialGrade : null);
	let withLowerGrades = $state(initialParams.get(LOWER_GRADES_PARAM) === '1');

	let filteredTemplates = $derived(
		filterTemplatesByGrade(questionTemplatesCache.templates, chosenGrade, withLowerGrades)
	);

	// Le catalogue se range dans le navigateur, selon l'arbre des notions reçu
	// avec les modèles (lus une fois par onglet) ; aucun aperçu n'est calculé
	// par le serveur.
	let catalogue = $derived(buildCatalogue(filteredTemplates, questionTemplatesCache.nodes));
	let hasAnyTemplate = $derived(questionTemplatesCache.templates.length > 0);
	let branchItems = $derived(catalogue.branches.map((b) => ({ value: b.id, label: b.name })));

	// Recherche : texte du champ, et texte cherché (après le délai de frappe)
	const initialSearch = initialParams.get(SEARCH_PARAM) ?? '';
	let searchInput = $state(initialSearch);
	let searchQuery = $state(initialSearch);
	let searchTimer: ReturnType<typeof setTimeout> | undefined;
	let searchField = $state<HTMLInputElement | null>(null);

	// `null` : moins de 2 lettres, le catalogue se parcourt par notions
	let searchResult = $derived(
		searchCatalogue(
			filteredTemplates,
			questionTemplatesCache.nodes,
			questionTemplatesCache.pointNames,
			searchQuery
		)
	);
	// Groupes de résultats dépliés : les premiers (60 cartes au plus), puis ce
	// que le prof ouvre ou ferme ; une nouvelle recherche repart des premiers
	let defaultOpenGroups = $derived(searchResult ? initiallyOpenGroups(searchResult.groups) : []);
	// `$state.raw` : un `$state` profond rendrait un proxy du résultat, jamais
	// égal (===) au résultat courant, et le clic sur un groupe resterait sans effet
	let toggledGroups = $state.raw<{ result: typeof searchResult; open: string[] } | null>(null);
	let openSearchGroups = $derived(
		toggledGroups && toggledGroups.result === searchResult ? toggledGroups.open : defaultOpenGroups
	);

	// Notion choisie (celle de l'adresse au chargement)
	let chosenNotionId = $state<string | undefined>(initialParams.get(NOTION_PARAM) ?? undefined);

	// Branche choisie ; sinon celle de la notion choisie ; sinon la première
	let chosenBranchId = $state<string | undefined>(undefined);
	let selectedBranch = $derived(
		catalogue.branches.find((b) => b.id === chosenBranchId) ??
			catalogue.branches.find((b) => b.notions.some((n) => n.id === chosenNotionId)) ??
			catalogue.branches[0]
	);

	// Notion affichée : la choisie si la branche l'a, sinon sa première
	let selectedNotion = $derived(
		selectedBranch?.notions.find((n) => n.id === chosenNotionId) ?? selectedBranch?.notions[0]
	);

	// Rubriques dépliées de la notion affichée (valeurs des Accordion.Item)
	let openRubrics = $state<string[]>([]);
	let openUnclassified = $state<string[]>([]);

	/**
	 * Paramètres de départ : ceux de l'adresse ; adresse sans paramètre → la
	 * dernière adresse de la visite (stockage illisible ou absent : rien)
	 */
	function readInitialParams(): URLSearchParams {
		if (page.url.search) return new URLSearchParams(page.url.search);
		try {
			const remembered = sessionStorage.getItem(MEMORY_KEY);
			if (remembered) return new URLSearchParams(remembered);
		} catch {
			// Stockage indisponible (serveur, navigation privée) : on part de zéro
		}
		return new URLSearchParams();
	}

	function rubricValue(rubric: CatalogueRubric): string {
		return rubric.id ?? GENERAL_RUBRIC_VALUE;
	}

	function handleBranchChange(value: string) {
		chosenBranchId = value;
		chosenNotionId = undefined;
		openRubrics = [];
		writeChoicesToUrl();
	}

	function handleNotionChange(value: string | undefined) {
		chosenNotionId = value;
		openRubrics = [];
		writeChoicesToUrl();
	}

	/**
	 * Écrit niveau et notion affichée dans l'adresse, sans nouvelle entrée
	 * d'historique, et les retient pour la visite
	 */
	function writeChoicesToUrl() {
		const params = new URLSearchParams();
		if (chosenGrade) params.set(GRADE_PARAM, chosenGrade);
		if (chosenGrade && withLowerGrades) params.set(LOWER_GRADES_PARAM, '1');
		if (selectedNotion) params.set(NOTION_PARAM, selectedNotion.id);
		const query = searchQuery.trim();
		if (query) params.set(SEARCH_PARAM, query);
		const search = params.size > 0 ? `?${params.toString()}` : '';
		replaceState(`${resolve('automaths')}${search}`, page.state);
		rememberSearch(search);
	}

	function rememberSearch(search: string) {
		try {
			sessionStorage.setItem(MEMORY_KEY, search);
		} catch {
			// Stockage indisponible : le retour du panier repartira de zéro
		}
	}

	/** Frappe en attente appliquée tout de suite (changement de filtre pendant le délai) */
	function flushPendingSearch() {
		clearTimeout(searchTimer);
		searchQuery = searchInput;
	}

	function handleGradeChange(value: string) {
		flushPendingSearch();
		chosenGrade = isGradeCode(value) ? value : null;
		writeChoicesToUrl();
	}

	function handleLowerGradesChange(checked: boolean) {
		flushPendingSearch();
		withLowerGrades = checked;
		writeChoicesToUrl();
	}

	function handleSearchInput() {
		clearTimeout(searchTimer);
		searchTimer = setTimeout(() => {
			searchQuery = searchInput;
			writeChoicesToUrl();
		}, SEARCH_DELAY_MS);
	}

	/** Efface la recherche : retour à la notion où l'on était */
	function clearSearch() {
		clearTimeout(searchTimer);
		searchInput = '';
		searchQuery = '';
		writeChoicesToUrl();
	}

	function handleSearchKeydown(event: KeyboardEvent) {
		if (event.key === 'Escape' && searchInput) {
			event.preventDefault();
			clearSearch();
		}
	}

	/** « / » met le curseur dans la recherche, sauf si l'on tape déjà ailleurs */
	function handleWindowKeydown(event: KeyboardEvent) {
		if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
		const target = event.target;
		if (
			target instanceof HTMLElement &&
			(target.isContentEditable || ['INPUT', 'TEXTAREA', 'SELECT'].includes(target.tagName))
		) {
			return;
		}
		event.preventDefault();
		searchField?.focus();
	}

	function handleSearchGroupsChange(open: string[]) {
		toggledGroups = { result: searchResult, open };
	}

	function questionCount(n: number): string {
		return n === 1 ? '1 question' : `${n} questions`;
	}

	onMount(() => {
		// Dernière adresse de la visite reprise : l'adresse affichée la montre.
		// Arrivée par un lien avec paramètres : c'est elle que la visite retient.
		if (!page.url.search && initialParams.size > 0) {
			replaceState(`${resolve('automaths')}?${initialParams.toString()}`, page.state);
		} else if (page.url.search) {
			rememberSearch(page.url.search);
		}
		void questionTemplatesCache.fetchTemplates();
		// Page quittée pendant le délai de frappe : l'adresse d'une autre page reste intacte
		return () => clearTimeout(searchTimer);
	});
</script>

<svelte:window onkeydown={handleWindowKeydown} />

<SeoHead
	title="Automaths - Banque de questions | Chiphre"
	description="Banque de questions de mathématiques : composez une série d’exercices et lancez-la en classe, en contrôle blanc, en flash-cards ou en course aux nombres."
/>

<!-- pb-28 : la dernière carte peut remonter au-dessus du bouton rond du panier -->
<div class="container mx-auto max-w-7xl px-4 pt-8 pb-28">
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
		<!-- Recherche : pas de curseur automatique (clavier du téléphone) ; « / » l'y met -->
		<div class="relative mb-4 max-w-xl" role="search">
			<Input
				bind:ref={searchField}
				type="search"
				bind:value={searchInput}
				oninput={handleSearchInput}
				onkeydown={handleSearchKeydown}
				placeholder="Chercher une question : « distributivité », « aire du disque »…"
				aria-label="Chercher une question"
				class="pr-10 [&::-webkit-search-cancel-button]:hidden"
			/>
			{#if searchInput}
				<button
					type="button"
					class="absolute top-1/2 right-2 -translate-y-1/2 rounded px-2 text-muted-foreground hover:text-foreground"
					aria-label="Effacer la recherche"
					onclick={clearSearch}>✕</button
				>
			{/if}
		</div>

		<div class="mb-6 flex flex-wrap items-center gap-x-8 gap-y-4">
			{#if selectedBranch && !searchResult}
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
						triggerAriaLabel={`Branche : ${selectedBranch.name}`}
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

		{#if searchResult}
			<!-- Résultats de la recherche, à la place du menu Branche et des onglets -->
			{#if searchResult.total === 0}
				<div class="space-y-4 rounded-lg border border-dashed p-12 text-center">
					<p class="text-muted-foreground">Aucune question pour « {searchQuery.trim()} »</p>
					{#if chosenGrade}
						<Button variant="outline" onclick={() => handleGradeChange(ALL_GRADES_VALUE)}
							>Chercher dans tous les niveaux</Button
						>
					{/if}
				</div>
			{:else}
				<p class="mb-4 text-sm text-muted-foreground" aria-live="polite">
					{questionCount(searchResult.total)}
				</p>
				<Accordion.Root
					type="multiple"
					value={openSearchGroups}
					onValueChange={handleSearchGroupsChange}
					class="space-y-4"
				>
					{#each searchResult.groups as group (group.id)}
						<Accordion.Item value={group.id} class="rounded-lg border !border-b-0 bg-background">
							<Accordion.Trigger class="px-4 hover:bg-muted/50 hover:no-underline">
								<span class="font-medium text-foreground">
									{group.path.join(' › ')}
									<span class="font-normal text-muted-foreground"> · {group.templates.length}</span>
								</span>
							</Accordion.Trigger>
							<Accordion.Content class="px-4 pt-2 pb-4">
								<!-- Aperçus calculés seulement pour les groupes dépliés -->
								{#if openSearchGroups.includes(group.id)}
									<CatalogueGallery templates={group.templates} />
								{/if}
							</Accordion.Content>
						</Accordion.Item>
					{/each}
				</Accordion.Root>
			{/if}
		{:else if catalogue.branches.length === 0 && catalogue.unclassified.length === 0}
			<p class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
				Aucune question pour ce niveau.
			</p>
		{/if}

		{#if selectedBranch && !searchResult}
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

		{#if catalogue.unclassified.length > 0 && !searchResult}
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
