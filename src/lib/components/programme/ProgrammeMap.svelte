<script lang="ts">
	/**
	 * Carte du programme : une carte mentale par branche, de gauche à droite
	 * (branche → notions → sous-notions → points du niveau).
	 *
	 * Les boîtes sont en HTML (les libellés contiennent des maths, rendues par
	 * InlineMarkdown) ; seules les courbes de liaison sont en SVG, recalculées
	 * depuis la position des boîtes dès que la carte change de taille ou de
	 * contenu (dépliage, rendu des maths).
	 *
	 * Clic sur une branche ou une notion : plier / déplier ses enfants ; clic
	 * sur une sous-notion (ou sur « N points sur la notion ») : voir ses points.
	 */
	import type { Attachment } from 'svelte/attachments';
	import { SvelteSet } from 'svelte/reactivity';
	import { untrack } from 'svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { Button } from '$lib/components/ui/button';
	import {
		branchColor,
		countsLabel,
		defaultOpenIds,
		hideEmptyNodes,
		isEmptyNode,
		kindLabel,
		linkPath,
		pointHolderIds,
		type MapBranch,
		type MapPoint
	} from '$lib/utils/programme-map';

	let { map }: { map: MapBranch[] } = $props();

	// La page remonte le composant à chaque niveau ({#key}) : l'état part de la carte reçue.
	const open = new SvelteSet<string>(untrack(() => defaultOpenIds(map)));
	const openPoints = new SvelteSet<string>();
	let hideEmpty = $state(false);
	let links = $state<Record<string, string[]>>({});

	const shown = $derived(hideEmpty ? hideEmptyNodes(map) : map);
	const colorById = $derived(new Map(map.map((b, i) => [b.id, branchColor(i)])));
	const totals = $derived(
		map.reduce(
			(sum, b) => ({
				attendus: sum.attendus + b.counts.attendus,
				approfondissements: sum.approfondissements + b.counts.approfondissements
			}),
			{ attendus: 0, approfondissements: 0 }
		)
	);

	function toggle(set: SvelteSet<string>, id: string) {
		if (set.has(id)) set.delete(id);
		else set.add(id);
	}

	function openAll() {
		for (const id of defaultOpenIds(map)) open.add(id);
		for (const id of pointHolderIds(map)) openPoints.add(id);
	}

	/** Ne laisse que les branches. */
	function closeAll() {
		open.clear();
		openPoints.clear();
	}

	function plural(count: number, noun: string): string {
		return `${count} ${noun}${count > 1 ? 's' : ''}`;
	}

	/** Courbes de la carte d'une branche : de chaque boîte vers sa boîte parente. */
	function computeLinks(tree: HTMLElement): string[] {
		const origin = tree.getBoundingClientRect();
		const rectOf = (el: Element) => {
			const r = el.getBoundingClientRect();
			return {
				left: r.left - origin.left,
				top: r.top - origin.top,
				width: r.width,
				height: r.height
			};
		};
		const boxes = new Map<string, Element>();
		for (const el of tree.querySelectorAll('[data-box]'))
			boxes.set(el.getAttribute('data-box') ?? '', el);
		const paths: string[] = [];
		for (const el of tree.querySelectorAll('[data-parent]')) {
			const parent = boxes.get(el.getAttribute('data-parent') ?? '');
			if (parent) paths.push(linkPath(rectOf(parent), rectOf(el)));
		}
		return paths;
	}

	function drawLinks(branchId: string): Attachment<HTMLElement> {
		return (tree) => {
			const update = () => {
				links[branchId] = computeLinks(tree);
			};
			// Chaque boîte est observée : une boîte qui grandit (maths, police chargée)
			// déplace ses voisines sans forcément changer la taille de la carte.
			const resize = new ResizeObserver(update);
			const observeBoxes = () => {
				resize.observe(tree);
				for (const el of tree.querySelectorAll('[data-box], [data-parent]')) resize.observe(el);
			};
			// Le SVG est hors de `tree` : le redessiner ne relance pas l'observateur.
			const mutation = new MutationObserver(() => {
				observeBoxes();
				update();
			});
			observeBoxes();
			mutation.observe(tree, { childList: true, subtree: true });
			update();
			document.fonts?.ready.then(update);
			return () => {
				resize.disconnect();
				mutation.disconnect();
				delete links[branchId];
			};
		};
	}
</script>

