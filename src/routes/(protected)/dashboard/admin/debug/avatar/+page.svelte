<script lang="ts">
	import UserAvatar from '$lib/components/UserAvatar.svelte';

	let { data } = $props();
</script>

<div class="space-y-6">
	<div class="mb-8 rounded-lg border border-border bg-muted/50 p-6">
		<h2 class="mb-3 text-lg font-semibold">Avatar Debug</h2>
		<p class="text-sm text-muted-foreground">
			Shows avatar display and data sources. Avatar URL is synced from Google OAuth on each login.
		</p>
	</div>

	<div class="space-y-6">
		<!-- Avatar Display -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Avatar Display</h2>
			<UserAvatar
				avatar_url={data.profile?.avatar_url}
				role={data.profile?.role}
				firstname={data.profile?.firstname}
				lastname={data.profile?.lastname}
				class="h-20 w-20"
			/>
		</div>

		<!-- Data Sources -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Data Sources</h2>
			<ul class="space-y-2 text-sm">
				<li>
					<strong>profile.avatar_url:</strong>
					<code class="break-all">{data.profile?.avatar_url || '(null)'}</code>
				</li>
				<li>
					<strong>user_metadata.picture:</strong>
					<code class="break-all">{data.user?.user_metadata?.picture || '(null)'}</code>
				</li>
				<li>
					<strong>profile.role:</strong>
					{data.profile?.role || '(null)'}
				</li>
			</ul>
		</div>

		<!-- Raw Profile -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Profile Data</h2>
			<pre class="overflow-auto rounded bg-muted p-4 text-xs">{JSON.stringify(
					data.profile,
					null,
					2
				)}</pre>
		</div>
	</div>
</div>
