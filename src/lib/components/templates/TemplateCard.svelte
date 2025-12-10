<!--
	TemplateCard Component
	======================

	Card displaying template summary with actions.
	Shows title, description, grades, status, content counts, and color/icon.

	@module components/templates/TemplateCard
-->
<script lang="ts">
	import type { TemplateSummary } from '$lib/types/chapter-templates';
	import { getStatusLabel, getStatusColorClasses } from '$lib/types/chapter-templates';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
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
		Eye,
		Pencil,
		Copy,
		FileText,
		ClipboardList,
		HelpCircle,
		Dumbbell
	} from 'lucide-svelte';
	import type { ChapterIcon } from '$lib/types/chapters';

	// Props
	interface Props {
		template: TemplateSummary;
		onSelect?: (template: TemplateSummary) => void;
		onEdit?: (template: TemplateSummary) => void;
		onInstantiate?: (template: TemplateSummary) => void;
		class?: string;
	}

	let { template, onSelect, onEdit, onInstantiate, class: className = '' }: Props = $props();

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

	// Get icon component
	const IconComponent = $derived(template.icon ? iconMap[template.icon] : Book);

	// Get status classes
	const statusClasses = $derived(getStatusColorClasses(template.status));

	// Truncate description
	function truncate(text: string | null, maxLength: number): string {
		if (!text) return '';
		return text.length > maxLength ? text.slice(0, maxLength) + '...' : text;
	}
</script>

<Card.Root
	class={cn(
		'group relative overflow-hidden transition-all hover:shadow-lg',
		template.color && `border-l-4 border-l-${template.color}-500`,
		className
	)}
>
	<!-- Color accent bar -->
	{#if template.color}
		<div class={cn('absolute top-0 left-0 h-full w-1', `bg-${template.color}-500`)}></div>
	{/if}

	<Card.Header class="pb-3">
		<div class="flex items-start justify-between gap-3">
			<!-- Icon -->
			<div
				class={cn(
					'flex h-10 w-10 items-center justify-center rounded-lg text-white',
					template.color ? `bg-${template.color}-500` : 'bg-primary'
				)}
			>
				<IconComponent class="h-5 w-5" />
			</div>

			<!-- Status badge -->
			<Badge
				variant="outline"
				class={cn(statusClasses.bg, statusClasses.text, statusClasses.border, 'border')}
			>
				{getStatusLabel(template.status)}
			</Badge>
		</div>

		<div class="mt-3">
			<Card.Title class="line-clamp-1 text-lg">{template.title}</Card.Title>
			{#if template.description}
				<Card.Description class="mt-1.5 line-clamp-2 text-sm">
					{truncate(template.description, 120)}
				</Card.Description>
			{/if}
		</div>
	</Card.Header>

	<Card.Content class="space-y-3 pb-3">
		<!-- Grades -->
		{#if template.grades.length > 0}
			<div class="flex flex-wrap gap-1">
				{#each template.grades as grade (grade)}
					<Badge variant="secondary" class="text-xs">
						{grade}e
					</Badge>
				{/each}
			</div>
		{:else}
			<Badge variant="secondary" class="text-xs">Tous niveaux</Badge>
		{/if}

		<!-- Content counts -->
		<div class="grid grid-cols-2 gap-2 text-xs text-muted-foreground">
			<div class="flex items-center gap-1.5">
				<FileText class="h-3.5 w-3.5" />
				<span>{template.documentCount} doc{template.documentCount > 1 ? 's' : ''}</span>
			</div>
			<div class="flex items-center gap-1.5">
				<HelpCircle class="h-3.5 w-3.5" />
				<span>{template.quizQuestionCount} quiz</span>
			</div>
			<div class="flex items-center gap-1.5">
				<ClipboardList class="h-3.5 w-3.5" />
				<span>{template.checklistItemCount} obj.</span>
			</div>
			<div class="flex items-center gap-1.5">
				<Dumbbell class="h-3.5 w-3.5" />
				<span>{template.exerciseCount} ex.</span>
			</div>
		</div>

		<!-- Metadata -->
		<div class="flex items-center justify-between border-t pt-2 text-xs text-muted-foreground">
			<span>
				{template.instantiationCount} utilisation{template.instantiationCount > 1 ? 's' : ''}
			</span>
			<span>v{template.currentVersion}</span>
		</div>

		{#if template.creatorName}
			<p class="text-xs text-muted-foreground">
				Par {template.creatorName}
			</p>
		{/if}
	</Card.Content>

	<Card.Footer class="flex gap-2 pt-0">
		{#if onSelect}
			<Button variant="outline" size="sm" onclick={() => onSelect?.(template)} class="flex-1">
				<Eye class="mr-1 h-4 w-4" />
				Voir
			</Button>
		{/if}

		{#if template.isOwner && onEdit}
			<Button variant="outline" size="sm" onclick={() => onEdit?.(template)} class="flex-1">
				<Pencil class="mr-1 h-4 w-4" />
				Modifier
			</Button>
		{/if}

		{#if onInstantiate}
			<Button variant="default" size="sm" onclick={() => onInstantiate?.(template)} class="flex-1">
				<Copy class="mr-1 h-4 w-4" />
				Utiliser
			</Button>
		{/if}
	</Card.Footer>
</Card.Root>
