<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Loader2, CheckCircle2, XCircle, User, Hash } from 'lucide-svelte';
	import type { TeacherErrorReportView } from '$lib/types/worksheets';

	// Props
	let {
		report,
		worksheetId,
		assignmentId,
		open,
		onClose,
		onSuccess
	}: {
		report: TeacherErrorReportView;
		worksheetId: string;
		assignmentId: string;
		open: boolean;
		onClose: () => void;
		onSuccess: () => void;
	} = $props();

	// State
	let submitting = $state(false);
	let teacherResponse = $state('');

	// Derived values
	let studentName = $derived(
		report.student_first_name || report.student_last_name
			? `${report.student_first_name || ''} ${report.student_last_name || ''}`.trim()
			: 'Étudiant inconnu'
	);

	/**
	 * Submit review
	 */
	async function handleReview(status: 'fixed' | 'rejected') {
		if (submitting) return;

		submitting = true;

		try {
			const response = await fetch(
				`/api/worksheets/${worksheetId}/assignments/${assignmentId}/reports/${report.id}`,
				{
					method: 'PUT',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({
						status,
						response: teacherResponse.trim() || null
					})
				}
			);

			if (!response.ok) {
				const errorData = await response.json().catch(() => ({ message: 'Erreur serveur' }));
				throw new Error(errorData.message || 'Erreur lors du traitement du signalement');
			}

			toaster.success(
				status === 'fixed' ? 'Signalement marqué comme corrigé' : 'Signalement marqué comme rejeté'
			);

			// Reset form
			teacherResponse = '';

			// Call success callback
			onSuccess();
		} catch (err) {
			console.error('Error reviewing report:', err);
			toaster.error(err instanceof Error ? err.message : 'Erreur lors du traitement');
		} finally {
			submitting = false;
		}
	}

	/**
	 * Reset form when dialog opens/closes
	 */
	$effect(() => {
		if (!open) {
			teacherResponse = '';
		}
	});
</script>

<Dialog.Root {open} onOpenChange={(isOpen) => !isOpen && onClose()}>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title>Traiter le signalement</Dialog.Title>
			<Dialog.Description>
				Marquez ce signalement comme corrigé ou rejeté, avec une réponse optionnelle pour l'élève.
			</Dialog.Description>
		</Dialog.Header>

		<div class="space-y-6 py-4">
			<!-- Report details -->
			<div class="space-y-4 rounded-md border p-4">
				<!-- Student and exercise info -->
				<div class="flex flex-wrap items-center gap-3">
					<div class="flex items-center gap-1.5 text-sm font-medium">
						<User class="h-4 w-4 text-muted-foreground" />
						<span>{studentName}</span>
					</div>
					<span class="text-muted-foreground">•</span>
					<div class="flex items-center gap-1.5 text-sm text-muted-foreground">
						<Hash class="h-4 w-4" />
						<span>Exercice {report.exercise_position}</span>
					</div>
				</div>

				<!-- Report description -->
				<div class="space-y-2">
					<Label class="text-sm font-medium">Description du problème:</Label>
					<div class="rounded-md bg-muted/50 p-3">
						<p class="text-sm break-words whitespace-pre-wrap">{report.description}</p>
					</div>
				</div>
			</div>

			<!-- Teacher response input -->
			<div class="space-y-2">
				<Label for="teacher-response">Réponse (optionnelle)</Label>
				<Textarea
					id="teacher-response"
					bind:value={teacherResponse}
					placeholder="Ajoutez une réponse pour expliquer votre décision à l'élève..."
					rows={4}
					class="resize-none"
					disabled={submitting}
				/>
				<p class="text-xs text-muted-foreground">
					Cette réponse sera envoyée à l'élève avec votre décision.
				</p>
			</div>
		</div>

		<Dialog.Footer class="flex flex-col gap-2 sm:flex-row">
			<Button variant="outline" onclick={onClose} disabled={submitting} class="flex-1 sm:flex-none">
				Annuler
			</Button>
			<div class="flex flex-1 gap-2">
				<Button
					variant="destructive"
					onclick={() => handleReview('rejected')}
					disabled={submitting}
					class="flex-1"
				>
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<XCircle class="mr-2 h-4 w-4" />
					{/if}
					Rejeter
				</Button>
				<Button onclick={() => handleReview('fixed')} disabled={submitting} class="flex-1">
					{#if submitting}
						<Loader2 class="mr-2 h-4 w-4 animate-spin" />
					{:else}
						<CheckCircle2 class="mr-2 h-4 w-4" />
					{/if}
					Corriger
				</Button>
			</div>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
