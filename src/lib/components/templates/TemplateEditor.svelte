<!--
	TemplateEditor Component
	========================

	Form for creating and editing chapter templates.
	Includes metadata editing and content management with tabs.

	@module components/templates/TemplateEditor
-->
<script lang="ts">
	import type {
		ChapterTemplate,
		TemplateContentSnapshot,
		TemplateStatus
	} from '$lib/types/chapter-templates';
	import { GRADE_LEVELS } from '$lib/types/chapter-templates';
	import type { ChapterColor, ChapterIcon } from '$lib/types/chapters';
	import { CHAPTER_COLORS, CHAPTER_ICONS } from '$lib/types/chapters';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
	import * as Tabs from '$lib/components/ui/tabs';
	import { Badge } from '$lib/components/ui/badge';
	import { cn } from '$lib/utils';
	import {
		Book,
		Calculator,
		Compass,
		Lightbulb,
		Target,
		Star,
		Trophy,
		Flag,
		Rocket,
		Puzzle,
		Brain,
		BarChart2,
		TrendingUp,
		Percent,
		Sigma,
		Pi,
		Radical,
		Ruler,
		Shapes,
		Box,
		Save,
		X,
		FileText,
		HelpCircle,
		ClipboardList,
		Dumbbell,
		AlertCircle
	} from 'lucide-svelte';

	// Props
	interface Props {
		template?: ChapterTemplate;
		onSave: (data: {
			title: string;
			description: string | null;
			grades: string[];
			color: ChapterColor | null;
			icon: ChapterIcon | null;
			status: TemplateStatus;
			isPublic: boolean;
			contentSnapshot: TemplateContentSnapshot;
		}) => void;
		onCancel: () => void;
	}

	let { template, onSave, onCancel }: Props = $props();

	// Form state - Metadata
	let title = $state(template?.title ?? '');
	let description = $state(template?.description ?? '');
	let selectedGrades = $state<string[]>(template?.grades ?? []);
	let color = $state<ChapterColor | null>(template?.color ?? null);
	let icon = $state<ChapterIcon | null>(template?.icon ?? 'book');
	let status = $state<TemplateStatus>(template?.status ?? 'draft');
	let isPublic = $state(template?.isPublic ?? false);
	let isSubmitting = $state(false);

	// Content snapshot (simplified - full editor would manage these)
	let contentSnapshot = $state<TemplateContentSnapshot>(
		template?.contentSnapshot ?? {
			documents: [],
			quizQuestions: [],
			checklistItems: [],
			exercises: []
		}
	);

	// Active tab
	let activeTab = $state('metadata');

	// Validation
	const isValid = $derived(title.trim().length > 0);
	const hasContent = $derived(
		contentSnapshot.documents.length > 0 ||
			contentSnapshot.quizQuestions.length > 0 ||
			contentSnapshot.checklistItems.length > 0 ||
			contentSnapshot.exercises.length > 0
	);
	const _canPublish = $derived(isValid && hasContent);

	// Icon mapping
	const iconMap: Record<ChapterIcon, typeof Book> = {
		book: Book,
		calculator: Calculator,
		compass: Compass,
		lightbulb: Lightbulb,
		target: Target,
		star: Star,
		trophy: Trophy,
		flag: Flag,
		rocket: Rocket,
		puzzle: Puzzle,
		brain: Brain,
		'chart-bar': BarChart2,
		'chart-line': TrendingUp,
		percent: Percent,
		sigma: Sigma,
		pi: Pi,
		'square-root': Radical,
		ruler: Ruler,
		shapes: Shapes,
		cube: Box
	};

	// Icon display names
	const iconLabels: Record<ChapterIcon, string> = {
		book: 'Livre',
		calculator: 'Calculatrice',
		compass: 'Compas',
		lightbulb: 'Ampoule',
		target: 'Cible',
		star: 'Étoile',
		trophy: 'Trophée',
		flag: 'Drapeau',
		rocket: 'Fusée',
		puzzle: 'Puzzle',
		brain: 'Cerveau',
		'chart-bar': 'Graphique barres',
		'chart-line': 'Graphique lignes',
		percent: 'Pourcentage',
		sigma: 'Sigma',
		pi: 'Pi',
		'square-root': 'Racine carrée',
		ruler: 'Règle',
		shapes: 'Formes',
		cube: 'Cube'
	};

	// Color display names
	const colorLabels: Record<ChapterColor, string> = {
		slate: 'Ardoise',
		red: 'Rouge',
		orange: 'Orange',
		amber: 'Ambre',
		yellow: 'Jaune',
		lime: 'Citron vert',
		green: 'Vert',
		emerald: 'Émeraude',
		teal: 'Bleu-vert',
		cyan: 'Cyan',
		sky: 'Bleu ciel',
		blue: 'Bleu',
		indigo: 'Indigo',
		violet: 'Violet',
		purple: 'Pourpre',
		fuchsia: 'Fuchsia',
		pink: 'Rose',
		rose: 'Rose pâle'
	};

	// Build select items
	const gradeItems = $derived(
		GRADE_LEVELS.map((grade) => ({
			value: grade,
			label: `${grade}e`
		}))
	);

	const iconItems = $derived(
		CHAPTER_ICONS.map((i) => ({
			value: i,
			label: iconLabels[i as ChapterIcon] ?? i
		}))
	);

	const colorItems = $derived([
		{ value: '', label: 'Aucune couleur' },
		...CHAPTER_COLORS.map((c) => ({
			value: c,
			label: colorLabels[c as ChapterColor] ?? c
		}))
	]);

	const statusItems = [
		{ value: 'draft', label: 'Brouillon' },
		{ value: 'published', label: 'Publié' },
		{ value: 'archived', label: 'Archivé' }
	];

	// Color preview class
	function getColorPreviewClass(c: ChapterColor): string {
		return `bg-${c}-500`;
	}

	// Handle form submission
	function handleSubmit() {
		if (!isValid || isSubmitting) return;

		// Prevent publishing without content
		if (status === 'published' && !hasContent) {
			alert('Impossible de publier un template vide. Ajoutez du contenu avant de publier.');
			return;
		}

		isSubmitting = true;

		onSave({
			title: title.trim(),
			description: description.trim() || null,
			grades: selectedGrades,
			color,
			icon,
			status,
			isPublic,
			contentSnapshot
		});

		isSubmitting = false;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{template ? 'Modifier le template' : 'Nouveau template'}
		</Card.Title>
		<Card.Description>
			{template
				? 'Modifiez les informations et le contenu du template.'
				: 'Créez un nouveau template de chapitre réutilisable.'}
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<Tabs.Root bind:value={activeTab}>
			<Tabs.List class="grid w-full grid-cols-5">
				<Tabs.Trigger value="metadata">Informations</Tabs.Trigger>
				<Tabs.Trigger value="documents" class="flex items-center gap-1">
					<FileText class="h-4 w-4" />
					<span class="hidden sm:inline">Documents</span>
					<Badge variant="secondary" class="ml-1 text-xs">
						{contentSnapshot.documents.length}
					</Badge>
				</Tabs.Trigger>
				<Tabs.Trigger value="quiz" class="flex items-center gap-1">
					<HelpCircle class="h-4 w-4" />
					<span class="hidden sm:inline">Quiz</span>
					<Badge variant="secondary" class="ml-1 text-xs">
						{contentSnapshot.quizQuestions.length}
					</Badge>
				</Tabs.Trigger>
				<Tabs.Trigger value="checklist" class="flex items-center gap-1">
					<ClipboardList class="h-4 w-4" />
					<span class="hidden sm:inline">Objectifs</span>
					<Badge variant="secondary" class="ml-1 text-xs">
						{contentSnapshot.checklistItems.length}
					</Badge>
				</Tabs.Trigger>
				<Tabs.Trigger value="exercises" class="flex items-center gap-1">
					<Dumbbell class="h-4 w-4" />
					<span class="hidden sm:inline">Exercices</span>
					<Badge variant="secondary" class="ml-1 text-xs">
						{contentSnapshot.exercises.length}
					</Badge>
				</Tabs.Trigger>
			</Tabs.List>

			<!-- Metadata Tab -->
			<Tabs.Content value="metadata" class="space-y-6 py-4">
				<!-- Title -->
				<div class="space-y-2">
					<Label for="title">Titre *</Label>
					<Input
						id="title"
						bind:value={title}
						placeholder="Ex: Les fractions - Niveau 5e"
						required
						maxlength={100}
					/>
				</div>

				<!-- Description -->
				<div class="space-y-2">
					<Label for="description">Description</Label>
					<Textarea
						id="description"
						bind:value={description}
						placeholder="Décrivez le contenu de ce template..."
						rows={3}
						maxlength={500}
					/>
				</div>

				<!-- Grades -->
				<div class="space-y-2">
					<Label>Niveaux</Label>
					<MySelect
						type="multiple"
						bind:value={selectedGrades}
						items={gradeItems}
						placeholder="Sélectionner les niveaux"
					/>
					<p class="text-xs text-muted-foreground">
						Pour quels niveaux ce template est-il adapté ?
					</p>
				</div>

				<!-- Icon -->
				<div class="space-y-2">
					<Label>Icône</Label>
					<div class="flex items-center gap-4">
						<MySelect
							value={icon ?? 'book'}
							items={iconItems}
							onValueChange={(v) => {
								icon = v as ChapterIcon;
							}}
							placeholder="Choisir une icône"
						/>
						{#if icon}
							{@const IconComponent = iconMap[icon]}
							<div class="rounded-lg bg-muted p-3">
								<IconComponent class="h-6 w-6" />
							</div>
						{/if}
					</div>
				</div>

				<!-- Color -->
				<div class="space-y-2">
					<Label>Couleur</Label>
					<div class="flex items-center gap-4">
						<MySelect
							value={color ?? ''}
							items={colorItems}
							onValueChange={(v) => {
								color = v ? (v as ChapterColor) : null;
							}}
							placeholder="Choisir une couleur"
						/>
						{#if color}
							<div class={cn('h-8 w-8 rounded-lg', getColorPreviewClass(color))}></div>
						{/if}
					</div>
					<div class="mt-3 flex flex-wrap gap-2">
						{#each CHAPTER_COLORS as c (c)}
							<button
								type="button"
								class={cn(
									'h-8 w-8 rounded-lg transition-all',
									getColorPreviewClass(c as ChapterColor),
									color === c && 'ring-2 ring-primary ring-offset-2',
									'hover:scale-110'
								)}
								onclick={() => {
									color = c as ChapterColor;
								}}
								aria-label={colorLabels[c as ChapterColor]}
							></button>
						{/each}
					</div>
				</div>

				<!-- Status -->
				<div class="space-y-2">
					<Label>Statut</Label>
					<MySelect
						type="single"
						bind:value={status}
						items={statusItems}
						placeholder="Choisir un statut"
					/>
					{#if status === 'published' && !hasContent}
						<div
							class="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-900/30"
						>
							<AlertCircle class="h-4 w-4 shrink-0 text-orange-600" />
							<p class="text-orange-700 dark:text-orange-200">
								Vous ne pouvez pas publier un template sans contenu.
							</p>
						</div>
					{/if}
				</div>

				<!-- Public -->
				<div class="space-y-2">
					<Label>Visibilité</Label>
					<MyCheckbox bind:checked={isPublic} label="Template public" />
					<p class="text-xs text-muted-foreground">
						Les templates publics peuvent être utilisés par tous les enseignants.
					</p>
				</div>

				<!-- Preview -->
				{#if title.trim()}
					<div class="space-y-2">
						<Label>Aperçu</Label>
						<div
							class={cn(
								'rounded-lg border-2 p-4',
								color
									? `bg-${color}-50 dark:bg-${color}-900/30 border-${color}-200 dark:border-${color}-800`
									: 'border-border bg-card'
							)}
						>
							<div class="flex items-center gap-3">
								{#if icon}
									{@const IconComponent = iconMap[icon]}
									<div
										class={cn(
											'rounded-lg p-2 text-white',
											color ? `bg-${color}-500` : 'bg-primary'
										)}
									>
										<IconComponent class="h-5 w-5" />
									</div>
								{/if}
								<div>
									<h3 class="font-semibold">{title.trim()}</h3>
									{#if description.trim()}
										<p class="line-clamp-1 text-sm text-muted-foreground">{description.trim()}</p>
									{/if}
								</div>
							</div>
						</div>
					</div>
				{/if}
			</Tabs.Content>

			<!-- Documents Tab -->
			<Tabs.Content value="documents" class="py-4">
				<div
					class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12"
				>
					<FileText class="mb-3 h-12 w-12 text-muted-foreground/50" />
					<h3 class="mb-1 text-lg font-semibold">Gestion des documents</h3>
					<p class="text-sm text-muted-foreground">
						L'éditeur de documents sera disponible prochainement.
					</p>
				</div>
			</Tabs.Content>

			<!-- Quiz Tab -->
			<Tabs.Content value="quiz" class="py-4">
				<div
					class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12"
				>
					<HelpCircle class="mb-3 h-12 w-12 text-muted-foreground/50" />
					<h3 class="mb-1 text-lg font-semibold">Gestion des questions quiz</h3>
					<p class="text-sm text-muted-foreground">
						L'éditeur de quiz sera disponible prochainement.
					</p>
				</div>
			</Tabs.Content>

			<!-- Checklist Tab -->
			<Tabs.Content value="checklist" class="py-4">
				<div
					class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12"
				>
					<ClipboardList class="mb-3 h-12 w-12 text-muted-foreground/50" />
					<h3 class="mb-1 text-lg font-semibold">Gestion des objectifs</h3>
					<p class="text-sm text-muted-foreground">
						L'éditeur d'objectifs sera disponible prochainement.
					</p>
				</div>
			</Tabs.Content>

			<!-- Exercises Tab -->
			<Tabs.Content value="exercises" class="py-4">
				<div
					class="flex flex-col items-center justify-center rounded-lg border-2 border-dashed py-12"
				>
					<Dumbbell class="mb-3 h-12 w-12 text-muted-foreground/50" />
					<h3 class="mb-1 text-lg font-semibold">Gestion des exercices</h3>
					<p class="text-sm text-muted-foreground">
						L'éditeur d'exercices sera disponible prochainement.
					</p>
				</div>
			</Tabs.Content>
		</Tabs.Root>
	</Card.Content>

	<Card.Footer class="flex justify-end gap-3">
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
		<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
			<Save class="mr-2 h-4 w-4" />
			{template ? 'Enregistrer' : 'Créer'}
		</Button>
	</Card.Footer>
</Card.Root>
