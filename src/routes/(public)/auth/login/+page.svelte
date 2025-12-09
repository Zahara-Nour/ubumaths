<!--
  Login Page

  AUTHENTICATION APPROACH:
  This page supports two authentication methods:
  1. Google OAuth (default) - One-click sign-in with Google workspace accounts
  2. Email/Password - Traditional authentication method

  Both methods use SvelteKit form actions (server-side) to ensure cookies are
  properly set on the server.

  WHY NOT CLIENT-SIDE?
  - Client Supabase uses localStorage
  - Server Supabase uses cookies
  - If we login on client, server doesn't know → UI doesn't update

  INSTEAD:
  - Form POSTs to server action (?/googleSignIn or ?/login)
  - Server initiates OAuth flow or calls signInWithPassword() → sets cookies
  - Server redirects on success
  - Browser detects auth change → UI updates

  PROGRESSIVE ENHANCEMENT:
  The use:enhance directive provides:
  - Client-side validation before submit
  - Loading states during submission
  - Prevents full page reload
  - Falls back to standard form POST if JS disabled
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { page } from '$app/stores';
	import { resolve } from '$app/paths';
	import type { ActionData } from './$types';
	import { Button } from '$lib/components/ui/button';
	import { Input } from '$lib/components/ui/input';
	import { Label } from '$lib/components/ui/label';
	import * as Card from '$lib/components/ui/card';
	import * as Alert from '$lib/components/ui/alert';
	import * as Tabs from '$lib/components/ui/tabs';

	// Form action result (contains error if login failed)
	let { form }: { form: ActionData } = $props();

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

			<!-- Tabs for Google vs Email/Password -->
			<Tabs.Root value="google">
				<Tabs.List class="grid w-full grid-cols-2">
					<Tabs.Trigger value="google">Compte Voltaire</Tabs.Trigger>
					<Tabs.Trigger value="email">Email & Mot de passe</Tabs.Trigger>
				</Tabs.List>

				<!-- Google Sign In Tab -->
				<Tabs.Content value="google" class="space-y-4">
					<form method="POST" action="?/googleSignIn" use:enhance class="space-y-4">
						<p class="text-center text-sm text-muted-foreground">
							Réservé au lycée Voltaire de Doha
						</p>

						<div class="flex justify-center">
							<Button type="submit" variant="destructive" class=" gap-3">Se connecter</Button>
						</div>

						{#if form?.error && !urlError}
							<Alert.Root variant="destructive">
								<Alert.Description>{form.error}</Alert.Description>
							</Alert.Root>
						{/if}
					</form>
				</Tabs.Content>

				<!-- Email & Password Tab -->
				<Tabs.Content value="email" class="space-y-4">
					<form method="POST" action="?/login" use:enhance class="space-y-4">
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

						<div class="flex justify-center">
							<Button type="submit" variant="destructive" class=" gap-3">Se connecter</Button>
						</div>

						<!-- Note: No signup link - registration is controlled -->
						<!-- Students: created by teachers or imported via Google Classroom -->
						<!-- Teachers: invitation/admin approval required -->
					</form>
				</Tabs.Content>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>
</div>
