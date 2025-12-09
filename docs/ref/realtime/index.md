# Supabase Realtime - Complete Reference Guide

Comprehensive documentation for UbuMaths' realtime communication system built on Supabase Realtime.

> **Migration Note**: Migrated from custom WebSocket to Supabase Realtime (November 2025)

---

## Table of Contents

1. [Quick Start](#quick-start)
2. [Architecture Overview](#architecture-overview)
3. [Available Stores](#available-stores)
4. [Communication Methods](#communication-methods)
5. [Related Documentation](#related-documentation)

---

## Quick Start

### Initialize the Realtime System

```typescript
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';
import { presenceManager } from '$lib/stores/presence.svelte';
import { chatStore } from '$lib/stores/chat.svelte';

// Initialize central manager (once per app)
supabaseRealtimeManager.init(supabase, userId);

// Initialize specialized stores as needed
presenceManager.init(supabase, userId);
chatStore.init(supabase, userId, { full_name, avatar_url });
```

### Subscribe to Events

```typescript
// Create a channel
const channel = supabaseRealtimeManager.createChannel('my-channel');

// Listen for database changes
channel.on(
	'postgres_changes',
	{ event: 'INSERT', schema: 'public', table: 'messages' },
	(payload) => handleNewMessage(payload.new)
);

// Listen for broadcasts (ephemeral)
channel.on('broadcast', { event: 'typing' }, (payload) => handleTyping(payload));

// Subscribe
await supabaseRealtimeManager.subscribeChannel('my-channel');
```

### Cleanup (Critical)

```svelte
<script lang="ts">
	// Svelte 5: Use $effect with cleanup return
	$effect(() => {
		// Initialize realtime subscriptions
		presenceManager.startPresenceTracking(friendIds);
		chatStore.subscribeToConversation(conversationId);

		// Cleanup on unmount (return function)
		return () => {
			presenceManager.stopPresenceTracking();
			chatStore.unsubscribeFromConversation(conversationId);
			supabaseRealtimeManager.unsubscribeChannel('my-channel');
		};
	});
</script>
```

---

## Architecture Overview

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                         UbuMaths Realtime Architecture                      │
├─────────────────────────────────────────────────────────────────────────────┤
│                                                                             │
│  ┌─────────────────┐                                                        │
│  │   Components    │                                                        │
│  │                 │                                                        │
│  │  ┌───────────┐  │     ┌─────────────────┐                                │
│  │  │ Friends   │──┼────▶│ presenceManager │──────┐                         │
│  │  │ Page      │  │     └─────────────────┘      │                         │
│  │  └───────────┘  │                              │                         │
│  │                 │     ┌─────────────────────┐  │                         │
│  │  ┌───────────┐  │     │ notificationsReal- │  │                         │
│  │  │ Dashboard │──┼────▶│ timeManager       │──┼──┐                       │
│  │  │ Layout    │  │     └─────────────────────┘  │  │                      │
│  │  └───────────┘  │                              │  │                      │
│  │                 │     ┌─────────────────────┐  │  │  ┌────────────────┐  │
│  │  ┌───────────┐  │     │ achievementsReal-  │  │  │  │ supabaseReal-  │  │
│  │  │Achievement│──┼────▶│ timeManager       │──┼──┼─▶│ timeManager    │  │
│  │  │Notif.     │  │     └─────────────────────┘  │  │  │ (Central Hub)  │  │
│  │  └───────────┘  │                              │  │  └────────────────┘  │
│  │                 │     ┌─────────────────┐      │  │          │           │
│  │  ┌───────────┐  │     │   chatStore     │──────┘  │          │           │
│  │  │ ChatWindow│──┼────▶│ (Hybrid Mode)   │         │          │           │
│  │  └───────────┘  │     └─────────────────┘         │          │           │
│  │                 │                                 │          ▼           │
│  │  ┌───────────┐  │     ┌─────────────────┐         │  ┌───────────────┐   │
│  │  │Multiplayer│──┼────▶│multiplayerStore │─────────┘  │   Supabase    │   │
│  │  │Minesweeper│  │     │ (Direct Channel)│            │   Realtime    │   │
│  │  └───────────┘  │     └─────────────────┘            │   Server      │   │
│  │                 │                                    └───────────────┘   │
│  └─────────────────┘                                                        │
│                                                                             │
└─────────────────────────────────────────────────────────────────────────────┘
```

### Data Flow

```
                     REALTIME MESSAGE FLOW
                     ═══════════════════════

┌─────────┐   1. Optimistic    ┌──────────┐   2. Broadcast    ┌───────────────┐
│  User   │ ─────────────────▶ │ UI State │ ─────────────────▶│ Other Clients │
│ Action  │   (immediate)      │  (~0ms)  │    (~50ms, FREE)  │   (instant)   │
└─────────┘                    └──────────┘                   └───────────────┘
     │                              │
     │                              │
     ▼                              │
┌─────────────┐                     │
│  Database   │ ◀───────────────────┘
│   Insert    │   3. Persist (~200ms)
└─────────────┘
     │
     │ 4. postgres_changes (~300ms)
     ▼
┌───────────────┐
│  Source of    │  Replaces broadcast message with
│  Truth + JOINs│  full data (sender profile, etc.)
└───────────────┘
```

---

## Available Stores

| Store                          | File                              | Method             | Purpose                      |
| ------------------------------ | --------------------------------- | ------------------ | ---------------------------- |
| `supabaseRealtimeManager`      | `supabaseRealtime.svelte.ts`      | Central Hub        | Channel lifecycle management |
| `presenceManager`              | `presence.svelte.ts`              | `postgres_changes` | Friend online/offline status |
| `chatStore`                    | `chat.svelte.ts`                  | Hybrid             | Chat with deduplication      |
| `notificationsRealtimeManager` | `notificationsRealtime.svelte.ts` | `postgres_changes` | Notification alerts          |
| `achievementsRealtimeManager`  | `achievementsRealtime.svelte.ts`  | `postgres_changes` | Achievement unlocks          |
| `multiplayerStore`             | `multiplayer.svelte.ts`           | Direct Channel     | Game-specific sync           |

---

## Communication Methods

### Method Comparison

| Method             | Latency        | Quota Cost | Persistence | JOINs | Use Case                |
| ------------------ | -------------- | ---------- | ----------- | ----- | ----------------------- |
| `postgres_changes` | ~300ms         | COUNTS     | Yes         | Yes   | Presence, notifications |
| Broadcast          | ~50ms          | FREE       | No          | No    | Typing, cursors         |
| Hybrid             | ~50ms + ~300ms | Partial    | Yes         | Yes   | Chat messages           |

### When to Use Each

**postgres_changes** - When you need:

- Data persistence
- JOINed/enriched data
- Row Level Security (RLS)
- Source of truth

**Broadcast** - When you need:

- Ultra-fast feedback (<100ms)
- No persistence required
- High-frequency updates
- Free quota usage

**Hybrid** - When you need:

- Best UX (instant feedback)
- Data reliability
- Proper deduplication

---

## Related Documentation

| Document                                  | Description                     |
| ----------------------------------------- | ------------------------------- |
| [Architecture](./architecture.md)         | Detailed system architecture    |
| [Stores Reference](./stores-reference.md) | Complete API reference          |
| [Chat System](./chat-system.md)           | Chat-specific documentation     |
| [Presence System](./presence-system.md)   | Presence tracking guide         |
| [Testing Guide](./testing.md)             | Testing patterns and mocks      |
| [Best Practices](./best-practices.md)     | Performance, security, patterns |

---

## Critical Configuration

```typescript
// BILLING CRITICAL - DO NOT CHANGE without recalculating quota
export const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)

// Quota calculation:
// 200 users × 8h × 20 days = ~640K messages/month (32% of 2M free tier)
```

**Warning**: Modifying heartbeat interval impacts billing. See [Best Practices](./best-practices.md#quota-management) for details.
