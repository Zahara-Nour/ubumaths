<!--
	Mon carnet de liaison — la vue de l'élève (ADR 0040 ; C1-C3, Q3, Q15)
	====================================================================

	Le même carnet que reçoivent ses parents (`CarnetView`), avec ce que
	l'élève doit savoir : qui le voit (un nombre, jamais les adresses), si le
	partage est arrêté, et les courriels envoyés à ses parents (date, motif).
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.ts';
	import * as Card from '#lib/components/ui/card/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import CarnetView from '#lib/components/carnet/CarnetView.svelte';
	import { Eye, Mail, UserPlus } from '@lucide/svelte';
	import type { ActionData, PageData } from './$types';

	// Constantes

	const KIND_LABELS: Record<string, string> = {
		confirmation: 'Demande de confirmation d’une adresse',
		link: 'Envoi du lien du carnet',
		quarterly: 'Message de fin de trimestre'
	};

	const REASON_LABELS: Record<string, string> = {
		evaluation_missed: 'évaluation non faite',
		reviews_overdue: 'révisions en retard',
		inactivity: 'pas de travail depuis longtemps'
	};

	const DATE_FORMAT = new Intl.DateTimeFormat('fr-FR', {
		day: 'numeric',
		month: 'long',
		year: 'numeric',
		timeZone: 'Europe/Paris'
	});

	// Variables

	let { data, form }: { data: PageData; form: ActionData } = $props();

	let pending = $state(false);

	const canAddParent = $derived(
		!!data.carnet && data.carnet.shared && !data.carnet.opted_out && data.carnet.parents < 2
	);

	// Functions

	function notificationLabel(kind: string, reasons: string[]): string {
		if (kind === 'exception') {
			const motifs = reasons.map((r) => REASON_LABELS[r] ?? r).join(', ');
			return motifs ? `Alerte : ${motifs}` : 'Alerte';
		}
		return KIND_LABELS[kind] ?? 'Courriel';
	}

	function submitting() {
		pending = true;
		return async ({ update }: { update: (opts?: { reset?: boolean }) => Promise<void> }) => {
			await update({ reset: true });
			pending = false;
		};
	}
</script>

<svelte:head>
	<title>Mon carnet de liaison</title>
</svelte:head>

<div class="mx-auto w-full max-w-2xl space-y-6 p-4">
	<header class="space-y-1">
		<h1 class="text-2xl font-bold">Mon carnet de liaison</h1>
	</header>

	{#if !data.carnet}
		<p class="text-muted-foreground">Le carnet de liaison n'est pas disponible.</p>
	{:else}
		<div
			class="flex items-start gap-3 rounded-lg border border-border bg-muted/40 p-4 text-sm"
			role="note"
		>
			<Eye class="mt-0.5 size-5 shrink-0 text-muted-foreground" aria-hidden="true" />
			<p data-testid="carnet-partage">
				{#if data.carnet.opted_out}
					Le partage avec tes parents est arrêté.
				{:else if !data.carnet.shared}
					Le carnet de liaison n'est pas encore ouvert pour ta classe : tes parents ne voient pas
					cette page.
				{:else if data.carnet.parents === 0}
					Aucun parent ne reçoit encore ton carnet.
				{:else}
					Tes parents voient cette page. Ils ne voient ni tes notes, ni tes messages.
				{/if}
			</p>
		</div>

		<CarnetView carnet={data.carnet} />

		{#if canAddParent}
			<Card.Root>
				<Card.Header>
					<Card.Title class="flex items-center gap-2 text-lg">
						<UserPlus class="size-5 text-muted-foreground" aria-hidden="true" />
						Ajouter l'adresse d'un parent
					</Card.Title>
				</Card.Header>
				<Card.Content class="space-y-3">
					<p class="text-sm text-muted-foreground">
						Ton parent reçoit d'abord un courriel pour confirmer son adresse ; le lien du carnet
						part après sa confirmation. Deux parents au plus.
					</p>
					<form
						method="POST"
						action="?/addParent"
						use:enhance={submitting}
						class="flex flex-col gap-2 sm:flex-row sm:items-end"
					>
						<div class="flex-1 space-y-1.5">
							<Label for="carnet-parent-email">Adresse de ton parent</Label>
							<Input
								id="carnet-parent-email"
								name="email"
								type="email"
								autocomplete="off"
								required
								maxlength={254}
							/>
						</div>
						<Button type="submit" disabled={pending}>Envoyer la confirmation</Button>
					</form>
					{#if form?.message}
						<p
							role={form.sent ? 'status' : 'alert'}
							class={form.sent ? 'text-sm' : 'text-sm text-destructive'}
						>
							{form.message}
						</p>
					{/if}
				</Card.Content>
			</Card.Root>
		{/if}

		<Card.Root>
			<Card.Header>
				<Card.Title class="flex items-center gap-2 text-lg">
					<Mail class="size-5 text-muted-foreground" aria-hidden="true" />
					Courriels envoyés à tes parents
				</Card.Title>
			</Card.Header>
			<Card.Content>
				{#if data.notifications.length === 0}
					<p class="text-sm text-muted-foreground">Aucun courriel envoyé.</p>
				{:else}
					<ul class="divide-y divide-border">
						{#each data.notifications as n (`${n.created_at}-${n.kind}`)}
							<li class="flex flex-wrap justify-between gap-x-3 py-2 text-sm">
								<span>{notificationLabel(n.kind, n.reasons)}</span>
								<span class="text-muted-foreground">
									{DATE_FORMAT.format(new Date(n.created_at))}
								</span>
							</li>
						{/each}
					</ul>
				{/if}
			</Card.Content>
		</Card.Root>
	{/if}
</div>
