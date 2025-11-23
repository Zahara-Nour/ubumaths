<!--
	MetadataCards Component
	=======================

	Displays worksheet metadata in read-only cards format.
	Shows type, duration, grades, tags, statistics, and dates.

	Usage:
	```svelte
	<script lang="ts">
	  import MetadataCards from '$lib/components/worksheets/MetadataCards.svelte';
	</script>

	<MetadataCards {worksheet} onEdit={() => editMode = true} />
	```
-->
<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import { Separator } from '$lib/components/ui/separator';
	import {
		Clock,
		GraduationCap,
		Tag,
		ListOrdered,
		FileText,
		Calendar,
		Pencil
	} from 'lucide-svelte';
	import {
		WORKSHEET_TYPE_ICONS,
		WORKSHEET_TYPE_LABELS,
		formatDate,
		formatDuration
	} from '$lib/utils/worksheet-constants';
	import { formatGradeShort } from '$lib/utils/grades';
	import type { WorksheetWithRelations } from '$lib/types/worksheets';
	import type { GradeCode } from '$lib/types/grades';

	// Props
	interface Props {
		worksheet: WorksheetWithRelations;
		onEdit?: () => void;
	}

	let { worksheet, onEdit }: Props = $props();

	// Derived: Get type icon component
	let TypeIcon = $derived(worksheet.type ? WORKSHEET_TYPE_ICONS[worksheet.type] : null);
</script>

<!-- Description Card (only if description exists) -->
{#if worksheet.description}
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0">
			<Card.Title class="text-lg">Description</Card.Title>
			{#if onEdit}
				<Button variant="ghost" size="sm" onclick={onEdit}>
					<Pencil class="mr-2 h-4 w-4" />
					Modifier
				</Button>
			{/if}
		</Card.Header>
		<Card.Content>
			<p class="whitespace-pre-wrap">{worksheet.description}</p>
		</Card.Content>
	</Card.Root>
{/if}

<!-- Metadata grid -->
<div class="grid gap-4 md:grid-cols-2">
	<!-- Left column: Information -->
	<Card.Root>
		<Card.Header class="flex flex-row items-center justify-between space-y-0">
			<Card.Title class="text-lg">Informations</Card.Title>
			{#if onEdit && !worksheet.description}
				<Button variant="ghost" size="sm" onclick={onEdit}>
					<Pencil class="mr-2 h-4 w-4" />
					Modifier
				</Button>
			{/if}
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Type -->
			{#if worksheet.type && TypeIcon}
				<div class="flex items-center gap-3">
					<TypeIcon class="h-4 w-4 text-muted-foreground" />
					<div>
						<p class="text-sm text-muted-foreground">Type</p>
						<p class="font-medium">{WORKSHEET_TYPE_LABELS[worksheet.type]}</p>
					</div>
				</div>
				<Separator />
			{/if}

			<!-- Duration -->
			<div class="flex items-center gap-3">
				<Clock class="h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Duree estimee</p>
					<p class="font-medium">{formatDuration(worksheet.estimated_duration_minutes)}</p>
				</div>
			</div>

			<Separator />

			<!-- Grade levels -->
			<div class="flex items-start gap-3">
				<GraduationCap class="mt-0.5 h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Niveaux scolaires</p>
					{#if worksheet.grade_levels && worksheet.grade_levels.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each worksheet.grade_levels as grade, i (i)}
								<Badge variant="outline">
									{formatGradeShort(String(grade) as GradeCode)}
								</Badge>
							{/each}
						</div>
					{:else}
						<p class="font-medium">-</p>
					{/if}
				</div>
			</div>

			<Separator />

			<!-- Tags -->
			<div class="flex items-start gap-3">
				<Tag class="mt-0.5 h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Tags</p>
					{#if worksheet.tags && worksheet.tags.length > 0}
						<div class="mt-1 flex flex-wrap gap-1">
							{#each worksheet.tags as tag (tag)}
								<Badge variant="secondary">{tag}</Badge>
							{/each}
						</div>
					{:else}
						<p class="font-medium">-</p>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Right column: Statistics -->
	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Statistiques</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-4">
			<!-- Points total -->
			<div class="flex items-center gap-3">
				<ListOrdered class="h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Points total</p>
					<p class="font-medium">{worksheet.total_points ?? 0} points</p>
				</div>
			</div>

			<Separator />

			<!-- Exercises count -->
			<div class="flex items-center gap-3">
				<FileText class="h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Exercices</p>
					<p class="font-medium">{worksheet.exercises?.length ?? 0} exercice(s)</p>
				</div>
			</div>

			<Separator />

			<!-- Dates -->
			<div class="flex items-center gap-3">
				<Calendar class="h-4 w-4 text-muted-foreground" />
				<div>
					<p class="text-sm text-muted-foreground">Cree le</p>
					<p class="font-medium">{formatDate(worksheet.created_at)}</p>
				</div>
			</div>

			{#if worksheet.published_at}
				<div class="ml-7 flex items-center gap-3">
					<div>
						<p class="text-sm text-muted-foreground">Publie le</p>
						<p class="font-medium">{formatDate(worksheet.published_at)}</p>
					</div>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
