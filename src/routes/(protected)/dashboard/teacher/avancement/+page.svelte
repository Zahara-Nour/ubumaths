<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher — Avancement du programme (coverage heatmap).
	 *
	 * Read-only view: for a class, how many times each curriculum point was worked
	 * on this school year, rolled up to items and themes. Colour = intensity.
	 */
	import { goto } from '$app/navigation';
	import { page } from '$app/state';
	import { resolve } from '$app/paths';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { Gauge, ChevronRight, ChevronDown } from '@lucide/svelte';
	import type { PageData } from './$types';

	type Theme = PageData['tree'][number];
	type Item = Theme['objectives'][number];

	let { data }: { data: PageData } = $props();

	let openThemes = $state<Record<string, boolean>>({});
	let openItems = $state<Record<string, boolean>>({});
	let onlyUncovered = $state(false);

	function changeClass(value: string | string[]) {
		if (typeof value !== 'string') return;
		// Query-only navigation (reloads the server load).
		const url = new URL(page.url);
		url.searchParams.set('class', value);
		goto(url, { keepFocus: true, noScroll: true });
	}

	function count(pointId: string): number {
		return data.counts[pointId] ?? 0;
	}

	/** Colour bucket: 0 = never seen (highlighted), then light → dark. */
	function cellClass(c: number): string {
		if (c === 0) return 'bg-red-50 text-red-700 ring-1 ring-inset ring-red-200';
		if (c === 1) return 'bg-emerald-100 text-emerald-900';
		if (c <= 3) return 'bg-emerald-300 text-emerald-950';
		return 'bg-emerald-500 text-white';
	}

	function itemStats(item: Item): { vus: number; total: number } {
		const total = item.points.length;
		const vus = item.points.filter((p) => count(p.id) > 0).length;
		return { vus, total };
	}

	function themeStats(theme: Theme): { vus: number; total: number } {
		let vus = 0;
		let total = 0;
		for (const item of theme.objectives) {
			const s = itemStats(item);
			vus += s.vus;
			total += s.total;
		}
		return { vus, total };
	}

	function pct(vus: number, total: number): number {
		return total > 0 ? Math.round((vus / total) * 100) : 0;
	}

	function uncoveredPoints(item: Item) {
		return item.points.filter((p) => count(p.id) === 0);
	}

	function themeHasUncovered(theme: Theme): boolean {
		return theme.objectives.some((item) => uncoveredPoints(item).length > 0);
	}
</script>

<svelte:head><title>Avancement du programme | Chiphre</title></svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-4">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
				<Gauge class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Avancement du programme</h1>
				<p class="text-sm text-muted-foreground">Année scolaire {data.schoolYearLabel}</p>
			</div>
		</div>
		{#if data.classOptions.length > 0}
			<MySelect
				type="single"
				value={data.selectedClassId}
				items={data.classOptions}
				onValueChange={changeClass}
				placeholder="{lore.entities.class}…"
				triggerClass="w-48"
			/>
		{/if}
	</div>

	{#if data.classOptions.length === 0}
		<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
			Aucune classe.
		</div>
	{:else if data.tree.length === 0}
		<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
			Aucun programme défini pour le niveau de cette classe.
			<a class="underline" href={resolve('/dashboard/teacher/programme')}>Le créer dans Programme</a
			>.
		</div>
	{:else}
		<!-- Legend + filter -->
		<div class="flex flex-wrap items-center justify-between gap-3 rounded-lg border bg-card p-3">
			<div class="flex flex-wrap items-center gap-3 text-xs">
				<span class="text-muted-foreground">Travaillé :</span>
				<span class="rounded px-2 py-0.5 {cellClass(0)}">jamais</span>
				<span class="rounded px-2 py-0.5 {cellClass(1)}">1×</span>
				<span class="rounded px-2 py-0.5 {cellClass(2)}">2–3×</span>
				<span class="rounded px-2 py-0.5 {cellClass(4)}">4×+</span>
			</div>
			<MyCheckbox bind:checked={onlyUncovered} label="Seulement les points non vus" />
		</div>

		<!-- Heatmap tree -->
		<div class="space-y-2">
			{#each data.tree as theme (theme.id)}
				{@const ts = themeStats(theme)}
				{#if !onlyUncovered || themeHasUncovered(theme)}
					<div class="rounded-lg border bg-card">
						<button
							class="flex w-full items-center gap-2 p-2 text-left"
							onclick={() => (openThemes[theme.id] = !openThemes[theme.id])}
						>
							{#if onlyUncovered || openThemes[theme.id]}
								<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
							{:else}
								<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
							{/if}
							<span class="flex-1 font-semibold">{theme.name}</span>
							<span class="text-xs text-muted-foreground">
								{ts.vus}/{ts.total} · {pct(ts.vus, ts.total)}%
							</span>
						</button>

						{#if onlyUncovered || openThemes[theme.id]}
							<div class="space-y-1 border-t p-2 pl-4">
								{#each theme.objectives as item (item.id)}
									{@const is = itemStats(item)}
									{#if !onlyUncovered || uncoveredPoints(item).length > 0}
										<div class="rounded-md border">
											<button
												class="flex w-full items-center gap-2 p-2 text-left text-sm"
												onclick={() => (openItems[item.id] = !openItems[item.id])}
											>
												{#if onlyUncovered || openItems[item.id]}
													<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
												{:else}
													<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
												{/if}
												<span class="flex-1 font-medium">{item.name}</span>
												<span class="text-xs text-muted-foreground">{is.vus}/{is.total}</span>
											</button>

											{#if onlyUncovered || openItems[item.id]}
												<div class="space-y-0.5 border-t p-2 pl-4">
													{#each onlyUncovered ? uncoveredPoints(item) : item.points as point (point.id)}
														{@const c = count(point.id)}
														<div class="flex items-center gap-2 py-0.5 text-sm">
															<span
																class="inline-flex h-6 min-w-[1.5rem] items-center justify-center rounded px-1.5 text-xs font-medium {cellClass(
																	c
																)}"
															>
																{c}
															</span>
															<span class:text-muted-foreground={c === 0}>{point.name}</span>
														</div>
													{/each}
												</div>
											{/if}
										</div>
									{/if}
								{/each}
							</div>
						{/if}
					</div>
				{/if}
			{/each}
		</div>
	{/if}
</div>
