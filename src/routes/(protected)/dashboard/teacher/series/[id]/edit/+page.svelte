<script lang="ts">
	import { goto } from '$app/navigation';
	import * as Card from '$lib/components/ui/card';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import { ArrowLeft, Minus, Plus, Trash2 } from '@lucide/svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { submitAction } from '$lib/utils/form-action';
	import { getGradeSelectItems } from '$lib/utils/grades';
	import type { CartItem } from '$lib/stores/questionCart.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const gradeItems = getGradeSelectItems();

	// Copie de travail : la page n'écrit qu'à l'enregistrement
	// svelte-ignore state_referenced_locally
	const initial = data.series;
	let title = $state(initial.title);
	let grade = $state(initial.grade);
	let description = $state(initial.description ?? '');
	let categories = $state<CartItem[]>(initial.categories.map((item) => ({ ...item })));
	let isSaving = $state(false);

	let canSave = $derived(title.trim().length > 0 && categories.length > 0 && !isSaving);

	function categoryLabel(item: CartItem): string {
		const { theme, domain, subdomain, level } = item.category;
		return [theme, domain, subdomain].filter(Boolean).join(' / ') + ` — niveau ${level}`;
	}

	function handleQuantity(index: number, delta: number) {
		const next = categories[index].quantity + delta;
		if (next < 1 || next > 50) return;
		categories[index].quantity = next;
	}

	function handleRemove(index: number) {
		categories.splice(index, 1);
	}

	function handleBack() {
		goto('/dashboard/teacher/series').then(() => {});
	}

	async function handleSubmit() {
		if (!canSave) return;
		isSaving = true;
		try {
			const formData = new FormData();
			formData.set('title', title.trim());
			formData.set('grade', grade);
			formData.set('description', description.trim());
			formData.set('categories', JSON.stringify(categories));
			const outcome = await submitAction('', formData);
			if (!outcome.ok) {
				toaster.error(outcome.message);
				return;
			}
			toaster.success('Série enregistrée');
			handleBack();
		} finally {
			isSaving = false;
		}
	}
</script>

<svelte:head>
	<title>Modifier la série | Chiphre</title>
</svelte:head>

<div class="container mx-auto max-w-4xl px-4 py-8">
	<div class="mb-8 flex items-center gap-4">
		<Button variant="ghost" size="icon" onclick={handleBack} aria-label="Retour aux séries">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<h1 class="text-3xl font-bold tracking-tight">Modifier la série</h1>
	</div>

	<form
		class="space-y-6"
		onsubmit={(e) => {
			e.preventDefault();
			handleSubmit();
		}}
	>
		<Card.Root>
			<Card.Content class="space-y-4 pt-6">
				<div class="space-y-2">
					<Label for="title">Titre</Label>
					<Input id="title" bind:value={title} maxlength={200} required />
				</div>
				<div class="space-y-2">
					<Label for="grade">Niveau</Label>
					<MySelect
						type="single"
						bind:value={grade}
						items={gradeItems}
						triggerClass="h-10 w-full rounded-md border border-input bg-background px-3 text-sm inline-flex items-center justify-between"
					/>
				</div>
				<div class="space-y-2">
					<Label for="description">Description (facultative)</Label>
					<Textarea id="description" bind:value={description} rows={3} maxlength={2000} />
				</div>
			</Card.Content>
		</Card.Root>

		<Card.Root>
			<Card.Header>
				<Card.Title>Questions</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if categories.length === 0}
					<p class="text-sm text-destructive">Une série garde au moins une catégorie.</p>
				{:else}
					<ul class="divide-y">
						{#each categories as item, index (index)}
							<li class="flex flex-wrap items-center justify-between gap-2 py-2">
								<span class="text-sm">{categoryLabel(item)}</span>
								<div class="flex items-center gap-2">
									<Button
										type="button"
										size="icon"
										variant="outline"
										aria-label="Une question de moins"
										onclick={() => handleQuantity(index, -1)}
									>
										<Minus class="h-4 w-4" />
									</Button>
									<span class="w-8 text-center text-sm">{item.quantity}</span>
									<Button
										type="button"
										size="icon"
										variant="outline"
										aria-label="Une question de plus"
										onclick={() => handleQuantity(index, 1)}
									>
										<Plus class="h-4 w-4" />
									</Button>
									<Button
										type="button"
										size="icon"
										variant="ghost"
										aria-label="Retirer la catégorie"
										onclick={() => handleRemove(index)}
									>
										<Trash2 class="h-4 w-4" />
									</Button>
								</div>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>

		<div class="flex justify-end gap-3">
			<Button type="button" variant="outline" onclick={handleBack}>Annuler</Button>
			<Button type="submit" disabled={!canSave}>
				{isSaving ? 'Enregistrement…' : 'Enregistrer'}
			</Button>
		</div>
	</form>
</div>
