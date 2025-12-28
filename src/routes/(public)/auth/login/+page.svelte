<!--
  Login Page - Simplified Design

  Two clear options:
  1. "Lycée Voltaire" button - One-click Google OAuth for @voltairedoha.com accounts
  2. "Email et mot de passe" button - Reveals email/password form inline

  Both methods use SvelteKit form actions (server-side) to ensure cookies are
  properly set on the server.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { resolve } from '$app/paths';
	import { page } from '$app/stores';
	import { slide } from 'svelte/transition';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';

	// Form action result (contains error if login failed)
	let { form }: { form: ActionData } = $props();

	// State for showing email form
	let showEmailForm = $state(false);

	// Extract error from URL query params (for OAuth callback errors)
	let urlError = $derived.by(() => {
		const currentPage = $page;
		return currentPage.url.searchParams.get('error');
	});
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header>
			<Card.Title class="text-center text-3xl">Connexion à votre compte</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-6">
			<!-- Display errors from OAuth callback or form actions -->
			{#if urlError}
				<Alert.Root variant="destructive">
					<Alert.Description>{urlError}</Alert.Description>
				</Alert.Root>
			{/if}

			<!-- Primary: Google Sign In for Voltaire accounts -->
			<form method="POST" action="?/googleSignIn" use:enhance>
				<Button type="submit" variant="default" class="h-auto w-full flex-col gap-1 py-4">
					<span class="flex items-center gap-2 text-lg font-semibold">
						<svg class="h-5 w-5" viewBox="0 0 24 24" fill="currentColor">
							<path
								d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
							/>
							<path
								d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
							/>
							<path
								d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
							/>
							<path
								d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
							/>
						</svg>
						Lycée Voltaire
					</span>
					<span class="text-sm font-normal opacity-80">Comptes @voltairedoha.com</span>
				</Button>
			</form>

			<!-- Separator -->
			<div class="relative">
				<div class="absolute inset-0 flex items-center">
					<span class="w-full border-t"></span>
				</div>
				<div class="relative flex justify-center text-xs uppercase">
					<span class="bg-card px-2 text-muted-foreground">ou</span>
				</div>
			</div>

			<!-- Secondary: Email/Password option -->
			{#if !showEmailForm}
				<Button
					variant="outline"
					class="h-auto w-full flex-col gap-1 py-4"
					onclick={() => (showEmailForm = true)}
				>
					<span class="flex items-center gap-2 text-lg font-semibold">
						<svg
							class="h-5 w-5"
							viewBox="0 0 24 24"
							fill="none"
							stroke="currentColor"
							stroke-width="2"
						>
							<rect x="2" y="4" width="20" height="16" rx="2" />
							<path d="m22 7-8.97 5.7a1.94 1.94 0 0 1-2.06 0L2 7" />
						</svg>
						Email et mot de passe
					</span>
					<span class="text-sm font-normal opacity-80">Autres comptes</span>
				</Button>
			{:else}
				<!-- Email/Password Form -->
				<div transition:slide={{ duration: 200 }}>
					<form method="POST" action="?/login" use:enhance class="space-y-4">
						<div class="mb-4 flex items-center justify-between">
							<span class="text-sm font-medium text-muted-foreground">Connexion par email</span>
							<Button
								variant="ghost"
								size="sm"
								type="button"
								onclick={() => (showEmailForm = false)}
							>
								Retour
							</Button>
						</div>

						<div class="space-y-2">
							<Label for="email">Adresse email</Label>
							<Input
								id="email"
								name="email"
								type="email"
								autocomplete="email"
								required
								value={form?.email ?? ''}
							/>
						</div>

						<div class="space-y-2">
							<div class="flex items-center justify-between">
								<Label for="password">Mot de passe</Label>
								<a
									href={resolve('/auth/reset-password')}
									class="text-sm text-primary hover:underline"
								>
									Mot de passe oublié ?
								</a>
							</div>
							<Input
								id="password"
								name="password"
								type="password"
								autocomplete="current-password"
								required
							/>
						</div>

						{#if form?.error && !urlError}
							<Alert.Root variant="destructive">
								<Alert.Description>{form.error}</Alert.Description>
							</Alert.Root>
						{/if}

						<Button type="submit" variant="default" class="w-full">Se connecter</Button>
					</form>
				</div>
			{/if}
		</Card.Content>
	</Card.Root>
</div>
