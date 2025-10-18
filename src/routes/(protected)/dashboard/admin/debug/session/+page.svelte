<script lang="ts">
	import * as Card from '$lib/components/ui/card';
	import { Badge } from '$lib/components/ui/badge';
	import { Separator } from '$lib/components/ui/separator';

	let { data } = $props();

	function formatExpiry(minutes: number | null): string {
		if (minutes === null) return 'Unknown';
		if (minutes < 0) return 'EXPIRED';
		if (minutes < 60) return `${minutes} minutes`;
		const hours = Math.floor(minutes / 60);
		const remainingMinutes = minutes % 60;
		return `${hours}h ${remainingMinutes}m`;
	}
</script>

<div class="space-y-6">
	<!-- Session Expiry Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Session Status</Card.Title>
			<Card.Description>Authentication session expiry information</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="grid grid-cols-1 gap-4 md:grid-cols-3">
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Expires At</p>
					<p class="font-mono text-sm">
						{data.expiryInfo.expiresAt || 'Unknown'}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Time Until Expiry</p>
					<p class="font-mono text-sm">
						{formatExpiry(data.expiryInfo.timeUntilExpiry)}
					</p>
				</div>
				<div class="space-y-1">
					<p class="text-sm text-muted-foreground">Status</p>
					{#if data.expiryInfo.isExpired}
						<Badge variant="destructive">Expired</Badge>
					{:else if data.expiryInfo.timeUntilExpiry && data.expiryInfo.timeUntilExpiry < 30}
						<Badge
							variant="outline"
							class="bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200"
						>
							Expiring Soon
						</Badge>
					{:else}
						<Badge
							variant="outline"
							class="bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200"
						>
							Active
						</Badge>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Auth Provider Info -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Authentication Provider</Card.Title>
			<Card.Description>OAuth provider and authentication details</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3">
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">Primary Provider</span>
					<Badge>{data.authProvider.provider}</Badge>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">All Providers</span>
					<div class="flex gap-2">
						{#each data.authProvider.providers as provider (provider)}
							<Badge variant="outline">{provider}</Badge>
						{/each}
					</div>
				</div>
				<Separator />
				<div class="flex items-center justify-between">
					<span class="text-sm font-medium">User Role</span>
					<Badge variant="secondary">{data.authProvider.role}</Badge>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Session Metadata -->
	{#if data.sessionMetadata}
		<Card.Root>
			<Card.Header>
				<Card.Title>Session Metadata</Card.Title>
				<Card.Description>Session tokens and expiry (sensitive data redacted)</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3 font-mono text-sm">
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Access Token:</span>
						<span class="max-w-md text-right break-all">{data.sessionMetadata.access_token}</span>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Refresh Token:</span>
						<span class="max-w-md text-right break-all">{data.sessionMetadata.refresh_token}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Token Type:</span>
						<span>{data.sessionMetadata.token_type}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Expires In:</span>
						<span>{data.sessionMetadata.expires_in} seconds</span>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Provider Token:</span>
						<span class="max-w-md text-right break-all">{data.sessionMetadata.provider_token}</span>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Provider Refresh:</span>
						<span class="max-w-md text-right break-all"
							>{data.sessionMetadata.provider_refresh_token}</span
						>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- User Metadata (OAuth) -->
	{#if data.userMetadata}
		<Card.Root>
			<Card.Header>
				<Card.Title>User Metadata (OAuth)</Card.Title>
				<Card.Description>Data provided by OAuth provider (Google)</Card.Description>
			</Card.Header>
			<Card.Content>
				<div class="space-y-3 font-mono text-sm">
					<div class="flex justify-between">
						<span class="text-muted-foreground">Email:</span>
						<span>{data.userMetadata.email}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Email Verified:</span>
						<span>{data.userMetadata.email_verified ? '✅' : '❌'}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Full Name:</span>
						<span>{data.userMetadata.full_name || '(none)'}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Given Name:</span>
						<span>{data.userMetadata.given_name || '(none)'}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Family Name:</span>
						<span>{data.userMetadata.family_name || '(none)'}</span>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Avatar URL:</span>
						<span class="max-w-md text-right break-all"
							>{data.userMetadata.avatar_url || '(none)'}</span
						>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Picture (Google):</span>
						<span class="max-w-md text-right break-all"
							>{data.userMetadata.picture || '(none)'}</span
						>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Provider ID:</span>
						<span>{data.userMetadata.provider_id || '(none)'}</span>
					</div>
					<Separator />
					<div class="flex justify-between">
						<span class="text-muted-foreground">Sub:</span>
						<span>{data.userMetadata.sub || '(none)'}</span>
					</div>
					<Separator />
					<div class="flex items-start justify-between">
						<span class="text-muted-foreground">Issuer (iss):</span>
						<span class="max-w-md text-right break-all">{data.userMetadata.iss || '(none)'}</span>
					</div>
				</div>
			</Card.Content>
		</Card.Root>
	{/if}

	<!-- Profile Data (Database) -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Profile Data (Database)</Card.Title>
			<Card.Description>User profile stored in database</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-3 font-mono text-sm">
				<div class="flex justify-between">
					<span class="text-muted-foreground">ID:</span>
					<span class="max-w-md text-right break-all">{data.profileData.id}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Email:</span>
					<span>{data.profileData.email}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">First Name:</span>
					<span>{data.profileData.firstname || '(none)'}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Last Name:</span>
					<span>{data.profileData.lastname || '(none)'}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Full Name:</span>
					<span>{data.profileData.full_name || '(none)'}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Role:</span>
					<span>{data.profileData.role}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Gender:</span>
					<span>{data.profileData.gender || '(none)'}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Grade:</span>
					<span>{data.profileData.grade || '(none)'}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">School ID:</span>
					<span class="max-w-md text-right break-all">{data.profileData.school_id || '(none)'}</span
					>
				</div>
				<Separator />
				<div class="flex items-start justify-between">
					<span class="text-muted-foreground">Avatar URL:</span>
					<span class="max-w-md text-right break-all"
						>{data.profileData.avatar_url || '(none)'}</span
					>
				</div>
				<Separator />
				<div class="flex items-start justify-between">
					<span class="text-muted-foreground">Class IDs:</span>
					<span class="max-w-md text-right break-all">
						{JSON.stringify(data.profileData.class_ids || [])}
					</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Created At:</span>
					<span>{data.profileData.created_at}</span>
				</div>
				<Separator />
				<div class="flex justify-between">
					<span class="text-muted-foreground">Updated At:</span>
					<span>{data.profileData.updated_at}</span>
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Data Comparison -->
	<Card.Root>
		<Card.Header>
			<Card.Title>Data Comparison</Card.Title>
			<Card.Description>Compare OAuth metadata with database profile</Card.Description>
		</Card.Header>
		<Card.Content>
			<div class="space-y-4">
				<div>
					<h3 class="mb-2 text-sm font-semibold">Name Comparison</h3>
					<div class="space-y-2 text-sm">
						<div class="flex justify-between rounded bg-muted/50 p-2">
							<span class="text-muted-foreground">OAuth Full Name:</span>
							<span>{data.userMetadata?.full_name || '(none)'}</span>
						</div>
						<div class="flex justify-between rounded bg-muted/50 p-2">
							<span class="text-muted-foreground">Profile First + Last:</span>
							<span>
								{data.profileData.firstname || '(none)'}
								{data.profileData.lastname || ''}
							</span>
						</div>
					</div>
				</div>

				<Separator />

				<div>
					<h3 class="mb-2 text-sm font-semibold">Avatar Comparison</h3>
					<div class="space-y-2 text-sm">
						<div class="flex items-start justify-between rounded bg-muted/50 p-2">
							<span class="text-muted-foreground">OAuth Picture:</span>
							<span class="max-w-md text-right break-all">
								{data.userMetadata?.picture || '(none)'}
							</span>
						</div>
						<div class="flex items-start justify-between rounded bg-muted/50 p-2">
							<span class="text-muted-foreground">OAuth Avatar URL:</span>
							<span class="max-w-md text-right break-all">
								{data.userMetadata?.avatar_url || '(none)'}
							</span>
						</div>
						<div class="flex items-start justify-between rounded bg-muted/50 p-2">
							<span class="text-muted-foreground">Profile Avatar URL:</span>
							<span class="max-w-md text-right break-all">
								{data.profileData.avatar_url || '(none)'}
							</span>
						</div>
					</div>

					{#if data.userMetadata?.picture && !data.profileData.avatar_url}
						<div
							class="mt-2 rounded border border-yellow-200 bg-yellow-50 p-3 dark:border-yellow-800 dark:bg-yellow-900/20"
						>
							<p class="text-sm text-yellow-800 dark:text-yellow-200">
								⚠️ OAuth has picture but profile doesn't have avatar_url saved. User should log out
								and log back in.
							</p>
						</div>
					{/if}
				</div>
			</div>
		</Card.Content>
	</Card.Root>

	<!-- Privacy Notice -->
	<div
		class="rounded-lg border border-border bg-muted/30 p-4 text-center text-xs text-muted-foreground"
	>
		🔒 Sensitive data (tokens, full emails) are redacted for security
	</div>
</div>
