<!--
	Bonus Reason Modal
	==================

	Modal for selecting a reason when awarding a bonus to a student.

	USAGE:
	```typescript
	import { modalStack } from '$lib/stores/modalStack.svelte';
	import BonusReasonModal from '$lib/components/teacher/BonusReasonModal.svelte';

	modalStack.push({
		component: BonusReasonModal,
		props: {
			studentName: 'Alice',
			onConfirm: (reason: string) => {
				console.log('Selected reason:', reason);
				modalStack.pop();
			},
			onCancel: () => {
				modalStack.pop();
			}
		}
	});
	```
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { X, Star } from 'lucide-svelte';

	interface Props {
		studentName: string;
		onConfirm: (reason: string) => void;
		onCancel: () => void;
	}

	let { studentName, onConfirm, onCancel }: Props = $props();

	const reasons = [
		{ value: 'Bonne participation', label: 'Bonne participation' },
		{ value: "Correction d'une erreur", label: "Correction d'une erreur" },
		{ value: 'Bon travail', label: 'Bon travail' }
	];

	let selectedReason = $state(reasons[0].value);

	function handleConfirm() {
		onConfirm(selectedReason);
	}
</script>

<Card.Root class="w-full max-w-sm">
	<Card.Header>
		<div class="flex items-start justify-between">
			<div class="flex items-center gap-2">
				<Star class="h-5 w-5 text-amber-500" />
				<Card.Title>Ajouter un bonus</Card.Title>
			</div>
			<Button variant="ghost" size="icon" onclick={onCancel}>
				<X class="h-4 w-4" />
			</Button>
		</div>
		<Card.Description>
			Choisir la raison du bonus pour {studentName}
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<div class="flex flex-col gap-2">
			{#each reasons as reason (reason.value)}
				<label
					class="flex cursor-pointer items-center gap-3 rounded-lg border p-3 transition-colors hover:bg-muted/50"
					class:border-amber-500={selectedReason === reason.value}
					class:bg-amber-50={selectedReason === reason.value}
				>
					<input
						type="radio"
						name="bonus-reason"
						value={reason.value}
						bind:group={selectedReason}
						class="h-4 w-4 accent-amber-500"
					/>
					<span class="text-sm font-medium">{reason.label}</span>
				</label>
			{/each}
		</div>
	</Card.Content>

	<Card.Footer class="flex justify-end gap-2">
		<Button variant="outline" onclick={onCancel}>Annuler</Button>
		<Button onclick={handleConfirm} class="bg-amber-500 hover:bg-amber-600">
			<Star class="mr-1 h-4 w-4" />
			Confirmer
		</Button>
	</Card.Footer>
</Card.Root>
