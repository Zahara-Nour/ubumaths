// Gardes `if (!browser)` des stores temps réel (supabaseRealtime, chat, presence).
//
// Ces cas ne peuvent pas vivre dans les `*.svelte.test.ts` : ceux-ci tournent dans
// Chromium, où le mock de `$app/environment` est figé à `browser: true` (vitest copie
// les exports du mock, on ne peut pas le basculer test par test). Ici, projet `server`
// (node), `browser` vaut false pour tout le fichier.
//
// Pour que seule la garde `browser` explique le refus (et non « store non initialisé »),
// chaque test installe d'abord un client factice dans l'état privé du store.
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import type { SupabaseClient } from '@supabase/supabase-js';
import type { Database } from '$lib/types/database';

vi.mock('$app/environment', () => ({
	browser: false,
	building: false,
	dev: true,
	version: '1.0.0'
}));

import { supabaseRealtimeManager } from '../supabaseRealtime.svelte';
import { chatStore } from '../chat.svelte';
import { presenceManager } from '../presence.svelte';

function createMockSupabase() {
	const client = {
		channel: vi.fn(),
		removeChannel: vi.fn(() => Promise.resolve('ok' as const)),
		rpc: vi.fn(() => Promise.resolve({ data: [], error: null })),
		from: vi.fn(),
		realtime: { setAuth: vi.fn() }
	};
	return client as typeof client & SupabaseClient<Database>;
}

const USER_ID = '22222222-2222-4222-a222-222222222222';

describe('supabaseRealtimeManager côté serveur', () => {
	let supabase: ReturnType<typeof createMockSupabase>;
	const fakeChannel = { subscribe: vi.fn() };

	beforeEach(() => {
		supabase = createMockSupabase();
		supabaseRealtimeManager['supabase'] = supabase;
		supabaseRealtimeManager['userId'] = USER_ID;
		supabaseRealtimeManager['channels'].set('test-channel', fakeChannel as never);
	});

	afterEach(() => {
		supabaseRealtimeManager['supabase'] = null;
		supabaseRealtimeManager['userId'] = null;
		supabaseRealtimeManager['channels'].clear();
		supabaseRealtimeManager.connectionStatus = 'disconnected';
		vi.clearAllMocks();
	});

	it('refuse de créer un canal', () => {
		expect(() => supabaseRealtimeManager.createChannel('autre-canal')).toThrow(
			'Impossible de créer un canal côté serveur'
		);
		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it("n'abonne pas un canal existant", async () => {
		await supabaseRealtimeManager.subscribeChannel('test-channel');
		expect(fakeChannel.subscribe).not.toHaveBeenCalled();
	});

	it('ne désabonne pas un canal existant', async () => {
		await supabaseRealtimeManager.unsubscribeChannel('test-channel');
		expect(supabase.removeChannel).not.toHaveBeenCalled();
		expect(supabaseRealtimeManager['channels'].has('test-channel')).toBe(true);
	});

	it('ne déconnecte pas', async () => {
		await supabaseRealtimeManager.disconnect();
		expect(supabase.removeChannel).not.toHaveBeenCalled();
		expect(supabaseRealtimeManager['channels'].has('test-channel')).toBe(true);
	});

	it("n'initialise pas la connexion", () => {
		supabaseRealtimeManager['supabase'] = null;
		supabaseRealtimeManager['userId'] = null;

		supabaseRealtimeManager.init(supabase, USER_ID);

		expect(supabaseRealtimeManager.connectionStatus).toBe('disconnected');
		expect(supabaseRealtimeManager['supabase']).toBeNull();
		expect(supabaseRealtimeManager['userId']).toBeNull();
	});
});

describe('chatStore côté serveur', () => {
	let supabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		supabase = createMockSupabase();
		chatStore['supabase'] = supabase;
		chatStore['userId'] = USER_ID;
		chatStore['currentUser'] = { full_name: 'Test User', avatar_url: null } as never;
		chatStore.activeConversationId = null;
	});

	afterEach(() => {
		chatStore['supabase'] = null;
		chatStore['userId'] = null;
		chatStore['currentUser'] = null;
		chatStore.activeConversationId = null;
		vi.unstubAllGlobals();
		vi.clearAllMocks();
	});

	it("n'envoie pas de message", async () => {
		const result = await chatStore.sendMessage('conv-1', 'Test');

		expect(result).toBeNull();
		expect(supabase.from).not.toHaveBeenCalled();
	});

	it("n'initialise pas le store", () => {
		chatStore['supabase'] = null;
		chatStore['userId'] = null;
		chatStore['currentUser'] = null;

		chatStore.init(supabase, USER_ID, { full_name: 'Test User', avatar_url: null });

		expect(chatStore['supabase']).toBeNull();
		expect(chatStore['userId']).toBeNull();
		expect(chatStore['currentUser']).toBeNull();
	});

	it('ne change pas de conversation active', () => {
		chatStore.setActiveConversation('conv-1');

		expect(chatStore.activeConversationId).toBeNull();
		expect(supabase.channel).not.toHaveBeenCalled();
	});

	it('ne charge pas les conversations', async () => {
		await chatStore.loadConversations();

		expect(supabase.rpc).not.toHaveBeenCalled();
		expect(chatStore.isLoadingConversations).toBe(false);
	});

	it('ne signale pas de message', async () => {
		const fetchMock = vi.fn();
		vi.stubGlobal('fetch', fetchMock);

		const success = await chatStore.reportMessage('msg-1', 'spam');

		expect(success).toBe(false);
		expect(fetchMock).not.toHaveBeenCalled();
	});
});

describe('presenceManager côté serveur', () => {
	let supabase: ReturnType<typeof createMockSupabase>;

	beforeEach(() => {
		supabase = createMockSupabase();
		presenceManager['supabase'] = supabase;
		presenceManager['userId'] = USER_ID;
	});

	afterEach(() => {
		presenceManager['supabase'] = null;
		presenceManager['userId'] = null;
		vi.restoreAllMocks();
		vi.clearAllMocks();
	});

	it('ne démarre pas le suivi', async () => {
		const createChannel = vi.spyOn(supabaseRealtimeManager, 'createChannel');

		await presenceManager.startPresenceTracking(['friend-1']);

		expect(createChannel).not.toHaveBeenCalled();
		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	it("n'arrête pas le suivi (aucun passage hors ligne)", async () => {
		await presenceManager.stopPresenceTracking();

		expect(supabase.rpc).not.toHaveBeenCalled();
	});

	it('ne met pas à jour la liste d’amis', async () => {
		const createChannel = vi.spyOn(supabaseRealtimeManager, 'createChannel');

		await presenceManager.updateFriendList(['friend-1']);

		expect(createChannel).not.toHaveBeenCalled();
		expect(supabase.rpc).not.toHaveBeenCalled();
	});
});
