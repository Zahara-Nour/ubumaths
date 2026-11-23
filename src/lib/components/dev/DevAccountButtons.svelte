<script lang="ts">
	/**
	 * Connexion en un geste aux comptes fictifs (serveur de dev)
	 * ==========================================================
	 *
	 * Trois boutons sous le formulaire de connexion, chargés par la page en dev
	 * seulement (`import.meta.env.DEV`) : jamais dans le build. Un appui envoie le
	 * compte fictif à l'action `?/login` de la page, la même que le formulaire :
	 * aucune route nouvelle, aucun accès nouveau.
	 *
	 * Cachés quand le serveur ne vise pas la base locale. Élève : `eleve01`, à
	 * défaut `student` (base non remplie), comme `pnpm voir --compte eleve`.
	 */
	import { applyAction, deserialize } from '$app/forms';
	import { PUBLIC_SUPABASE_URL } from '$app/env/public';
	import { Button } from '#lib/components/ui/button/index.ts';
	import { isLocalSupabaseUrl } from '#lib/dev/feedback.ts';
	import {
		LOCAL_ACCOUNTS,
		signInWithFirst,
		type LocalAccount,
		type LocalAccountName,
		type SignInAttempt
	} from '#lib/dev/local-accounts.ts';

	type ActionResult = ReturnType<typeof deserialize>;

	const LABELS: { name: LocalAccountName; label: string }[] = [
		{ name: 'prof', label: 'Prof' },
		{ name: 'eleve', label: 'Élève' },
		{ name: 'admin', label: 'Admin' }
	];

	const available = isLocalSupabaseUrl(PUBLIC_SUPABASE_URL);

	let pending = $state<LocalAccountName | null>(null);
	let failure = $state<string | null>(null);

	async function attempt(account: LocalAccount): Promise<SignInAttempt<ActionResult>> {
		const body = new FormData();
		body.set('email', account.email);
		body.set('password', account.password);
		let response: Response;
		try {
			response = await fetch('?/login', {
				method: 'POST',
				body,
				headers: { 'x-sveltekit-action': 'true' }
			});
		} catch {
			return { ok: false, message: 'le serveur de dev ne répond pas' };
		}
		let result: ActionResult;
		try {
			result = deserialize(await response.text());
		} catch {
			return { ok: false, message: `réponse ${response.status} illisible` };
		}
		if (result.type === 'redirect' || result.type === 'success') return { ok: true, result };
		const data: unknown = result.type === 'failure' ? result.data : null;
		const message =
			typeof data === 'object' && data !== null && 'error' in data && typeof data.error === 'string'
				? data.error
				: `réponse ${response.status}`;
		return { ok: false, message };
	}

	async function signIn(name: LocalAccountName) {
		if (pending) return;
		pending = name;
		failure = null;
		const outcome = await signInWithFirst(LOCAL_ACCOUNTS[name], attempt);
		if (outcome.ok) await applyAction(outcome.result);
		else
			failure = `Connexion impossible (${outcome.message}). Base locale démarrée et remplie ? pnpm db:start, pnpm db:neuf.`;
		pending = null;
	}
</script>

{#if available}
	<div class="space-y-2 border-t pt-4" data-testid="comptes-fictifs-dev">
		<p class="text-center text-xs text-muted-foreground">
			Serveur de dev : comptes fictifs de la base locale
		</p>
		<div class="grid grid-cols-3 gap-2">
			{#each LABELS as { name, label } (name)}
				<Button variant="outline" disabled={pending !== null} onclick={() => signIn(name)}>
					{label}
				</Button>
			{/each}
		</div>
		{#if failure}
			<p class="text-center text-sm text-destructive" role="alert">{failure}</p>
		{/if}
	</div>
{/if}
