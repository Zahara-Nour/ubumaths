<!--
	ChapterEditor Component
	=======================

	Form for editing chapter metadata.
	Includes title, description, color picker, icon selector, and visibility toggle.

	@module components/cours/teacher/ChapterEditor
-->
<script lang="ts">
	import type { ClassChapter, ChapterColor, ChapterIcon } from '$lib/types/chapters';
	import { CHAPTER_COLORS, CHAPTER_ICONS } from '$lib/types/chapters';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import MySelect from '$lib/components/MySelect.svelte';
	import * as Card from '$lib/components/ui/card';
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
		X
	} from 'lucide-svelte';

	// Types for create/update inputs
	interface CreateChapterInput {
		classId: string;
		title: string;
		description: string | null;
		color: ChapterColor | null;
		icon: ChapterIcon | null;
		isVisible: boolean;
	}

	interface UpdateChapterInput {
		title?: string;
		description?: string | null;
		color?: ChapterColor | null;
		icon?: ChapterIcon | null;
		isVisible?: boolean;
	}

	// Props
	interface Props {
		chapter?: ClassChapter;
		classId: string;
		onSave: (data: CreateChapterInput | UpdateChapterInput) => void;
		onCancel: () => void;
	}

	let { chapter, classId, onSave, onCancel }: Props = $props();

	// Form state
	let title = $state(chapter?.title ?? '');
	let description = $state(chapter?.description ?? '');
	let color = $state<ChapterColor | null>(chapter?.color ?? null);
	let icon = $state<ChapterIcon | null>(chapter?.icon ?? 'book');
	let isVisible = $state(chapter?.isVisible ?? true);
	let isSubmitting = $state(false);

	// Validation
	const isValid = $derived(title.trim().length > 0);

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

	// Icon display names (in French)
	const iconLabels: Record<ChapterIcon, string> = {
		book: 'Livre',
		calculator: 'Calculatrice',
		compass: 'Compas',
		lightbulb: 'Ampoule',
		target: 'Cible',
		star: 'Etoile',
		trophy: 'Trophee',
		flag: 'Drapeau',
		rocket: 'Fusee',
		puzzle: 'Puzzle',
		brain: 'Cerveau',
		'chart-bar': 'Graphique barres',
		'chart-line': 'Graphique lignes',
		percent: 'Pourcentage',
		sigma: 'Sigma',
		pi: 'Pi',
		'square-root': 'Racine carree',
		ruler: 'Regle',
		shapes: 'Formes',
		cube: 'Cube'
	};

	// Color display names (in French)
	const colorLabels: Record<ChapterColor, string> = {
		slate: 'Ardoise',
		red: 'Rouge',
		orange: 'Orange',
		amber: 'Ambre',
		yellow: 'Jaune',
		lime: 'Citron vert',
		green: 'Vert',
		emerald: 'Emeraude',
		teal: 'Bleu-vert',
		cyan: 'Cyan',
		sky: 'Bleu ciel',
		blue: 'Bleu',
		indigo: 'Indigo',
		violet: 'Violet',
		purple: 'Pourpre',
		fuchsia: 'Fuchsia',
		pink: 'Rose',
		rose: 'Rose pale'
	};

	// Color preview classes
	function getColorPreviewClass(c: ChapterColor): string {
		return `bg-${c}-500`;
	}

	// Build select items for icons
	const iconItems = $derived(
		CHAPTER_ICONS.map((i) => ({
			value: i,
			label: iconLabels[i as ChapterIcon] ?? i
		}))
	);

	// Build select items for colors
	const colorItems = $derived([
		{ value: '', label: 'Aucune couleur' },
		...CHAPTER_COLORS.map((c) => ({
			value: c,
			label: colorLabels[c as ChapterColor] ?? c
		}))
	]);

	// Handle form submission
	function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;

		if (chapter) {
			// Update existing chapter
			const updateData: UpdateChapterInput = {
				title: title.trim(),
				description: description.trim() || null,
				color,
				icon,
				isVisible
			};
			onSave(updateData);
		} else {
			// Create new chapter
			const createData: CreateChapterInput = {
				classId,
				title: title.trim(),
				description: description.trim() || null,
				color,
				icon,
				isVisible
			};
			onSave(createData);
		}

		isSubmitting = false;
	}
</script>

<Card.Root>
	<Card.Header>
		<Card.Title>
			{chapter ? 'Modifier le chapitre' : 'Nouveau chapitre'}
		</Card.Title>
		<Card.Description>
			{chapter
				? 'Modifiez les informations du chapitre.'
				: 'Creez un nouveau chapitre pour votre classe.'}
		</Card.Description>
	</Card.Header>

	<Card.Content>
		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-6"
		>
			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre *</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Ex: Les fractions"
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
					placeholder="Description du chapitre (optionnel)"
					rows={3}
					maxlength={500}
				/>
			</div>

			<!-- Icon selector -->
			<div class="space-y-2">
				<Label>Icone</Label>
				<div class="flex items-center gap-4">
					<MySelect
						value={icon ?? 'book'}
						items={iconItems}
						onValueChange={(v: string) => {
							icon = v as ChapterIcon;
						}}
						placeholder="Choisir une icone"
					/>
					<!-- Icon preview -->
					{#if icon}
						{@const IconComponent = iconMap[icon]}
						<div class="rounded-lg bg-muted p-3">
							<IconComponent class="h-6 w-6" />
						</div>
					{/if}
				</div>
			</div>

			<!-- Color selector -->
			<div class="space-y-2">
				<Label>Couleur</Label>
				<div class="flex items-center gap-4">
					<MySelect
						value={color ?? ''}
						items={colorItems}
						onValueChange={(v: string) => {
							color = v ? (v as ChapterColor) : null;
						}}
						placeholder="Choisir une couleur"
					/>
					<!-- Color preview -->
					{#if color}
						<div class={cn('h-8 w-8 rounded-lg', getColorPreviewClass(color))}></div>
					{/if}
				</div>

				<!-- Color grid for quick selection -->
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

			<!-- Visibility toggle -->
			<div class="space-y-2">
				<Label>Visibilite</Label>
				<div class="flex items-center gap-2">
					<MyCheckbox bind:checked={isVisible} label="Visible pour les eleves" />
				</div>
				<p class="text-xs text-muted-foreground">
					Les chapitres masques ne sont pas visibles par les eleves.
				</p>
			</div>

			<!-- Preview -->
			{#if title.trim()}
				<div class="space-y-2">
					<Label>Apercu</Label>
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
									class={cn('rounded-lg p-2 text-white', color ? `bg-${color}-500` : 'bg-primary')}
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
		</form>
	</Card.Content>

	<Card.Footer class="flex justify-end gap-3">
		<Button variant="outline" onclick={onCancel} disabled={isSubmitting}>
			<X class="mr-2 h-4 w-4" />
			Annuler
		</Button>
		<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
			<Save class="mr-2 h-4 w-4" />
			{chapter ? 'Enregistrer' : 'Creer'}
		</Button>
	</Card.Footer>
</Card.Root>
