<script lang="ts">
	import { onMount, tick, type Snippet } from 'svelte';
	import { page } from '$app/state';
	import { replaceState } from '$app/navigation';
	import { resolve } from '$app/paths';
	import SeoHead from '#lib/seo/SeoHead.svelte';
	import * as Sheet from '#lib/components/ui/sheet/index.ts';
	import * as Accordion from '#lib/components/ui/accordion/index.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import CatalogueGallery from '#lib/components/questions/CatalogueGallery.svelte';
	import CatalogueTreeNav from '#lib/components/questions/CatalogueTreeNav.svelte';
	import CatalogueNotionSections from '#lib/components/questions/CatalogueNotionSections.svelte';
	import CatalogueProgrammeSections from '#lib/components/questions/CatalogueProgrammeSections.svelte';
	import MySeriesDock from '#lib/components/series/MySeriesDock.svelte';
	import MySeriesPreview from '#lib/components/series/MySeriesPreview.svelte';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { ChevronDown } from '@lucide/svelte';
	import { questionTemplatesCache } from '#lib/stores/questionTemplates.svelte.ts';
	import {
		buildCatalogue,
		filterTemplatesByGrade,
		notionTemplateCount
	} from '#lib/questions/catalogue.ts';
	import {
		initiallyOpenGroups,
		searchCatalogue,
		type SearchShortcut
	} from '#lib/questions/catalogue-search.ts';
	import {
		buildProgramme,
		chapterTemplateCount,
		partTemplateCount
	} from '#lib/questions/catalogue-programme.ts';
	import { GRADE_CODES, GRADES, isGradeCode, type GradeCode } from '#lib/types/grades.ts';

	const UNCLASSIFIED_VALUE = 'non-classes';
	// Groupe replié des résultats trouvés seulement par la correction ou le programme
	const OTHERS_GROUP_VALUE = 'aussi';
	// Valeur du menu « Niveau » quand aucun niveau n'est choisi
	const ALL_GRADES_VALUE = 'tous';
	// Paramètres d'adresse du filtre : un rechargement ou un lien le conserve
	const GRADE_PARAM = 'niveau';
	const LOWER_GRADES_PARAM = 'inferieurs';
	const NOTION_PARAM = 'notion';
	const SEARCH_PARAM = 'q';
	const VIEW_PARAM = 'vue';
	const CHAPTER_PARAM = 'chapitre';
	const PROGRAMME_VIEW = 'programme';
	const NOTIONS_VIEW = 'notions';
	// Délai entre la frappe et la recherche (les cartes ne se recalculent pas à chaque lettre)
	const SEARCH_DELAY_MS = 200;
	// Dernière adresse du catalogue, retenue le temps de la visite (onglet) :
	// revenu sans paramètre (retour du panier), on la reprend
	const MEMORY_KEY = 'chiphre_automaths_adresse';
	type CatalogueView = typeof PROGRAMME_VIEW | typeof NOTIONS_VIEW;
	const VIEW_OPTIONS: { view: CatalogueView; label: string }[] = [
		{ view: PROGRAMME_VIEW, label: 'Programme' },
		{ view: NOTIONS_VIEW, label: 'Notions' }
	];
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
	// Sous-notion où descendre à l'arrivée sur la notion (raccourci de la recherche)
	let arrivalRubricId = $state<string | null>(null);

	// Branche de la notion choisie ; sinon la première (notion absente au niveau, ou inconnue)
	let selectedBranch = $derived(
		catalogue.branches.find((b) => b.notions.some((n) => n.id === chosenNotionId)) ??
			catalogue.branches[0]
	);

	// Notion affichée : la choisie si elle existe au niveau, sinon la première
	let selectedNotion = $derived(
		selectedBranch?.notions.find((n) => n.id === chosenNotionId) ?? selectedBranch?.notions[0]
	);

	// Vue « Programme » : le programme du niveau choisi (seul), questions selon le filtre
	let programme = $derived(
		buildProgramme(
			questionTemplatesCache.points,
			chosenGrade,
			filteredTemplates,
			questionTemplatesCache.templatePoints,
			questionTemplatesCache.nodes
		)
	);
	// Vue choisie (adresse) ; sans choix, « Programme » dès qu'un niveau en a un.
	// Un ancien lien qui ne porte qu'une notion garde la vue « Notions ».
	const initialView = initialParams.get(VIEW_PARAM);
	let chosenView = $state<CatalogueView | null>(
		initialView === PROGRAMME_VIEW || initialView === NOTIONS_VIEW
			? initialView
			: initialParams.has(NOTION_PARAM)
				? NOTIONS_VIEW
				: null
	);
	// « Tous les niveaux », niveau sans programme, liste sans programme : Notions seule
	let activeView = $derived<CatalogueView>(
		programme.length > 0 ? (chosenView ?? PROGRAMME_VIEW) : NOTIONS_VIEW
	);
	let chosenChapterId = $state<string | undefined>(initialParams.get(CHAPTER_PARAM) ?? undefined);
	// Chapitre affiché : le choisi s'il existe au niveau, sinon le premier
	let selectedChapter = $derived(
		programme.flatMap((part) => part.chapters).find((c) => c.id === chosenChapterId) ??
			programme[0]?.chapters[0]
	);

	// Listes de la colonne : branches → notions, ou parties → chapitres, à compteurs
	let notionGroups = $derived(
		catalogue.branches.map((branch) => {
			const items = branch.notions.map((n) => ({
				id: n.id,
				name: n.name,
				count: notionTemplateCount(n)
			}));
			return {
				id: branch.id,
				name: branch.name,
				count: items.reduce((sum, item) => sum + item.count, 0),
				items
			};
		})
	);
	let chapterGroups = $derived(
		programme.map((part) => ({
			id: part.id,
			name: part.name,
			count: partTemplateCount(part),
			items: part.chapters.map((c) => ({ id: c.id, name: c.name, count: chapterTemplateCount(c) }))
		}))
	);

	// Téléphone : liste des notions (ou des chapitres) dans un panneau du bas
	let navSheetOpen = $state(false);
	// Haut de la notion (ou du chapitre) affiché : on y remonte en en changeant
	let contentTop = $state<HTMLElement | null>(null);
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

	/** Notion (vue « Notions ») ou chapitre (vue « Programme ») choisi dans la liste */
	async function handleNavSelect(id: string) {
		if (activeView === PROGRAMME_VIEW) chosenChapterId = id;
		else chosenNotionId = id;
		arrivalRubricId = null;
		navSheetOpen = false;
		writeChoicesToUrl();
		await showChosenContent();
	}

	/**
	 * Raccourci de la recherche : la recherche s'efface, la notion s'affiche
	 * (vue « Notions »), et la page descend à la sous-notion s'il y en a une
	 */
	async function handleShortcut(shortcut: SearchShortcut) {
		clearTimeout(searchTimer);
		searchInput = '';
		searchQuery = '';
		chosenView = NOTIONS_VIEW;
		chosenNotionId = shortcut.notionId;
		arrivalRubricId = shortcut.rubricId;
		writeChoicesToUrl();
		await showChosenContent();
		// Lue au montage de la notion : oubliée aussitôt, sinon un retour plus
		// tard sur cette notion (vue, recherche raccourcie) y redescendrait
		arrivalRubricId = null;
	}

	/** Haut du contenu choisi à l'écran, focus sur son titre */
	async function showChosenContent() {
		// Panneau refermé et contenu rendu avant de défiler (le panneau bloque le défilement)
		await tick();
		// Choisi après avoir descendu : on remonte au début
		if (contentTop && contentTop.getBoundingClientRect().top < 0) {
			contentTop.scrollIntoView({ block: 'start' });
		}
		// Clavier, lecteur d'écran : le focus passe au titre choisi
		document.getElementById('catalogue-titre')?.focus({ preventScroll: true });
	}

	function handleViewChange(view: CatalogueView) {
		chosenView = view;
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
		if (programme.length > 0) params.set(VIEW_PARAM, activeView);
		if (activeView === PROGRAMME_VIEW && selectedChapter) {
			params.set(CHAPTER_PARAM, selectedChapter.id);
		} else if (activeView === NOTIONS_VIEW && selectedNotion) {
			params.set(NOTION_PARAM, selectedNotion.id);
		}
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
		arrivalRubricId = null;
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

<!-- Liste (colonne à gauche sur grand écran, panneau du bas sur téléphone) et contenu affiché -->
{#snippet browser(
	navLabel: string,
	groups: typeof notionGroups,
	selectedId: string,
	sheetButtonLabel: string,
	content: Snippet
)}
	<div class="lg:grid lg:grid-cols-[16rem_minmax(0,1fr)] lg:gap-8">
		<aside class="hidden lg:block">
			<div class="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto pr-2">
				<CatalogueTreeNav label={navLabel} {groups} {selectedId} onselect={handleNavSelect} />
			</div>
		</aside>

		<div bind:this={contentTop} class="min-w-0 scroll-mt-4">
			<Button
				variant="outline"
				class="mb-4 w-full justify-between lg:hidden"
				onclick={() => (navSheetOpen = true)}
			>
				<span class="truncate">{sheetButtonLabel}</span>
				<ChevronDown class="h-4 w-4 shrink-0" aria-hidden="true" />
			</Button>

			{@render content()}
		</div>
	</div>

	<Sheet.Root bind:open={navSheetOpen}>
		<Sheet.Content side="bottom" class="max-h-[80vh] overflow-y-auto">
			<Sheet.Header>
				<Sheet.Title>{navLabel}</Sheet.Title>
			</Sheet.Header>
			<div class="px-4 pb-6">
				<CatalogueTreeNav label={navLabel} {groups} {selectedId} onselect={handleNavSelect} />
			</div>
		</Sheet.Content>
	</Sheet.Root>
{/snippet}

