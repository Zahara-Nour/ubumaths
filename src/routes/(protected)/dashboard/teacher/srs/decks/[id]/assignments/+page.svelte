<!--
	Teacher - View Deck Assignments
	================================

	Teacher page to view which students received a specific deck.

	Features:
	- List all students who received the deck
	- Show deck copy status for each student
	- Show student progress stats
	- Resend deck to students who didn't receive it
-->

<script lang="ts">
	import { page } from '$app/state';
	import { goto } from '$app/navigation';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import * as Avatar from '$lib/components/ui/avatar';
	import { toaster } from '$lib/stores/toaster.svelte';
	import {
		ArrowLeft,
		Users,
		CheckCircle2,
		XCircle,
		RefreshCw,
		Calendar,
		Target
	} from 'lucide-svelte';
	import { cn } from '$lib/utils';

	interface Props {
		data: {
			deck: { name: string }; // id available from page.params
			assignments: { id: string; student_id: string; assigned_at: string }[];
		};
	}

	let { data }: Props = $props();

	const deckId = $derived(page.params.id);

	// Derived stats
	const totalAssignments = $derived(data.assignments.length);
	const successfulCopies = $derived(data.assignments.filter((a) => a.studentDeck !== null).length);
	const failedCopies = $derived(data.assignments.filter((a) => a.studentDeck === null).length);

	/**
	 * Navigate back
	 */
	function goBack() {
		goto('/dashboard/teacher/srs/decks').then(() => {});
	}

	/**
	 * Format date
	 */
	function formatDate(dateString: string) {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'short',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	/**
	 * Get student initials
	 */
	function getInitials(firstName?: string, lastName?: string) {
		const first = firstName?.charAt(0) || '';
		const last = lastName?.charAt(0) || '';
		return (first + last).toUpperCase();
	}

	/**
	 * Resend deck to student
	 */
	async function resendDeck(studentId: string) {
		try {
			const response = await fetch(`/api/srs/decks/${deckId}/assign`, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					targetType: 'student',
					targetIds: [studentId]
				})
			});

			if (!response.ok) {
				throw new Error('Failed to resend deck');
			}

			toaster.success('Deck renvoyé avec succès');
			location.reload();
		} catch (error) {
			console.error('Error resending deck:', error);
			toaster.error("Erreur lors de l'envoi du deck");
		}
	}
</script>

<svelte:head>
	<title>Attributions du deck - UbuMaths</title>
</svelte:head>

