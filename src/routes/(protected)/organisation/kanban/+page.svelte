<!--
	Kanban Boards List
	==================

	Displays every board the current user can access. Owner-only actions
	(delete) are gated behind a per-card dropdown. The create dialog is
	conditionally enriched with a class selector when the user is a teacher.

	Cards are clickable and navigate to /organisation/kanban/[boardId]. That
	detail page ships in Phase 4 — Phase 3 only provides a "coming soon" stub
	so the link doesn't 404.
-->

<script lang="ts">
	import { invalidateAll } from '$app/navigation';
	import { resolve } from '$app/paths';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';
	import { Plus, MoreVertical, Trash2, LayoutDashboard, Users, User } from '@lucide/svelte';

	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import * as DropdownMenu from '$lib/components/ui/dropdown-menu';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { KanbanBoardWithCounts } from '$lib/types/database-helpers';

	import { ConfirmDialog } from '$lib/components/ui/confirm-dialog';
	import CreateBoardDialog from './CreateBoardDialog.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	let createOpen = $state(false);
	let deletingId = $state<string | null>(null);

	// Pagination: append client-side as the user clicks "Voir plus". The first
	// page comes from the server load; subsequent pages are fetched via the
	// API with a cursor (the updated_at of the last board on the previous page).
	// Helper functions sidestep the `state_referenced_locally` warning that
	// would fire if we read `data.boards` directly at the top level.
	function seedBoards(): KanbanBoardWithCounts[] {
		return [...data.boards];
	}
	function seedCursor(): string | null {
		return data.nextCursor;
	}
	let boards = $state<KanbanBoardWithCounts[]>(seedBoards());
	let cursor = $state<string | null>(seedCursor());
	let loadingMore = $state(false);

	// Confirm-delete state. We stage the candidate board, then open the dialog;
	// the dialog's onConfirm closes itself and invokes the async deletion.
	let deleteConfirmOpen = $state(false);
	let pendingDelete = $state<KanbanBoardWithCounts | null>(null);

	async function loadMore() {
		if (!cursor || loadingMore) return;
		loadingMore = true;
		try {
			const res = await fetch(
				`/api/organisation/kanban/boards?cursor=${encodeURIComponent(cursor)}`
			);
			if (!res.ok) {
				toaster.error('Erreur lors du chargement de la page suivante');
				return;
			}
			const json = (await res.json()) as {
				boards: KanbanBoardWithCounts[];
				nextCursor: string | null;
			};
			boards = [...boards, ...json.boards];
			cursor = json.nextCursor;
		} catch (err) {
			console.error('[organisation/kanban] loadMore failed:', err);
			toaster.error('Erreur réseau');
		} finally {
			loadingMore = false;
		}
	}

	// Build a class_id -> class_name lookup for the badge text. Only teachers
	// have classes in `data.classes`; for students the badge will fall back to
	// "Classe" without a name (they don't need to identify their own classes
	// since RLS already filtered the visible boards).
	const classNameById = $derived.by(() => {
		const lookup: Record<string, string> = {};
		for (const c of data.classes) lookup[c.id] = c.name;
		return lookup;
	});

	function getClassLabel(board: KanbanBoardWithCounts): string {
		if (!board.class_id) return 'Personnel';
		const name = classNameById[board.class_id];
		return name ? `Classe : ${name}` : 'Classe';
	}

	function formatRelative(iso: string): string {
		try {
			return formatDistanceToNow(new Date(iso), { addSuffix: true, locale: fr });
		} catch {
			return iso;
		}
	}

	function requestDelete(board: KanbanBoardWithCounts) {
		pendingDelete = board;
		deleteConfirmOpen = true;
	}

	async function performDelete() {
		const board = pendingDelete;
		if (!board) return;
		pendingDelete = null;
		deletingId = board.id;
		try {
			const res = await fetch(`/api/organisation/kanban/boards/${board.id}`, {
				method: 'DELETE'
			});

			if (!res.ok) {
				let message = 'Erreur lors de la suppression';
				try {
					const json = await res.json();
					if (typeof json?.message === 'string') message = json.message;
					else if (typeof json?.error === 'string') message = json.error;
				} catch {
					/* ignore */
				}
				toaster.error(message);
				return;
			}

			toaster.success('Tableau supprimé');
			// Local filter is enough: we don't need to re-fetch the first page
			// just to remove one entry.
			boards = boards.filter((b) => b.id !== board.id);
		} catch (err) {
			console.error('[organisation/kanban] delete failed:', err);
			toaster.error('Erreur réseau lors de la suppression');
		} finally {
			deletingId = null;
		}
	}

	async function handleCreated() {
		// Refetch the first page so the new board (which sorts to the top via
		// updated_at DESC) appears. We also reset the cursor — the page may
		// contain fewer entries than before but that's fine.
		try {
			const res = await fetch('/api/organisation/kanban/boards');
			if (!res.ok) {
				await invalidateAll();
				return;
			}
			const json = (await res.json()) as {
				boards: KanbanBoardWithCounts[];
				nextCursor: string | null;
			};
			boards = json.boards;
			cursor = json.nextCursor;
		} catch {
			await invalidateAll();
		}
	}
