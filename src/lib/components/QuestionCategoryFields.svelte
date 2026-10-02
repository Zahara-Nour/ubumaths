<!--
  QuestionCategoryFields
  ======================

  Thème / Domaine / Sous-domaine de l'éditeur de modèle de question.
  - Domaine filtré par le thème choisi, Sous-domaine par thème + domaine
    (logique pure : $lib/questions/category-options).
  - La valeur courante reste toujours proposée, même absente des données.
  - Les valeurs créées par « Ajouter… » restent disponibles pendant la session,
    rattachées au thème / domaine choisis au moment de l'ajout.
  - Changer de thème ou de domaine NE vide PAS une valeur devenue incompatible :
    elle reste sélectionnée, et un message signale qu'elle est nouvelle dans ce
    thème / domaine (elle sera créée avec le modèle). L'utilisateur choisit alors
    une autre valeur ou garde celle-ci en connaissance de cause.
-->
<script lang="ts">
	import CategorySelector from './CategorySelector.svelte';
	import {
		themeOptionsFor,
		domainOptionsFor,
		subdomainOptionsFor,
		isKnownDomain,
		isKnownSubdomain,
		type CategoryEntry
	} from '$lib/questions/category-options';

	interface Props {
		entries: CategoryEntry[];
		theme: string;
		domain: string;
		subdomain: string;
		themeError?: string;
		domainError?: string;
	}

	let {
		entries,
		theme = $bindable(),
		domain = $bindable(),
		subdomain = $bindable(),
		themeError = '',
		domainError = ''
	}: Props = $props();

	// Ajouts de la session (« Ajouter… ») : perdus au rechargement, comme avant
	let addedThemes = $state<string[]>([]);
	let addedEntries = $state<CategoryEntry[]>([]);

	const allEntries = $derived([...entries, ...addedEntries]);

	const themeOptions = $derived(themeOptionsFor(allEntries, addedThemes, theme));
	const domainOptions = $derived(domainOptionsFor(allEntries, theme, domain));
	const subdomainOptions = $derived(subdomainOptionsFor(allEntries, theme, domain, subdomain));

	const domainIsNewHere = $derived(
		Boolean(theme && domain) && !isKnownDomain(allEntries, theme, domain)
	);
	const subdomainIsNewHere = $derived(
		Boolean(theme && domain && subdomain) && !isKnownSubdomain(allEntries, theme, domain, subdomain)
	);

	function addTheme(newTheme: string) {
		addedThemes = [...addedThemes, newTheme];
	}

	function addDomain(newDomain: string) {
		addedEntries = [...addedEntries, { theme, domain: newDomain, subdomain: null }];
	}

	function addSubdomain(newSubdomain: string) {
		addedEntries = [...addedEntries, { theme, domain, subdomain: newSubdomain }];
	}
</script>

<div class="grid gap-4 md:grid-cols-3">
	<div>
		<CategorySelector
			label="Thème"
			bind:value={theme}
			options={themeOptions}
			required={true}
			onValueChange={(val) => (theme = val)}
			onAddNew={addTheme}
		/>
		{#if themeError}
			<p class="mt-1 text-xs text-destructive">{themeError}</p>
		{/if}
	</div>

	<div>
		<CategorySelector
			label="Domaine"
			bind:value={domain}
			options={domainOptions}
			required={true}
			onValueChange={(val) => (domain = val)}
			onAddNew={addDomain}
		/>
		{#if domainError}
			<p class="mt-1 text-xs text-destructive">{domainError}</p>
		{/if}
		{#if domainIsNewHere}
			<p class="mt-1 text-xs text-amber-700 dark:text-amber-400">
				« {domain} » n’existe pas encore dans le thème « {theme} » : il sera créé avec ce modèle.
			</p>
		{/if}
	</div>

	<div>
		<CategorySelector
			label="Sous-domaine"
			bind:value={subdomain}
			options={subdomainOptions}
			allowEmpty={true}
			onValueChange={(val) => (subdomain = val)}
			onAddNew={addSubdomain}
		/>
		{#if subdomainIsNewHere}
			<p class="mt-1 text-xs text-amber-700 dark:text-amber-400">
				« {subdomain} » n’existe pas encore dans « {theme} / {domain} » : il sera créé avec ce modèle.
			</p>
		{/if}
	</div>
</div>
