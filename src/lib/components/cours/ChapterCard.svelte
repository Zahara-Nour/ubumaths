<!--
	ChapterCard Component
	=====================

	Card displaying chapter summary for list view.
	Shows title, description, content counts (docs, quiz, exercises, checklist),
	and progress bar at the bottom.

	@module components/cours/ChapterCard
-->
<script lang="ts">
	import type {
		ChapterSummary,
		ChapterProgress,
		ChapterColor,
		ChapterIcon
	} from '$lib/types/chapters';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Progress } from '$lib/components/ui/progress';
	import { cn } from '$lib/utils';
	import {
		FileText,
		HelpCircle,
		BookOpen,
		CheckSquare,
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
		Box
	} from 'lucide-svelte';

	// Props
	interface Props {
		chapter: ChapterSummary;
		progress?: ChapterProgress;
		href: string;
	}

	let { chapter, progress, href }: Props = $props();

	// Icon mapping from ChapterIcon to Lucide component
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

	// Color classes for different chapter colors
	function getColorClasses(color: ChapterColor | null): {
		bg: string;
		border: string;
		accent: string;
	} {
		const colorMap: Record<ChapterColor, { bg: string; border: string; accent: string }> = {
			slate: {
				bg: 'bg-slate-50 dark:bg-slate-900/50',
				border: 'border-slate-200 dark:border-slate-700',
				accent: 'bg-slate-500'
			},
			red: {
				bg: 'bg-red-50 dark:bg-red-900/30',
				border: 'border-red-200 dark:border-red-800',
				accent: 'bg-red-500'
			},
			orange: {
				bg: 'bg-orange-50 dark:bg-orange-900/30',
				border: 'border-orange-200 dark:border-orange-800',
				accent: 'bg-orange-500'
			},
			amber: {
				bg: 'bg-amber-50 dark:bg-amber-900/30',
				border: 'border-amber-200 dark:border-amber-800',
				accent: 'bg-amber-500'
			},
			yellow: {
				bg: 'bg-yellow-50 dark:bg-yellow-900/30',
				border: 'border-yellow-200 dark:border-yellow-800',
				accent: 'bg-yellow-500'
			},
			lime: {
				bg: 'bg-lime-50 dark:bg-lime-900/30',
				border: 'border-lime-200 dark:border-lime-800',
				accent: 'bg-lime-500'
			},
			green: {
				bg: 'bg-green-50 dark:bg-green-900/30',
				border: 'border-green-200 dark:border-green-800',
				accent: 'bg-green-500'
			},
			emerald: {
				bg: 'bg-emerald-50 dark:bg-emerald-900/30',
				border: 'border-emerald-200 dark:border-emerald-800',
				accent: 'bg-emerald-500'
			},
			teal: {
				bg: 'bg-teal-50 dark:bg-teal-900/30',
				border: 'border-teal-200 dark:border-teal-800',
				accent: 'bg-teal-500'
			},
			cyan: {
				bg: 'bg-cyan-50 dark:bg-cyan-900/30',
				border: 'border-cyan-200 dark:border-cyan-800',
				accent: 'bg-cyan-500'
			},
			sky: {
				bg: 'bg-sky-50 dark:bg-sky-900/30',
				border: 'border-sky-200 dark:border-sky-800',
				accent: 'bg-sky-500'
			},
			blue: {
				bg: 'bg-blue-50 dark:bg-blue-900/30',
				border: 'border-blue-200 dark:border-blue-800',
				accent: 'bg-blue-500'
			},
			indigo: {
				bg: 'bg-indigo-50 dark:bg-indigo-900/30',
				border: 'border-indigo-200 dark:border-indigo-800',
				accent: 'bg-indigo-500'
			},
			violet: {
				bg: 'bg-violet-50 dark:bg-violet-900/30',
				border: 'border-violet-200 dark:border-violet-800',
				accent: 'bg-violet-500'
			},
			purple: {
				bg: 'bg-purple-50 dark:bg-purple-900/30',
				border: 'border-purple-200 dark:border-purple-800',
				accent: 'bg-purple-500'
			},
			fuchsia: {
				bg: 'bg-fuchsia-50 dark:bg-fuchsia-900/30',
				border: 'border-fuchsia-200 dark:border-fuchsia-800',
				accent: 'bg-fuchsia-500'
			},
			pink: {
				bg: 'bg-pink-50 dark:bg-pink-900/30',
				border: 'border-pink-200 dark:border-pink-800',
				accent: 'bg-pink-500'
			},
			rose: {
				bg: 'bg-rose-50 dark:bg-rose-900/30',
				border: 'border-rose-200 dark:border-rose-800',
				accent: 'bg-rose-500'
			}
		};

		if (!color) {
			return { bg: 'bg-card', border: 'border-border', accent: 'bg-primary' };
		}

		return colorMap[color];
	}

	// Truncate description to max length
	function truncateDescription(text: string | null, maxLength: number = 120): string {
		if (!text) return '';
		if (text.length <= maxLength) return text;
		return text.substring(0, maxLength).trim() + '...';
	}

	// Derived values
	const colorClasses = $derived(getColorClasses(chapter.color));
	const ChapterIconComponent = $derived(chapter.icon ? iconMap[chapter.icon] : Book);
	const truncatedDescription = $derived(truncateDescription(chapter.description));
	const progressPercent = $derived(progress?.checklistProgress ?? 0);

	// Content counts
	const hasContent = $derived(
		chapter.documentCount > 0 ||
			chapter.quizQuestionCount > 0 ||
			chapter.exerciseCount > 0 ||
			chapter.checklistItemCount > 0
	);
