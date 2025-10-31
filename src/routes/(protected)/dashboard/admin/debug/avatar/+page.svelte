<script lang="ts">
	import * as Avatar from '$lib/components/ui/avatar';
	import { getAvatarFallback, getAvatarInitials, type Gender } from '$lib/utils/avatar';

	let { data } = $props();

	function getAvatarSrc() {
		// First try profile avatar_url
		if (data.profile?.avatar_url) {
			return data.profile.avatar_url;
		}

		// Then try user metadata (Google uses 'picture')
		if (data.user?.user_metadata?.picture) {
			return data.user.user_metadata.picture;
		}
		if (data.user?.user_metadata?.avatar_url) {
			return data.user.user_metadata.avatar_url;
		}

		// Finally, use role/gender-based fallback if profile is available
		if (data.profile) {
			return getAvatarFallback(data.profile.role, data.profile.gender as Gender | null);
		}

		// Default fallback - empty string will trigger Avatar.Fallback
		return '';
	}
</script>

<div class="space-y-6">
	<!-- Documentation -->
	<div class="mb-8 rounded-lg border border-border bg-muted/50 p-6">
		<h2 class="mb-3 text-lg font-semibold">About This Page</h2>
		<p class="mb-4 text-sm text-muted-foreground">
			This debug page helps troubleshoot avatar display issues for users authenticated via Google
			OAuth. It shows all available avatar data sources and the fallback chain.
		</p>

		<div class="space-y-2 text-sm">
			<p class="font-semibold">Avatar Priority Order:</p>
			<ol class="ml-2 list-inside list-decimal space-y-1 text-muted-foreground">
				<li>
					<strong>profile.avatar_url</strong> - Stored in database (saved from OAuth on login)
				</li>
				<li>
					<strong>user_metadata.picture</strong> - Google OAuth session data (Google's standard field)
				</li>
				<li>
					<strong>user_metadata.avatar_url</strong> - Other OAuth providers (fallback field)
				</li>
				<li>
					<strong>Role/gender fallback</strong> - Default avatar based on user role and gender
				</li>
				<li><strong>Initials</strong> - First/last name initials or email initial</li>
			</ol>
		</div>

		<div class="mt-4 rounded border border-border bg-background p-3">
			<p class="font-mono text-xs">
				<strong>Important:</strong> Google OAuth stores profile pictures in the
				<code class="rounded bg-muted px-1">picture</code> field, NOT
				<code class="rounded bg-muted px-1">avatar_url</code>. If avatars aren't displaying, check
				that the OAuth callback and database trigger are extracting from the correct field.
			</p>
		</div>
	</div>

	<div class="space-y-6">
		<!-- Avatar Display -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Avatar Display</h2>
			<Avatar.Root class="h-20 w-20">
				<Avatar.Image src={getAvatarSrc()} alt={data.user?.email || 'User'} />
				<Avatar.Fallback>
					{getAvatarInitials(data.profile?.firstname ?? null, data.profile?.lastname ?? null) ||
						data.user?.email?.charAt(0).toUpperCase() ||
						'?'}
				</Avatar.Fallback>
			</Avatar.Root>
		</div>

		<!-- Avatar Source -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Avatar Source URL</h2>
			<p class="font-mono text-sm break-all">{getAvatarSrc() || '(empty)'}</p>
		</div>

		<!-- User Data -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">User Data</h2>
			<pre class="overflow-auto rounded bg-muted p-4 text-xs">{JSON.stringify(
					data.user,
					null,
					2
				)}</pre>
		</div>

		<!-- User Metadata -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">User Metadata</h2>
			<pre class="overflow-auto rounded bg-muted p-4 text-xs">{JSON.stringify(
					data.userMetadata,
					null,
					2
				)}</pre>
		</div>

		<!-- Profile Data -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Profile Data</h2>
			<pre class="overflow-auto rounded bg-muted p-4 text-xs">{JSON.stringify(
					data.profile,
					null,
					2
				)}</pre>
		</div>

		<!-- Specific Checks -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Specific Checks</h2>
			<ul class="space-y-2">
				<li>
					<strong>profile.avatar_url:</strong>
					{data.profile?.avatar_url || '(null/empty)'}
				</li>
				<li>
					<strong>user_metadata.avatar_url:</strong>
					{data.user?.user_metadata?.avatar_url || '(null/empty)'}
				</li>
				<li>
					<strong>user_metadata.picture:</strong>
					{data.user?.user_metadata?.picture || '(null/empty)'}
				</li>
				<li>
					<strong>Profile role:</strong>
					{data.profile?.role || '(null/empty)'}
				</li>
				<li>
					<strong>Profile gender:</strong>
					{data.profile?.gender || '(null/empty)'}
				</li>
			</ul>
		</div>

		<!-- Troubleshooting Tips -->
		<div class="rounded-lg border border-border bg-card p-6">
			<h2 class="mb-4 text-xl font-semibold">Troubleshooting Tips</h2>
			<div class="space-y-3 text-sm">
				<div>
					<p class="mb-1 font-semibold">Avatar not displaying?</p>
					<ol class="ml-2 list-inside list-decimal space-y-1 text-muted-foreground">
						<li>Log out and log back in to trigger avatar save</li>
						<li>
							Check if <code class="rounded bg-muted px-1">user_metadata.picture</code> exists
						</li>
						<li>
							Verify migration 061 is applied: <code class="rounded bg-muted px-1"
								>pnpm db:migrate</code
							>
						</li>
						<li>Check browser console for image loading errors</li>
					</ol>
				</div>

				<div>
					<p class="mb-1 font-semibold">Related Files:</p>
					<ul class="ml-2 list-inside list-disc space-y-1 text-muted-foreground">
						<li>
							<code class="rounded bg-muted px-1 text-xs"
								>src/routes/(public)/auth/callback/+server.ts</code
							> - OAuth callback handler
						</li>
						<li>
							<code class="rounded bg-muted px-1 text-xs">src/lib/components/Header.svelte</code> - Avatar
							display logic
						</li>
						<li>
							<code class="rounded bg-muted px-1 text-xs"
								>supabase/migrations/061_fix_google_avatar_picture_field.sql</code
							> - Database trigger
						</li>
						<li>
							<code class="rounded bg-muted px-1 text-xs">src/lib/utils/avatar.ts</code> - Avatar utility
							functions
						</li>
					</ul>
				</div>
			</div>
		</div>
	</div>
</div>