{#snippet leaf(point: MapPoint, parentKey: string)}
	{@const approf = point.exigence === 'approfondissement'}
	<div
		class="map-leaf w-96 rounded-md border bg-card px-3 py-1.5 text-sm"
		class:approf
		data-parent={parentKey}
		data-map-point={point.code}
		data-exigence={point.exigence}
	>
		<div class="font-mono text-[11px] text-muted-foreground tabular-nums">
			{point.code}<span class="ml-2 font-sans">· {kindLabel(point.kind)}</span>{#if approf}<span
					class="ml-1 font-sans">· approfondissement</span
				>{/if}
		</div>
		<div class:text-muted-foreground={approf}><InlineMarkdown content={point.name} /></div>
	</div>
{/snippet}

{#snippet archivedTag(archived: boolean)}
	{#if archived}<span class="ml-1 text-[10px] tracking-wide uppercase" data-node-archived
			>archivé</span
		>{/if}
{/snippet}

<div class="space-y-4">
	<div class="flex flex-wrap items-center gap-x-4 gap-y-2">
		<span class="text-sm text-muted-foreground tabular-nums" data-map-totals>
			{plural(totals.attendus + totals.approfondissements, 'point')} · {totals.attendus}
			attendus · {plural(totals.approfondissements, 'approfondissement')}
		</span>
		<Button variant="outline" size="sm" onclick={openAll}>Tout déplier</Button>
		<Button variant="outline" size="sm" onclick={closeAll}>Tout replier</Button>
		<MyCheckbox bind:checked={hideEmpty} label="Masquer les nœuds vides" />
	</div>

	<div class="flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-muted-foreground">
		<span class="inline-flex items-center gap-1.5"
			><span class="legend-swatch"></span>point attendu</span
		>
		<span class="inline-flex items-center gap-1.5"
			><span class="legend-swatch approf"></span>approfondissement</span
		>
		<span class="inline-flex items-center gap-1.5"
			><span class="legend-swatch empty"></span>nœud sans point pour ce niveau</span
		>
	</div>

	{#if totals.attendus + totals.approfondissements === 0}
		<p class="rounded-lg border border-dashed p-4 text-center text-muted-foreground">
			Aucun point pour ce programme
		</p>
	{/if}

	<nav class="flex flex-wrap gap-1.5" aria-label="Branches">
		{#each shown as branch (branch.id)}
			<a
				href="#carte-{branch.id}"
				class="inline-flex items-center gap-1.5 rounded-md border bg-card px-2.5 py-1 text-xs hover:border-primary"
				class:text-muted-foreground={isEmptyNode(branch)}
			>
				<span
					class="h-2.5 w-2.5 rounded-full"
					style:background={isEmptyNode(branch) ? 'var(--color-border)' : colorById.get(branch.id)}
				></span>
				{branch.name}
				<span class="text-muted-foreground tabular-nums"
					>{branch.counts.attendus + branch.counts.approfondissements}</span
				>
			</a>
		{/each}
	</nav>

	{#each shown as branch (branch.id)}
		{@const color = colorById.get(branch.id)}
		{@const branchOpen = open.has(branch.id)}
		<section
			id="carte-{branch.id}"
			class="scroll-mt-4 overflow-x-auto rounded-lg border bg-card p-3"
			style:--branch={color}
			aria-label={branch.name}
		>
			<div class="relative w-max">
				<svg class="pointer-events-none absolute inset-0 h-full w-full" aria-hidden="true">
					{#each links[branch.id] ?? [] as d, i (i)}
						<path {d} class="map-link" />
					{/each}
				</svg>
				<div class="map-row relative" {@attach drawLinks(branch.id)}>
					<button
						type="button"
						class="map-branch w-44 shrink-0 rounded-xl px-3.5 py-3 text-left"
						class:empty={isEmptyNode(branch)}
						data-box={branch.id}
						aria-expanded={branchOpen}
						onclick={() => toggle(open, branch.id)}
					>
						<span class="block text-[15px] leading-tight font-bold">{branch.name}</span>
						{@render archivedTag(branch.archived)}
						<span class="mt-1.5 block text-xs tabular-nums opacity-85"
							>{branchOpen ? '▾' : '▸'} {countsLabel(branch.counts)}</span
						>
					</button>

					{#if branchOpen && branch.notions.length > 0}
						<div class="map-col gap-3">
							{#each branch.notions as notion (notion.id)}
								{@const notionOpen = open.has(notion.id)}
								<div class="map-row">
									<button
										type="button"
										class="map-notion w-60 shrink-0 rounded-lg border bg-card py-2 pr-3 pl-4 text-left"
										class:empty={isEmptyNode(notion)}
										data-box={notion.id}
										data-parent={branch.id}
										aria-expanded={notionOpen}
										onclick={() => toggle(open, notion.id)}
									>
										<span class="block text-sm leading-snug font-semibold">{notion.name}</span>
										{@render archivedTag(notion.archived)}
										<span class="mt-1 block text-xs text-muted-foreground tabular-nums">
											{#if notion.subnotions.length > 0}{notionOpen ? '▾' : '▸'}{/if}
											{countsLabel(notion.counts)}
										</span>
									</button>

									{#if notion.points.length > 0 || (notionOpen && notion.subnotions.length > 0)}
										<div class="map-col gap-2">
											{#if notion.points.length > 0}
												{@const pillKey = `pts-${notion.id}`}
												{@const pointsOpen = openPoints.has(notion.id)}
												<button
													type="button"
													class="map-pill w-56 rounded-full border border-dotted bg-card px-3.5 py-1 text-left text-xs text-muted-foreground"
													data-box={pillKey}
													data-parent={notion.id}
													aria-expanded={pointsOpen}
													onclick={() => toggle(openPoints, notion.id)}
												>
													{pointsOpen ? '▾' : '▸'}
													{plural(notion.points.length, 'point')} sur la notion
												</button>
												{#if pointsOpen}
													{#each notion.points as point (point.id)}
														{@render leaf(point, notion.id)}
													{/each}
												{/if}
											{/if}
											{#if notionOpen}
												{#each notion.subnotions as sub (sub.id)}
													{@const subOpen = openPoints.has(sub.id)}
													<div class="map-row">
														{#if sub.points.length > 0}
															<button
																type="button"
																class="map-sub w-56 shrink-0 rounded-[10px] border px-3.5 py-1.5 text-left"
																data-box={sub.id}
																data-parent={notion.id}
																aria-expanded={subOpen}
																onclick={() => toggle(openPoints, sub.id)}
															>
																<span class="block text-[13px] leading-snug">{sub.name}</span>
																{@render archivedTag(sub.archived)}
																<span class="block text-xs text-muted-foreground tabular-nums"
																	>{subOpen ? '▾' : '▸'} {countsLabel(sub.counts)}</span
																>
															</button>
														{:else}
															<div
																class="map-sub empty w-56 shrink-0 rounded-[10px] border px-3.5 py-1.5"
																data-box={sub.id}
																data-parent={notion.id}
															>
																<span class="block text-[13px] leading-snug">{sub.name}</span>
																<span class="block text-xs tabular-nums"
																	>{countsLabel(sub.counts)}</span
																>
															</div>
														{/if}
														{#if subOpen && sub.points.length > 0}
															<div class="map-col gap-2">
																{#each sub.points as point (point.id)}
																	{@render leaf(point, sub.id)}
																{/each}
															</div>
														{/if}
													</div>
												{/each}
											{/if}
										</div>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			</div>
		</section>
	{/each}
</div>

<style>
	/* Un nœud et la colonne de ses enfants, centrés l'un sur l'autre. */
	.map-row {
		display: flex;
		align-items: center;
		column-gap: 2.75rem;
	}
	.map-col {
		display: flex;
		flex-direction: column;
		align-items: flex-start;
	}
	.map-link {
		fill: none;
		stroke: var(--color-border);
		stroke-width: 1.5;
	}
	.map-branch {
		background: var(--branch);
		color: light-dark(#ffffff, #141917);
		border: 1.5px solid var(--branch);
	}
	.map-notion {
		border-left: 5px solid var(--branch);
	}
	.map-sub {
		background: color-mix(in srgb, var(--branch) 12%, var(--color-card));
		border-color: color-mix(in srgb, var(--branch) 55%, var(--color-card));
	}
	.map-pill {
		border-color: var(--branch);
	}
	.map-leaf {
		border-color: color-mix(in srgb, var(--color-foreground) 45%, transparent);
	}
	.map-leaf.approf {
		border-style: dashed;
		border-color: var(--color-muted-foreground);
	}
	/* Nœud sans point du niveau : grisé, en pointillé. */
	.map-branch.empty,
	.map-notion.empty,
	.map-sub.empty {
		background: transparent;
		color: var(--color-muted-foreground);
		border: 1.5px dashed var(--color-border);
	}
	.map-notion.empty {
		border-left: 5px solid var(--color-border);
	}
	button:focus-visible {
		outline: 2px solid var(--color-ring);
		outline-offset: 2px;
	}
	.legend-swatch {
		display: inline-block;
		width: 1.4rem;
		height: 0.75rem;
		border-radius: 3px;
		border: 1.5px solid var(--color-foreground);
	}
	.legend-swatch.approf {
		border-style: dashed;
		border-color: var(--color-muted-foreground);
	}
	.legend-swatch.empty {
		border-style: dashed;
		border-color: var(--color-border);
	}
</style>
