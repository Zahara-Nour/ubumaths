<!--
	Admin → Cours particuliers
	==========================

	Chantier `invitation-cours-particulier` (PR 2) : « Inviter un élève » (prénom, adresse
	du parent, niveau) et la liste des invitations ouvertes, avec « Renvoyer » (nouveau lien
	de 7 jours, l'ancien ne marche plus) et « Annuler ». Une invitation utilisée ou annulée
	quitte la liste ; une expirée y reste jusqu'à sa purge (30 jours) et peut être renvoyée.
	Garde, école et écritures : `+page.server.ts`.
-->
<script lang="ts">
	import type { SubmitFunction } from '$app/forms';
	import type { PageData } from './$types';
	import { enhance } from '$app/forms';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { Input } from '#lib/components/ui/input/index.ts';
	import { Label } from '#lib/components/ui/label/index.ts';
	import MySelect from '#lib/components/MySelect.svelte';
	import { toaster } from '#lib/stores/toaster.svelte.ts';
	import { formatGradeForDisplay, getGradeSelectItems } from '#lib/utils/grades.ts';
	import { GRADE_CODES, type GradeCode } from '#lib/types/grades.ts';

	// Types

	type Invitation = PageData['invitations'][number];
	type ActionResultData = { message?: string; emailSent?: boolean } | undefined;

	// Constantes

	const GRADE_ITEMS = getGradeSelectItems();

	// Variables

	let { data }: { data: PageData } = $props();

	let firstname = $state('');
	let parentEmail = $state('');
	let grade = $state('');
	let sending = $state(false);
	let busyId = $state<string | null>(null);

	let canSend = $derived(data.school !== null && data.school.hasSchoolYear);
	let formReady = $derived(firstname.trim() !== '' && parentEmail.trim() !== '' && grade !== '');

	// Functions

	function formatDate(iso: string): string {
		return new Date(iso).toLocaleDateString('fr-FR', {
			day: 'numeric',
			month: 'long',
			year: 'numeric'
		});
	}

	function gradeLabel(code: string): string {
		return (GRADE_CODES as readonly string[]).includes(code)
			? formatGradeForDisplay(code as GradeCode)
			: code;
	}

	function isExpired(invitation: Invitation): boolean {
		return new Date(invitation.expires_at).getTime() <= Date.now();
	}

	/** Ce que la ligne dit de l'invitation : courriel non parti, expirée, ou en attente. */
	function statusLabel(invitation: Invitation): string {
		if (!invitation.email_sent_at) return 'Courriel non parti';
		if (isExpired(invitation)) return `Expirée le ${formatDate(invitation.expires_at)}`;
		return `Expire le ${formatDate(invitation.expires_at)}`;
	}

	function showResult(resultData: ActionResultData, ok: boolean) {
		const message = resultData?.message ?? (ok ? 'C’est fait.' : 'Une erreur est survenue.');
		if (ok && resultData?.emailSent !== false) toaster.success(message);
		else if (ok) toaster.warning(message);
		else toaster.error(message);
	}

	const submitInvite: SubmitFunction = () => {
		sending = true;
		return async ({ result, update }) => {
			sending = false;
			if (result.type === 'success') {
				showResult(result.data as ActionResultData, true);
				firstname = '';
				parentEmail = '';
				grade = '';
				await update({ reset: false });
			} else if (result.type === 'failure') {
				showResult(result.data as ActionResultData, false);
			} else {
				await update();
			}
		};
	};

	function submitRowAction(id: string): SubmitFunction {
		return () => {
			busyId = id;
			return async ({ result, update }) => {
				busyId = null;
				if (result.type === 'success') {
					showResult(result.data as ActionResultData, true);
					await update();
				} else if (result.type === 'failure') {
					showResult(result.data as ActionResultData, false);
					await update();
				} else {
					await update();
				}
			};
		};
	}
</script>

<svelte:head>
	<title>Cours particuliers — Administration — Chiphre</title>
</svelte:head>

<section class="mx-auto max-w-4xl space-y-8 p-6">
	<header>
		<h1 class="text-2xl font-bold tracking-tight">Cours particuliers</h1>
		{#if data.school}
			<p class="mt-1 text-muted-foreground">
				École : {data.school.name}. Le parent reçoit un lien valable 7 jours qui crée l’espace de
				l’enfant et sa classe.
			</p>
		{/if}
	</header>

	{#if !data.school}
		<p class="rounded-md border border-border bg-muted p-4 text-sm" role="status">
			Aucune école n’est réglée pour les cours particuliers.
		</p>
	{:else}
		{#if !data.school.hasSchoolYear}
			<p
				class="rounded-md border border-warning bg-warning/10 p-4 text-sm text-foreground"
				role="status"
			>
				{data.school.name} n’a pas d’année scolaire en cours : créez-la avant d’envoyer une invitation.
			</p>
		{/if}

		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="text-lg font-semibold">Inviter un élève</h2>
			<p class="mt-1 text-sm text-muted-foreground">
				Pour un élève de moins de 15 ans : le parent donnera son consentement en créant l’espace.
			</p>
			<form
				method="POST"
				action="?/invite"
				class="mt-4 grid gap-4 sm:grid-cols-3"
				use:enhance={submitInvite}
			>
				<div class="space-y-1.5">
					<Label for="invite-firstname">Prénom de l’élève</Label>
					<Input
						id="invite-firstname"
						name="firstname"
						maxlength={50}
						autocomplete="off"
						required
						bind:value={firstname}
					/>
				</div>
				<div class="space-y-1.5">
					<Label for="invite-email">Adresse du parent</Label>
					<Input
						id="invite-email"
						name="parentEmail"
						type="email"
						maxlength={254}
						autocomplete="off"
						required
						bind:value={parentEmail}
					/>
				</div>
				<div class="space-y-1.5">
					<span class="block text-sm leading-none font-medium" aria-hidden="true">Niveau</span>
					<MySelect
						type="single"
						name="grade"
						items={GRADE_ITEMS}
						placeholder="Choisir un niveau"
						triggerAriaLabel={grade ? `Niveau : ${gradeLabel(grade)}` : 'Choisir un niveau'}
						bind:value={grade}
					/>
				</div>
				<div class="sm:col-span-3">
					<Button type="submit" disabled={!canSend || !formReady || sending}>
						{sending ? 'Envoi…' : 'Envoyer l’invitation'}
					</Button>
				</div>
			</form>
		</div>

		<div>
			<h2 class="text-lg font-semibold">Invitations en attente</h2>
			{#if data.invitations.length === 0}
				<p class="mt-2 text-sm text-muted-foreground">Aucune invitation en attente.</p>
			{:else}
				<ul class="mt-3 divide-y divide-border rounded-lg border border-border">
					{#each data.invitations as invitation (invitation.id)}
						<li class="flex flex-wrap items-center justify-between gap-3 p-4">
							<div class="min-w-0">
								<p class="font-medium">
									{invitation.firstname}
									<span class="text-sm font-normal text-muted-foreground">
										· {gradeLabel(invitation.grade)}</span
									>
								</p>
								<p class="truncate text-sm text-muted-foreground">{invitation.parent_email}</p>
								<p class="text-sm text-muted-foreground">
									{#if invitation.email_sent_at}
										Envoyée le {formatDate(invitation.email_sent_at)} ·
									{/if}
									<span
										class={!invitation.email_sent_at || isExpired(invitation)
											? 'font-medium text-destructive'
											: ''}>{statusLabel(invitation)}</span
									>
								</p>
							</div>
							<div class="flex gap-2">
								<form method="POST" action="?/resend" use:enhance={submitRowAction(invitation.id)}>
									<input type="hidden" name="id" value={invitation.id} />
									<Button
										type="submit"
										variant="outline"
										size="sm"
										disabled={!canSend || busyId !== null || invitation.sent_count >= data.maxSends}
									>
										Renvoyer
									</Button>
								</form>
								<form method="POST" action="?/cancel" use:enhance={submitRowAction(invitation.id)}>
									<input type="hidden" name="id" value={invitation.id} />
									<Button type="submit" variant="ghost" size="sm" disabled={busyId !== null}>
										Annuler
									</Button>
								</form>
							</div>
						</li>
					{/each}
				</ul>
			{/if}
		</div>
	{/if}
</section>
