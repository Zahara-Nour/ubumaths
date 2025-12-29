<!--
	Welcome Email Page
	==================

	Allows teachers to send welcome emails to newly approved students.

	Features:
	- Displays student information (name, email)
	- Shows email template preview
	- Warns if Gmail integration is missing
	- Shows previous email status if already sent
	- Send button (API to be implemented in Phase 5)
-->
<script lang="ts">
	import type { PageData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { Mail, AlertTriangle, CheckCircle2, ExternalLink, Send } from 'lucide-svelte';
	import { WELCOME_EMAIL_SUBJECT, getWelcomeEmailText } from '$lib/email-templates/welcome';

	let { data }: { data: PageData } = $props();

	let isSending = $state(false);

	// Format date for display
	function formatDate(dateString: string): string {
		return new Date(dateString).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric',
			hour: '2-digit',
			minute: '2-digit'
		});
	}

	// Get student display name
	const studentName = $derived(
		data.student.firstname && data.student.lastname
			? `${data.student.firstname} ${data.student.lastname}`
			: data.student.email
	);

	// Email template content (from shared template)
	const emailSubject = WELCOME_EMAIL_SUBJECT;
	const emailBody = $derived(getWelcomeEmailText(data.student.firstname));

	// Handle send button click
	async function handleSendEmail() {
		if (!data.hasGmailAccess) {
			toaster.error("Veuillez d'abord connecter votre compte Google avec Gmail");
			return;
		}

		isSending = true;

		try {
			const response = await fetch('/api/teacher/send-welcome-email', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ student_id: data.student.id })
			});

			const result = await response.json();

			if (!response.ok) {
				throw new Error(result.error || "Erreur lors de l'envoi");
			}

			toaster.success('Email de bienvenue envoyé avec succès !');

			// Update the previous email data to show the "already sent" notice
			data.previousEmail = { sent_at: new Date().toISOString() };
		} catch (err) {
			console.error('[Welcome Email] Send error:', err);
			toaster.error(err instanceof Error ? err.message : "Erreur lors de l'envoi de l'email");
		} finally {
			isSending = false;
		}
	}
</script>

<svelte:head>
	<title>Envoyer un email de bienvenue - UbuMaths</title>
</svelte:head>

<div class="container mx-auto max-w-2xl space-y-6 p-6">
	<!-- Page Header -->
	<div class="space-y-2">
		<div class="flex items-center gap-3">
			<Mail class="h-8 w-8 text-primary" />
			<h1 class="text-3xl font-bold tracking-tight">Email de bienvenue</h1>
		</div>
	</div>

	<!-- Gmail Access Warning -->
	{#if !data.hasGmailAccess}
		<Alert.Root variant="destructive">
			<AlertTriangle class="h-4 w-4" />
			<Alert.Title>Integration Gmail requise</Alert.Title>
			<Alert.Description class="space-y-2">
				<p>
					Pour envoyer des emails, vous devez d'abord connecter votre compte Google avec les
					permissions Gmail.
				</p>
				<Button variant="outline" size="sm" href="/dashboard/teacher/settings/google" class="mt-2">
					<ExternalLink class="mr-2 h-4 w-4" />
					Configurer l'intégration Google
				</Button>
			</Alert.Description>
		</Alert.Root>
	{/if}

	<!-- Email Already Sent - Success State -->
	{#if data.previousEmail}
		<Card.Root>
			<Card.Header>
				<div class="flex items-center gap-3">
					<CheckCircle2 class="h-8 w-8 text-primary" />
					<div>
						<Card.Title>Email déjà envoyé</Card.Title>
						<Card.Description>
							Un email de bienvenue a été envoyé à {studentName} le {formatDate(
								data.previousEmail.sent_at
							)}.
						</Card.Description>
					</div>
				</div>
			</Card.Header>
			<Card.Content>
				<p class="text-sm text-muted-foreground">
					L'élève a reçu toutes les informations nécessaires pour se connecter à UbuMaths.
				</p>
			</Card.Content>
			<Card.Footer>
				<Button href="/dashboard/teacher/classes">Retour aux classes</Button>
			</Card.Footer>
		</Card.Root>
	{:else}
		<!-- Student Info Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Informations de l'eleve</Card.Title>
			</Card.Header>
			<Card.Content class="space-y-3">
				<div class="grid grid-cols-[120px_1fr] gap-2 text-sm">
					<span class="font-medium text-muted-foreground">Nom :</span>
					<span>{studentName}</span>

					<span class="font-medium text-muted-foreground">Email :</span>
					<span class="break-all">{data.student.email}</span>
				</div>
			</Card.Content>
		</Card.Root>

		<!-- Email Preview Card -->
		<Card.Root>
			<Card.Header>
				<Card.Title>Apercu de l'email</Card.Title>
				<Card.Description>
					Cet email sera envoye a l'adresse : {data.student.email}
				</Card.Description>
			</Card.Header>
			<Card.Content class="space-y-4">
				<!-- Subject -->
				<div class="space-y-1">
					<span class="text-sm font-medium text-muted-foreground">Objet :</span>
					<p class="rounded-md border bg-muted/50 px-3 py-2 text-sm">{emailSubject}</p>
				</div>

				<!-- Body -->
				<div class="space-y-1">
					<span class="text-sm font-medium text-muted-foreground">Message :</span>
					<div class="rounded-md border bg-muted/50 px-3 py-2 text-sm whitespace-pre-wrap">
						{emailBody}
					</div>
				</div>
			</Card.Content>

			<Card.Footer class="flex justify-end gap-2">
				<Button variant="outline" href="/dashboard/teacher/classes">Annuler</Button>
				<Button onclick={handleSendEmail} disabled={!data.hasGmailAccess || isSending}>
					<Send class="mr-2 h-4 w-4" />
					{#if isSending}
						Envoi en cours...
					{:else}
						Envoyer l'email
					{/if}
				</Button>
			</Card.Footer>
		</Card.Root>
	{/if}
</div>
