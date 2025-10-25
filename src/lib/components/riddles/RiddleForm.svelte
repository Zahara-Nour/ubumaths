<!--
	RiddleForm Component
	====================
	Form for creating and editing math riddles/enigmas

	Features:
	- Title, genre, difficulty inputs
	- Rich text editors for statement and correction
	- Image upload (optional)
	- Automatic validation configuration (Phase 2)
	- Draft/published status
	- Preview mode

	Props:
	- riddle: DbRiddle | null - Existing riddle for edit mode
	- onSubmit: (data) => void - Callback for form submission
	- onCancel: () => void - Callback for cancel action
	- loading: boolean - Form submission state
-->

<script lang="ts">
	import type {
		DbRiddle,
		CreateRiddleData,
		RiddleDifficulty,
		AnswerConfig
	} from '$lib/types/riddle';
	import { calculateGidouilles } from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import FormRichTextEditor from '$lib/components/rich-text/FormRichTextEditor.svelte';
	import AnswerConfigEditor from '$lib/components/riddles/AnswerConfigEditor.svelte';
	import { Lightbulb, Image as ImageIcon, Save, X } from 'lucide-svelte';

	// Props
	interface Props {
		riddle?: DbRiddle | null;
		onSubmit: (data: CreateRiddleData) => void;
		onCancel: () => void;
		loading?: boolean;
	}

	let { riddle = null, onSubmit, onCancel, loading = false }: Props = $props();

	// ============================================================================
	// FORM STATE
	// ============================================================================

	let title = $state(riddle?.title || '');
	let genre = $state(riddle?.genre || '');
	let difficulty = $state<RiddleDifficulty>(riddle?.difficulty || 1);
	let statement = $state(riddle?.statement || '');
	let correction = $state(riddle?.correction || '');
	let imageUrl = $state(riddle?.image_url || '');
	let answerConfig = $state<AnswerConfig | null>(riddle?.answer || null);
	let status = $state<'draft' | 'published'>(riddle?.status || 'draft');

	// Genre suggestions (common math topics)
	const genreSuggestions = [
		'Logique',
		'Géométrie',
		'Algèbre',
		'Arithmétique',
		'Probabilités',
		'Calcul',
		'Énigme classique',
		'Problème ouvert'
	];

	// ============================================================================
	// COMPUTED
	// ============================================================================

	const isValid = $derived(
		title.trim().length > 0 && statement.trim().length > 0 && correction.trim().length > 0
	);

	const gidouillesPreview = $derived({
		first: calculateGidouilles(difficulty, 1),
		second: calculateGidouilles(difficulty, 2),
		third: calculateGidouilles(difficulty, 3)
	});

	// ============================================================================
	// HANDLERS
	// ============================================================================

	function handleSubmit() {
		if (!isValid || loading) return;

		const data: CreateRiddleData = {
			title: title.trim(),
			genre: genre.trim() || undefined,
			difficulty,
			statement: statement.trim(),
			correction: correction.trim(),
			image_url: imageUrl.trim() || undefined,
			answer: answerConfig,
			status
		};

		onSubmit(data);
	}
</script>

<form
	onsubmit={(e) => {
		e.preventDefault();
		handleSubmit();
	}}
	class="space-y-6"
