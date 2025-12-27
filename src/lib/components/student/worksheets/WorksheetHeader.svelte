<!--
	WorksheetHeader Component
	=========================
	Header section for the student worksheet detail page.
	Displays worksheet metadata including title, type, class, dates, and instructions.

	Props:
	- worksheet: StudentWorksheetView - The worksheet data from the API
-->

<script lang="ts">
	import { Badge } from '$lib/components/ui/badge';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import {
		ArrowLeft,
		Calendar,
		CheckCircle,
		FileText,
		GraduationCap,
		ClipboardList,
		FileQuestion,
		PenLine,
		BookOpen,
		Info
	} from 'lucide-svelte';
	import type { StudentWorksheetView, WorksheetType } from '$lib/types/worksheets';

	interface Props {
		worksheet: StudentWorksheetView;
	}

	let { worksheet }: Props = $props();

	// Get icon and label for worksheet type (same logic as WorksheetCard)
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

	// Get badge variant for worksheet type (same logic as WorksheetCard)
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

	// Format closes_at date relative to now (same logic as WorksheetCard)
	function formatClosesAt(closesAt: string | null): { text: string; urgent: boolean } {
		if (!closesAt) {
			return { text: 'Disponible indefiniment', urgent: false };
		}

		const closes = new Date(closesAt);
		const now = new Date();
		const diffMs = closes.getTime() - now.getTime();
		const diffDays = Math.floor(diffMs / (1000 * 60 * 60 * 24));
		const diffHours = Math.floor(diffMs / (1000 * 60 * 60));

		if (diffMs < 0) {
			return { text: "N'est plus disponible", urgent: true };
		}

		if (diffHours < 24) {
			if (diffHours < 1) {
				const diffMinutes = Math.floor(diffMs / (1000 * 60));
				return {
					text: `Disponible encore ${diffMinutes} minute${diffMinutes > 1 ? 's' : ''}`,
					urgent: true
				};
			}
			return {
				text: `Disponible encore ${diffHours} heure${diffHours > 1 ? 's' : ''}`,
				urgent: true
			};
		}

		if (diffDays === 1) {
			return { text: "Disponible jusqu'a demain", urgent: true };
		}

		if (diffDays < 7) {
			return { text: `Disponible encore ${diffDays} jours`, urgent: diffDays <= 2 };
		}

		// Format as date
		const formattedDate = closes.toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: closes.getFullYear() !== now.getFullYear() ? 'numeric' : undefined
		});
		return { text: `Disponible jusqu'au ${formattedDate}`, urgent: false };
	}

	// Derived values
	let typeInfo = $derived(getTypeInfo(worksheet.type));
	let typeBadgeVariant = $derived(getTypeBadgeVariant(worksheet.type));
	let closesInfo = $derived(formatClosesAt(worksheet.closes_at));
	let TypeIcon = $derived(typeInfo.icon);
</script>

<div class="space-y-4">
	<!-- Back Button -->
	<Button variant="ghost" href="/dashboard/student/worksheets" class="gap-2 pl-2">
		<ArrowLeft class="h-4 w-4" />
		Retour aux fiches
	</Button>

	<!-- Header Card -->
	<Card.Root>
		<Card.Header>
			<!-- Badges Row -->
			<div class="mb-3 flex flex-wrap items-center gap-2">
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

			<!-- Title -->
			<Card.Title class="text-2xl leading-tight sm:text-3xl">{worksheet.title}</Card.Title>

			<!-- Class Name -->
			{#if worksheet.class_name}
				<Card.Description class="mt-2 flex items-center gap-1.5 text-base">
					<GraduationCap class="h-4 w-4 flex-shrink-0" />
					<span>{worksheet.class_name}</span>
				</Card.Description>
			{/if}
		</Card.Header>

		<Card.Content class="space-y-4">
			<!-- Availability (only show if there's a deadline) -->
			{#if worksheet.closes_at}
				<div
					class="flex items-center gap-2"
					class:text-destructive={closesInfo.urgent}
					class:text-muted-foreground={!closesInfo.urgent}
				>
					<Calendar class="h-4 w-4 flex-shrink-0" />
					<span class:font-medium={closesInfo.urgent}>{closesInfo.text}</span>
				</div>
			{/if}

			<!-- Description -->
			{#if worksheet.description}
				<div class="text-muted-foreground">
					<p>{worksheet.description}</p>
				</div>
			{/if}

			<!-- Instructions -->
			{#if worksheet.instructions}
				<div
					class="rounded-lg border border-blue-200 bg-blue-50 p-4 dark:border-blue-900 dark:bg-blue-950/50"
				>
					<div class="mb-2 flex items-center gap-2 font-medium text-blue-700 dark:text-blue-300">
						<Info class="h-4 w-4" />
						Instructions
					</div>
					<p class="text-sm text-blue-600 dark:text-blue-400">
						{worksheet.instructions}
					</p>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