</script>

<a
	{href}
	class="block rounded-xl transition-all duration-200 hover:scale-[1.02] focus:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
>
	<Card.Root class={cn('relative overflow-hidden', colorClasses.bg, colorClasses.border)}>
		<!-- Color accent bar at top -->
		<div class={cn('absolute top-0 right-0 left-0 h-1', colorClasses.accent)}></div>

		<Card.Header class="pt-5">
			<div class="flex items-start gap-3">
				<!-- Icon -->
				<div class={cn('rounded-lg p-2', colorClasses.accent, 'text-white')}>
					<ChapterIconComponent class="h-5 w-5" />
				</div>

				<!-- Title and visibility -->
				<div class="min-w-0 flex-1">
					<Card.Title class="line-clamp-2 text-lg font-semibold">
						{chapter.title}
					</Card.Title>
					{#if !chapter.isVisible}
						<Badge variant="secondary" class="mt-1">Masque</Badge>
					{/if}
				</div>
			</div>
		</Card.Header>

		<Card.Content class="space-y-4">
			<!-- Description -->
			{#if truncatedDescription}
				<p class="line-clamp-2 text-sm text-muted-foreground">
					{truncatedDescription}
				</p>
			{/if}

			<!-- Content counts -->
			{#if hasContent}
				<div class="flex flex-wrap gap-3 text-xs text-muted-foreground">
					{#if chapter.documentCount > 0}
						<div class="flex items-center gap-1">
							<FileText class="h-3.5 w-3.5" />
							<span>{chapter.documentCount} doc{chapter.documentCount > 1 ? 's' : ''}</span>
						</div>
					{/if}
					{#if chapter.quizQuestionCount > 0}
						<div class="flex items-center gap-1">
							<HelpCircle class="h-3.5 w-3.5" />
							<span>{chapter.quizQuestionCount} quiz</span>
						</div>
					{/if}
					{#if chapter.exerciseCount > 0}
						<div class="flex items-center gap-1">
							<BookOpen class="h-3.5 w-3.5" />
							<span>{chapter.exerciseCount} exercice{chapter.exerciseCount > 1 ? 's' : ''}</span>
						</div>
					{/if}
					{#if chapter.checklistItemCount > 0}
						<div class="flex items-center gap-1">
							<CheckSquare class="h-3.5 w-3.5" />
							<span
								>{chapter.checklistItemCount} objectif{chapter.checklistItemCount > 1
									? 's'
									: ''}</span
							>
						</div>
					{/if}
				</div>
			{/if}
		</Card.Content>

		<!-- Progress bar at bottom -->
		{#if progress}
			<Card.Footer class="pt-0">
				<div class="w-full space-y-1">
					<div class="flex justify-between text-xs text-muted-foreground">
						<span>Progression</span>
						<span>{progressPercent}%</span>
					</div>
					<Progress value={progressPercent} max={100} class="h-2" />
				</div>
			</Card.Footer>
		{/if}
	</Card.Root>
</a>
