<!--
	Versions d'un exercice dans sa page d'édition (ADR 0044)
	=========================================================
	Menu des versions (numéro, note, fiches qui l'utilisent), « Nouvelle version » (recopie de la
	plus récente, note facultative), note de la version affichée, suppression (refusée par le
	serveur si une fiche l'utilise ou si c'est la seule). Bandeau quand la version affichée sert à
	des fiches, ou n'est pas la plus récente.

	Changer de version = changer `?version=` dans l'adresse : la page recharge son contenu.
-->
<script lang="ts">
	import { goto, refreshAll } from '$app/navigation';
	import { page } from '$app/state';
	import { lore } from '#lib/config/lore.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { Textarea } from '#lib/components/ui/textarea/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { VERSION_PARAM, latestOf } from '#lib/exercises/edited-version.ts';
	import { History, Plus, Pencil, Trash2, Loader2, Info } from '@lucide/svelte';

	// ============================================================================
	// TYPES
	// ============================================================================

	interface VersionWorksheet {
		id: string;
		title: string;
		active_assignments: number;
	}

	interface Version {
		id: string;
		number: number;
		note: string | null;
		created_at: string;
		worksheets: VersionWorksheet[];
	}

	interface Props {
		exerciseId: string;
		versions: Version[];
		editedVersionId: string;
	}

	// ============================================================================
	// CONSTANTES
	// ============================================================================

	const NOTE_MAX = 500;

	// ============================================================================
	// VARIABLES
	// ============================================================================

	let { exerciseId, versions, editedVersionId }: Props = $props();

	let edited = $derived(versions.find((v) => v.id === editedVersionId) ?? null);
	let latest = $derived(latestOf(versions));
	let isLatest = $derived(edited !== null && edited.id === latest?.id);
	let distributedCount = $derived(
		edited ? edited.worksheets.filter((w) => w.active_assignments > 0).length : 0
	);

	let items = $derived(
		[...versions]
			.sort((a, b) => b.number - a.number)
			.map((v) => ({
				value: String(v.number),
				label: versionLabel(v, v.id === latest?.id)
			}))
	);

	let newDialogOpen = $state(false);
	let noteDialogOpen = $state(false);
	let deleteDialogOpen = $state(false);
	let noteDraft = $state('');
	let busy = $state(false);

	// ============================================================================
	// FONCTIONS
	// ============================================================================

	function versionLabel(v: Version, latestOne: boolean): string {
		const parts = [`Version ${v.number}`];
		if (latestOne) parts[0] += ' (la plus récente)';
		if (v.note) parts.push(v.note);
		if (v.worksheets.length > 0) {
			parts.push(v.worksheets.length === 1 ? '1 fiche' : `${v.worksheets.length} fiches`);
		}
		return parts.join(' · ');
	}

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/** Ouvre une version : l'adresse change, la page recharge son contenu */
	async function openVersion(number: string) {
		const url = new URL(page.url.href);
		url.searchParams.set(VERSION_PARAM, number);
		await goto(url, { refreshAll: true });
	}

	async function errorMessage(response: Response, fallback: string): Promise<string> {
		const body = (await response.json().catch(() => null)) as { message?: string } | null;
		return body?.message ?? fallback;
	}

	function openNewDialog() {
		noteDraft = '';
		newDialogOpen = true;
	}

	function openNoteDialog() {
		noteDraft = edited?.note ?? '';
		noteDialogOpen = true;
	}

	async function createVersion() {
		busy = true;
		try {
			const response = await fetch(`/api/exercises/${exerciseId}/versions`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note: noteDraft })
			});
			if (!response.ok) {
				toaster.error(await errorMessage(response, 'Impossible de créer la nouvelle version'));
				return;
			}
			const { version } = (await response.json()) as { version: { number: number } };
			newDialogOpen = false;
			toaster.success(`Version ${version.number} créée`);
			await openVersion(String(version.number));
		} catch {
			toaster.error('Erreur réseau');
		} finally {
			busy = false;
		}
	}

	async function saveNote() {
		if (!edited) return;
		busy = true;
		try {
			const response = await fetch(`/api/exercises/${exerciseId}/versions/${edited.id}`, {
				method: 'PATCH',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ note: noteDraft })
			});
			if (!response.ok) {
				toaster.error(await errorMessage(response, 'Impossible de modifier la note'));
				return;
			}
			noteDialogOpen = false;
			toaster.success('Note enregistrée');
			await refreshAll();
		} catch {
			toaster.error('Erreur réseau');
		} finally {
			busy = false;
		}
	}

	async function deleteVersion() {
		if (!edited) return;
		busy = true;
		try {
			const response = await fetch(`/api/exercises/${exerciseId}/versions/${edited.id}`, {
				method: 'DELETE'
			});
			if (!response.ok) {
				toaster.error(await errorMessage(response, 'Impossible de supprimer la version'));
				return;
			}
			deleteDialogOpen = false;
			toaster.success(`Version ${edited.number} supprimée`);
			// Sans `?version` : la plus récente restante, ou, venue d'une fiche, la version de la fiche
			const url = new URL(page.url.href);
			url.searchParams.delete(VERSION_PARAM);
			await goto(url, { refreshAll: true });
		} catch {
			toaster.error('Erreur réseau');
		} finally {
			busy = false;
		}
	}
