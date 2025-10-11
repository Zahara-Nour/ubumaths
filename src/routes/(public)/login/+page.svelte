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
	let urlError = $derived($page.url.searchParams.get('error'));
</script>

<div class="min-h-screen flex items-center justify-center bg-background px-4">
	<Card.Root class="max-w-md w-full">
		<Card.Header>
			<Card.Title class="text-center text-3xl">Sign in to your account</Card.Title>
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
					<Tabs.Trigger value="google">Google Sign In</Tabs.Trigger>
					<Tabs.Trigger value="email">Email & Password</Tabs.Trigger>
				</Tabs.List>

				<!-- Google Sign In Tab -->
				<Tabs.Content value="google" class="space-y-4">
					<form method="POST" action="?/googleSignIn" use:enhance class="space-y-4">
						<p class="text-sm text-muted-foreground text-center">
							Sign in with your Voltaire Doha Google account (@voltairedoha.com)
						</p>

						<Button type="submit" variant="outline" class="w-full gap-3">
							<svg class="w-5 h-5" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
								<path
									d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"
									fill="#4285F4"
								/>
								<path
									d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"
									fill="#34A853"
								/>
								<path
									d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"
									fill="#FBBC05"
								/>
								<path
									d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"
									fill="#EA4335"
								/>
							</svg>
							Sign in with Google
						</Button>

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
							<Label for="email">Email address</Label>
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
								<Label for="password">Password</Label>
								<a href="/auth/reset-password" class="text-sm text-primary hover:underline">
									Forgot password?
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

						<Button type="submit" class="w-full">Sign in</Button>

						<!-- Sign up link -->
						<p class="text-center text-sm text-muted-foreground">
							Don't have an account?
							<a href="/signup" class="text-primary hover:underline font-medium">Sign up</a>
						</p>
					</form>
				</Tabs.Content>
			</Tabs.Root>
		</Card.Content>
	</Card.Root>
</div>