<div class="assignments-page">
	<!-- Header -->
	<div class="mb-6">
		<Button onclick={goBack} variant="ghost" class="mb-4">
			<ArrowLeft class="mr-2 h-4 w-4" />
			Retour
		</Button>

		<h1 class="mb-2 text-3xl font-bold">Attributions du deck</h1>
		<p class="text-muted-foreground">Vérifier quels élèves ont reçu ce deck et leur progression</p>
	</div>

	<!-- Deck Info -->
	<Card.Root class="mb-6">
		<Card.Header>
			<div class="flex items-start justify-between">
				<div>
					<Card.Title>{data.deck?.name || 'Deck'}</Card.Title>
					{#if data.deck?.description}
						<Card.Description class="mt-2">{data.deck.description}</Card.Description>
					{/if}
				</div>
				<Badge variant={data.deck?.deckType === 'official' ? 'default' : 'secondary'}>
					{data.deck?.deckType === 'official' ? 'Officiel' : 'Personnel'}
				</Badge>
			</div>
		</Card.Header>
	</Card.Root>

	<!-- Statistics Overview -->
	<div class="mb-6 grid gap-4 md:grid-cols-3">
		<!-- Total Assignments -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Attributions</Card.Title>
				<Users class="h-4 w-4 text-muted-foreground" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold">{totalAssignments}</div>
				<p class="text-xs text-muted-foreground">Élèves ciblés</p>
			</Card.Content>
		</Card.Root>

		<!-- Successful Copies -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Reçu</Card.Title>
				<CheckCircle2 class="h-4 w-4 text-green-500" />
			</Card.Header>
			<Card.Content>
				<div class="text-2xl font-bold text-green-600">{successfulCopies}</div>
				<p class="text-xs text-muted-foreground">Copies créées</p>
			</Card.Content>
		</Card.Root>

		<!-- Failed Copies -->
		<Card.Root>
			<Card.Header class="flex flex-row items-center justify-between space-y-0 pb-2">
				<Card.Title class="text-sm font-medium">Non reçu</Card.Title>
				<XCircle class="h-4 w-4 text-red-500" />
			</Card.Header>
			<Card.Content>
				<div class={cn('text-2xl font-bold', failedCopies > 0 && 'text-red-600')}>
					{failedCopies}
				</div>
				<p class="text-xs text-muted-foreground">Échecs</p>
			</Card.Content>
		</Card.Root>
	</div>

	<!-- Assignments List -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Liste des élèves</Card.Title>
			<Card.Description>
				{totalAssignments} élève{totalAssignments > 1 ? 's' : ''}
				{totalAssignments > 1 ? 'ont' : 'a'} reçu ce deck
			</Card.Description>
		</Card.Header>
		<Card.Content>
			{#if data.assignments.length === 0}
				<div class="rounded-lg border-2 border-dashed border-muted bg-muted/20 p-8 text-center">
					<p class="text-muted-foreground">Aucune attribution pour ce deck.</p>
				</div>
			{:else}
				<div class="space-y-4">
					{#each data.assignments as assignment (assignment.id)}
						<div
							class={cn(
								'flex items-center gap-4 rounded-lg border p-4 transition-colors',
								assignment.studentDeck
									? 'border-green-200 bg-green-50/50'
									: 'border-red-200 bg-red-50/50'
							)}
						>
							<!-- Avatar -->
							<Avatar.Root class="h-12 w-12">
								{#if assignment.student?.avatarUrl}
									<Avatar.Image
										src={assignment.student.avatarUrl}
										alt={assignment.student.firstName}
									/>
								{/if}
								<Avatar.Fallback>
									{getInitials(assignment.student?.firstName, assignment.student?.lastName)}
								</Avatar.Fallback>
							</Avatar.Root>

							<!-- Student Info -->
							<div class="flex-1">
								<div class="flex items-center gap-2">
									<p class="font-medium">
										{assignment.student?.firstName || 'Inconnu'}
										{assignment.student?.lastName || ''}
									</p>
									{#if assignment.studentDeck}
										<Badge variant="outline" class="gap-1 text-green-600">
											<CheckCircle2 class="h-3 w-3" />
											Reçu
										</Badge>
									{:else}
										<Badge variant="outline" class="gap-1 text-red-600">
											<XCircle class="h-3 w-3" />
											Non reçu
										</Badge>
									{/if}
								</div>
								{#if assignment.student?.email}
									<p class="text-sm text-muted-foreground">{assignment.student.email}</p>
								{/if}

								<!-- Stats if deck exists -->
								{#if assignment.studentDeck?.stats}
									<div class="mt-2 flex items-center gap-4 text-sm text-muted-foreground">
										<span class="flex items-center gap-1">
											<Target class="h-3 w-3" />
											{assignment.studentDeck.stats.total_cards || 0} cartes
										</span>
										<span class="flex items-center gap-1">
											<Calendar class="h-3 w-3" />
											{assignment.studentDeck.stats.due_count || 0} à réviser
										</span>
									</div>
								{/if}
							</div>

							<!-- Attribution Date -->
							<div class="text-right">
								<p class="text-xs text-muted-foreground">Attribué le</p>
								<p class="text-sm font-medium">{formatDate(assignment.assignedAt)}</p>
							</div>

							<!-- Actions -->
							{#if !assignment.studentDeck}
								<Button
									onclick={() => resendDeck(assignment.assignedTo)}
									variant="outline"
									size="sm"
								>
									<RefreshCw class="mr-2 h-4 w-4" />
									Renvoyer
								</Button>
							{/if}
						</div>
					{/each}
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>

<style>
	.assignments-page {
		max-width: 1200px;
		margin: 0 auto;
		padding: 1rem;
		animation: fadeIn 0.3s ease-out;
	}

	@keyframes fadeIn {
		from {
			opacity: 0;
		}
		to {
			opacity: 1;
		}
	}
</style>