</script>

<section
	class="mb-6 space-y-3 rounded-lg border border-border bg-card p-4"
	aria-label="Versions de la {lore.learning.exercise}"
>
	<div class="flex flex-wrap items-center gap-2">
		<!-- Petit écran : le menu prend sa ligne, les boutons passent dessous -->
		<div class="flex min-w-0 basis-full items-center gap-2 sm:max-w-md sm:flex-1 sm:basis-0">
			<History class="h-5 w-5 shrink-0 text-primary" aria-hidden="true" />
			<MySelect
				type="single"
				value={edited ? String(edited.number) : undefined}
				{items}
				onValueChange={openVersion}
				triggerAriaLabel="Version affichée"
				class="w-full"
			/>
		</div>
		<Button variant="outline" size="sm" onclick={openNewDialog}>
			<Plus class="mr-1 h-4 w-4" />
			Nouvelle version
		</Button>
		<Button variant="ghost" size="sm" onclick={openNoteDialog} disabled={!edited}>
			<Pencil class="mr-1 h-4 w-4" />
			Note
		</Button>
		<Button
			variant="ghost"
			size="sm"
			onclick={() => (deleteDialogOpen = true)}
			disabled={!edited || versions.length < 2 || edited.worksheets.length > 0}
			title={versions.length < 2
				? 'C’est la seule version'
				: edited && edited.worksheets.length > 0
					? 'Une fiche utilise cette version'
					: 'Supprimer cette version'}
		>
			<Trash2 class="mr-1 h-4 w-4" />
			Supprimer
		</Button>
	</div>

	{#if edited}
		<p class="text-sm text-muted-foreground">
			Version {edited.number}, créée le {formatDate(edited.created_at)}{#if edited.note}
				· <span class="text-foreground">{edited.note}</span>{/if}
		</p>

		{#if edited.worksheets.length > 0}
			<p class="flex gap-2 rounded-md bg-muted p-3 text-sm" role="note">
				<Info class="mt-0.5 h-4 w-4 shrink-0 text-primary" aria-hidden="true" />
				<span>
					Utilisée par :
					{#each edited.worksheets as w, i (w.id)}{i > 0 ? ', ' : ''}<a
							class="font-medium underline underline-offset-2"
							href="/dashboard/teacher/contenu/worksheets/{w.id}">{w.title}</a
						>{#if w.active_assignments > 0}&nbsp;(distribuée){/if}{/each}.
					{distributedCount > 0
						? 'Tes modifications s’y verront, y compris chez les élèves.'
						: 'Tes modifications s’y verront.'}
				</span>
			</p>
		{/if}

		{#if !isLatest && latest}
			<p class="text-sm text-muted-foreground">
				Ce n’est pas la version la plus récente (version {latest.number}) : hors fiche et dans les
				nouvelles fiches, c’est la version {latest.number} qui s’affiche.
			</p>
		{/if}
	{/if}
</section>

<Dialog.Root bind:open={newDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Nouvelle version</Dialog.Title>
			<Dialog.Description>
				Recopie de la version la plus récente{latest ? ` (version ${latest.number})` : ''}. Tu
				modifies la copie ; aucune fiche ne change.
			</Dialog.Description>
		</Dialog.Header>
		<label class="space-y-1 text-sm">
			<span class="font-medium">Note (facultative)</span>
			<Textarea
				bind:value={noteDraft}
				maxlength={NOTE_MAX}
				rows={3}
				placeholder="Question b) reformulée après le test en classe"
			/>
		</label>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (newDialogOpen = false)} disabled={busy}>
				Annuler
			</Button>
			<Button onclick={createVersion} disabled={busy}>
				{#if busy}<Loader2 class="mr-1 h-4 w-4 animate-spin" />{/if}
				Créer la version
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={noteDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Note de la version {edited?.number ?? ''}</Dialog.Title>
			<Dialog.Description>Vide : la version n’a pas de note.</Dialog.Description>
		</Dialog.Header>
		<Textarea bind:value={noteDraft} maxlength={NOTE_MAX} rows={3} aria-label="Note" />
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (noteDialogOpen = false)} disabled={busy}>
				Annuler
			</Button>
			<Button onclick={saveNote} disabled={busy}>
				{#if busy}<Loader2 class="mr-1 h-4 w-4 animate-spin" />{/if}
				Enregistrer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>

<Dialog.Root bind:open={deleteDialogOpen}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Supprimer la version {edited?.number ?? ''} ?</Dialog.Title>
			<Dialog.Description>
				Son contenu sera perdu. Aucune fiche ne l’utilise.{#if isLatest && latest}
					La version précédente deviendra la plus récente.{/if}
			</Dialog.Description>
		</Dialog.Header>
		<Dialog.Footer>
			<Button variant="outline" onclick={() => (deleteDialogOpen = false)} disabled={busy}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={deleteVersion} disabled={busy}>
				{#if busy}<Loader2 class="mr-1 h-4 w-4 animate-spin" />{/if}
				Supprimer
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
