<!--
	SaveSeriesDialog — enregistrer le panier comme série (C18, prof et admin).

	Titre (1 à 200 caractères), niveau, description facultative. Les catégories
	viennent du panier ; le serveur les valide (POST /api/series).
-->
<script lang="ts">
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { getGradeSelectItems } from '$lib/utils/grades';
	import type { CartItem } from '$lib/stores/questionCart.svelte';

	interface Props {
		open: boolean;
		categories: CartItem[];
		onSaved?: (seriesId: string) => void;
	}

	let { open = $bindable(), categories, onSaved }: Props = $props();

	const gradeItems = getGradeSelectItems();

	let title = $state('');
	let grade = $state('6');
	let description = $state('');
	let isSaving = $state(false);
	let errorMessage = $state<string | null>(null);

	let trimmedTitle = $derived(title.trim());
	let canSave = $derived(
		trimmedTitle.length > 0 && trimmedTitle.length <= 200 && !!grade && !isSaving
	);

	async function handleSave() {
		if (!canSave) return;
		isSaving = true;
		errorMessage = null;
		try {
			const response = await fetch('/api/series', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					title: trimmedTitle,
					grade,
					description: description.trim() || null,
					categories
				})
			});
			const body: unknown = await response.json().catch(() => null);
			if (!response.ok) {
				errorMessage =
					body && typeof body === 'object' && 'error' in body && typeof body.error === 'string'
						? body.error
						: "La série n'a pas pu être enregistrée";
				return;
			}
			const seriesId =
				body &&
				typeof body === 'object' &&
				'series' in body &&
				body.series &&
				typeof body.series === 'object' &&
				'id' in body.series &&
				typeof body.series.id === 'string'
					? body.series.id
					: null;
			toaster.success('Série enregistrée');
			open = false;
			title = '';
			description = '';
			if (seriesId) onSaved?.(seriesId);
		} catch {
			errorMessage = "La série n'a pas pu être enregistrée";
		} finally {
			isSaving = false;
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-lg">
		<Dialog.Header>
			<Dialog.Title>Enregistrer comme série</Dialog.Title>
			<Dialog.Description>
				La série garde les {categories.length} catégorie{categories.length > 1 ? 's' : ''} du panier.
				Tu pourras ensuite en faire une évaluation.
			</Dialog.Description>
		</Dialog.Header>

		<form
			class="space-y-4"
			onsubmit={(e) => {
				e.preventDefault();
				handleSave();
			}}
		>
			<div class="space-y-2">
				<Label for="series-title">Titre</Label>
				<Input id="series-title" bind:value={title} maxlength={200} required />
			</div>
			<div class="space-y-2">
				<Label for="series-grade">Niveau</Label>
				<MySelect
					type="single"
					bind:value={grade}
					items={gradeItems}
					placeholder="Choisir un niveau"
					triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
				/>
			</div>
			<div class="space-y-2">
				<Label for="series-description">Description (facultative)</Label>
				<Textarea id="series-description" bind:value={description} rows={3} maxlength={2000} />
			</div>

			{#if errorMessage}
				<p class="text-sm text-destructive" role="alert">{errorMessage}</p>
			{/if}

			<Dialog.Footer>
				<Button type="button" variant="outline" onclick={() => (open = false)}>Annuler</Button>
				<Button type="submit" disabled={!canSave}>
					{isSaving ? 'Enregistrement…' : 'Enregistrer'}
				</Button>
			</Dialog.Footer>
		</form>
	</Dialog.Content>
</Dialog.Root>