>
	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-2">
				<Lightbulb class="h-5 w-5 text-primary" />
				<Card.Title>{riddle ? 'Modifier' : 'Créer'} une énigme</Card.Title>
			</div>
			<Card.Description>
				{riddle
					? 'Modifiez les informations de cette énigme'
					: 'Créez une nouvelle énigme mathématique pour vos élèves'}
			</Card.Description>
		</Card.Header>

		<Card.Content class="space-y-4">
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre de l'énigme *</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Ex: Le mystère des triangles magiques"
					maxlength={100}
					required
				/>
				<p class="text-xs text-muted-foreground">{title.length}/100 caractères</p>
			</div>

			<!-- Genre and Difficulty Row -->
			<div class="grid gap-4 sm:grid-cols-2">
				<!-- Genre -->
				<div class="space-y-2">
					<Label for="genre">Genre (optionnel)</Label>
					<Input
						id="genre"
						bind:value={genre}
						placeholder="Ex: Logique, Géométrie..."
						list="genre-suggestions"
					/>
					<datalist id="genre-suggestions">
						{#each genreSuggestions as suggestion (suggestion)}
							<option value={suggestion}></option>
						{/each}
					</datalist>
				</div>

				<!-- Difficulty -->
				<div class="space-y-2">
					<Label for="difficulty">Difficulté *</Label>
					<select
						id="difficulty"
						bind:value={difficulty}
						class="flex h-10 w-full rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
						required
					>
						<option value={1}>Facile (1)</option>
						<option value={2}>Moyen (2)</option>
						<option value={3}>Difficile (3)</option>
					</select>
				</div>
			</div>

			<!-- Gidouilles Preview -->
			<div class="rounded-lg border bg-muted/50 p-3">
				<p class="mb-2 text-sm font-medium">Récompenses (gidouilles dégressives):</p>
				<div class="flex flex-wrap gap-2">
					<Badge variant="outline" class="bg-green-50 dark:bg-green-950">
						1ère tentative: {gidouillesPreview.first}
					</Badge>
					<Badge variant="outline" class="bg-yellow-50 dark:bg-yellow-950">
						2ème tentative: {gidouillesPreview.second}
					</Badge>
					<Badge variant="outline" class="bg-orange-50 dark:bg-orange-950">
						3ème+ tentatives: {gidouillesPreview.third}
					</Badge>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Statement Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Énoncé *</Card.Title>
			<Card.Description>
				Le problème ou la question posée aux élèves (supporte le rich text et LaTeX)
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<FormRichTextEditor
				bind:value={statement}
				placeholder="Énoncez votre énigme ici... Vous pouvez utiliser des formules mathématiques, des couleurs, etc."
			/>
		</Card.Content>
	</Card.Root>

	<!-- Correction Card -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Correction *</Card.Title>
			<Card.Description>
				La solution et l'explication (visible uniquement par les professeurs)
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<FormRichTextEditor
				bind:value={correction}
				placeholder="Expliquez la solution de l'énigme ici..."
			/>
		</Card.Content>
	</Card.Root>

	<!-- Optional Image Card -->
	<Card.Root>
		<Card.Header>
			<div class="flex items-center gap-2">
				<ImageIcon class="h-4 w-4" />
				<Card.Title class="text-base">Image (optionnel)</Card.Title>
			</div>
			<Card.Description>Ajoutez une image pour illustrer votre énigme</Card.Description>
		</Card.Header>
		<Card.Content class="space-y-2">
			<Label for="image-url">URL de l'image</Label>
			<Input
				id="image-url"
				bind:value={imageUrl}
				type="url"
				placeholder="https://exemple.com/image.png"
			/>
			{#if imageUrl}
				<div class="mt-3">
					<p class="mb-2 text-sm font-medium">Aperçu:</p>
					<img
						src={imageUrl}
						alt="Aperçu de l'image"
						class="max-h-48 rounded-lg border"
						onerror={() => (imageUrl = '')}
					/>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Validation Automatique Card -->
	<AnswerConfigEditor config={answerConfig} onChange={(config) => (answerConfig = config)} />

	<!-- Status and Actions -->
	<Card.Root>
		<Card.Content class="pt-6">
			<div class="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
				<!-- Status -->
				<div class="space-y-2">
					<Label for="status">Statut</Label>
					<select
						id="status"
						bind:value={status}
						class="flex h-10 w-[200px] rounded-md border border-input bg-background px-3 py-2 text-sm ring-offset-background focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:outline-none disabled:cursor-not-allowed disabled:opacity-50"
					>
						<option value="draft">Brouillon</option>
						<option value="published">Publiée</option>
					</select>
				</div>

				<!-- Action Buttons -->
				<div class="flex gap-2">
					<Button type="button" variant="outline" onclick={onCancel} disabled={loading}>
						<X class="mr-2 h-4 w-4" />
						Annuler
					</Button>
					<Button type="submit" disabled={!isValid || loading}>
						<Save class="mr-2 h-4 w-4" />
						{loading ? 'Enregistrement...' : riddle ? 'Enregistrer' : "Créer l'énigme"}
					</Button>
				</div>
			</div>
		</Card.Content>
	</Card.Root>
</form>
