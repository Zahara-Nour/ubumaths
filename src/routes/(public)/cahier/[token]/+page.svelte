<!--
	Cahier de texte public
	======================

	Ce que voit un élève ou une famille sans compte : les séances publiées d'une
	classe, avec leurs devoirs. Rien d'autre — pas de navigation vers le reste de
	l'application, pas de connexion suggérée, pas de liste d'élèves.

	Page volontairement autonome plutôt que réutilisant les composants de
	`$lib/components/journal` : ceux-ci portent les types et les attentes de
	l'espace authentifié, et cette page doit rester lisible même quand tout le
	reste change.
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import MarkdownRenderer from '$lib/components/markdown/MarkdownRenderer.svelte';
	import { BookOpen, ClipboardList, CalendarDays } from '@lucide/svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	const title = $derived(
		data.journal.class_grade
			? `${data.journal.class_name} · ${data.journal.class_grade}`
			: data.journal.class_name
	);

	/** « lundi 8 septembre » — le format long aide à se repérer sans calendrier. */
	function formatDate(iso: string): string {
		return new Date(`${iso}T00:00:00`).toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long'
		});
	}

	/** Un devoir sans échéance reste un devoir ; on ne l'annonce simplement pas. */
	function formatDueDate(iso: string | null): string | null {
		return iso ? `Pour le ${formatDate(iso)}` : null;
	}
</script>

<svelte:head>
	<title>Cahier de texte — {title}</title>
	<meta name="robots" content="noindex, nofollow" />
</svelte:head>

<div class="mx-auto w-full max-w-3xl space-y-6 p-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold">Cahier de texte</h1>
		<p class="text-muted-foreground">{title}</p>
	</header>

	{#if data.journal.entries.length === 0}
		<Card.Root>
			<Card.Content class="p-6 text-center text-muted-foreground">
				Aucune séance publiée pour l'instant.
			</Card.Content>
		</Card.Root>
	{:else}
		<div class="space-y-4">
			{#each data.journal.entries as entry (entry.id)}
				<Card.Root>
					<Card.Header class="pb-3">
						<div class="flex items-center gap-2 text-sm text-muted-foreground">
							<CalendarDays class="h-4 w-4" />
							<span class="capitalize">{formatDate(entry.entry_date)}</span>
						</div>
					</Card.Header>
					<Card.Content class="space-y-4">
						{#if entry.lesson_content}
							<div class="space-y-1">
								<div class="flex items-center gap-2 text-sm font-medium">
									<BookOpen class="h-4 w-4" />
									En classe
								</div>
								<div class="prose prose-sm max-w-none dark:prose-invert">
									<MarkdownRenderer content={entry.lesson_content} />
								</div>
							</div>
						{/if}

						{#if entry.homework_content}
							<div class="space-y-1 rounded-md bg-muted/50 p-3">
								<div class="flex flex-wrap items-center gap-2 text-sm font-medium">
									<ClipboardList class="h-4 w-4" />
									À faire
									{#if formatDueDate(entry.homework_due_date)}
										<Badge variant="secondary">{formatDueDate(entry.homework_due_date)}</Badge>
									{/if}
								</div>
								<div class="prose prose-sm max-w-none dark:prose-invert">
									<MarkdownRenderer content={entry.homework_content} />
								</div>
							</div>
						{/if}
					</Card.Content>
				</Card.Root>
			{/each}
		</div>
	{/if}

	<p class="pt-2 text-center text-xs text-muted-foreground">
		Lien de consultation. Il ne permet pas de rejoindre la classe ni de se connecter.
	</p>
</div>
