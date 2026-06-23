<!--
	Admin elevation page
	====================

	Step-up screen (Pattern 2). The teacher is already logged in as themselves;
	to act as admin they prove they hold the ADMIN account's credentials. On
	success the server sets an httpOnly elevation cookie and the parallel admin
	state becomes active — the teacher session is never modified.

	Mono-admin model: only the admin PASSWORD is asked — the server resolves the
	single admin account's email itself.

	Flow:
	  submit → POST /api/admin/elevate { password }
	    200 → invalidateAll() (re-runs layout loads so adminElevation is live)
	         → goto(data.redirect) (server-validated, open-redirect-safe target)
	    error → toaster with the server message; the form stays so the user can
	            retry. The submit button is disabled while the request is in flight.
-->

<script lang="ts">
	import { goto, invalidateAll } from '$app/navigation';
	import { ShieldCheck } from '@lucide/svelte';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import { toaster } from '$lib/stores/toaster.svelte';
	import type { PageData } from './$types';

	let { data }: { data: PageData } = $props();

	// Form state
	let password = $state('');
	let submitting = $state(false);

	async function handleSubmit(event: SubmitEvent) {
		event.preventDefault();
		if (submitting) return;

		submitting = true;
		try {
			const response = await fetch('/api/admin/elevate', {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({ password })
			});

			if (response.ok) {
				// Re-run server loads so locals.adminElevation is reflected in page
				// data (the admin layout guard now lets us through), then land on the
				// validated target.
				await invalidateAll();
				await goto(data.redirect);
				return;
			}

			// SvelteKit error() responses carry { message }; fall back to a generic
			// French message if the body is not the expected shape.
			let message = 'Échec de la connexion administration. Veuillez réessayer.';
			try {
				const body = (await response.json()) as { message?: unknown };
				if (typeof body.message === 'string' && body.message.length > 0) {
					message = body.message;
				}
			} catch {
				// Non-JSON body — keep the generic message.
			}
			toaster.error(message);
		} catch {
			toaster.error('Erreur réseau. Vérifiez votre connexion et réessayez.');
		} finally {
			submitting = false;
		}
	}
</script>

<svelte:head>
	<title>Accès administration — Chiphre</title>
</svelte:head>

<div class="flex min-h-[60vh] items-center justify-center p-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="space-y-2 text-center">
			<div class="flex justify-center">
				<div
					class="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900/40"
				>
					<ShieldCheck class="h-6 w-6 text-amber-600 dark:text-amber-400" />
				</div>
			</div>
			<Card.Title class="text-2xl">Accès administration</Card.Title>
			<Card.Description>
				Saisissez le mot de passe du compte administrateur pour accéder à cet espace.
			</Card.Description>
		</Card.Header>

		<Card.Content>
			<form class="space-y-4" onsubmit={handleSubmit}>
				<div class="space-y-2">
					<Label for="admin-password">Mot de passe administrateur</Label>
					<Input
						id="admin-password"
						type="password"
						autocomplete="current-password"
						bind:value={password}
						required
						disabled={submitting}
					/>
				</div>

				<Button type="submit" class="w-full" disabled={submitting}>
					{submitting ? 'Connexion…' : 'Accéder à l’administration'}
				</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
