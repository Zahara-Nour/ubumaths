<!--
	Mon profil — placeholder
	========================

	Page accessible depuis l'avatar du header et depuis l'item "Mon profil"
	en footer de la sidebar. Pour l'instant : info utilisateur de base.

	Les fonctions GDPR (Export mes données, Supprimer mon compte) et les
	contrôles de préférences (dark/light, taille texte) seront migrées ici
	depuis le dropdown de l'avatar en Phase 3 de la refonte sidebar.
	Voir docs/wip/sidebar-reorg-progress.md.
-->
<script lang="ts">
	import type { LayoutData } from '../$types';
	import UserAvatar from '$lib/components/UserAvatar.svelte';
	import { Button } from '$lib/components/ui/button';
	import { LogOut } from 'lucide-svelte';

	let { data }: { data: LayoutData } = $props();

	const role = $derived(data.profile.role);
	const roleLabel = $derived(
		role === 'student' ? 'Élève' : role === 'teacher' ? 'Enseignant' : 'Administrateur'
	);

	async function handleLogout() {
		const form = document.createElement('form');
		form.method = 'POST';
		form.action = '/auth/logout';
		document.body.appendChild(form);
		form.submit();
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
		aria-label="Préférences et compte"
	>
		<h2 class="mb-3 text-lg font-semibold">Compte</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			La gestion des préférences (mode sombre, taille du texte), l'export de vos données et la
			suppression de compte seront accessibles ici prochainement.
		</p>
		<Button variant="outline" onclick={handleLogout}>
			<LogOut class="mr-2 h-4 w-4" />
			Se déconnecter
		</Button>
	</section>
</div>
