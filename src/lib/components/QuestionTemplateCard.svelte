<!--
	Question Template Card Component
	=================================

	Card view display for question templates in the admin list.

	Features:
	- Compact card layout with type badge
	- Statement preview (first text content)
	- Grade level badges
	- Created date display
	- Action buttons (Preview, Edit, Duplicate, Delete)
	- Hover effects

	Props:
	- template: QuestionTemplate
	- onPreview: (id: string) => void
	- onEdit: (id: string) => void
	- onDuplicate: (id: string) => void
	- onDelete: (id: string) => void
-->

<script lang="ts">
	import type { QuestionTemplate } from '$lib/questions/types';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import * as Card from '$lib/components/ui/card';
	import { Eye, Pencil, Copy, Trash2 } from 'lucide-svelte';

	interface Props {
		template: QuestionTemplate;
		onPreview: (id: string) => void;
		onEdit: (id: string) => void;
		onDuplicate: (id: string) => void;
		onDelete: (id: string) => void;
	}

	let { template, onPreview, onEdit, onDuplicate, onDelete }: Props = $props();

	/**
	 * Get badge color for question type
	 */
	function getTypeBadgeClass(type: string): string {
		switch (type) {
			case 'numerical_exact':
			case 'numerical_decimal':
			case 'numerical_rounded':
				return 'bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200';
			case 'algebraic_transform':
				return 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200';
			case 'fill_in_blanks':
				return 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200';
			case 'multiple_choice':
				return 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200';
			default:
				return 'bg-muted text-muted-foreground';
		}
	}

	/**
	 * Get display label for question type
	 */
	function getTypeLabel(type: string): string {
		const types: Record<string, string> = {
			numerical_exact: 'Numérique (exact)',
			numerical_decimal: 'Numérique (décimal)',
			numerical_rounded: 'Numérique (arrondi)',
			algebraic_transform: 'Transformation algébrique',
			fill_in_blanks: 'À trous',
			multiple_choice: 'QCM'
		};
		return types[type] || type;
	}

	/**
	 * Get first text content from statement (for preview)
	 */
	function getStatementPreview(statement: any[]): string {
		const textField = statement.find((s) => s.type === 'text');
		if (!textField) return '(No text content)';

		const content = textField.content;
		// Remove LaTeX delimiters for preview
		const cleaned = content.replace(/\$\$/g, '');
		return cleaned.length > 150 ? cleaned.substring(0, 150) + '...' : cleaned;
	}
</script>

<Card.Root class="group transition-shadow hover:shadow-md">
	<Card.Header class="space-y-3">
		<!-- Type badge -->
		<div class="flex items-start justify-between gap-2">
			<Badge class={getTypeBadgeClass(template.type)}>
				{getTypeLabel(template.type)}
			</Badge>
			<span class="text-xs text-muted-foreground">
				{new Date(template.created_at).toLocaleDateString('fr-FR')}
			</span>
		</div>

		<!-- Statement preview -->
		<p class="line-clamp-3 text-sm text-muted-foreground">
			{getStatementPreview(template.statement)}
		</p>
	</Card.Header>

	<Card.Content class="space-y-3">
		<!-- Categories -->
		<div class="space-y-1">
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="font-medium">Thème:</span>
				<span>{template.theme}</span>
			</div>
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="font-medium">Domaine:</span>
				<span>{template.domain}</span>
			</div>
			{#if template.subdomain}
				<div class="flex items-center gap-2 text-xs text-muted-foreground">
					<span class="font-medium">Sous-domaine:</span>
					<span>{template.subdomain}</span>
				</div>
			{/if}
			<div class="flex items-center gap-2 text-xs text-muted-foreground">
				<span class="font-medium">Niveau:</span>
				<Badge variant="secondary" class="text-xs">{template.level}</Badge>
			</div>
		</div>

		<!-- Grades -->
		<div class="flex flex-wrap gap-1">
			{#each template.grades.slice(0, 4) as grade}
				<Badge variant="outline" class="text-xs">{grade}</Badge>
			{/each}
			{#if template.grades.length > 4}
				<Badge variant="outline" class="text-xs">+{template.grades.length - 4}</Badge>
			{/if}
		</div>

		<!-- Actions -->
		<div class="flex gap-1">
			<Button
				variant="ghost"
				size="sm"
				class="flex-1"
				onclick={() => onPreview(template.id)}
				title="Aperçu"
			>
				<Eye class="mr-1 h-4 w-4" />
				<span class="hidden sm:inline">Aperçu</span>
			</Button>
			<Button
				variant="ghost"
				size="sm"
				class="flex-1"
				onclick={() => onEdit(template.id)}
				title="Modifier"
			>
				<Pencil class="mr-1 h-4 w-4" />
				<span class="hidden sm:inline">Modifier</span>
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => onDuplicate(template.id)}
				title="Dupliquer"
			>
				<Copy class="h-4 w-4" />
			</Button>
			<Button
				variant="ghost"
				size="sm"
				onclick={() => onDelete(template.id)}
				title="Supprimer"
			>
				<Trash2 class="h-4 w-4 text-destructive" />
			</Button>
		</div>
	</Card.Content>
</Card.Root>
