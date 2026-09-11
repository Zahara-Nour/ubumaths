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
	import { linkifyResourceReferences } from '$lib/resources/linkify';
	import { GRADES, type GradeCode } from '$lib/types/grades';
	import {
		BookOpen,
		ArrowLeft,
		FileText,
		ClipboardList,
		Calendar,
		User,
		Clock
	} from '@lucide/svelte';
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
	 *
	 * ⚠️ Les deux bornes sont prises à minuit UTC. L'ancien calcul comparait
	 * minuit LOCAL (`setHours(0,0,0,0)`) à `new Date('2026-09-17')`, qui est
	 * minuit UTC : à Paris, deux heures d'écart que `Math.ceil` arrondissait au
	 * jour supérieur. La page annonçait « Dans 8 jours » là où le panneau
	 * « Travail à faire », calculé côté serveur, disait 7 — pour la même date,
	 * sur le même écran.
	 */
	function getDaysUntilDue(dueDateStr: string): { text: string; isUrgent: boolean } {
		const maintenant = new Date();
		const todayUtc = Date.UTC(
			maintenant.getUTCFullYear(),
			maintenant.getUTCMonth(),
			maintenant.getUTCDate()
		);
		const diffDays = Math.round((Date.parse(`${dueDateStr}T00:00:00Z`) - todayUtc) / 86_400_000);

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

	// Transformed content for safe rendering.
	//
	// La transformation des références vient APRÈS l'assainissement : elle
	// réinjecte le libellé tel quel dans le document, donc il doit déjà être du
	// texte échappé. Sans elle, l'élève lit littéralement `[[exercise:3f2a…|…]]`.
	function renderContent(raw: string | null | undefined): string {
		return linkifyResourceReferences(transformMathHtml(raw || ''), { role: 'student' });
	}

	let lessonHtml = $derived(renderContent(data.entry.lessonContent));

	/**
	 * Les homeworkItems de la séance, chacun avec son rendu et son décompte.
	 *
	 * Calculé en une fois plutôt qu'appelé depuis le balisage : `getDaysUntilDue`
	 * lit l'heure courante, et une fonction impure dans un `{#each}` se
	 * recalculerait à chaque rendu sans que rien n'ait changé.
	 */
	let homeworkItems = $derived(
		data.entry.homework.map((travail) => ({
			...travail,
			html: renderContent(travail.content),
			echeance: travail.dueDate ? getDaysUntilDue(travail.dueDate) : null
		}))
	);

	/** Y a-t-il quoi que ce soit à montrer sur cette séance ? */
	let sessionIsEmpty = $derived(!data.entry.lessonContent && homeworkItems.length === 0);
</script>

<svelte:head>
	<title>{formatDateLong(data.entry.entryDate)} - {data.classData.name} | Chiphre</title>
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
					{data.classData.name}{#if data.classData.grade}
						- {GRADES[data.classData.grade as GradeCode]?.displayName ?? data.classData.grade}{/if}
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

		<!-- Travail à faire : une carte par échéance. Les fondre en une seule
		     obligerait à choisir une date pour deux devoirs qui n'en partagent
		     pas. -->
		{#each homeworkItems as travail (travail.id)}
			<Card.Root
				class={travail.echeance?.isUrgent ? 'border-orange-300 dark:border-orange-700' : ''}
			>
				<Card.Header>
					<div class="flex items-start justify-between gap-4">
						<Card.Title class="flex items-center gap-2">
							<ClipboardList class="h-5 w-5 text-orange-500" />
							Travail a faire
						</Card.Title>
						{#if travail.echeance}
							<Badge variant={travail.echeance.isUrgent ? 'destructive' : 'secondary'}>
								<Clock class="mr-1 h-3 w-3" />
								{travail.echeance.text}
							</Badge>
						{/if}
					</div>
					{#if travail.dueDate}
						<Card.Description class="mt-2 flex items-center gap-2">
							<Calendar class="h-4 w-4" />
							A rendre pour le {formatDateShort(travail.dueDate)}
						</Card.Description>
					{/if}
				</Card.Header>
				<Card.Content>
					<div class="prose prose-sm max-w-none dark:prose-invert">
						{@html travail.html}
					</div>
				</Card.Content>
			</Card.Root>
		{/each}

		<!-- Empty state if no content -->
		{#if sessionIsEmpty}
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
