<!--
	Riddle Validation Detail Page
	==============================
	Detailed view for teacher to validate a student's riddle answer
-->

<script lang="ts">
	import type { PageData } from './$types';
	import {
		getDifficultyLabel,
		getDifficultyColor,
		formatAttemptNumber,
		calculateGidouilles
	} from '$lib/types/riddle';
	import { Button } from '$lib/components/ui/button';
	import { Badge } from '$lib/components/ui/badge';
	import { Textarea } from '$lib/components/ui/textarea';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Avatar from '$lib/components/ui/avatar';
	import * as Alert from '$lib/components/ui/alert';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { CheckCircle2, XCircle, User, AlertTriangle, ArrowLeft } from 'lucide-svelte';
	import { formatDistanceToNow } from 'date-fns';
	import { fr } from 'date-fns/locale';

	let { data }: { data: PageData } = $props();

	let feedback = $state('');
	let isSubmitting = $state(false);
	let selectedValidation: boolean | null = $state(null);

	const potentialGidouilles = $derived(
		calculateGidouilles(data.attempt.riddle.difficulty, data.attempt.attempt_number)
	);

	async function handleValidate(isCorrect: boolean) {
		if (isSubmitting) return;

		const confirmMessage = isCorrect
			? `Confirmer la validation de la réponse ? L'élève recevra ${potentialGidouilles} gidouilles.`
			: "Confirmer le refus de la réponse ? L'élève pourra réessayer.";

		if (!confirm(confirmMessage)) return;

		isSubmitting = true;
		selectedValidation = isCorrect;

		const formData = new FormData();
		formData.append('is_correct', String(isCorrect));
		if (feedback.trim()) formData.append('feedback', feedback.trim());

		try {
			const response = await fetch('?/validate', {
				method: 'POST',
				body: formData
			});

			if (response.ok) {
				toaster.success(isCorrect ? 'Réponse validée avec succès' : 'Réponse refusée');
				// Redirect will happen server-side
			} else {
				toaster.error('Erreur lors de la validation');
				isSubmitting = false;
				selectedValidation = null;
			}
		} catch (error) {
			console.error('Validation error:', error);
			toaster.error('Erreur lors de la validation');
			isSubmitting = false;
			selectedValidation = null;
		}
	}

	function formatTimeAgo(dateString: string) {
		return formatDistanceToNow(new Date(dateString), { addSuffix: true, locale: fr });
	}
</script>

<svelte:head>
	<title>Valider la réponse - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-4xl p-4 sm:p-6">
	<!-- Back Button -->
	<Button variant="ghost" href="/dashboard/teacher/riddles/validations" class="mb-4">
		<ArrowLeft class="mr-2 h-4 w-4" />
		Retour aux validations
	</Button>

	<!-- Student Info Card -->
	<Card.Root class="mb-6">
		<Card.Header>
			<div class="flex items-start gap-4">
				<Avatar.Root class="h-16 w-16">
					<Avatar.Image src={data.attempt.student.avatar_url} alt="Avatar élève" />
					<Avatar.Fallback>
						<User class="h-8 w-8" />
					</Avatar.Fallback>
				</Avatar.Root>
				<div class="flex-1">
					<Card.Title class="text-2xl">
						{data.attempt.student.firstname || ''}
						{data.attempt.student.lastname || ''}
					</Card.Title>
					<Card.Description>
						Énigme #{data.attempt.riddle.riddle_number}: {data.attempt.riddle.title}
					</Card.Description>
					<div class="mt-2 flex flex-wrap items-center gap-2">
						<Badge class={getDifficultyColor(data.attempt.riddle.difficulty)}>
							{getDifficultyLabel(data.attempt.riddle.difficulty)}
						</Badge>
						{#if data.attempt.riddle.genre}
							<Badge variant="outline">{data.attempt.riddle.genre}</Badge>
						{/if}
						<Badge variant="outline">
							{formatAttemptNumber(data.attempt.attempt_number)} tentative
						</Badge>
						<Badge variant="outline" class="bg-yellow-50 dark:bg-yellow-950">
							{potentialGidouilles} gidouilles si validé
						</Badge>
					</div>
				</div>
			</div>
		</Card.Header>
		<Card.Content>
			<p class="text-sm text-muted-foreground">
				Soumis {formatTimeAgo(data.attempt.created_at)}
			</p>
		</Card.Content>
	</Card.Root>

	<!-- Riddle Statement -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Énoncé de l'énigme</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="prose max-w-none dark:prose-invert">
				{@html data.attempt.riddle.statement}
			</div>
			{#if data.attempt.riddle.image_url}
				<img
					src={data.attempt.riddle.image_url}
					alt="Illustration énigme"
					class="mt-4 max-w-full rounded-lg"
				/>
			{/if}
		</Card.Content>
	</Card.Root>

	<!-- Student Answer -->
	<Card.Root class="mb-6 border-2 border-blue-500">
		<Card.Header>
			<Card.Title class="text-blue-700 dark:text-blue-300">Réponse de l'élève</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="rounded-lg bg-blue-50 p-4 dark:bg-blue-950">
				<div class="prose max-w-none whitespace-pre-wrap dark:prose-invert">
					{#if data.attempt.submitted_answer?.value}
						{typeof data.attempt.submitted_answer.value === 'string'
							? data.attempt.submitted_answer.value
							: JSON.stringify(data.attempt.submitted_answer.value, null, 2)}
					{:else}
						<span class="text-muted-foreground italic">Aucune réponse fournie</span>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Correction (Teacher Only) -->
	<Card.Root class="mb-6 border-2 border-primary">
		<Card.Header>
			<Card.Title class="text-primary">Correction (visible pour vous uniquement)</Card.Title>
		</Card.Header>
		<Card.Content>
			<div class="rounded-lg bg-primary/5 p-4">
				<div class="prose max-w-none dark:prose-invert">
					{@html data.attempt.riddle.correction}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Feedback (Optional) -->
	<Card.Root class="mb-6">
		<Card.Header>
			<Card.Title>Commentaire pour l'élève (optionnel)</Card.Title>
			<Card.Description>
				Ajoutez un commentaire qui sera envoyé à l'élève avec votre validation
			</Card.Description>
		</Card.Header>
		<Card.Content>
			<Textarea
				bind:value={feedback}
				placeholder="Ex: Bonne approche, mais attention à..."
				rows={4}
			/>
		</Card.Content>
	</Card.Root>

	<!-- Warning Alert -->
	<Alert.Root class="mb-6">
		<AlertTriangle class="h-4 w-4" />
		<Alert.Title>Attention</Alert.Title>
		<Alert.Description>
			Cette action est définitive. L'élève sera notifié de votre décision par message.
		</Alert.Description>
	</Alert.Root>

	<!-- Action Buttons -->
	<div class="flex flex-col gap-4 sm:flex-row">
		<Button
			onclick={() => handleValidate(false)}
			variant="destructive"
			size="lg"
			disabled={isSubmitting}
			class="flex-1"
		>
			<XCircle class="mr-2 h-5 w-5" />
			{isSubmitting && selectedValidation === false ? 'Refus en cours...' : 'Refuser la réponse'}
		</Button>
		<Button onclick={() => handleValidate(true)} size="lg" disabled={isSubmitting} class="flex-1">
			<CheckCircle2 class="mr-2 h-5 w-5" />
			{isSubmitting && selectedValidation === true
				? 'Validation en cours...'
				: `Valider (+${potentialGidouilles} gidouilles)`}
		</Button>
	</div>
</div>
