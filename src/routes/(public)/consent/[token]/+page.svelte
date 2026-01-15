<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import { Card, CardContent, CardHeader, CardTitle } from '$lib/components/ui/card';
	import { AlertCircle, CheckCircle2, Clock, GraduationCap, School, User } from 'lucide-svelte';

	let { data, form } = $props();

	let isSubmitting = $state(false);

	// Format grade for display
	function formatGrade(grade: string | null): string {
		if (!grade) return 'Non spécifiée';
		const gradeNames: Record<string, string> = {
			'6': '6ème',
			'5': '5ème',
			'4': '4ème',
			'3': '3ème',
			'2': '2nde'
		};
		return gradeNames[grade] || grade;
	}

	// Format expiry date
	function formatDate(dateStr: string): string {
		const date = new Date(dateStr);
		return date.toLocaleDateString('fr-FR', {
			weekday: 'long',
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get student display name
	function getStudentName(): string {
		if ('student' in data && data.student) {
			const { firstname, lastname } = data.student;
			if (firstname && lastname) return `${firstname} ${lastname}`;
			if (firstname) return firstname;
		}
		return 'votre enfant';
	}
</script>

<svelte:head>
	<title>Consentement parental - UbuMaths</title>
</svelte:head>

<div class="min-h-screen bg-gradient-to-b from-blue-50 to-white px-4 py-8">
	<div class="mx-auto max-w-lg">
		<!-- Logo/Header -->
		<div class="mb-8 text-center">
			<h1 class="text-3xl font-bold text-blue-600">UbuMaths</h1>
			<p class="mt-2 text-muted-foreground">Plateforme éducative de mathématiques</p>
		</div>

		{#if 'error' in data}
			<!-- Error state -->
			<Card class="border-red-200 bg-red-50">
				<CardHeader>
					<CardTitle class="flex items-center gap-2 text-red-700">
						<AlertCircle class="h-5 w-5" />
						{#if data.error === 'TOKEN_EXPIRED'}
							Lien expiré
						{:else if data.error === 'ALREADY_GRANTED'}
							Consentement déjà accordé
						{:else}
							Lien invalide
						{/if}
					</CardTitle>
				</CardHeader>
				<CardContent>
					<p class="text-red-600">{data.message}</p>
					{#if data.error === 'TOKEN_EXPIRED'}
						<p class="mt-4 text-sm text-muted-foreground">
							Contactez l'enseignant de votre enfant pour recevoir un nouveau lien de consentement.
						</p>
					{/if}
				</CardContent>
			</Card>
		{:else}
			<!-- Valid consent request -->
			<Card>
				<CardHeader>
					<CardTitle class="text-xl">Consentement parental requis</CardTitle>
				</CardHeader>
				<CardContent class="space-y-6">
					<!-- Student info -->
					<div class="rounded-lg bg-blue-50 p-4">
						<h3 class="mb-3 text-sm font-medium tracking-wide text-muted-foreground uppercase">
							Informations de l'élève
						</h3>
						<ul class="space-y-2">
							<li class="flex items-center gap-2">
								<User class="h-4 w-4 text-blue-600" />
								<span class="font-medium">{getStudentName()}</span>
							</li>
							<li class="flex items-center gap-2">
								<GraduationCap class="h-4 w-4 text-blue-600" />
								<span>{formatGrade(data.student?.grade ?? null)}</span>
							</li>
							{#if data.schoolName}
								<li class="flex items-center gap-2">
									<School class="h-4 w-4 text-blue-600" />
									<span>{data.schoolName}</span>
								</li>
							{/if}
							{#if data.teacherName}
								<li class="flex items-center gap-2">
									<User class="h-4 w-4 text-blue-600" />
									<span>Enseignant : {data.teacherName}</span>
								</li>
							{/if}
						</ul>
					</div>

					<!-- RGPD explanation -->
					<div class="border-l-4 border-amber-400 bg-amber-50 p-4">
						<p class="text-sm text-amber-800">
							<strong>Conformément au RGPD (Article 8)</strong>, votre consentement est requis car
							votre enfant a moins de 15 ans pour utiliser cette plateforme éducative.
						</p>
					</div>

					<!-- What they're consenting to -->
					<div class="space-y-2">
						<h3 class="font-medium">En autorisant l'accès, vous permettez à votre enfant de :</h3>
						<ul class="ml-4 list-disc space-y-1 text-sm text-muted-foreground">
							<li>Réaliser des exercices de mathématiques</li>
							<li>Suivre sa progression scolaire</li>
							<li>Communiquer avec son enseignant</li>
							<li>Participer aux activités pédagogiques de la plateforme</li>
						</ul>
					</div>

					<!-- Expiry notice -->
					<div class="flex items-center gap-2 text-sm text-muted-foreground">
						<Clock class="h-4 w-4" />
						<span>Ce lien expire le {formatDate(data.expiresAt)}</span>
					</div>

					<!-- Form error -->
					{#if form?.error}
						<div class="rounded-lg bg-red-50 p-3 text-sm text-red-600">
							{form.message || form.error}
						</div>
					{/if}

					<!-- Action buttons -->
					<form
						method="POST"
						action="?/grant"
						use:enhance={() => {
							isSubmitting = true;
							return async ({ update }) => {
								isSubmitting = false;
								await update();
							};
						}}
					>
						<Button type="submit" class="w-full" size="lg" disabled={isSubmitting}>
							{#if isSubmitting}
								<span class="animate-pulse">Traitement en cours...</span>
							{:else}
								<CheckCircle2 class="mr-2 h-5 w-5" />
								J'autorise l'accès
							{/if}
						</Button>
					</form>

					<p class="text-center text-xs text-muted-foreground">
						En cliquant sur ce bouton, vous acceptez que votre enfant utilise UbuMaths dans le cadre
						de son éducation.
					</p>
				</CardContent>
			</Card>
		{/if}

		<!-- Footer -->
		<div class="mt-8 text-center text-sm text-muted-foreground">
			<p>
				Si vous n'avez pas demandé ce consentement, vous pouvez fermer cette page en toute sécurité.
			</p>
			<p class="mt-2">
				<a href="/privacy" class="text-blue-600 hover:underline">Politique de confidentialité</a>
			</p>
		</div>
	</div>
</div>
