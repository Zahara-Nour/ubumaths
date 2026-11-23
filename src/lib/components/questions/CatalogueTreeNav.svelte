<!--
	CatalogueTreeNav — liste à deux étages du catalogue Automaths
	=============================================================

	Vue « Notions » : branches → notions ; vue « Programme » : parties →
	chapitres. Chaque entrée porte son nombre de questions (selon le niveau
	choisi : la page passe des compteurs déjà filtrés). Seul le groupe de
	l'entrée affichée est déplié au départ ; un clic sur un groupe l'ouvre ou le
	ferme. Un groupe dont la seule entrée porte son nom (partie sans chapitre)
	s'affiche comme une entrée. Montée dans la colonne de gauche (grand écran)
	ou dans le panneau du bas (téléphone).
-->
<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';

	// Types
	interface NavItem {
		id: string;
		name: string;
		count: number;
	}

	interface NavGroup extends NavItem {
		items: NavItem[];
	}

	let {
		label,
		groups,
		selectedId,
		onselect
	}: {
		/** Nom accessible de la liste (« Notions », « Chapitres ») */
		label: string;
		groups: NavGroup[];
		selectedId: string | undefined;
		onselect: (id: string) => void;
	} = $props();

	// Groupes ouverts ou fermés à la main, pour l'entrée affichée seulement :
	// une autre entrée affichée (clic, changement de niveau) repart de son groupe ouvert
	let toggled = $state<{ selectedId: string | undefined; open: Record<string, boolean> }>({
		selectedId: undefined,
		open: {}
	});

	function isOpen(group: NavGroup): boolean {
		const manual = toggled.selectedId === selectedId ? toggled.open[group.id] : undefined;
		return manual ?? group.items.some((item) => item.id === selectedId);
	}

	function toggleGroup(group: NavGroup) {
		const open = toggled.selectedId === selectedId ? toggled.open : {};
		toggled = { selectedId, open: { ...open, [group.id]: !isOpen(group) } };
	}

	/** Partie sans chapitre : sa seule entrée porte son nom */
	function singleItem(group: NavGroup): NavItem | null {
		const [only, ...rest] = group.items;
		return only && rest.length === 0 && only.name === group.name ? only : null;
	}

	function questionCount(n: number): string {
		return n === 1 ? '1 question' : `${n} questions`;
	}
</script>

{#snippet itemButton(item: NavItem, topLevel: boolean)}
	{@const selected = item.id === selectedId}
	<button
		type="button"
		class="flex w-full items-center gap-2 rounded-md px-2 text-left text-sm {topLevel
			? 'py-1.5 pl-8 font-semibold'
			: 'py-1'} {selected ? 'bg-primary/10 font-medium text-primary' : 'hover:bg-muted'}"
		aria-current={selected ? 'true' : undefined}
		onclick={() => onselect(item.id)}
	>
		<span class="flex-1">{item.name}</span>
		<span class="text-xs font-normal text-muted-foreground" aria-hidden="true">{item.count}</span>
		<span class="sr-only">, {questionCount(item.count)}</span>
	</button>
{/snippet}

<nav aria-label={label}>
	<ul class="space-y-1">
		{#each groups as group (group.id)}
			{@const single = singleItem(group)}
			<li>
				{#if single}
					{@render itemButton(single, true)}
				{:else}
					{@const open = isOpen(group)}
					<button
						type="button"
						class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
						aria-expanded={open}
						onclick={() => toggleGroup(group)}
					>
						<ChevronRight
							class="h-4 w-4 shrink-0 transition-transform {open ? 'rotate-90' : ''}"
							aria-hidden="true"
						/>
						<span class="flex-1">{group.name}</span>
						<span class="text-xs font-normal text-muted-foreground" aria-hidden="true"
							>{group.count}</span
						>
						<span class="sr-only">, {questionCount(group.count)}</span>
					</button>
					{#if open}
						<ul class="mt-1 mb-2 ml-6 space-y-0.5 border-l border-border pl-2">
							{#each group.items as item (item.id)}
								<li>{@render itemButton(item, false)}</li>
							{/each}
						</ul>
					{/if}
				{/if}
			</li>
		{/each}
	</ul>
</nav>
