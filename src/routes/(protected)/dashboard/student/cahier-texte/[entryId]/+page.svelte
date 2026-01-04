<script lang="ts">
	/**
	 * Student Journal Entry Detail Page
	 * ===================================
	 *
	 * Displays a single published journal entry (read-only).
	 * - Lesson content with rich text/math rendering
	 * - Homework content with due date
	 * - Back navigation
	 */

	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Breadcrumb from '$lib/components/ui/breadcrumb';
	import { Badge } from '$lib/components/ui/badge';
	import { transformMathHtml } from '$lib/utils/sanitize';
	import {
		BookOpen,
		ArrowLeft,
		FileText,
		ClipboardList,
		Calendar,
		User,
		Clock
	} from 'lucide-svelte';
	import type { PageData } from './$types';

	interface Props {
		data: PageData;
	}

	let { data }: Props = $props();

	/**
	 * Format date for display (e.g., "Lundi 15 janvier 2024")
	 */
	function formatDateLong(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	/**
	 * Format short date (e.g., "15 janvier")
	 */
	function formatDateShort(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long'
		});
	}

	/**
	 * Calculate days until due date
	 */
	function getDaysUntilDue(dueDateStr: string): { text: string; isUrgent: boolean } {
		const today = new Date();
		today.setHours(0, 0, 0, 0);
		const dueDate = new Date(dueDateStr);
		const diffTime = dueDate.getTime() - today.getTime();
		const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));

		if (diffDays < 0) {
			return {
				text: `En retard de ${Math.abs(diffDays)} jour${Math.abs(diffDays) > 1 ? 's' : ''}`,
				isUrgent: true
			};
		}
		if (diffDays === 0) {
			return { text: "Aujourd'hui", isUrgent: true };
		}
		if (diffDays === 1) {
			return { text: 'Demain', isUrgent: true };
		}
		if (diffDays <= 2) {
			return { text: `Dans ${diffDays} jours`, isUrgent: true };
		}
		return { text: `Dans ${diffDays} jours`, isUrgent: false };
	}

	/**
	 * Navigate back to main view
	 */
	function goBack() {
		goto('/dashboard/student/cahier-texte');
	}

	// Transformed content for safe rendering
	let lessonHtml = $derived(transformMathHtml(data.entry.lessonContent || ''));
	let homeworkHtml = $derived(transformMathHtml(data.entry.homeworkContent || ''));

	// Due date info
	let dueDateInfo = $derived(
		data.entry.homeworkDueDate ? getDaysUntilDue(data.entry.homeworkDueDate) : null
	);
</script>

<svelte:head>
	<title>{formatDateLong(data.entry.entryDate)} - {data.classData.name} | UbuMaths</title>
</svelte:head>

<main class="container mx-auto max-w-4xl px-4 py-8">
	<!-- Breadcrumb -->
	<Breadcrumb.Root class="mb-6">
		<Breadcrumb.List>
			<Breadcrumb.Item>
				<Breadcrumb.Link href="/dashboard/student/cahier-texte">Cahier de Texte</Breadcrumb.Link>
			</Breadcrumb.Item>
			<Breadcrumb.Separator />
			<Breadcrumb.Item>
				<Breadcrumb.Page>{formatDateLong(data.entry.entryDate)}</Breadcrumb.Page>
			</Breadcrumb.Item>
		</Breadcrumb.List>
	</Breadcrumb.Root>

	<!-- Header -->
	<div class="mb-8 flex items-start gap-4">
		<Button variant="ghost" size="icon" onclick={goBack} title="Retour">
			<ArrowLeft class="h-5 w-5" />
		</Button>
		<div class="flex items-center gap-3">
			<div class="flex h-12 w-12 items-center justify-center rounded-xl bg-primary/10">
				<BookOpen class="h-6 w-6 text-primary" />
			</div>
			<div>
				<h1 class="text-2xl font-bold tracking-tight capitalize">
					{formatDateLong(data.entry.entryDate)}
				</h1>
				<p class="text-muted-foreground">
					{data.classData.name} - {data.classData.level}
				</p>
			</div>
		</div>
	</div>

	<!-- Teacher info -->
	<div class="mb-6 flex items-center gap-2 text-sm text-muted-foreground">
		<User class="h-4 w-4" />
		<span>{data.teacherName}</span>
	</div>

	<div class="space-y-6">
		<!-- Lesson Content -->
		{#if data.entry.lessonContent}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2">
						<FileText class="h-5 w-5 text-primary" />
						Contenu de la seance
					</Card.Title>
				</Card.Header>
				<Card.Content>
					<div class="prose prose-sm max-w-none dark:prose-invert">
						{@html lessonHtml}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Homework Content -->
		{#if data.entry.homeworkContent}
			<Card.Root class={dueDateInfo?.isUrgent ? 'border-orange-300 dark:border-orange-700' : ''}>
				<Card.Header>
					<div class="flex items-start justify-between gap-4">
						<Card.Title class="flex items-center gap-2">
							<ClipboardList class="h-5 w-5 text-orange-500" />
							Travail a faire
						</Card.Title>
						{#if dueDateInfo}
							<Badge variant={dueDateInfo.isUrgent ? 'destructive' : 'secondary'}>
								<Clock class="mr-1 h-3 w-3" />
								{dueDateInfo.text}
							</Badge>
						{/if}
					</div>
					{#if data.entry.homeworkDueDate}
						<Card.Description class="mt-2 flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							A rendre pour le {formatDateShort(data.entry.homeworkDueDate)}
						</Card.Description>
					{/if}
				</Card.Header>
				<Card.Content>
					<div class="prose prose-sm max-w-none dark:prose-invert">
						{@html homeworkHtml}
					</div>
				</Card.Content>
			</Card.Root>
		{/if}

		<!-- Empty state if no content -->
		{#if !data.entry.lessonContent && !data.entry.homeworkContent}
			<Card.Root>
				<Card.Content class="py-12 text-center">
					<BookOpen class="mx-auto mb-4 h-12 w-12 text-muted-foreground/50" />
					<p class="text-muted-foreground">Aucun contenu pour cette entree</p>
				</Card.Content>
			</Card.Root>
		{/if}
	</div>

	<!-- Back button -->
	<div class="mt-8">
		<Button variant="outline" onclick={goBack}>
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour au cahier de texte
		</Button>
	</div>
</main>

<style>
	/* Ensure math-field elements render correctly */
	:global(.math-inline-wrapper) {
		display: inline;
	}
	:global(.math-block-wrapper) {
		display: block;
		text-align: center;
		margin: 1rem 0;
	}
	:global(math-field) {
		font-size: inherit;
	}
</style>