</script>

<div class="flex flex-col gap-6">
	<div class="flex flex-col items-start justify-between gap-3 sm:flex-row sm:items-center">
		<div>
			<h1 class="text-2xl font-semibold tracking-tight sm:text-3xl">Mes tableaux Kanban</h1>
			<p class="text-sm text-muted-foreground">
				Organisez vos tâches en colonnes et cartes, en personnel ou par classe.
			</p>
		</div>
		<Button onclick={() => (createOpen = true)} class="gap-2">
			<Plus class="h-4 w-4" aria-hidden="true" />
			Nouveau tableau
		</Button>
	</div>

	{#if boards.length === 0}
		<div
			class="flex flex-col items-center gap-3 rounded-lg border border-dashed bg-muted/30 p-10 text-center"
		>
			<LayoutDashboard class="h-10 w-10 text-muted-foreground" aria-hidden="true" />
			<p class="text-base font-medium">Aucun tableau pour le moment.</p>
			<p class="max-w-md text-sm text-muted-foreground">
				Créez votre premier tableau pour commencer à organiser vos tâches.
			</p>
			<Button onclick={() => (createOpen = true)} class="mt-2 gap-2">
				<Plus class="h-4 w-4" aria-hidden="true" />
				Créer un tableau
			</Button>
		</div>
	{:else}
		<ul class="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
			{#each boards as board (board.id)}
				{@const isOwner = board.owner_id === data.userId}
				{@const isClass = board.class_id !== null}
				<li>
					<Card.Root
						class="group relative h-full transition-shadow focus-within:ring-2 focus-within:ring-ring hover:shadow-md"
					>
						<Card.Header class="flex flex-row items-start justify-between gap-2 pb-2">
							<div class="flex min-w-0 flex-col gap-2">
								<Card.Title class="line-clamp-2 text-base break-words">
									<!--
										Stretched link pattern: the <a> uses `before:absolute
										before:inset-0` so the whole card is clickable, while the
										dropdown trigger sits above it via `relative z-10`. The
										detail route is a Phase 4 placeholder for now.
									-->
									<a
										href={resolve(`/organisation/kanban/${board.id}`)}
										class="before:absolute before:inset-0 before:rounded-xl focus:outline-none"
										aria-label={`Ouvrir le tableau ${board.title}`}
									>
										{board.title}
									</a>
								</Card.Title>
								<Badge variant={isClass ? 'default' : 'secondary'} class="w-fit gap-1">
									{#if isClass}
										<Users class="h-3 w-3" aria-hidden="true" />
									{:else}
										<User class="h-3 w-3" aria-hidden="true" />
									{/if}
									<span class="truncate">{getClassLabel(board)}</span>
								</Badge>
							</div>

							{#if isOwner}
								<DropdownMenu.Root>
									<DropdownMenu.Trigger
										class="relative z-10 inline-flex h-8 w-8 items-center justify-center rounded-md text-muted-foreground hover:bg-muted hover:text-foreground focus:outline-none focus-visible:ring-2 focus-visible:ring-ring"
										aria-label="Actions sur le tableau"
									>
										<MoreVertical class="h-4 w-4" aria-hidden="true" />
									</DropdownMenu.Trigger>
									<DropdownMenu.Content align="end">
										<DropdownMenu.Item
											class="text-destructive focus:text-destructive"
											disabled={deletingId === board.id}
											onclick={() => requestDelete(board)}
										>
											<Trash2 class="mr-2 h-4 w-4" aria-hidden="true" />
											{deletingId === board.id ? 'Suppression…' : 'Supprimer'}
										</DropdownMenu.Item>
									</DropdownMenu.Content>
								</DropdownMenu.Root>
							{/if}
						</Card.Header>

						<Card.Content class="flex flex-col gap-1 pt-0 text-sm text-muted-foreground">
							<p>
								{board.column_count} colonne{board.column_count > 1 ? 's' : ''}
								·
								{board.card_count} carte{board.card_count > 1 ? 's' : ''}
							</p>
							<p class="text-xs">
								Modifié {formatRelative(board.updated_at)}
							</p>
						</Card.Content>
					</Card.Root>
				</li>
			{/each}
		</ul>

		{#if cursor !== null}
			<div class="flex justify-center pt-2">
				<Button variant="outline" onclick={loadMore} disabled={loadingMore} class="gap-2">
					{loadingMore ? 'Chargement…' : 'Voir plus de tableaux'}
				</Button>
			</div>
		{/if}
	{/if}
</div>

<CreateBoardDialog
	bind:open={createOpen}
	role={data.role}
	classes={data.classes}
	onCreated={handleCreated}
/>

<ConfirmDialog
	bind:open={deleteConfirmOpen}
	title="Supprimer le tableau"
	description={pendingDelete
		? `« ${pendingDelete.title} » sera supprimé définitivement avec toutes ses colonnes et ses cartes.`
		: ''}
	confirmLabel="Supprimer"
	cancelLabel="Annuler"
	variant="destructive"
	onConfirm={performDelete}
	onCancel={() => (pendingDelete = null)}
/>