<SeoHead
	title="Automaths : automatismes et questions flash de maths | Chiphre"
	description="Banque de questions de mathématiques : composez une série d’exercices et lancez-la en classe, en contrôle blanc, en flash-cards ou en course aux nombres."
/>

<!-- pb-28 : la dernière carte peut remonter au-dessus du bouton rond ou de la barre de « Ma série » -->
<div class="container mx-auto max-w-7xl px-4 pt-8 pb-28 xl:max-w-[96rem]">
	<!-- Grand écran (≥ 1 280 px) : « Ma série » en colonne à droite -->
	<div class="xl:grid xl:grid-cols-[minmax(0,1fr)_18rem] xl:gap-8">
		<div class="min-w-0">
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
						<p class="mt-2 text-sm text-muted-foreground">
							Les questions publiées apparaîtront ici.
						</p>
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

					<!-- Bascule : seulement quand le niveau choisi a un programme ; la recherche remplace les deux vues -->
					{#if programme.length > 0 && !searchResult}
						<div
							role="group"
							aria-label="Parcourir par"
							class="inline-flex rounded-md border border-border p-0.5"
						>
							{#each VIEW_OPTIONS as option (option.view)}
								{@const pressed = activeView === option.view}
								<button
									type="button"
									class="rounded px-3 py-1 text-sm {pressed
										? 'bg-primary text-primary-foreground'
										: 'text-muted-foreground hover:text-foreground'}"
									aria-pressed={pressed}
									onclick={() => handleViewChange(option.view)}>{option.label}</button
								>
							{/each}
						</div>
					{/if}
				</div>

				{#if searchResult && searchResult.shortcuts.length > 0}
					<!-- Raccourcis : le mot cherché est le nom d'une notion ou d'une sous-notion -->
					<nav aria-label="Aller à" class="mb-6 flex flex-wrap items-center gap-2">
						<span class="text-sm text-muted-foreground">Aller à :</span>
						{#each searchResult.shortcuts as shortcut (shortcut.rubricId ?? shortcut.notionId)}
							<Button variant="outline" size="sm" onclick={() => handleShortcut(shortcut)}>
								{shortcut.path.join(' › ')}
								<span class="text-muted-foreground" aria-hidden="true">· {shortcut.count}</span>
								<span class="sr-only">, {questionCount(shortcut.count)}</span>
							</Button>
						{/each}
					</nav>
				{/if}

				{#if searchResult}
					<!-- Résultats de la recherche, à la place de la liste des notions -->
					{#if searchResult.total === 0 && searchResult.others.length === 0}
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
							{searchResult.total === 0
								? 'Aucune question dans les titres et les énoncés'
								: questionCount(searchResult.total)}
						</p>
						<Accordion.Root
							type="multiple"
							value={openSearchGroups}
							onValueChange={handleSearchGroupsChange}
							class="space-y-4"
						>
							{#each searchResult.groups as group (group.id)}
								<Accordion.Item
									value={group.id}
									class="rounded-lg border !border-b-0 bg-background"
								>
									<Accordion.Trigger class="px-4 hover:bg-muted/50 hover:no-underline">
										<span class="font-medium text-foreground">
											{group.path.join(' › ')}
											<span class="font-normal text-muted-foreground">
												· {group.templates.length}</span
											>
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
							{#if searchResult.others.length > 0}
								<!-- Mot trouvé seulement dans la correction ou un point du programme : replié -->
								<Accordion.Item
									value={OTHERS_GROUP_VALUE}
									class="rounded-lg border !border-b-0 bg-background"
								>
									<Accordion.Trigger class="px-4 hover:bg-muted/50 hover:no-underline">
										<span class="font-medium text-foreground">
											Aussi dans les corrigés et le programme
											<span class="font-normal text-muted-foreground">
												· {searchResult.others.length}</span
											>
										</span>
									</Accordion.Trigger>
									<Accordion.Content class="px-4 pt-2 pb-4">
										{#if openSearchGroups.includes(OTHERS_GROUP_VALUE)}
											<CatalogueGallery templates={searchResult.others} />
										{/if}
									</Accordion.Content>
								</Accordion.Item>
							{/if}
						</Accordion.Root>
					{/if}
				{:else if activeView === NOTIONS_VIEW && catalogue.branches.length === 0 && catalogue.unclassified.length === 0}
					<p class="rounded-lg border border-dashed p-12 text-center text-muted-foreground">
						Aucune question pour ce niveau.
					</p>
				{/if}

				{#if !searchResult && activeView === PROGRAMME_VIEW && selectedChapter}
					{@const chapter = selectedChapter}
					{@render browser(
						'Chapitres',
						chapterGroups,
						chapter.id,
						`Chapitre : ${chapter.name} · ${chapterTemplateCount(chapter)}`,
						programmeContent
					)}
					{#snippet programmeContent()}
						{#key chapter.id}
							<CatalogueProgrammeSections {chapter} />
						{/key}
					{/snippet}
				{:else if !searchResult && activeView === NOTIONS_VIEW && selectedBranch && selectedNotion}
					{@const notion = selectedNotion}
					{@render browser(
						'Notions',
						notionGroups,
						notion.id,
						`Notion : ${notion.name} · ${notionTemplateCount(notion)}`,
						notionContent
					)}
					{#snippet notionContent()}
						{#key notion.id}
							<CatalogueNotionSections {notion} initialRubricId={arrivalRubricId} />
						{/key}
					{/snippet}
				{/if}

				{#if catalogue.unclassified.length > 0 && !searchResult && activeView === NOTIONS_VIEW}
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

		<aside aria-labelledby="ma-serie-titre" class="hidden xl:block">
			<div data-series-sticky class="sticky top-4 max-h-[calc(100vh-2rem)] overflow-y-auto">
				<MySeriesPreview titleId="ma-serie-titre" />
			</div>
		</aside>
	</div>
</div>

<!-- Plus petit : bouton rond (tablette) ou barre en bas (téléphone) → panneau -->
<MySeriesDock />
