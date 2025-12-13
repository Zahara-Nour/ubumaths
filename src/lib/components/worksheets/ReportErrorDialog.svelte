<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { StudentErrorReportView } from '$lib/types/worksheets';

	interface Props {
		open: boolean;
		assignmentId: string;
		exerciseId: string;
		exercisePosition: number;
		onOpenChange: (open: boolean) => void;
		onReportCreated: (report: StudentErrorReportView) => void;
	}

	let { open, assignmentId, exerciseId, exercisePosition, onOpenChange, onReportCreated }: Props =
		$props();

	// Form state
	let description = $state('');
	let isSubmitting = $state(false);

	// Validation
	const MIN_CHARS = 10;
	const MAX_CHARS = 1000;
	let charCount = $derived(description.length);
	let isValid = $derived(charCount >= MIN_CHARS && charCount <= MAX_CHARS);
	let charCountColor = $derived.by(() => {
		if (charCount < MIN_CHARS) return 'text-red-500';
		if (charCount > MAX_CHARS) return 'text-red-500';
		if (charCount > MAX_CHARS * 0.9) return 'text-amber-500';
		return 'text-muted-foreground';
	});

	async function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		try {
			const response = await fetch(
				`/api/student/worksheets/${assignmentId}/exercises/${exerciseId}/report`,
				{
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ description })
				}
			);

			if (!response.ok) {
				const contentType = response.headers.get('content-type');
				if (contentType?.includes('application/json')) {
					const error = await response.json();
					throw new Error(error.message || 'Erreur lors du signalement');
				}
				throw new Error('Erreur lors du signalement');
			}

			const data = await response.json();
			toaster.success('Signalement envoyé avec succès');

			// Reset form
			description = '';

			// Notify parent and close dialog
			onReportCreated(data.report);
			onOpenChange(false);
		} catch (error) {
			console.error('[ReportErrorDialog] Error submitting report:', error);
			const message = error instanceof Error ? error.message : 'Erreur lors du signalement';
			toaster.error(message);
		} finally {
			isSubmitting = false;
		}
	}

	// Reset form when dialog opens
	$effect(() => {
		if (!open) {
			description = '';
		}
	});
</script>

<Dialog.Root {open} {onOpenChange}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Signaler une erreur</Dialog.Title>
			<Dialog.Description>
				Exercice {exercisePosition + 1} - Décrivez l'erreur que vous avez trouvée (faute de frappe, énoncé
				incorrect, erreur dans la correction, etc.)
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-4"
		>
			<div class="space-y-2">
				<Label for="description">Description de l'erreur</Label>
				<Textarea
					id="description"
					bind:value={description}
					placeholder="Exemple : Il y a une faute de frappe dans la question 2, il est écrit 'calcler' au lieu de 'calculer'."
					rows={6}
					disabled={isSubmitting}
					class="resize-none"
				/>
				<div class="flex items-center justify-between text-xs">
					<span class={charCountColor}>
						{charCount} / {MAX_CHARS} caractères
					</span>
					{#if charCount < MIN_CHARS}
						<span class="text-red-500">Minimum {MIN_CHARS} caractères requis</span>
					{/if}
				</div>
			</div>

			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => onOpenChange(false)}
					disabled={isSubmitting}
				>
					Annuler
				</Button>
				<Button type="submit" disabled={!isValid || isSubmitting}>
					{isSubmitting ? 'Envoi...' : 'Envoyer le signalement'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
