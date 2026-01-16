<script lang="ts">
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import { Textarea } from '$lib/components/ui/textarea';
	import MySelect from '$lib/components/MySelect.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { ExerciseHint, ExerciseResourceType } from '$lib/exercises/types';

	interface Props {
		hints: ExerciseHint[];
		statementMd?: string;
		solutionMd?: string;
		onchange?: () => void;
	}

	let { hints = $bindable([]), statementMd = '', solutionMd = '', onchange }: Props = $props();

	const hintTypes: { value: ExerciseResourceType; label: string }[] = [
		{ value: 'video', label: 'Video' },
		{ value: 'pdf', label: 'PDF' },
		{ value: 'link', label: 'Lien' },
		{ value: 'geogebra', label: 'GeoGebra' },
		{ value: 'image', label: 'Image' },
		{ value: 'ubumark', label: 'Contenu Ubumark' }
	];

	// New hint form state
	let newId = $state('');
	let newType = $state<ExerciseResourceType>('video');
	let newUrl = $state('');
	let newContent = $state('');
	let newTitle = $state('');
	let newDescription = $state('');

	// Edit mode state
	let editingIndex = $state<number | null>(null);
	let editId = $state('');
	let editType = $state<ExerciseResourceType>('video');
	let editUrl = $state('');
	let editContent = $state('');
	let editTitle = $state('');
	let editDescription = $state('');

	/**
	 * Check if a hint ID is referenced in statement or solution
	 */
	function isHintUsed(hintId: string): boolean {
		const pattern = `{{hint:${hintId}}}`;
		return statementMd.includes(pattern) || solutionMd.includes(pattern);
	}

	/**
	 * Validate hint ID format (alphanumeric + dashes)
	 */
	function isValidHintId(id: string): boolean {
		return /^[a-zA-Z0-9][a-zA-Z0-9-]*[a-zA-Z0-9]$|^[a-zA-Z0-9]$/.test(id);
	}

	/**
	 * Check if hint ID is unique
	 */
	function isUniqueHintId(id: string, excludeIndex?: number): boolean {
		return !hints.some((h, i) => h.id === id && i !== excludeIndex);
	}

	/**
	 * Generate a unique hint ID from title
	 */
	function generateHintId(title: string): string {
		const base = title
			.toLowerCase()
			.normalize('NFD')
			.replace(/[\u0300-\u036f]/g, '') // Remove accents
			.replace(/[^a-z0-9]+/g, '-')
			.replace(/^-+|-+$/g, '')
			.slice(0, 20);

		if (!base) return `hint-${Date.now().toString(36)}`;

		let candidate = base;
		let counter = 1;
		while (!isUniqueHintId(candidate)) {
			candidate = `${base}-${counter}`;
			counter++;
		}
		return candidate;
	}

	/**
	 * Copy hint reference to clipboard
	 */
	async function copyHintReference(hintId: string) {
		try {
			await navigator.clipboard.writeText(`{{hint:${hintId}}}`);
			toaster.success('Reference copiee');
		} catch {
			toaster.error('Erreur lors de la copie');
		}
	}

	/** Maximum number of hints allowed per variation (enforced limit) */
	const MAX_HINTS = 20;

	/**
	 * Add new hint.
	 * Enforces a maximum of 20 hints per variation for performance and UX.
	 */
	function addHint() {
		// Enforce maximum limit
		if (hints.length >= MAX_HINTS) {
			toaster.warning(`Maximum ${MAX_HINTS} aides autorisees`);
			return;
		}

		// Generate ID if empty
		const finalId = newId.trim() || generateHintId(newTitle);

		// Validate
		if (!isValidHintId(finalId)) {
			toaster.error("L'ID doit contenir uniquement des lettres, chiffres et tirets");
			return;
		}

		if (!isUniqueHintId(finalId)) {
			toaster.error('Cet ID existe deja');
			return;
		}

		// Validate URL or content based on type
		if (newType === 'ubumark') {
			if (!newContent.trim()) {
				toaster.error('Le contenu est requis');
				return;
			}
			if (newContent.trim().length > 5000) {
				toaster.error('Le contenu est trop long (max 5000 caracteres)');
				return;
			}
		} else {
			if (!newUrl.trim()) {
				toaster.error("L'URL est requise");
				return;
			}
		}

		if (!newTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		const newHint: ExerciseHint =
			newType === 'ubumark'
				? {
						id: finalId,
						type: newType,
						content: newContent.trim(),
						title: newTitle.trim(),
						description: newDescription.trim() || undefined
					}
				: {
						id: finalId,
						type: newType,
						url: newUrl.trim(),
						title: newTitle.trim(),
						description: newDescription.trim() || undefined
					};

		hints = [...hints, newHint];
		onchange?.();

		// Reset form
		newId = '';
		newUrl = '';
		newContent = '';
		newTitle = '';
		newDescription = '';
		newType = 'video';

		toaster.success('Aide ajoutee');
	}

	/**
	 * Start editing a hint
	 */
	function startEdit(index: number) {
		const hint = hints[index];
		editingIndex = index;
		editId = hint.id;
		editType = hint.type;
		editUrl = hint.url ?? '';
		editContent = hint.content ?? '';
		editTitle = hint.title;
		editDescription = hint.description ?? '';
	}

	/**
	 * Save edited hint
	 */
	function saveEdit() {
		if (editingIndex === null) return;

		// Validate
		if (!isValidHintId(editId)) {
			toaster.error("L'ID doit contenir uniquement des lettres, chiffres et tirets");
			return;
		}

		if (!isUniqueHintId(editId, editingIndex)) {
			toaster.error('Cet ID existe deja');
			return;
		}

		// Validate URL or content based on type
		if (editType === 'ubumark') {
			if (!editContent.trim()) {
				toaster.error('Le contenu est requis');
				return;
			}
			if (editContent.trim().length > 5000) {
				toaster.error('Le contenu est trop long (max 5000 caracteres)');
				return;
			}
		} else {
			if (!editUrl.trim()) {
				toaster.error("L'URL est requise");
				return;
			}
		}

		if (!editTitle.trim()) {
			toaster.error('Le titre est requis');
			return;
		}

		const updatedHint: ExerciseHint =
			editType === 'ubumark'
				? {
						id: editId.trim(),
						type: editType,
						content: editContent.trim(),
						title: editTitle.trim(),
						description: editDescription.trim() || undefined
					}
				: {
						id: editId.trim(),
						type: editType,
						url: editUrl.trim(),
						title: editTitle.trim(),
						description: editDescription.trim() || undefined
					};

		hints = hints.map((h, i) => (i === editingIndex ? updatedHint : h));
		onchange?.();
		cancelEdit();
		toaster.success('Aide modifiee');
	}

	/**
	 * Cancel editing
	 */
	function cancelEdit() {
		editingIndex = null;
		editId = '';
		editType = 'video';
		editUrl = '';
		editContent = '';
		editTitle = '';
		editDescription = '';
	}

	/**
	 * Remove hint
	 */
	function removeHint(index: number) {
		hints = hints.filter((_, i) => i !== index);
		onchange?.();
	}

	/**
	 * Get icon for hint type
	 */
	function getTypeIcon(type: ExerciseResourceType): string {
		switch (type) {
			case 'video':
				return '🎬';
			case 'pdf':
				return '📄';
			case 'link':
				return '🔗';
			case 'geogebra':
				return '📐';
			case 'image':
				return '🖼️';
			case 'ubumark':
				return '📝';
			default:
				return '📎';
		}
	}

	/**
	 * Get label for hint type
	 */
	function getTypeLabel(type: ExerciseResourceType): string {
		return hintTypes.find((t) => t.value === type)?.label ?? type;
	}
</script>

<div class="space-y-4">
	<!-- Existing hints list -->
	{#if hints.length > 0}
		<div class="space-y-2">
			{#each hints as hint, index (hint.id)}
				{#if editingIndex === index}
					<!-- Edit mode -->
					<div class="rounded-md border border-primary bg-muted/30 p-3">
						<p class="mb-3 text-sm font-medium">Modifier l'aide</p>
						<div class="grid gap-3">
							<div class="grid grid-cols-2 gap-3">
								<div class="space-y-1">
									<Label for="edit-hint-id" class="text-xs">ID</Label>
									<Input
										id="edit-hint-id"
										type="text"
										placeholder="rappel-pythagore"
										bind:value={editId}
										class="h-9 font-mono text-xs"
									/>
								</div>
								<div class="space-y-1">
									<Label for="edit-hint-type" class="text-xs">Type</Label>
									<MySelect
										type="single"
										bind:value={editType}
										items={hintTypes}
										placeholder="Type"
									/>
								</div>
							</div>
							<div class="space-y-1">
								<Label for="edit-hint-title" class="text-xs">Titre</Label>
								<Input
									id="edit-hint-title"
									type="text"
									placeholder="Rappel : Theoreme de Pythagore"
									bind:value={editTitle}
									class="h-9"
								/>
							</div>
							{#if editType === 'ubumark'}
								<div class="space-y-1">
									<Label for="edit-hint-content" class="text-xs">Contenu Ubumark</Label>
									<Textarea
										id="edit-hint-content"
										placeholder={'Formules: $x^2$ Variables: {{a}}'}
										bind:value={editContent}
										rows={4}
										class="resize-none font-mono text-sm"
									/>
									<p class="text-xs text-muted-foreground">
										Supporte les formules LaTeX et les variables de l'exercice
									</p>
								</div>
							{:else}
								<div class="space-y-1">
									<Label for="edit-hint-url" class="text-xs">URL</Label>
									<Input
										id="edit-hint-url"
										type="url"
										placeholder="https://..."
										bind:value={editUrl}
										class="h-9"
									/>
								</div>
							{/if}
							<div class="space-y-1">
								<Label for="edit-hint-description" class="text-xs">Description (optionnel)</Label>
								<Textarea
									id="edit-hint-description"
									placeholder="Explication supplementaire..."
									bind:value={editDescription}
									rows={2}
									class="resize-none text-sm"
								/>
							</div>
							<div class="flex justify-end gap-2">
								<Button type="button" variant="ghost" size="sm" onclick={cancelEdit}>
									Annuler
								</Button>
								<Button type="button" variant="default" size="sm" onclick={saveEdit}>
									Enregistrer
								</Button>
							</div>
						</div>
					</div>
				{:else}
					<!-- Display mode -->
					<div class="flex items-center gap-2 rounded-md border bg-muted/50 p-2 text-sm">
						<span class="text-lg" title={getTypeLabel(hint.type)}>{getTypeIcon(hint.type)}</span>
						<div class="min-w-0 flex-1">
							<div class="flex items-center gap-2">
								<code class="rounded bg-muted px-1.5 py-0.5 font-mono text-xs">
									{hint.id}
								</code>
								<button
									type="button"
									onclick={() => copyHintReference(hint.id)}
									class="text-xs text-muted-foreground hover:text-foreground"
									title={`Copier {{hint:${hint.id}}}`}
								>
									📋
								</button>
								{#if isHintUsed(hint.id)}
									<span class="text-xs text-green-600" title="Utilise dans l'enonce ou la solution"
										>✓</span
									>
								{:else}
									<span class="text-xs text-amber-600" title="Non utilise">⚠️</span>
								{/if}
							</div>
							{#if hint.type === 'ubumark'}
								<span class="font-medium">{hint.title}</span>
							{:else if hint.url}
								<a
									href={hint.url}
									target="_blank"
									rel="noopener noreferrer"
									class="font-medium hover:underline"
								>
									{hint.title}
								</a>
							{:else}
								<span class="font-medium">{hint.title}</span>
							{/if}
							{#if hint.description}
								<p class="truncate text-xs text-muted-foreground">{hint.description}</p>
							{/if}
						</div>
						<div class="flex gap-1">
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onclick={() => startEdit(index)}
								class="h-8 w-8 p-0"
								title="Modifier"
							>
								✏️
							</Button>
							<Button
								type="button"
								variant="ghost"
								size="sm"
								onclick={() => removeHint(index)}
								class="h-8 w-8 p-0 text-destructive hover:text-destructive"
								title="Supprimer"
							>
								×
							</Button>
						</div>
					</div>
				{/if}
			{/each}
		</div>
	{/if}

	<!-- Add new hint form -->
	<div class="rounded-md border p-3">
		<p class="mb-3 text-sm font-medium">Ajouter une aide</p>
		<div class="grid gap-3">
			<div class="grid grid-cols-2 gap-3">
				<div class="space-y-1">
					<Label for="new-hint-id" class="text-xs">
						ID <span class="text-muted-foreground">(auto si vide)</span>
					</Label>
					<Input
						id="new-hint-id"
						type="text"
						placeholder="rappel-pythagore"
						bind:value={newId}
						class="h-9 font-mono text-xs"
					/>
				</div>
				<div class="space-y-1">
					<Label for="new-hint-type" class="text-xs">Type</Label>
					<MySelect type="single" bind:value={newType} items={hintTypes} placeholder="Type" />
				</div>
			</div>
			<div class="space-y-1">
				<Label for="new-hint-title" class="text-xs">Titre</Label>
				<Input
					id="new-hint-title"
					type="text"
					placeholder="Rappel : Theoreme de Pythagore"
					bind:value={newTitle}
					class="h-9"
				/>
			</div>
			{#if newType === 'ubumark'}
				<div class="space-y-1">
					<Label for="new-hint-content" class="text-xs">Contenu Ubumark</Label>
					<Textarea
						id="new-hint-content"
						placeholder={'Formules: $x^2$ Variables: {{a}}'}
						bind:value={newContent}
						rows={4}
						class="resize-none font-mono text-sm"
					/>
					<p class="text-xs text-muted-foreground">
						Supporte les formules LaTeX et les variables de l'exercice
					</p>
				</div>
			{:else}
				<div class="space-y-1">
					<Label for="new-hint-url" class="text-xs">URL</Label>
					<Input
						id="new-hint-url"
						type="url"
						placeholder="https://..."
						bind:value={newUrl}
						class="h-9"
					/>
				</div>
			{/if}
			<div class="space-y-1">
				<Label for="new-hint-description" class="text-xs">Description (optionnel)</Label>
				<Textarea
					id="new-hint-description"
					placeholder="Explication supplementaire..."
					bind:value={newDescription}
					rows={2}
					class="resize-none text-sm"
				/>
			</div>
			<Button
				type="button"
				variant="outline"
				size="sm"
				onclick={addHint}
				disabled={(newType === 'ubumark' ? !newContent.trim() : !newUrl.trim()) ||
					!newTitle.trim() ||
					hints.length >= MAX_HINTS}
			>
				+ Ajouter
			</Button>
		</div>
	</div>

	{#if hints.length >= MAX_HINTS}
		<p class="text-xs text-muted-foreground">Maximum {MAX_HINTS} aides atteint</p>
	{/if}
</div>
