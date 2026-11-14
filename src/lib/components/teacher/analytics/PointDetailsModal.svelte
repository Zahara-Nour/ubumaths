<!--
	PointDetailsModal
	=================
	Fenêtre d'un point du programme du widget E (« Top points à remédier ») :
	- onglet « Élèves » : les élèves concernés et leur badge ;
	- onglet « Erreurs » (chantier `erreurs-frequentes`, PR 2) : pour chaque
	  modèle du point, les erreurs de la classe (séries et contrôles), lues à la
	  PREMIÈRE ouverture de l'onglet seulement ; un échec se relit à l'ouverture
	  suivante.

	Props:
	- open (bindable), classId, pointId, title
	- students: élèves concernés (nom, légende)
-->

<script lang="ts">
	import { lore } from '$lib/config/lore';
	import * as Dialog from '$lib/components/ui/dialog';
	import * as Tabs from '$lib/components/ui/tabs';
	import InlineMarkdown from '$lib/components/markdown/InlineMarkdown.svelte';
	import QuestionErrorsPanel from '$lib/components/assessments/QuestionErrorsPanel.svelte';
	import {
		POINT_ERRORS_EMPTY,
		POINT_ERRORS_MESSAGE,
		type ClassPointErrors,
		type PointTemplateErrors
	} from '$lib/types/point-errors';

	interface StudentEntry {
		student_id: string;
		display_name: string;
		caption?: string;
	}

	interface Props {
		open: boolean;
		classId: string;
		pointId: string;
		title: string;
		students: StudentEntry[];
	}

	type ErrorsState =
		| { phase: 'idle' }
		| { phase: 'loading' }
		| { phase: 'error' }
		| { phase: 'done'; templates: PointTemplateErrors[] };

	let { open = $bindable(), classId, pointId, title, students }: Props = $props();

	let tab = $state('students');
	let errorsState = $state<ErrorsState>({ phase: 'idle' });

	async function loadErrors(): Promise<void> {
		errorsState = { phase: 'loading' };
		try {
			const response = await fetch(
				`/api/teacher/classes/${classId}/analytics/point-errors?point=${encodeURIComponent(pointId)}`
			);
			const body = (await response.json()) as ClassPointErrors;
			errorsState =
				response.ok && body.status === 'ok'
					? { phase: 'done', templates: body.templates }
					: { phase: 'error' };
		} catch {
			errorsState = { phase: 'error' };
		}
	}

	/** Réponses écrites = comptées moins sans réponse */
	function writtenLabel(entry: PointTemplateErrors): string {
		const n = entry.errors.answers - entry.errors.withoutAnswer;
		return `${n} réponse${n > 1 ? 's' : ''} écrite${n > 1 ? 's' : ''}`;
	}

	function handleTabChange(value: string): void {
		tab = value;
		if (value === 'errors' && (errorsState.phase === 'idle' || errorsState.phase === 'error')) {
			void loadErrors();
		}
	}
</script>

<Dialog.Root bind:open>
	<Dialog.Portal>
		<Dialog.Overlay />
		<Dialog.Content class="max-h-[85vh] overflow-y-auto sm:max-w-3xl">
			<Dialog.Header>
				<Dialog.Title><InlineMarkdown content={title} /></Dialog.Title>
				<Dialog.Description>Point du programme.</Dialog.Description>
			</Dialog.Header>

			<Tabs.Root value={tab} onValueChange={handleTabChange}>
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="students">{lore.entities.student}s concernés</Tabs.Trigger>
					<Tabs.Trigger value="errors">Erreurs</Tabs.Trigger>
				</Tabs.List>

				<Tabs.Content value="students" class="mt-4">
					{#if students.length === 0}
						<p class="py-4 text-center text-sm text-muted-foreground">
							Aucun {lore.entities.student} à afficher.
						</p>
					{:else}
						<ul class="divide-y divide-border">
							{#each students as student (student.student_id)}
								<li class="flex items-center justify-between py-2 text-sm">
									<span class="font-medium">{student.display_name}</span>
									{#if student.caption}
										<span class="text-xs text-muted-foreground">{student.caption}</span>
									{/if}
								</li>
							{/each}
						</ul>
					{/if}
				</Tabs.Content>

				<Tabs.Content value="errors" class="mt-4">
					{#if errorsState.phase === 'idle' || errorsState.phase === 'loading'}
						<p class="py-3 text-sm text-muted-foreground" role="status">Chargement des erreurs…</p>
					{:else if errorsState.phase === 'error'}
						<p class="py-3 text-sm text-destructive" role="alert">{POINT_ERRORS_MESSAGE}</p>
					{:else if errorsState.templates.length === 0}
						<p class="py-3 text-sm text-muted-foreground">{POINT_ERRORS_EMPTY}</p>
					{:else}
						<div class="space-y-6">
							{#each errorsState.templates as entry (entry.templateId)}
								<section class="space-y-1">
									<h3 class="font-medium"><InlineMarkdown content={entry.title} /></h3>
									<p class="text-xs text-muted-foreground">
										{writtenLabel(entry)}
										{#if entry.capped}
											· séries : seules les réponses les plus récentes sont montrées{/if}
									</p>
									<QuestionErrorsPanel errors={entry.errors} />
								</section>
							{/each}
						</div>
					{/if}
				</Tabs.Content>
			</Tabs.Root>
		</Dialog.Content>
	</Dialog.Portal>
</Dialog.Root>
