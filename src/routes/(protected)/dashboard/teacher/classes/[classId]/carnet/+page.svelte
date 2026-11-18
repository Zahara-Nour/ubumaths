<!--
	Carnet de liaison — le côté professeur, par classe (ADR 0040 ; D1-D3, Q28-Q30)
	=============================================================================

	En haut, la classe : activer (en annonçant le nombre de courriels, Q30),
	seuils des exceptions, « Envoyer les liens manquants » (Q29). Dessous, un
	élève par ligne : ses adresses (état, gestes) et le partage (couper /
	rétablir). Chaque geste est un formulaire ; le message de retour s'affiche
	en toast.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import type { SubmitFunction } from '$app/forms';
	import BackLink from '#lib/components/navigation/BackLink.svelte';
	import MyCheckbox from '#lib/components/MyCheckbox.svelte';
	import { Badge } from '#lib/components/ui/badge/index.ts';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { BookHeart, Send } from '@lucide/svelte';
	import type { PageData } from './$types';
	import type { CarnetContactRow } from './+page.server';

	// Constantes

	const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'short',
		timeZone: 'Europe/Paris'
	});

	// Variables

	let { data }: { data: PageData } = $props();

	let pending = $state(false);

	const settings = $derived(data.settings);
	// Cases cochables, recalées sur la base à chaque rechargement des données.
	let evaluationMissed = $derived(data.settings.evaluation_missed_alert);
	let quarterly = $derived(data.settings.quarterly_message);
	const now = Date.now();

	// Functions

	/** Chaque geste : bouton désactivé pendant l'envoi, message en toast. */
	const submit: SubmitFunction = ({ formElement }) => {
		// Seul le champ d'adresse se vide après succès : remettre à zéro le
		// formulaire des réglages défairait les cases que la page vient d'écrire.
		const clears = !!formElement.querySelector('input[name="email"]');
		pending = true;
		return async ({ result, update }) => {
			pending = false;
			if (result.type === 'success' || result.type === 'failure') {
				const message = (result.data as { message?: string } | undefined)?.message;
				if (message) {
					if (result.type === 'success') toaster.success(message);
					else toaster.error(message);
				}
			} else if (result.type === 'error') {
				toaster.error(result.error?.message ?? 'Une erreur est survenue.');
			}
			await update({ reset: clears && result.type === 'success' });
		};
	};

	function activeCount(contacts: CarnetContactRow[]): number {
		return contacts.filter((c) => c.status === 'pending' || c.status === 'confirmed').length;
	}

	function date(value: string): string {
		return DATE_FORMAT.format(new Date(value));
	}

	function contactState(c: CarnetContactRow): string {
		switch (c.status) {
			case 'pending':
				return c.confirm_expires_at && Date.parse(c.confirm_expires_at) < now
					? 'Confirmation expirée'
					: `En attente de confirmation (${c.confirm_sent_count}/3 envois)`;
			case 'confirmed':
				if (c.emails_stopped_at) return 'Confirmée · courriels arrêtés par le parent';
				if (!c.link) return 'Confirmée · aucun lien actif';
				return c.link.last_accessed_at
					? `Confirmée · carnet ouvert le ${date(c.link.last_accessed_at)}`
					: 'Confirmée · carnet jamais ouvert';
			case 'refused':
				return '« Je ne suis pas le parent de cet élève » : adresse effacée';
			case 'invalid':
				return 'Adresse rejetée par la messagerie';
			case 'removed':
				return 'Retirée par vous : effacée, plus aucun lien (ressaisissez-la pour la rétablir)';
		}
	}
</script>

<svelte:head>
	<title>Carnet de liaison — {data.classRow.name}</title>
</svelte:head>

