<!--
	CatalogueNotionNav — liste des notions du catalogue Automaths
	=============================================================

	Branches et notions, chacune avec son nombre de questions (selon le niveau
	choisi : la page passe le catalogue déjà filtré). Seule la branche de la
	notion affichée est dépliée au départ ; un clic sur une branche l'ouvre ou
	la ferme. Montée dans la colonne de gauche (grand écran) ou dans le panneau
	du bas (téléphone).
-->
<script lang="ts">
	import { ChevronRight } from '@lucide/svelte';
	import { notionTemplateCount, type CatalogueBranch } from '#lib/questions/catalogue.ts';

	let {
		branches,
		selectedNotionId,
		onselect
	}: {
		branches: CatalogueBranch[];
		selectedNotionId: string | undefined;
		onselect: (notionId: string) => void;
	} = $props();

	// Branches ouvertes ou fermées à la main ; sinon, ouverte = celle de la notion affichée
	let toggled = $state<Record<string, boolean>>({});

	function isOpen(branch: CatalogueBranch): boolean {
		return toggled[branch.id] ?? branch.notions.some((n) => n.id === selectedNotionId);
	}

	function toggleBranch(branch: CatalogueBranch) {
		toggled[branch.id] = !isOpen(branch);
	}

	function branchCount(branch: CatalogueBranch): number {
		return branch.notions.reduce((sum, notion) => sum + notionTemplateCount(notion), 0);
	}
</script>

<nav aria-label="Notions">
	<ul class="space-y-1">
		{#each branches as branch (branch.id)}
			{@const open = isOpen(branch)}
			<li>
				<button
					type="button"
					class="flex w-full items-center gap-2 rounded-md px-2 py-1.5 text-left text-sm font-semibold hover:bg-muted"
					aria-expanded={open}
					onclick={() => toggleBranch(branch)}
				>
					<ChevronRight
						class="h-4 w-4 shrink-0 transition-transform {open ? 'rotate-90' : ''}"
						aria-hidden="true"
					/>
					<span class="flex-1">{branch.name}</span>
					<span class="text-xs font-normal text-muted-foreground" aria-hidden="true"
						>{branchCount(branch)}</span
					>
				</button>
				{#if open}
					<ul class="mt-1 mb-2 ml-6 space-y-0.5 border-l border-border pl-2">
						{#each branch.notions as notion (notion.id)}
							{@const selected = notion.id === selectedNotionId}
							{@const count = notionTemplateCount(notion)}
							<li>
								<button
									type="button"
									class="flex w-full items-center gap-2 rounded-md px-2 py-1 text-left text-sm {selected
										? 'bg-primary/10 font-medium text-primary'
										: 'hover:bg-muted'}"
									aria-current={selected ? 'true' : undefined}
									onclick={() => onselect(notion.id)}
								>
									<span class="flex-1">{notion.name}</span>
									<span class="text-xs text-muted-foreground" aria-hidden="true">{count}</span>
									<span class="sr-only">, {count === 1 ? '1 question' : `${count} questions`}</span>
								</button>
							</li>
						{/each}
					</ul>
				{/if}
			</li>
		{/each}
	</ul>
</nav>
