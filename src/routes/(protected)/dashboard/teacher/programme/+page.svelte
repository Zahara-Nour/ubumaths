<script lang="ts">
	/**
	 * Teacher — Programme (consultation).
	 *
	 * Le programme d'un niveau dans la génération neuve des points (ADR 0020) :
	 * branche > notion > points, dans l'ordre du BO. Le BO fait foi : un point se
	 * crée, se déplace ou se supprime par migration. Ici, on peut seulement
	 * renommer un point (son code ne change jamais) et l'archiver / le restaurer.
	 *
	 * Les écritures passent par PATCH /api/teacher/curriculum/points/[pointId] ;
	 * la page se recharge par invalidateAll().
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { lore } from '$lib/config/lore';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		countArchivedPoints,
		hideArchivedPoints,
		type ProgrammePointView
	} from '$lib/utils/programme-tree';
	import {
		Pencil,
		Archive,
		ArchiveRestore,
		ChevronRight,
		ChevronDown,
		ListTodo
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Ouverture des branches et notions, par id (proxy $state → réactif).
	let openBranches = $state<Record<string, boolean>>({});
	let openNotions = $state<Record<string, boolean>>({});
	let showArchived = $state(false);
	let busy = $state(false);

	// Dialogue de renommage.
	let renameOpen = $state(false);
	let renameTarget = $state<ProgrammePointView | null>(null);
	let renameValue = $state('');

	const archivedCount = $derived(countArchivedPoints(data.tree));
	const branches = $derived(showArchived ? data.tree : hideArchivedPoints(data.tree));

	function pointCount(branch: (typeof branches)[number]): number {
		return branch.notions.reduce((sum, n) => sum + n.points.length, 0);
	}

	function changeGrade(value: string | string[]) {
		if (typeof value !== 'string') return;
		// Navigation sur la même route, query seule → relance le load serveur.
		// resolve() ne porte pas de query string (même motif que la page Avancement).
		const url = new URL(page.url);
		url.searchParams.set('grade', value);
		goto(url, { keepFocus: true, noScroll: true });
	}

	async function patchPoint(pointId: string, body: { name: string } | { archived: boolean }) {
		busy = true;
		try {
			const res = await fetch(`/api/teacher/curriculum/points/${pointId}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify(body)
			});
			const json: { error?: string } = await res.json().catch(() => ({}));
			if (!res.ok) {
				toaster.error(json.error ?? 'Une erreur est survenue');
				return false;
			}
			return true;
		} catch {
			toaster.error('Erreur réseau');
			return false;
		} finally {
			busy = false;
		}
	}

	function openRename(point: ProgrammePointView) {
		renameTarget = point;
		renameValue = point.name;
		renameOpen = true;
	}

	async function submitRename() {
		if (!renameTarget) return;
		const name = renameValue.trim();
		if (!name) {
			toaster.error('Le libellé ne peut pas être vide');
			return;
		}
		if (await patchPoint(renameTarget.id, { name })) {
			renameOpen = false;
			toaster.success('Renommé');
			await invalidateAll();
		}
	}

	// Archiver : le point sort des vues, du tagging et de la couverture, mais
	// son historique reste attaché.
	async function toggleArchive(point: ProgrammePointView) {
		const archiving = point.archived_at === null;
		if (await patchPoint(point.id, { archived: archiving })) {
			toaster.success(archiving ? 'Archivé' : 'Restauré');
			await invalidateAll();
		}
	}
</script>

<svelte:head><title>Programme | Chiphre</title></svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-4">
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
				<ListTodo class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Programme</h1>
				<p class="text-sm text-muted-foreground">
					Points du programme par branche et notion, dans l'ordre du BO.
				</p>
			</div>
		</div>
		<MySelect
			type="single"
			value={data.grade}
			items={data.gradeOptions}
			onValueChange={changeGrade}
			triggerClass="w-28"
		/>
	</div>

	{#if archivedCount > 0}
		<MyCheckbox
			bind:checked={showArchived}
			label="Afficher les {archivedCount} point{archivedCount > 1
				? 's'
				: ''} archivé{archivedCount > 1 ? 's' : ''}"
		/>
	{/if}

	{#if branches.length === 0}
		<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
			Aucun point pour ce programme
		</div>
	{:else}
		<div class="space-y-2">
			{#each branches as branch (branch.id)}
				<div class="rounded-lg border bg-card">
					<button
						class="flex w-full items-center gap-2 p-2 text-left"
						data-tree-toggle
						aria-expanded={openBranches[branch.id] ?? false}
						onclick={() => (openBranches[branch.id] = !openBranches[branch.id])}
					>
						{#if openBranches[branch.id]}
							<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
						{:else}
							<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
						{/if}
						<span class="font-semibold">{branch.name}</span>
						<span class="text-xs text-muted-foreground">
							{branch.notions.length} notions · {pointCount(branch)} points
						</span>
					</button>

					{#if openBranches[branch.id]}
						<div class="space-y-1 border-t bg-muted/30 p-2 pl-6">
							{#each branch.notions as notion (notion.id)}
								<div class="rounded-md border bg-card">
									<button
										class="flex w-full items-center gap-2 p-2 text-left"
										data-tree-toggle
										aria-expanded={openNotions[notion.id] ?? false}
										onclick={() => (openNotions[notion.id] = !openNotions[notion.id])}
									>
										{#if openNotions[notion.id]}
											<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
										{:else}
											<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
										{/if}
										<span class="font-medium">{notion.name}</span>
										<span class="text-xs text-muted-foreground">{notion.points.length} points</span>
									</button>

									{#if openNotions[notion.id]}
										<ul class="space-y-1 border-t p-2 pl-6">
											{#each notion.points as point (point.id)}
												<li
													class="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/50"
													class:opacity-60={point.archived_at}
												>
													<code
														class="mt-1 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums"
													>
														{point.code}
													</code>
													<span class="flex-1 text-sm" class:line-through={point.archived_at}>
														<InlineMarkdown content={point.name} />
														{#if point.subnotionName}
															<Badge variant="secondary" class="ml-2 align-middle text-[10px]">
																{point.subnotionName}
															</Badge>
														{/if}
														{#if point.archived_at}
															<Badge variant="outline" class="ml-1 align-middle text-[10px]">
																archivé
															</Badge>
														{/if}
													</span>
													<div class="flex items-center gap-1">
														<Button
															variant="ghost"
															size="sm"
															title="Renommer"
															aria-label="Renommer « {point.name} »"
															disabled={busy}
															onclick={() => openRename(point)}
														>
															<Pencil class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															title={point.archived_at ? 'Restaurer' : 'Archiver'}
															aria-label="{point.archived_at
																? 'Restaurer'
																: 'Archiver'} « {point.name} »"
															disabled={busy}
															onclick={() => toggleArchive(point)}
														>
															{#if point.archived_at}
																<ArchiveRestore class="h-4 w-4" />
															{:else}
																<Archive class="h-4 w-4" />
															{/if}
														</Button>
													</div>
												</li>
											{/each}
										</ul>
									{/if}
								</div>
							{/each}
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<Dialog.Root bind:open={renameOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Renommer le point</Dialog.Title>
			{#if renameTarget}
				<Dialog.Description>
					Code <code class="font-mono">{renameTarget.code}</code> — il ne change jamais : c'est lui qui
					identifie ce point dans les fiches et les tags.
				</Dialog.Description>
			{/if}
		</Dialog.Header>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitRename();
			}}
		>
			<div class="space-y-2">
				<Label for="programme-point-name">Libellé</Label>
				<Input id="programme-point-name" bind:value={renameValue} autofocus />
			</div>
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (renameOpen = false)}>
					{lore.actions.cancel}
				</Button>
				<Button type="submit" disabled={busy}>Enregistrer</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
