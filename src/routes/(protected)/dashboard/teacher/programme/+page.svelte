<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher — Programme (curriculum tree editor).
	 *
	 * Editable Thème → Item → Point tree for a grade. Mutations go through the
	 * /api/teacher/curriculum endpoints; the page reloads via invalidateAll().
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Plus,
		Pencil,
		Trash2,
		ChevronRight,
		ChevronDown,
		ArrowUp,
		ArrowDown,
		ListTodo
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	type Level = 'theme' | 'item' | 'point';
	type DialogKind = 'none' | 'connaissance' | 'savoir_faire';

	let { data }: { data: PageData } = $props();

	// --- expansion (keyed by id; $state proxy → reactive) ---------------------
	let openThemes = $state<Record<string, boolean>>({});
	let openItems = $state<Record<string, boolean>>({});

	// --- dialog state ---------------------------------------------------------
	let dialogOpen = $state(false);
	let dialogMode = $state<'create' | 'edit'>('create');
	let dialogLevel = $state<Level>('theme');
	let dialogName = $state('');
	let dialogKind = $state<DialogKind>('none');
	/** Edit: id of the node. Create: id of the parent ('' for a theme). */
	let dialogTargetId = $state('');
	let busy = $state(false);

	const kindItems = [
		{ value: 'none', label: '— non précisé' },
		{ value: 'connaissance', label: 'Connaissance' },
		{ value: 'savoir_faire', label: 'Savoir-faire' }
	];

	const dialogTitle = $derived.by(() => {
		const noun = dialogLevel === 'theme' ? 'thème' : dialogLevel === 'item' ? 'item' : 'point';
		if (dialogMode === 'create') return `Nouveau ${noun}`;
		return `Modifier le ${noun}`;
	});

	function basePath(level: Level): string {
		return level === 'theme' ? 'themes' : level === 'item' ? 'items' : 'points';
	}

	function kindLabel(kind: string | null): string | null {
		if (kind === 'connaissance') return 'connaissance';
		if (kind === 'savoir_faire') return 'savoir-faire';
		return null;
	}

	function pointCount(theme: PageData['tree'][number]): number {
		return theme.objectives.reduce((sum, i) => sum + i.points.length, 0);
	}

	// --- API helper -----------------------------------------------------------
	async function api(url: string, method: string, body?: unknown): Promise<boolean> {
		busy = true;
		try {
			const res = await fetch(url, {
				method,
				headers: body ? { 'Content-Type': 'application/json' } : undefined,
				body: body ? JSON.stringify(body) : undefined
			});
			const json = await res.json().catch(() => ({}));
			if (!res.ok) {
				toaster.error(json?.error ?? 'Une erreur est survenue');
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

	// --- grade ----------------------------------------------------------------
	function changeGrade(value: string | string[]) {
		if (typeof value !== 'string') return;
		// Query-only navigation on the same route → reloads the server load.
		// (resolve() can't carry a query string; this mirrors the existing goto('?') usage.)
		const url = new URL(page.url);
		url.searchParams.set('grade', value);
		goto(url, { keepFocus: true, noScroll: true });
	}

	// --- dialog openers -------------------------------------------------------
	function openCreate(level: Level, parentId = '') {
		dialogMode = 'create';
		dialogLevel = level;
		dialogTargetId = parentId;
		dialogName = '';
		dialogKind = 'none';
		dialogOpen = true;
	}

	function openEdit(level: Level, node: { id: string; name: string; kind?: string | null }) {
		dialogMode = 'edit';
		dialogLevel = level;
		dialogTargetId = node.id;
		dialogName = node.name;
		dialogKind = (node.kind as DialogKind) ?? 'none';
		dialogOpen = true;
	}

	// --- submit (create / edit) ----------------------------------------------
	async function submitDialog() {
		const name = dialogName.trim();
		if (!name) {
			toaster.error('Le nom ne peut pas être vide');
			return;
		}
		const kind = dialogKind === 'none' ? null : dialogKind;
		let ok = false;

		if (dialogMode === 'create') {
			if (dialogLevel === 'theme') {
				ok = await api('/api/teacher/curriculum/themes', 'POST', { grade: data.grade, name });
			} else if (dialogLevel === 'item') {
				ok = await api('/api/teacher/curriculum/objectives', 'POST', {
					theme_id: dialogTargetId,
					name
				});
				if (ok) openThemes[dialogTargetId] = true;
			} else {
				ok = await api('/api/teacher/curriculum/points', 'POST', {
					objective_id: dialogTargetId,
					name,
					kind
				});
				if (ok) openItems[dialogTargetId] = true;
			}
		} else {
			const url = `/api/teacher/curriculum/${basePath(dialogLevel)}/${dialogTargetId}`;
			const payload = dialogLevel === 'point' ? { name, kind } : { name };
			ok = await api(url, 'PATCH', payload);
		}

		if (ok) {
			dialogOpen = false;
			toaster.success(dialogMode === 'create' ? 'Ajouté' : 'Modifié');
			await invalidateAll();
		}
	}

	// --- delete ---------------------------------------------------------------
	async function deleteNode(level: Level, node: { id: string; name: string }) {
		const warn =
			level === 'theme'
				? '\n\nTous ses items et points seront aussi supprimés.'
				: level === 'item'
					? '\n\nTous ses points seront aussi supprimés.'
					: '';
		if (!confirm(`Supprimer « ${node.name} » ?${warn}`)) return;
		const ok = await api(`/api/teacher/curriculum/${basePath(level)}/${node.id}`, 'DELETE');
		if (ok) {
			toaster.success('Supprimé');
			await invalidateAll();
		}
	}

	// --- reorder (swap display_order with neighbour) --------------------------
	async function reorder(
		level: Level,
		list: { id: string; display_order: number }[],
		index: number,
		dir: 'up' | 'down'
	) {
		const target = index + (dir === 'up' ? -1 : 1);
		if (target < 0 || target >= list.length) return;
		const a = list[index];
		const b = list[target];
		const path = (id: string) => `/api/teacher/curriculum/${basePath(level)}/${id}`;
		const ok1 = await api(path(a.id), 'PATCH', { display_order: b.display_order });
		if (!ok1) return;
		const ok2 = await api(path(b.id), 'PATCH', { display_order: a.display_order });
		if (ok2) await invalidateAll();
	}
</script>

<svelte:head><title>Programme | Chiphre</title></svelte:head>

<div class="container mx-auto max-w-4xl space-y-6 p-4">
	<!-- Header -->
	<div class="flex flex-wrap items-center justify-between gap-3">
		<div class="flex items-center gap-3">
			<div class="flex h-11 w-11 items-center justify-center rounded-xl bg-primary/10">
				<ListTodo class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight">Programme</h1>
				<p class="text-sm text-muted-foreground">
					Référentiel de suivi — thèmes, items et points par niveau.
				</p>
			</div>
		</div>
		<div class="flex items-center gap-2">
			<MySelect
				type="single"
				value={data.grade}
				items={data.gradeOptions}
				onValueChange={changeGrade}
				triggerClass="w-28"
			/>
			<Button size="sm" disabled={busy} onclick={() => openCreate('theme')}>
				<Plus class="mr-1 h-4 w-4" /> Thème
			</Button>
		</div>
	</div>

	<!-- Tree -->
	{#if data.tree.length === 0}
		<div class="rounded-lg border border-dashed p-10 text-center text-muted-foreground">
			Aucun thème pour ce niveau. Créez le premier avec « + Thème ».
		</div>
	{:else}
		<div class="space-y-2">
			{#each data.tree as theme, ti (theme.id)}
				<div class="rounded-lg border bg-card">
					<!-- Theme row -->
					<div class="flex items-center gap-2 p-2">
						<button
							class="flex flex-1 items-center gap-2 text-left"
							onclick={() => (openThemes[theme.id] = !openThemes[theme.id])}
						>
							{#if openThemes[theme.id]}
								<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
							{:else}
								<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
							{/if}
							<span class="font-semibold">{theme.name}</span>
							<span class="text-xs text-muted-foreground">
								{theme.objectives.length} items · {pointCount(theme)} points
							</span>
						</button>
						<div class="flex items-center gap-1">
							<Button
								variant="ghost"
								size="sm"
								disabled={busy || ti === 0}
								onclick={() => reorder('theme', data.tree, ti, 'up')}
							>
								<ArrowUp class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								disabled={busy || ti === data.tree.length - 1}
								onclick={() => reorder('theme', data.tree, ti, 'down')}
							>
								<ArrowDown class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								disabled={busy}
								onclick={() => openEdit('theme', theme)}
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								disabled={busy}
								onclick={() => deleteNode('theme', theme)}
							>
								<Trash2 class="h-4 w-4 text-destructive" />
							</Button>
						</div>
					</div>

					<!-- Items -->
					{#if openThemes[theme.id]}
						<div class="space-y-1 border-t bg-muted/30 p-2 pl-6">
							{#each theme.objectives as item, ii (item.id)}
								<div class="rounded-md border bg-card">
									<div class="flex items-center gap-2 p-2">
										<button
											class="flex flex-1 items-center gap-2 text-left"
											onclick={() => (openItems[item.id] = !openItems[item.id])}
										>
											{#if openItems[item.id]}
												<ChevronDown class="h-4 w-4 shrink-0 text-muted-foreground" />
											{:else}
												<ChevronRight class="h-4 w-4 shrink-0 text-muted-foreground" />
											{/if}
											<span class="font-medium">{item.name}</span>
											<span class="text-xs text-muted-foreground">{item.points.length} points</span>
										</button>
										<div class="flex items-center gap-1">
											<Button
												variant="ghost"
												size="sm"
												disabled={busy || ii === 0}
												onclick={() => reorder('item', theme.objectives, ii, 'up')}
											>
												<ArrowUp class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												disabled={busy || ii === theme.objectives.length - 1}
												onclick={() => reorder('item', theme.objectives, ii, 'down')}
											>
												<ArrowDown class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												disabled={busy}
												onclick={() => openEdit('item', item)}
											>
												<Pencil class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												disabled={busy}
												onclick={() => deleteNode('item', item)}
											>
												<Trash2 class="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>

									<!-- Points -->
									{#if openItems[item.id]}
										<div class="space-y-1 border-t p-2 pl-6">
											{#each item.points as point, pi (point.id)}
												<div class="flex items-center gap-2 rounded px-1 py-1 hover:bg-muted/50">
													<span class="flex-1 text-sm">
														{point.name}
														{#if kindLabel(point.kind)}
															<Badge variant="outline" class="ml-2 align-middle text-[10px]">
																{kindLabel(point.kind)}
															</Badge>
														{/if}
													</span>
													<div class="flex items-center gap-1">
														<Button
															variant="ghost"
															size="sm"
															disabled={busy || pi === 0}
															onclick={() => reorder('point', item.points, pi, 'up')}
														>
															<ArrowUp class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															disabled={busy || pi === item.points.length - 1}
															onclick={() => reorder('point', item.points, pi, 'down')}
														>
															<ArrowDown class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															disabled={busy}
															onclick={() => openEdit('point', point)}
														>
															<Pencil class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															disabled={busy}
															onclick={() => deleteNode('point', point)}
														>
															<Trash2 class="h-4 w-4 text-destructive" />
														</Button>
													</div>
												</div>
											{/each}
											<Button
												variant="ghost"
												size="sm"
												class="mt-1"
												disabled={busy}
												onclick={() => openCreate('point', item.id)}
											>
												<Plus class="mr-1 h-4 w-4" /> Point
											</Button>
										</div>
									{/if}
								</div>
							{/each}
							<Button
								variant="ghost"
								size="sm"
								class="mt-1"
								disabled={busy}
								onclick={() => openCreate('item', theme.id)}
							>
								<Plus class="mr-1 h-4 w-4" /> Item
							</Button>
						</div>
					{/if}
				</div>
			{/each}
		</div>
	{/if}
</div>

<!-- Create / edit dialog -->
<Dialog.Root bind:open={dialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
		</Dialog.Header>
		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				submitDialog();
			}}
		>
			<div class="space-y-2">
				<Label for="curriculum-name">Nom</Label>
				<Input id="curriculum-name" bind:value={dialogName} placeholder="Intitulé…" autofocus />
			</div>
			{#if dialogLevel === 'point'}
				<div class="space-y-2">
					<Label>Type</Label>
					<MySelect type="single" bind:value={dialogKind} items={kindItems} triggerClass="w-full" />
				</div>
			{/if}
			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (dialogOpen = false)}
					>{lore.actions.cancel}</Button
				>
				<Button type="submit" disabled={busy}>
					{dialogMode === 'create' ? 'Ajouter' : 'Enregistrer'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
