<!--
	Mon profil
	==========

	Page accessible depuis l'avatar du header et depuis l'item "Mon profil"
	en footer de la sidebar.

	Regroupe :
	- Informations utilisateur (avatar, nom, email, rôle)
	- Préférences (mode sombre, taille du texte) — accessibles aussi via le
	  menu hamburger sur mobile et via le header sur desktop
	- Compte (GDPR Art. 20 : export, GDPR Art. 17 : suppression)
	- Bouton de déconnexion

	Migré depuis l'ancien dropdown de l'avatar (Phase 3 refonte sidebar).
-->
<script lang="ts">
	import type { LayoutData } from '../$types';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import AccountDeletionDialog from '$lib/components/account/AccountDeletionDialog.svelte';
	import { theme } from '$lib/stores/theme.svelte';
	import { fontSize } from '$lib/stores/fontSize.svelte';
	import { toaster } from '$lib/stores/toaster.svelte';
	import { LogOut, Download, Loader2, Trash2, Sun, Moon, Minus, Plus } from 'lucide-svelte';

	let { data }: { data: LayoutData } = $props();

	const role = $derived(data.profile.role);
	const roleLabel = $derived(
		role === 'student' ? 'Élève' : role === 'teacher' ? 'Enseignant' : 'Administrateur'
	);

	let isExporting = $state(false);
	let accountDeletionDialogOpen = $state(false);

	async function handleLogout() {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/logout';
		document.body.appendChild(form);
		form.submit();
	}

	// GDPR Art. 20 — data portability
	async function handleExport() {
		if (isExporting) return;
		isExporting = true;
		try {
			const response = await fetch('/api/account/export');
			if (!response.ok) {
				if (response.status === 429) {
					toaster.error('Export limité à 1 fois par heure. Réessayez plus tard.');
				} else {
					toaster.error("Erreur lors de l'export des données");
				}
				return;
			}

			const contentDisposition = response.headers.get('Content-Disposition');
			let filename = 'ubumaths-export.json';
			if (contentDisposition) {
				const match = contentDisposition.match(/filename="(.+)"/);
				if (match) filename = match[1];
			}

			const blob = await response.blob();
			const url = URL.createObjectURL(blob);
			const a = document.createElement('a');
			a.href = url;
			a.download = filename;
			document.body.appendChild(a);
			a.click();
			document.body.removeChild(a);
			URL.revokeObjectURL(url);

			toaster.success('Données exportées avec succès');
		} catch (err) {
			console.error('Export failed:', err);
			toaster.error("Erreur lors de l'export des données");
		} finally {
			isExporting = false;
		}
	}
</script>

<svelte:head>
	<title>Mon profil — UbuMaths</title>
</svelte:head>

<div class="space-y-6">
	<header>
		<h1 class="text-3xl font-bold tracking-tight">Mon profil</h1>
		<p class="text-sm text-muted-foreground">Vos informations personnelles et préférences.</p>
	</header>

	<section
		class="flex items-start gap-4 rounded-lg border border-border bg-card p-6 shadow-sm"
		aria-label="Informations utilisateur"
	>
		<UserAvatar
			avatar_url={data.profile.avatar_url}
			{role}
			firstname={data.profile.firstname}
			lastname={data.profile.lastname}
			class="h-20 w-20"
		/>
		<div class="flex-1 space-y-1">
			<p class="text-xl font-semibold">
				{data.profile.firstname ?? ''}
				{data.profile.lastname ?? ''}
			</p>
			<p class="text-sm text-muted-foreground">{data.profile.email}</p>
			<span
				class="inline-block rounded-full bg-primary/10 px-3 py-1 text-xs font-medium text-primary"
			>
				{roleLabel}
			</span>
		</div>
	</section>

	<section
		class="rounded-lg border border-border bg-card p-6 shadow-sm"
		aria-label="Préférences d'affichage"
	>
		<h2 class="mb-4 text-lg font-semibold">Préférences d'affichage</h2>
		<div class="flex flex-wrap items-center gap-4">
			<Button variant="outline" onclick={() => theme.toggle()}>
				{#if theme.dark}
					<Sun class="mr-2 h-4 w-4" aria-hidden="true" />
					Passer en mode clair
				{:else}
					<Moon class="mr-2 h-4 w-4" aria-hidden="true" />
					Passer en mode sombre
				{/if}
			</Button>

			<div class="flex items-center gap-2">
				<span class="text-sm font-medium">Taille du texte :</span>
				<Button
					variant="outline"
					size="icon-sm"
					onclick={() => fontSize.decrease()}
					disabled={!fontSize.canDecrease}
					aria-label="Réduire la taille du texte"
				>
					<Minus class="h-4 w-4" />
				</Button>
				<span class="w-6 text-center text-sm">A</span>
				<Button
					variant="outline"
					size="icon-sm"
					onclick={() => fontSize.increase()}
					disabled={!fontSize.canIncrease}
					aria-label="Augmenter la taille du texte"
				>
					<Plus class="h-4 w-4" />
				</Button>
			</div>
		</div>
	</section>

	<section
		class="rounded-lg border border-border bg-card p-6 shadow-sm"
		aria-label="Gestion du compte"
	>
		<h2 class="mb-4 text-lg font-semibold">Compte</h2>
		<div class="flex flex-wrap gap-3">
			<Button variant="outline" onclick={handleExport} disabled={isExporting}>
				{#if isExporting}
					<Loader2 class="mr-2 h-4 w-4 animate-spin" aria-hidden="true" />
					Export en cours...
				{:else}
					<Download class="mr-2 h-4 w-4" aria-hidden="true" />
					Exporter mes données
				{/if}
			</Button>

			<Button variant="outline" onclick={handleLogout}>
				<LogOut class="mr-2 h-4 w-4" aria-hidden="true" />
				Se déconnecter
			</Button>

			<Button
				variant="outline"
				class="text-destructive hover:bg-destructive/10 hover:text-destructive"
				onclick={() => (accountDeletionDialogOpen = true)}
			>
				<Trash2 class="mr-2 h-4 w-4" aria-hidden="true" />
				Supprimer mon compte
			</Button>
		</div>
	</section>
</div>

<AccountDeletionDialog
	bind:open={accountDeletionDialogOpen}
	onOpenChange={(open) => (accountDeletionDialogOpen = open)}
/>
