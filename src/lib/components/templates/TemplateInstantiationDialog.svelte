<!--
	TemplateInstantiationDialog Component
	======================================

	Modal dialog for instantiating a template into a chapter.
	Allows selecting target class and customizing initial title/visibility.

	@module components/templates/TemplateInstantiationDialog
-->
<script lang="ts">
	import type { ChapterTemplate } from '$lib/types/chapter-templates';
	import * as Dialog from '$lib/components/ui/dialog';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import MySelect from '$lib/components/MySelect.svelte';
	import MyCheckbox from '$lib/components/MyCheckbox.svelte';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import {
		Copy,
		X,
		FileText,
		HelpCircle,
		ClipboardList,
		Dumbbell,
		AlertCircle
	} from 'lucide-svelte';

	// Props
	interface ClassOption {
		id: string;
		name: string;
		level: string;
	}

	interface Props {
		template: ChapterTemplate;
		classes: ClassOption[];
		open?: boolean;
		onInstantiate: (data: {
			templateId: string;
			classId: string;
			title: string;
			isVisible: boolean;
		}) => void;
		onCancel: () => void;
	}

	let { template, classes, open = $bindable(false), onInstantiate, onCancel }: Props = $props();

	// Form state
	let selectedClassId = $state<string>('');
	let title = $state(template.title);
	let isVisible = $state(true);
	let isSubmitting = $state(false);

	// Reset form when dialog opens
	$effect(() => {
		if (open) {
			selectedClassId = '';
			title = template.title;
			isVisible = true;
			isSubmitting = false;
		}
	});

	// Validation
	const isValid = $derived(selectedClassId !== '' && title.trim().length > 0);

	// Class items for select
	const classItems = $derived(
		classes.map((c) => ({
			value: c.id,
			label: `${c.name} (${c.level})`
		}))
	);

	// Handle submit
	function handleSubmit() {
		if (!isValid || isSubmitting) return;

		isSubmitting = true;
		onInstantiate({
			templateId: template.id,
			classId: selectedClassId,
			title: title.trim(),
			isVisible
		});
	}

	// Handle cancel
	function handleCancel() {
		if (!isSubmitting) {
			onCancel();
		}
	}

	// Total content count
	const totalContent = $derived(
		template.contentSnapshot.documents.length +
			template.contentSnapshot.quizQuestions.length +
			template.contentSnapshot.checklistItems.length +
			template.contentSnapshot.exercises.length
	);
</script>

<Dialog.Root bind:open>
	<Dialog.Content class="max-w-2xl">
		<Dialog.Header>
			<Dialog.Title class="flex items-center gap-2">
				<Copy class="h-5 w-5 text-primary" />
				Utiliser le template
			</Dialog.Title>
			<Dialog.Description>
				Créez un nouveau chapitre basé sur ce template. Le contenu sera copié dans la classe
				sélectionnée.
			</Dialog.Description>
		</Dialog.Header>

		<form
			onsubmit={(e) => {
				e.preventDefault();
				handleSubmit();
			}}
			class="space-y-6"
		>
			<!-- Template preview -->
			<Card.Root>
				<Card.Header class="pb-3">
					<Card.Title class="text-base">Template : {template.title}</Card.Title>
					{#if template.description}
						<Card.Description>{template.description}</Card.Description>
					{/if}
				</Card.Header>
				<Card.Content>
					<div class="grid grid-cols-2 gap-3 text-sm">
						<div class="flex items-center gap-2">
							<FileText class="h-4 w-4 text-muted-foreground" />
							<span>
								{template.contentSnapshot.documents.length} document{template.contentSnapshot
									.documents.length > 1
									? 's'
									: ''}
							</span>
						</div>
						<div class="flex items-center gap-2">
							<HelpCircle class="h-4 w-4 text-muted-foreground" />
							<span>
								{template.contentSnapshot.quizQuestions.length} question{template.contentSnapshot
									.quizQuestions.length > 1
									? 's'
									: ''} quiz
							</span>
						</div>
						<div class="flex items-center gap-2">
							<ClipboardList class="h-4 w-4 text-muted-foreground" />
							<span>
								{template.contentSnapshot.checklistItems.length} objectif{template.contentSnapshot
									.checklistItems.length > 1
									? 's'
									: ''}
							</span>
						</div>
						<div class="flex items-center gap-2">
							<Dumbbell class="h-4 w-4 text-muted-foreground" />
							<span>
								{template.contentSnapshot.exercises.length} exercice{template.contentSnapshot
									.exercises.length > 1
									? 's'
									: ''}
							</span>
						</div>
					</div>

					{#if template.grades.length > 0}
						<div class="mt-3 flex flex-wrap gap-1">
							{#each template.grades as grade (grade)}
								<Badge variant="secondary" class="text-xs">{grade}e</Badge>
							{/each}
						</div>
					{/if}
				</Card.Content>
			</Card.Root>

			<!-- Class selection -->
			<div class="space-y-2">
				<Label for="class-select">Classe cible *</Label>
				<MySelect
					id="class-select"
					bind:value={selectedClassId}
					items={classItems}
					placeholder="Sélectionner une classe"
				/>
				<p class="text-xs text-muted-foreground">Le chapitre sera créé dans cette classe</p>
			</div>

			<!-- Title -->
			<div class="space-y-2">
				<Label for="title">Titre du chapitre *</Label>
				<Input
					id="title"
					bind:value={title}
					placeholder="Ex: Les fractions"
					required
					maxlength={100}
				/>
				<p class="text-xs text-muted-foreground">
					Vous pouvez personnaliser le titre pour cette classe
				</p>
			</div>

			<!-- Visibility -->
			<div class="space-y-2">
				<Label>Visibilité</Label>
				<MyCheckbox bind:checked={isVisible} label="Visible pour les élèves" />
				<p class="text-xs text-muted-foreground">Vous pourrez modifier cette option plus tard</p>
			</div>

			<!-- Warning -->
			{#if totalContent === 0}
				<div
					class="flex items-start gap-2 rounded-lg border border-orange-200 bg-orange-50 p-3 text-sm dark:border-orange-800 dark:bg-orange-900/30"
				>
					<AlertCircle class="h-5 w-5 shrink-0 text-orange-600" />
					<div>
						<p class="font-medium text-orange-900 dark:text-orange-100">Template vide</p>
						<p class="mt-1 text-orange-700 dark:text-orange-200">
							Ce template ne contient aucun contenu. Vous pourrez ajouter des documents, quiz et
							exercices après la création.
						</p>
					</div>
				</div>
			{:else}
				<div
					class="flex items-start gap-2 rounded-lg border border-blue-200 bg-blue-50 p-3 text-sm dark:border-blue-800 dark:bg-blue-900/30"
				>
					<AlertCircle class="h-5 w-5 shrink-0 text-blue-600" />
					<div>
						<p class="font-medium text-blue-900 dark:text-blue-100">Lien avec le template</p>
						<p class="mt-1 text-blue-700 dark:text-blue-200">
							Le chapitre sera lié au template. Vous pourrez recevoir des mises à jour si le
							template est modifié.
						</p>
					</div>
				</div>
			{/if}
		</form>

		<Dialog.Footer class="flex justify-end gap-3">
			<Button variant="outline" onclick={handleCancel} disabled={isSubmitting}>
				<X class="mr-2 h-4 w-4" />
				Annuler
			</Button>
			<Button onclick={handleSubmit} disabled={!isValid || isSubmitting}>
				<Copy class="mr-2 h-4 w-4" />
				Créer le chapitre
			</Button>
		</Dialog.Footer>
	</Dialog.Content>
</Dialog.Root>
