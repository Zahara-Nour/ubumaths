<!--
	ReportMessageDialog Component
	==============================

	Dialog for reporting inappropriate messages.
	Allows users to select a reason and provide optional details.

	Props:
		- open: boolean
		- messageId: string | null
		- onOpenChange: (open: boolean) => void
		- onSubmit: (messageId: string, reason: string, details: string) => Promise<void>

	Features:
		- Reason selection (spam, harassment, inappropriate, other)
		- Optional details textarea
		- Form validation
		- Loading state during submission
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as RadioGroup from '$lib/components/ui/radio-group';
	import { Flag, AlertTriangle } from 'lucide-svelte';

	// Component Props
	interface Props {
		open: boolean;
		messageId: string | null;
		onOpenChange: (open: boolean) => void;
		onSubmit: (messageId: string, reason: string, details: string) => Promise<void>;
	}

	let { open = $bindable(), messageId, onOpenChange, onSubmit }: Props = $props();

	// Component State
	let selectedReason = $state<string>('inappropriate');
	let details = $state('');
	let isSubmitting = $state(false);

	/**
	 * Report reasons with descriptions
	 */
	const reportReasons = [
		{
			value: 'spam',
			label: 'Spam ou contenu commercial',
			description: 'Messages publicitaires, liens suspects, ou contenu répétitif'
		},
		{
			value: 'harassment',
			label: 'Harcèlement ou intimidation',
			description: 'Comportement abusif, menaces, ou harcèlement envers une personne'
		},
		{
			value: 'inappropriate',
			label: 'Contenu inapproprié',
			description: 'Langage offensant, contenu violent, ou inapproprié pour un contexte scolaire'
		},
		{
			value: 'other',
			label: 'Autre',
			description: 'Autre raison nécessitant une modération'
		}
	];

	/**
	 * Handle form submission
	 */
	async function handleSubmit(): Promise<void> {
		if (!messageId) return;

		isSubmitting = true;

		try {
			await onSubmit(messageId, selectedReason, details.trim());
			// Reset form
			selectedReason = 'inappropriate';
			details = '';
			// Dialog will be closed by parent component
		} catch (error) {
			console.error('Error submitting report:', error);
		} finally {
			isSubmitting = false;
		}
	}

	/**
	 * Reset form when dialog closes
	 */
	$effect(() => {
		if (!open) {
			selectedReason = 'inappropriate';
			details = '';
		}
	});
</script>

<Dialog.Root {open} onOpenChange={onOpenChange}>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<div class="flex items-center gap-2">
				<div class="rounded-full bg-destructive/10 p-2">
					<Flag class="h-5 w-5 text-destructive" />
				</div>
				<div>
					<Dialog.Title>Signaler ce message</Dialog.Title>
					<Dialog.Description>
						Aidez-nous à maintenir un environnement sûr et respectueux.
					</Dialog.Description>
				</div>
			</div>
		</Dialog.Header>

		<form onsubmit={(e) => { e.preventDefault(); handleSubmit(); }} class="space-y-6">
			<!-- Warning Notice -->
			<div class="flex gap-3 rounded-lg bg-muted p-3">
				<AlertTriangle class="h-5 w-5 flex-shrink-0 text-muted-foreground" />
				<div class="text-sm text-muted-foreground">
					<p class="mb-1 font-semibold">Avant de signaler :</p>
					<ul class="list-inside list-disc space-y-1">
						<li>Assurez-vous que le message viole les règles de la communauté</li>
						<li>Les fausses accusations peuvent avoir des conséquences</li>
						<li>Un enseignant examinera votre signalement</li>
					</ul>
				</div>
			</div>

			<!-- Reason Selection -->
			<div class="space-y-3">
				<Label>Raison du signalement *</Label>
				<RadioGroup.Root bind:value={selectedReason}>
					{#each reportReasons as reason}
						<div class="flex items-start space-x-3 rounded-lg border p-3 transition-colors hover:bg-accent">
							<RadioGroup.Item value={reason.value} id={reason.value} class="mt-1" />
							<Label for={reason.value} class="flex-1 cursor-pointer">
								<p class="font-semibold">{reason.label}</p>
								<p class="text-sm text-muted-foreground">{reason.description}</p>
							</Label>
						</div>
					{/each}
				</RadioGroup.Root>
			</div>

			<!-- Optional Details -->
			<div class="space-y-2">
				<Label for="details">Détails supplémentaires (optionnel)</Label>
				<Textarea
					id="details"
					bind:value={details}
					placeholder="Ajoutez des informations qui pourraient aider à l'examen de ce signalement..."
					rows={4}
					maxlength={500}
					class="resize-none"
				/>
				{#if details.length > 0}
					<p class="text-right text-xs text-muted-foreground">
						{details.length} / 500 caractères
					</p>
				{/if}
			</div>

			<!-- Form Actions -->
			<Dialog.Footer>
				<Button
					type="button"
					variant="outline"
					onclick={() => onOpenChange(false)}
					disabled={isSubmitting}
				>
					Annuler
				</Button>
				<Button type="submit" variant="destructive" disabled={isSubmitting}>
					{#if isSubmitting}
						Envoi en cours...
					{:else}
						Envoyer le signalement
					{/if}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
