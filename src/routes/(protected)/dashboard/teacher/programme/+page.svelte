<script lang="ts">
	import { lore } from '$lib/config/lore';
	/**
	 * Teacher — Programme (curriculum tree editor).
	 *
	 * Editable Thème → Item → Point tree for a grade. This page is the source of
	 * truth for the referential: the markdown under docs/wip/referentiel/ only
	 * bootstraps a level that doesn't exist yet, everything after happens here.
	 *
	 * Mutations go through the /api/teacher/curriculum endpoints; the page
	 * reloads via invalidateAll().
	 */
	import { goto, invalidateAll } from '$app/navigation';
	import { page } from '$app/state';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Badge } from '$lib/components/ui/badge';
	import * as Dialog from '$lib/components/ui/dialog';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		Plus,
		Pencil,
		Trash2,
		Archive,
		ArchiveRestore,
		ChevronRight,
		ChevronDown,
		ArrowUp,
		ArrowDown,
		ListTodo
	} from '@lucide/svelte';
	import type { PageData } from './$types';

	type Level = 'theme' | 'item' | 'point';
	type PointKind = 'connaissance' | 'savoir_faire' | 'demonstration';
	type Exigence = 'attendu' | 'approfondissement';
	type Regime = 'fluence' | 'diversite';
	type Point = PageData['tree'][number]['objectives'][number]['points'][number];

	let { data }: { data: PageData } = $props();

	// --- expansion (keyed by id; $state proxy → reactive) ---------------------
	let openThemes = $state<Record<string, boolean>>({});
	let openItems = $state<Record<string, boolean>>({});
	let showArchived = $state(false);

	// --- dialog state ---------------------------------------------------------
	let dialogOpen = $state(false);
	let dialogMode = $state<'create' | 'edit'>('create');
	let dialogLevel = $state<Level>('theme');
	let dialogName = $state('');
	let dialogKind = $state<PointKind>('savoir_faire');
	let dialogExigence = $state<Exigence>('attendu');
	let dialogRegime = $state<Regime>('diversite');
	/** '' = aucun rang ; sinon '1'..'4' (MySelect ne manipule que des chaînes). */
	let dialogRang = $state('');
	/** Édition d'un point : l'objectif où il vit — le changer le déplace. */
	let dialogObjectiveId = $state('');
	/** Édition d'un point : affiché en lecture seule, jamais modifiable. */
	let dialogCode = $state('');
	/** Edit: id of the node. Create: id of the parent ('' for a theme). */
	let dialogTargetId = $state('');
	let busy = $state(false);

	const kindItems = [
		{ value: 'connaissance', label: 'Connaissance' },
		{ value: 'savoir_faire', label: 'Savoir-faire' },
		{ value: 'demonstration', label: 'Démonstration' }
	];

	const exigenceItems = [
		{ value: 'attendu', label: 'Attendu' },
		{ value: 'approfondissement', label: 'Approfondissement' }
	];

	const regimeItems = [
		{ value: 'diversite', label: 'Diversité — des cas variés' },
		{ value: 'fluence', label: 'Fluence — vite, souvent, durablement' }
	];

	const rangItems = [
		{ value: '', label: '— aucun (simple liste)' },
		{ value: '1', label: 'Rang 1' },
		{ value: '2', label: 'Rang 2' },
		{ value: '3', label: 'Rang 3' },
		{ value: '4', label: 'Rang 4' }
	];

	/** Les points qu'une suppression amputerait : tags, couverture, acquisition. */
	const referenced = $derived(new Set(data.referencedPointIds));

	/** Destination possible d'un déplacement : tous les objectifs du niveau. */
	const objectiveItems = $derived(
		data.tree.flatMap((theme) =>
			theme.objectives.map((obj) => ({
				value: obj.id,
				label: `${theme.name} › ${obj.name}`
			}))
		)
	);

	const archivedCount = $derived(
		data.tree.reduce(
			(sum, t) =>
				sum + t.objectives.reduce((s, i) => s + i.points.filter((p) => p.archived_at).length, 0),
			0
		)
	);

	const dialogTitle = $derived.by(() => {
		const noun = dialogLevel === 'theme' ? 'thème' : dialogLevel === 'item' ? 'item' : 'point';
		if (dialogMode === 'create') return `Nouveau ${noun}`;
		return `Modifier le ${noun}`;
	});

	function basePath(level: Level): string {
		return level === 'theme' ? 'themes' : level === 'item' ? 'items' : 'points';
	}

	function kindLabel(kind: string): string {
		if (kind === 'connaissance') return 'connaissance';
		if (kind === 'demonstration') return 'démonstration';
		return 'savoir-faire';
	}

	function pointCount(theme: PageData['tree'][number]): number {
		return theme.objectives.reduce((sum, i) => sum + i.points.length, 0);
	}

	/** Masque les archivés tant que la case n'est pas cochée. */
	function visiblePoints(points: Point[]): Point[] {
		return showArchived ? points : points.filter((p) => !p.archived_at);
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
		dialogKind = 'savoir_faire';
		dialogExigence = 'attendu';
		dialogRegime = 'diversite';
		dialogRang = '';
		dialogObjectiveId = parentId;
		dialogCode = '';
		dialogOpen = true;
	}

	function openEditNode(level: 'theme' | 'item', node: { id: string; name: string }) {
		dialogMode = 'edit';
		dialogLevel = level;
		dialogTargetId = node.id;
		dialogName = node.name;
		dialogOpen = true;
	}

	function openEditPoint(point: Point) {
		dialogMode = 'edit';
		dialogLevel = 'point';
		dialogTargetId = point.id;
		dialogName = point.name;
		dialogKind = point.kind as PointKind;
		dialogExigence = point.exigence as Exigence;
		dialogRegime = point.regime_acquisition as Regime;
		dialogRang = point.rang === null ? '' : String(point.rang);
		dialogObjectiveId = point.objective_id;
		dialogCode = point.code;
		dialogOpen = true;
	}

	// --- submit (create / edit) ----------------------------------------------
	async function submitDialog() {
		const name = dialogName.trim();
		if (!name) {
			toaster.error('Le nom ne peut pas être vide');
			return;
		}

		// Tous les champs d'un point voyagent ensemble : l'API n'applique que ce
		// qu'elle reçoit, un champ omis garderait son ancienne valeur.
		const pointFields = {
			name,
			kind: dialogKind,
			exigence: dialogExigence,
			regime_acquisition: dialogRegime,
			rang: dialogRang === '' ? null : Number(dialogRang)
		};

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
				// `code` absent volontairement : la base attribue le suivant de la série.
				ok = await api('/api/teacher/curriculum/points', 'POST', {
					objective_id: dialogTargetId,
					...pointFields
				});
				if (ok) openItems[dialogTargetId] = true;
			}
		} else {
			const url = `/api/teacher/curriculum/${basePath(dialogLevel)}/${dialogTargetId}`;
			const payload =
				dialogLevel === 'point' ? { ...pointFields, objective_id: dialogObjectiveId } : { name };
			ok = await api(url, 'PATCH', payload);
		}

		if (ok) {
			dialogOpen = false;
			toaster.success(dialogMode === 'create' ? 'Ajouté' : 'Modifié');
			await invalidateAll();
		}
	}

	// --- archive / restore ----------------------------------------------------
	// Le geste normal pour retirer un point : il sort des vues, du tagging et du
	// calcul de couverture, mais son historique reste attaché.
	async function toggleArchive(point: Point) {
		const archiving = !point.archived_at;
		const ok = await api(`/api/teacher/curriculum/points/${point.id}`, 'PATCH', {
			archived: archiving
		});
		if (ok) {
			toaster.success(archiving ? 'Archivé' : 'Restauré');
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
					: '\n\nDéfinitif. Pour garder l’historique, archivez plutôt.';
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

	{#if archivedCount > 0}
		<MyCheckbox
			bind:checked={showArchived}
			label="Afficher les {archivedCount} point{archivedCount > 1
				? 's'
				: ''} archivé{archivedCount > 1 ? 's' : ''}"
		/>
	{/if}

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
								title="Monter"
								aria-label="Monter le thème"
								disabled={busy || ti === 0}
								onclick={() => reorder('theme', data.tree, ti, 'up')}
							>
								<ArrowUp class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								title="Descendre"
								aria-label="Descendre le thème"
								disabled={busy || ti === data.tree.length - 1}
								onclick={() => reorder('theme', data.tree, ti, 'down')}
							>
								<ArrowDown class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								title="Renommer"
								aria-label="Renommer le thème"
								disabled={busy}
								onclick={() => openEditNode('theme', theme)}
							>
								<Pencil class="h-4 w-4" />
							</Button>
							<Button
								variant="ghost"
								size="sm"
								title="Supprimer"
								aria-label="Supprimer le thème"
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
												title="Monter"
												aria-label="Monter l'item"
												disabled={busy || ii === 0}
												onclick={() => reorder('item', theme.objectives, ii, 'up')}
											>
												<ArrowUp class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												title="Descendre"
												aria-label="Descendre l'item"
												disabled={busy || ii === theme.objectives.length - 1}
												onclick={() => reorder('item', theme.objectives, ii, 'down')}
											>
												<ArrowDown class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												title="Renommer"
												aria-label="Renommer l'item"
												disabled={busy}
												onclick={() => openEditNode('item', item)}
											>
												<Pencil class="h-4 w-4" />
											</Button>
											<Button
												variant="ghost"
												size="sm"
												title="Supprimer"
												aria-label="Supprimer l'item"
												disabled={busy}
												onclick={() => deleteNode('item', item)}
											>
												<Trash2 class="h-4 w-4 text-destructive" />
											</Button>
										</div>
									</div>

									<!-- Points -->
									{#if openItems[item.id]}
										{@const points = visiblePoints(item.points)}
										<div class="space-y-1 border-t p-2 pl-6">
											{#each points as point, pi (point.id)}
												<div
													class="flex items-start gap-2 rounded px-1 py-1 hover:bg-muted/50"
													class:opacity-60={point.archived_at}
												>
													<code
														class="mt-1 shrink-0 font-mono text-[11px] text-muted-foreground tabular-nums"
													>
														{point.code}
													</code>
													<span class="flex-1 text-sm" class:line-through={point.archived_at}>
														{point.name}
														<Badge variant="outline" class="ml-2 align-middle text-[10px]">
															{kindLabel(point.kind)}
														</Badge>
														{#if point.exigence === 'approfondissement'}
															<Badge variant="outline" class="ml-1 align-middle text-[10px]">
																approfondissement
															</Badge>
														{/if}
														{#if point.regime_acquisition === 'fluence'}
															<Badge variant="secondary" class="ml-1 align-middle text-[10px]">
																fluence
															</Badge>
														{/if}
														{#if point.rang !== null}
															<Badge variant="secondary" class="ml-1 align-middle text-[10px]">
																rang {point.rang}
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
															title="Monter"
															aria-label="Monter le point"
															disabled={busy || pi === 0}
															onclick={() => reorder('point', points, pi, 'up')}
														>
															<ArrowUp class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															title="Descendre"
															aria-label="Descendre le point"
															disabled={busy || pi === points.length - 1}
															onclick={() => reorder('point', points, pi, 'down')}
														>
															<ArrowDown class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															title="Modifier"
															aria-label="Modifier le point"
															disabled={busy}
															onclick={() => openEditPoint(point)}
														>
															<Pencil class="h-4 w-4" />
														</Button>
														<Button
															variant="ghost"
															size="sm"
															title={point.archived_at ? 'Restaurer' : 'Archiver'}
															aria-label={point.archived_at
																? 'Restaurer le point'
																: 'Archiver le point'}
															disabled={busy}
															onclick={() => toggleArchive(point)}
														>
															{#if point.archived_at}
																<ArchiveRestore class="h-4 w-4" />
															{:else}
																<Archive class="h-4 w-4" />
															{/if}
														</Button>
														{#if !referenced.has(point.id)}
															<!-- Uniquement tant que rien n'y est accroché : passé là,
															     l'API refuse et l'archivage est la bonne action. -->
															<Button
																variant="ghost"
																size="sm"
																title="Supprimer"
																aria-label="Supprimer le point"
																disabled={busy}
																onclick={() => deleteNode('point', point)}
															>
																<Trash2 class="h-4 w-4 text-destructive" />
															</Button>
														{/if}
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
	<Dialog.Content class="max-h-[85vh] max-w-lg overflow-y-auto">
		<Dialog.Header>
			<Dialog.Title>{dialogTitle}</Dialog.Title>
			{#if dialogLevel === 'point' && dialogMode === 'edit'}
				<Dialog.Description>
					Code <code class="font-mono">{dialogCode}</code> — attribué par l'application, jamais modifiable
					: c'est lui qui identifie ce point dans les fiches et les tags.
				</Dialog.Description>
			{/if}
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

				<div class="space-y-2">
					<Label>Exigence</Label>
					<MySelect
						type="single"
						bind:value={dialogExigence}
						items={exigenceItems}
						triggerClass="w-full"
					/>
				</div>

				<div class="space-y-2">
					<Label>Ce qui prouve la maîtrise</Label>
					<MySelect
						type="single"
						bind:value={dialogRegime}
						items={regimeItems}
						triggerClass="w-full"
					/>
					<p class="text-xs text-muted-foreground">
						Diversité : réussi sur au moins 2 questions différentes, sans échec récent. Fluence : 5
						réussites et 3 sur les 5 dernières — pour ce qui doit rester rapide et fiable.
					</p>
				</div>

				<div class="space-y-2">
					<Label>Rang</Label>
					<MySelect type="single" bind:value={dialogRang} items={rangItems} triggerClass="w-full" />
					<p class="text-xs text-muted-foreground">
						Sans rang, l'objectif s'affiche en simple liste. Avec, ses points forment une échelle de
						difficulté croissante.
					</p>
				</div>

				{#if dialogMode === 'edit'}
					<div class="space-y-2">
						<Label>Objectif</Label>
						<MySelect
							type="single"
							bind:value={dialogObjectiveId}
							items={objectiveItems}
							triggerClass="w-full"
						/>
						<p class="text-xs text-muted-foreground">
							En changer déplace le point. Il garde son code et tout ce qui y est accroché.
						</p>
					</div>
				{/if}
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
