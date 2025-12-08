<!--
  Pending Approval Page

  Displayed to users who have signed up but are awaiting admin approval.
  Provides clear feedback about their account status and a logout option.
-->
<script lang="ts">
	import { enhance } from '$app/forms';
	import { Button } from '$lib/components/ui/button';
	import * as Card from '$lib/components/ui/card';
	import { Clock } from 'lucide-svelte';
</script>

<div class="flex min-h-screen items-center justify-center bg-background px-4">
	<Card.Root class="w-full max-w-md">
		<Card.Header class="text-center">
			<div
				class="mx-auto mb-4 flex h-16 w-16 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-900"
			>
				<Clock class="h-8 w-8 text-amber-600 dark:text-amber-400" />
			</div>
			<Card.Title class="text-2xl">En attente d'approbation</Card.Title>
		</Card.Header>

		<Card.Content class="space-y-6 text-center">
			<p class="text-muted-foreground">
				Votre compte a été créé avec succès. Un administrateur doit approuver votre inscription
				avant que vous puissiez accéder à l'application.
			</p>

			<p class="text-sm text-muted-foreground">
				Vous recevrez une notification lorsque votre compte sera approuvé.
			</p>

			<form method="POST" action="/auth/logout" use:enhance>
				<Button type="submit" variant="outline" class="w-full">Se déconnecter</Button>
			</form>
		</Card.Content>
	</Card.Root>
</div>
