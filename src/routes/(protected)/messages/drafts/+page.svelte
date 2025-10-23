<script lang="ts">
	import { privateMessages } from '$lib/stores/privateMessages.svelte';
	import { Button } from '$lib/components/ui/button';
	import { Loader2, FileEdit, Trash2, PencilLine } from 'lucide-svelte';
	import { onMount } from 'svelte';
	import { goto } from '$app/navigation';

	// Load drafts on mount
	onMount(() => {
		privateMessages.loadDrafts();
	});

	// Format date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		const now = new Date();
		const diff = now.getTime() - date.getTime();
		const days = Math.floor(diff / (1000 * 60 * 60 * 24));

		if (days === 0) {
			return date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' });
		} else if (days === 1) {
			return 'Hier';
		} else if (days < 7) {
			return `Il y a ${days} jours`;
		} else {
			return date.toLocaleDateString('fr-FR', { day: 'numeric', month: 'short' });
		}
	}

	// Delete draft
	async function deleteDraft(draftId: string, event: MouseEvent) {
		event.stopPropagation();
		if (confirm('Êtes-vous sûr de vouloir supprimer ce brouillon ?')) {
			await privateMessages.deleteDraft(draftId);
		}
	}

	// Edit draft (navigate to compose with draft data)
	function editDraft(draftId: string) {
		goto(`/messages/compose?draftId=${draftId}`);
	}
</script>

<div class="flex h-full flex-col">
	<!-- Header -->
	<div class="border-b border-border bg-card p-4">
		<div class="flex items-center justify-between">
			<div>
				<h1 class="text-2xl font-bold text-foreground">Brouillons</h1>
				<p class="text-sm text-muted-foreground">
					{privateMessages.drafts.length} brouillon{privateMessages.drafts.length !== 1 ? 's' : ''}
				</p>
			</div>
			<Button onclick={() => goto('/messages/compose')}>
				<PencilLine class="mr-2 h-4 w-4" />
				Nouveau message
			</Button>
		</div>
	</div>

	<!-- Drafts list -->
	<div class="flex-1 overflow-y-auto">
		{#if privateMessages.isLoading}
			<div class="flex h-full items-center justify-center">
				<Loader2 class="h-8 w-8 animate-spin text-muted-foreground" />
			</div>
		{:else if privateMessages.drafts.length === 0}
			<div class="flex h-full flex-col items-center justify-center text-center">
				<FileEdit class="mb-4 h-16 w-16 text-muted-foreground" />
				<h3 class="text-lg font-semibold text-foreground">Aucun brouillon</h3>
				<p class="mt-2 text-sm text-muted-foreground">
					Vos brouillons de messages apparaîtront ici
				</p>
				<Button onclick={() => goto('/messages/compose')} class="mt-4">
					<PencilLine class="mr-2 h-4 w-4" />
					Créer un message
				</Button>
			</div>
		{:else}
			<div class="divide-y divide-border">
				{#each privateMessages.drafts as draft}
					<button
						onclick={() => editDraft(draft.id)}
						class="group flex w-full items-start gap-4 p-4 text-left transition-colors hover:bg-muted/50"
					>
						<!-- Icon -->
						<div class="flex-shrink-0">
							<div
								class="flex h-10 w-10 items-center justify-center rounded-full bg-muted text-muted-foreground"
							>
								<FileEdit class="h-5 w-5" />
							</div>
						</div>

						<!-- Content -->
						<div class="min-w-0 flex-1">
							<div class="flex items-start justify-between gap-2">
								<div class="min-w-0 flex-1">
									<h3 class="truncate text-sm font-semibold text-foreground">
										{draft.subject || 'Sans sujet'}
									</h3>
									<p class="mt-1 text-xs text-muted-foreground">
										Dernière modification : {formatDate(draft.updated_at)}
									</p>
									<div class="mt-2 flex items-center gap-2 text-xs text-muted-foreground">
										{#if draft.is_group_message && draft.class_id}
											<span class="rounded bg-primary/10 px-1.5 py-0.5 text-xs text-primary">
												Message de groupe
											</span>
										{:else if draft.recipient_ids && draft.recipient_ids.length > 0}
											<span
												>{draft.recipient_ids.length} destinataire{draft.recipient_ids.length > 1
													? 's'
													: ''}</span
											>
										{/if}
									</div>
								</div>

								<!-- Actions -->
								<div
									class="flex items-center gap-1 opacity-0 transition-opacity group-hover:opacity-100"
								>
									<Button
										variant="ghost"
										size="sm"
										onclick={(e) => deleteDraft(draft.id, e)}
										class="h-8 w-8 p-0"
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</div>
						</div>
					</button>
				{/each}
			</div>
		{/if}
	</div>
</div>

<style>
	button:focus-visible {
		outline: 2px solid hsl(var(--primary));
		outline-offset: 2px;
	}
</style>
