import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database, FriendshipWithProfile, FriendshipType } from '$lib/types/database';
import { presenceManager } from './presence.svelte';

class FriendsManager {
	private supabase: SupabaseClient<Database> | null = null;
	private currentUserId: string | null = null;

	friendships = $state<FriendshipWithProfile[]>([]);
	pendingIncoming = $state<FriendshipWithProfile[]>([]);
	pendingSent = $state<FriendshipWithProfile[]>([]);
	loading = $state(false);
	error = $state<string | null>(null);

	/**
	 * Initialize the friends manager with Supabase client
	 */
	init(supabase: SupabaseClient<Database>, userId: string): void {
		this.supabase = supabase;
		this.currentUserId = userId;
	}

	/**
	 * Load all friendships for the current user
	 */
	async loadFriendships(): Promise<void> {
		if (!this.supabase || !this.currentUserId) {
			console.error('Friends manager not initialized');
			return;
		}

		this.loading = true;
		this.error = null;

		try {
			// Fetch all friendships where user is involved
			const { data: friendshipsData, error: friendshipsError } = await this.supabase
				.from('friendships')
				.select('*')
				.or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`)
				.order('created_at', { ascending: false });

			if (friendshipsError) {
				throw friendshipsError;
			}

			// Get all friend IDs to fetch their profiles
			const friendIds = friendshipsData.map((f) =>
				f.requester_id === this.currentUserId ? f.addressee_id : f.requester_id
			);

			// Fetch friend profiles
			const { data: profilesData, error: profilesError } = await this.supabase
				.from('profiles')
				.select('id, full_name, firstname, lastname, avatar_url, role')
				.in('id', friendIds);

			if (profilesError) {
				throw profilesError;
			}

			// Fetch presence for accepted friends
			const acceptedFriendIds = friendshipsData
				.filter((f) => f.status === 'accepted')
				.map((f) => (f.requester_id === this.currentUserId ? f.addressee_id : f.requester_id));

			const { data: presenceData, error: presenceError } = await this.supabase
				.from('user_presence')
				.select('*')
				.in('user_id', acceptedFriendIds);

			if (presenceError) {
				console.warn('Error fetching presence:', presenceError);
			}

			// Create profile map for quick lookup
			const profileMap = new Map(profilesData.map((p) => [p.id, p]));
			const presenceMap = new Map(presenceData?.map((p) => [p.user_id, p]) ?? []);

			// Enrich friendships with profile and presence data
			const enrichedFriendships = friendshipsData
				.map((friendship) => {
					const friendId =
						friendship.requester_id === this.currentUserId
							? friendship.addressee_id
							: friendship.requester_id;

					const profile = profileMap.get(friendId);
					const presenceData = presenceMap.get(friendId);

					// Skip if profile not found (shouldn't happen but handle gracefully)
					if (!profile) {
						console.warn(`Profile not found for friend ${friendId}`);
						return null;
					}

					// Transform presence to match FriendshipWithProfile type
					const presence = presenceData
						? {
								is_online: presenceData.status === 'online',
								last_seen: presenceData.last_heartbeat
							}
						: undefined;

					const enrichedFriendship: FriendshipWithProfile = {
						id: friendship.id,
						status: friendship.status as FriendshipType,
						friendship_type: friendship.friendship_type as FriendshipType,
						created_at: friendship.created_at,
						updated_at: friendship.updated_at,
						requester_id: friendship.requester_id,
						addressee_id: friendship.addressee_id,
						friend_profile: {
							id: friendId,
							full_name: profile.full_name ?? null,
							firstname: profile.firstname ?? null,
							lastname: profile.lastname ?? null,
							avatar_url: profile.avatar_url ?? null,
							role: profile.role ?? 'student'
						} as Database['public']['Tables']['profiles']['Row'],
						presence
					};
					return enrichedFriendship;
				})
				.filter((f): f is NonNullable<typeof f> => f !== null);

			// Separate into categories
			this.friendships = enrichedFriendships.filter((f) => f.status === 'accepted');
			this.pendingIncoming = enrichedFriendships.filter(
				(f) => f.status === 'pending' && f.addressee_id === this.currentUserId
			);
			this.pendingSent = enrichedFriendships.filter(
				(f) => f.status === 'pending' && f.requester_id === this.currentUserId
			);

			// Start presence tracking for accepted friends
			const trackedFriendIds = this.friendships
				.map((f) => f.friend_profile?.id)
				.filter((id): id is string => id !== undefined);
			if (trackedFriendIds.length > 0) {
				await presenceManager.startPresenceTracking(trackedFriendIds);
			}
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to load friendships';
			console.error('Error loading friendships:', err);
		} finally {
			this.loading = false;
		}
	}

	/**
	 * Send a friend request
	 */
	async sendFriendRequest(friendId: string, friendshipType: FriendshipType): Promise<boolean> {
		if (!this.supabase || !this.currentUserId) {
			console.error('Friends manager not initialized');
			return false;
		}

		try {
			const { error } = await this.supabase.from('friendships').insert({
				requester_id: this.currentUserId,
				addressee_id: friendId,
				status: 'pending',
				friendship_type: friendshipType
			});

			if (error) {
				throw error;
			}

			await this.loadFriendships();
			await this.updatePresenceTracking();
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to send friend request';
			console.error('Error sending friend request:', err);
			return false;
		}
	}

	/**
	 * Accept a friend request
	 */
	async acceptRequest(friendshipId: string): Promise<boolean> {
		if (!this.supabase) {
			console.error('Friends manager not initialized');
			return false;
		}

		try {
			const { error } = await this.supabase
				.from('friendships')
				.update({ status: 'accepted' })
				.eq('id', friendshipId);

			if (error) {
				throw error;
			}

			await this.loadFriendships();
			await this.updatePresenceTracking();
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to accept friend request';
			console.error('Error accepting friend request:', err);
			return false;
		}
	}

	/**
	 * Reject a friend request
	 */
	async rejectRequest(friendshipId: string): Promise<boolean> {
		if (!this.supabase) {
			console.error('Friends manager not initialized');
			return false;
		}

		try {
			const { error } = await this.supabase
				.from('friendships')
				.update({ status: 'rejected' })
				.eq('id', friendshipId);

			if (error) {
				throw error;
			}

			await this.loadFriendships();
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to reject friend request';
			console.error('Error rejecting friend request:', err);
			return false;
		}
	}

	/**
	 * Unfriend (delete friendship)
	 */
	async unfriend(friendshipId: string): Promise<boolean> {
		if (!this.supabase) {
			console.error('Friends manager not initialized');
			return false;
		}

		try {
			const { error } = await this.supabase.from('friendships').delete().eq('id', friendshipId);

			if (error) {
				throw error;
			}

			await this.loadFriendships();
			await this.updatePresenceTracking();
			return true;
		} catch (err) {
			this.error = err instanceof Error ? err.message : 'Failed to unfriend';
			console.error('Error unfriending:', err);
			return false;
		}
	}

	/**
	 * Cancel a sent friend request
	 */
	async cancelRequest(friendshipId: string): Promise<boolean> {
		// Same as unfriend, but semantically different
		return this.unfriend(friendshipId);
	}

	/**
	 * Get friend presence status (from presence manager)
	 */
	getFriendPresence(friendId: string): 'online' | 'offline' {
		return presenceManager.getFriendPresence(friendId);
	}

	/**
	 * Update presence tracking when friends list changes
	 */
	private async updatePresenceTracking(): Promise<void> {
		const friendIds = this.friendships
			.map((f) => f.friend_profile?.id)
			.filter((id): id is string => id !== undefined);
		if (friendIds.length > 0) {
			await presenceManager.updateFriendList(friendIds);
		} else {
			// No friends, stop tracking
			await presenceManager.stopPresenceTracking();
		}
	}

	/**
	 * Search for users to add as friends
	 */
	async searchUsers(query: string): Promise<
		Array<{
			id: string;
			full_name: string | null;
			firstname: string | null;
			lastname: string | null;
			avatar_url: string | null;
			role: 'student' | 'teacher' | 'admin';
			friendship_status?: 'pending' | 'accepted' | 'rejected' | null;
		}>
	> {
		if (!this.supabase || !this.currentUserId) {
			console.error('Friends manager not initialized');
			return [];
		}

		try {
			// Search users by name (case insensitive)
			const { data: usersData, error: usersError } = await this.supabase
				.from('profiles')
				.select('id, full_name, firstname, lastname, avatar_url, role')
				.neq('id', this.currentUserId) // Exclude self
				.or(`full_name.ilike.%${query}%,firstname.ilike.%${query}%,lastname.ilike.%${query}%`)
				.limit(20);

			if (usersError) {
				throw usersError;
			}

			// Get existing friendships with these users
			const userIds = usersData.map((u) => u.id);
			const { data: existingFriendships, error: friendshipsError } = await this.supabase
				.from('friendships')
				.select('addressee_id, requester_id, status')
				.or(`requester_id.eq.${this.currentUserId},addressee_id.eq.${this.currentUserId}`)
				.or(`requester_id.in.(${userIds.join(',')}),addressee_id.in.(${userIds.join(',')})`);

			if (friendshipsError) {
				console.warn('Error fetching existing friendships:', friendshipsError);
			}

			// Create friendship status map
			const friendshipMap = new Map<string, 'pending' | 'accepted' | 'rejected'>();
			existingFriendships?.forEach((f) => {
				const friendId = f.requester_id === this.currentUserId ? f.addressee_id : f.requester_id;
				friendshipMap.set(friendId, f.status as 'pending' | 'accepted' | 'rejected');
			});

			// Enrich users with friendship status
			return usersData.map((user) => ({
				...user,
				friendship_status: friendshipMap.get(user.id) ?? null
			}));
		} catch (err) {
			console.error('Error searching users:', err);
			return [];
		}
	}

	/**
	 * Get display name for a friend
	 */
	getDisplayName(friend: FriendshipWithProfile): string {
		if (!friend.friend_profile) {
			return 'Utilisateur inconnu';
		}
		if (friend.friend_profile.full_name) {
			return friend.friend_profile.full_name;
		}
		if (friend.friend_profile.firstname || friend.friend_profile.lastname) {
			return `${friend.friend_profile.firstname || ''} ${friend.friend_profile.lastname || ''}`.trim();
		}
		return 'Utilisateur inconnu';
	}
}

export const friendsManager = new FriendsManager();
