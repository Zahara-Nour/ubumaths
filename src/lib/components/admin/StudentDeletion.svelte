<!--
	Suppression définitive d'un élève par l'admin (RGPD art. 17)
	=============================================================

	Encadré rouge en bas de la fiche élève → fenêtre qui dit ce qui disparaît → l'admin
	retape le nom de l'élève (bouton grisé sinon) → DELETE /api/admin/users/[id]/delete.
	Pendant la requête, la fenêtre ne se ferme pas.
-->
<script lang="ts">
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import * as Dialog from '#lib/components/ui/dialog/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import {
		deletionConfirmationName,
		matchesDeletionConfirmation,
		type DeletionNameSource
	} from '#lib/utils/student-deletion.ts';
	import { Loader2, Trash2 } from '@lucide/svelte';

	let {
		student,
		ondeleted
	}: {
		student: DeletionNameSource & { id: string };
		ondeleted: (studentId: string) => void;
	} = $props();

	let open = $state(false);
	let isDeleting = $state(false);
	let typedName = $state('');

	const expectedName = $derived(deletionConfirmationName(student));
	const canConfirm = $derived(matchesDeletionConfirmation(typedName, student) && !isDeleting);

	function onOpenChange(next: boolean) {
		if (!next && isDeleting) return;
		open = next;
		if (!next) typedName = '';
	}

	async function deleteStudent() {
		if (!canConfirm) return;
		isDeleting = true;
		try {
			const response = await fetch(`/api/admin/users/${student.id}/delete`, {
				method: 'DELETE',
				headers: { 'content-type': 'application/json' },
				body: JSON.stringify({ confirmationName: typedName })
			});
			if (!response.ok) {
				const body: unknown = await response.json().catch(() => null);
				const message =
					body && typeof body === 'object' && 'message' in body && typeof body.message === 'string'
						? body.message
						: 'L’élève n’a pas pu être supprimé.';
				toaster.error(message);
				return;
			}
			toaster.success(`${expectedName} a été supprimé définitivement.`);
			isDeleting = false;
			onOpenChange(false);
			ondeleted(student.id);
		} catch {
			toaster.error('L’élève n’a pas pu être supprimé.');
		} finally {
			isDeleting = false;
		}
	}
</script>

<div class="mt-8 space-y-3 rounded-lg border border-destructive/50 p-4">
	<div>
		<p class="text-sm font-medium text-destructive">Supprimer définitivement</p>
		<p class="text-sm text-muted-foreground">
			Efface le compte de l’élève et toutes ses données. Impossible à annuler.
		</p>
	</div>
	<Button variant="destructive" size="sm" onclick={() => onOpenChange(true)}>
		<Trash2 class="mr-2 h-4 w-4" aria-hidden="true" />
		Supprimer l’élève
	</Button>
</div>

<Dialog.Root bind:open={() => open, onOpenChange}>
	<Dialog.Content class="max-w-md" showCloseButton={!isDeleting}>
		<Dialog.Header>
			<Dialog.Title>Supprimer {expectedName} ?</Dialog.Title>
			<Dialog.Description>
				Son compte, sa progression, ses messages et ses fichiers seront effacés définitivement. Il
				n’y a pas de retour possible.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-2">
			<Label for="student-deletion-name">
				Pour confirmer, tapez <strong>{expectedName}</strong>
			</Label>
			<Input
				id="student-deletion-name"
				bind:value={typedName}
				autocomplete="off"
				disabled={isDeleting}
			/>
		</div>

		<Dialog.Footer>
			<Button variant="outline" onclick={() => onOpenChange(false)} disabled={isDeleting}>
				Annuler
			</Button>
			<Button variant="destructive" onclick={deleteStudent} disabled={!canConfirm}>
				{#if isDeleting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
				{/if}
				Supprimer définitivement
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
