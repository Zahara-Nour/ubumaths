<!--
	WorksheetCard Component
	=======================
	Card component for displaying worksheet assignment info in student view

	Props:
	- worksheet: StudentWorksheetListItem - Worksheet assignment data
-->

<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import {
		FileText,
		Clock,
		CheckCircle,
		GraduationCap,
		ListChecks,
		Calendar,
		ClipboardList,
		BookOpen,
		PenLine,
		FileQuestion,
		ArrowRight
	} from 'lucide-svelte';
	import type { StudentWorksheetListItem, WorksheetType } from '$lib/types/worksheets';

	interface Props {
		worksheet: StudentWorksheetListItem;
	}

	let { worksheet }: Props = $props();

	// Get icon and label for worksheet type
	function getTypeInfo(type: WorksheetType): { icon: typeof FileText; label: string } {
		switch (type) {
			case 'worksheet':
				return { icon: FileText, label: 'Fiche de travail' };
			case 'assessment':
				return { icon: ClipboardList, label: 'Evaluation' };
			case 'exam':
				return { icon: GraduationCap, label: 'Examen' };
			case 'quiz':
				return { icon: FileQuestion, label: 'Quiz' };
			case 'homework':
				return { icon: PenLine, label: 'Devoir' };
			default:
				return { icon: BookOpen, label: 'Fiche' };
		}
	}

	// Get badge variant for worksheet type
	function getTypeBadgeVariant(
		type: WorksheetType
	): 'default' | 'secondary' | 'destructive' | 'outline' | 'warning' | 'success' {
		switch (type) {
			case 'exam':
				return 'destructive';
			case 'assessment':
				return 'warning';
			case 'homework':
				return 'default';
			case 'quiz':
				return 'secondary';
			default:
				return 'outline';
		}
	}

	// Format due date relative to now
	function formatDueDate(dueAt: string | null): { text: string; urgent: boolean } {
		if (!dueAt) {
			return { text: 'Pas de date limite', urgent: false };
		}

		const due = new Date(dueAt);
		const now = new Date();
		const diffMs = due.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMs < 0) {
			return { text: 'Date limite depassee', urgent: true };
		}

		if (diffHours < 24) {
			if (diffHours < 1) {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return { text: `Dans ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`, urgent: true };
			}
			return { text: `Dans ${diffHours} heure${diffHours > 1 ? 's' : ''}`, urgent: true };
		}

		if (diffDays === 1) {
			return { text: 'Demain', urgent: true };
		}

		if (diffDays < 7) {
			return { text: `Dans ${diffDays} jours`, urgent: diffDays <= 2 };
		}

		// Format as date
		const formattedDate = due.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: due.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
		return { text: `Pour le ${formattedDate}`, urgent: false };
	}

	// Derived values
	let typeInfo = $derived(getTypeInfo(worksheet.type));
	let typeBadgeVariant = $derived(getTypeBadgeVariant(worksheet.type));
	let dueInfo = $derived(formatDueDate(worksheet.due_at));
	let TypeIcon = $derived(typeInfo.icon);
</script>

<Card.Root class="flex flex-col transition-shadow hover:shadow-lg">
	<Card.Header class="pb-3">
		<div class="mb-2 flex flex-wrap items-center gap-2">
			<Badge variant={typeBadgeVariant}>
				<TypeIcon class="mr-1 h-3 w-3" />
				{typeInfo.label}
			</Badge>
			{#if worksheet.show_corrections}
				<Badge variant="success">
					<CheckCircle class="mr-1 h-3 w-3" />
					Corrections disponibles
				</Badge>
			{/if}
		</div>
		<Card.Title class="line-clamp-2 text-xl leading-tight">{worksheet.title}</Card.Title>
		{#if worksheet.class_name}
			<Card.Description class="mt-1 flex items-center gap-1.5">
				<GraduationCap class="h-4 w-4 flex-shrink-0" />
				<span>{worksheet.class_name}</span>
			</Card.Description>
		{/if}
	</Card.Header>

	<Card.Content class="flex-1 space-y-3">
		<!-- Exercise count -->
		<div class="flex items-center gap-2 text-sm text-muted-foreground">
			<ListChecks class="h-4 w-4 flex-shrink-0" />
			<span>
				{worksheet.exercise_count} exercice{worksheet.exercise_count > 1 ? 's' : ''}
			</span>
		</div>

		<!-- Due date -->
		<div
			class="flex items-center gap-2 text-sm"
			class:text-destructive={dueInfo.urgent}
			class:text-muted-foreground={!dueInfo.urgent}
		>
			{#if worksheet.due_at}
				<Calendar class="h-4 w-4 flex-shrink-0" />
			{:else}
				<Clock class="h-4 w-4 flex-shrink-0" />
			{/if}
			<span class:font-medium={dueInfo.urgent}>{dueInfo.text}</span>
		</div>
	</Card.Content>

	<Card.Footer class="pt-3">
		<Button
			variant="outline"
			class="w-full"
			href="/dashboard/student/worksheets/{worksheet.assignment_id}"
		>
			Voir la fiche
			<ArrowRight class="ml-2 h-4 w-4" />
		</Button>
	</Card.Footer>
</Card.Root>