<div class="mx-auto w-full max-w-4xl space-y-6 p-4">
	<BackLink href="/dashboard/teacher/classes" label="Retour aux classes" />

	<header class="space-y-1">
		<h1 class="flex items-center gap-2 text-2xl font-bold">
			<BookHeart class="size-6 text-muted-foreground" aria-hidden="true" />
			Carnet de liaison — {data.classRow.name}
		</h1>
		<p class="text-muted-foreground">
			Chaque parent reçoit le lien d'une page toujours à jour : régularité, révisions, évaluations
			faites ou non (jamais les notes). Un courriel seulement si quelque chose mérite son attention.
		</p>
	</header>

	{#if !data.brevoConfigured}
		<p role="alert" class="rounded-lg border border-destructive/40 p-3 text-sm text-destructive">
			L'envoi de courriels n'est pas configuré : aucun lien ne peut partir.
		</p>
	{/if}

	<Card.Root>
		<Card.Header>
			<Card.Title class="flex flex-wrap items-center gap-2 text-lg">
				La classe
				{#if settings.enabled}
					<Badge>Activé</Badge>
				{:else}
					<Badge variant="outline">Désactivé</Badge>
				{/if}
			</Card.Title>
		</Card.Header>
		<Card.Content class="space-y-6">
			{#if settings.enabled}
				<div class="flex flex-wrap items-center gap-3">
					<form method="POST" action="?/sendMissing" use:enhance={submit}>
						<Button
							type="submit"
							disabled={pending || !data.brevoConfigured || data.missingLinks === 0}
						>
							<Send class="mr-2 size-4" aria-hidden="true" />
							Envoyer les liens manquants
							{#if data.missingLinks}({data.missingLinks}){/if}
						</Button>
					</form>
					<form method="POST" action="?/deactivate" use:enhance={submit}>
						<Button type="submit" variant="outline" disabled={pending}>Désactiver</Button>
					</form>
				</div>
				<p class="text-sm text-muted-foreground">
					« Envoyer les liens manquants » : élèves arrivés après l'activation, consentements
					accordés depuis, envois en échec.
				</p>
			{:else}
				<div class="space-y-3">
					<p class="text-sm">
						Activer envoie un lien à chaque adresse de parent déjà confirmée par un consentement
						accordé. Les autres adresses s'ajoutent ensuite, élève par élève.
					</p>
					<p class="text-sm font-medium" data-testid="carnet-annonce">
						{#if data.missingLinks === null}
							Nombre de courriels inconnu pour l'instant.
						{:else if data.missingLinks === 0}
							Activer n'enverra aucun courriel.
						{:else}
							Activer enverra {data.missingLinks} courriel{data.missingLinks > 1 ? 's' : ''}.
						{/if}
					</p>
					<form method="POST" action="?/activate" use:enhance={submit}>
						<Button type="submit" disabled={pending || !data.brevoConfigured}>
							Activer le carnet de la classe
						</Button>
					</form>
				</div>
			{/if}

			<form method="POST" action="?/saveSettings" use:enhance={submit} class="space-y-4">
				<h2 class="font-semibold">Quand prévenir les parents</h2>
				<MyCheckbox
					name="evaluation_missed_alert"
					bind:checked={evaluationMissed}
					label="Une évaluation n'est pas faite à son échéance"
				/>
				<div class="grid gap-4 sm:grid-cols-2">
					<div class="space-y-1.5">
						<Label for="carnet-overdue">Révisions en retard depuis (jours)</Label>
						<Input
							id="carnet-overdue"
							name="overdue_reviews_days"
							type="number"
							min={1}
							max={60}
							required
							value={settings.overdue_reviews_days}
						/>
					</div>
					<div class="space-y-1.5">
						<Label for="carnet-inactivity">Aucun travail depuis (jours)</Label>
						<Input
							id="carnet-inactivity"
							name="inactivity_days"
							type="number"
							min={3}
							max={60}
							required
							value={settings.inactivity_days}
						/>
					</div>
				</div>
				<MyCheckbox
					name="quarterly_message"
					bind:checked={quarterly}
					label="Un message positif en fin de trimestre, s'il y a du vrai à dire"
				/>
				<p class="text-sm text-muted-foreground">
					Un courriel par semaine au plus, jamais pendant les vacances scolaires.
				</p>
				<Button type="submit" variant="outline" disabled={pending}>Enregistrer les réglages</Button>
			</form>
		</Card.Content>
	</Card.Root>

	<Card.Root>
		<Card.Header>
			<Card.Title class="text-lg">Les élèves</Card.Title>
		</Card.Header>
		<Card.Content>
			{#if data.students.length === 0}
				<p class="text-sm text-muted-foreground">Aucun élève dans cette classe.</p>
			{:else}
				<ul class="divide-y divide-border">
					{#each data.students as student (student.id)}
						<li class="space-y-3 py-4" data-testid="carnet-eleve">
							<div class="flex flex-wrap items-center justify-between gap-2">
								<span class="font-medium">{student.name}</span>
								{#if student.opted_out}
									<form method="POST" action="?/resumeSharing" use:enhance={submit}>
										<input type="hidden" name="student_id" value={student.id} />
										<Button type="submit" size="sm" variant="outline" disabled={pending}>
											Rétablir le partage
										</Button>
									</form>
								{:else}
									<form method="POST" action="?/stopSharing" use:enhance={submit}>
										<input type="hidden" name="student_id" value={student.id} />
										<Button type="submit" size="sm" variant="ghost" disabled={pending}>
											Couper le partage
										</Button>
									</form>
								{/if}
							</div>

							{#if student.opted_out}
								<p class="text-sm text-muted-foreground">
									Partage coupé : aucun lien, aucun courriel. Les liens du cahier et du cours de la
									classe restent ouverts.
								</p>
							{/if}

							{#if student.contacts.length === 0}
								<p class="text-sm text-muted-foreground">Aucune adresse de parent.</p>
							{:else}
								<ul class="space-y-2">
									{#each student.contacts as contact (contact.id)}
										<li
											class="flex flex-wrap items-center justify-between gap-2 rounded-md border border-border p-2 text-sm"
										>
											<div class="min-w-0">
												<p class="truncate">{contact.email ?? 'Adresse effacée'}</p>
												<p class="text-muted-foreground">
													{contactState(contact)}
													{#if contact.last_send_failed}
														· <span class="text-destructive">dernier envoi en échec</span>
													{/if}
												</p>
											</div>
											<div class="flex flex-wrap gap-2">
												{#if contact.status === 'pending' && contact.confirm_sent_count < 3}
													<form method="POST" action="?/resendConfirmation" use:enhance={submit}>
														<input type="hidden" name="contact_id" value={contact.id} />
														<Button type="submit" size="sm" variant="outline" disabled={pending}>
															Renvoyer la confirmation
														</Button>
													</form>
												{/if}
												{#if contact.status === 'confirmed' && !student.opted_out && settings.enabled}
													<form method="POST" action="?/sendNewLink" use:enhance={submit}>
														<input type="hidden" name="contact_id" value={contact.id} />
														<Button type="submit" size="sm" variant="outline" disabled={pending}>
															{contact.link ? 'Envoyer un nouveau lien' : 'Envoyer un lien'}
														</Button>
													</form>
												{/if}
												{#if contact.status === 'pending' || contact.status === 'confirmed' || contact.status === 'invalid'}
													<form method="POST" action="?/removeContact" use:enhance={submit}>
														<input type="hidden" name="contact_id" value={contact.id} />
														<Button type="submit" size="sm" variant="ghost" disabled={pending}>
															Retirer cette adresse
														</Button>
													</form>
												{/if}
											</div>
										</li>
									{/each}
								</ul>
							{/if}

							{#if settings.enabled && !student.opted_out && activeCount(student.contacts) < 2}
								<form
									method="POST"
									action="?/addContact"
									use:enhance={submit}
									class="flex flex-col gap-2 sm:flex-row sm:items-end"
								>
									<input type="hidden" name="student_id" value={student.id} />
									<div class="flex-1 space-y-1.5">
										<Label for="carnet-add-{student.id}" class="sr-only">
											Adresse d'un parent de {student.name}
										</Label>
										<Input
											id="carnet-add-{student.id}"
											name="email"
											type="email"
											autocomplete="off"
											placeholder="Adresse d'un parent"
											required
											maxlength={254}
										/>
									</div>
									<Button type="submit" size="sm" disabled={pending || !data.brevoConfigured}>
										Envoyer la confirmation
									</Button>
								</form>
							{/if}
						</li>
					{/each}
				</ul>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
