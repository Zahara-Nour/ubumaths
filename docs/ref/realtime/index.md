# Realtime Communication System - Technical Reference

Complete technical reference for UbuMaths' real-time communication infrastructure using Supabase Realtime.

**Last Updated**: December 2025
**Migration Date**: November 2025 (from custom WebSocket)

---

## Quick Navigation

| Document                                 | Description                                       |
| ---------------------------------------- | ------------------------------------------------- |
| [Architecture](./architecture.md)        | System design, data flow, component relationships |
| [Store API Reference](./stores.md)       | Complete API for all realtime stores              |
| [Database Layer](./database.md)          | Schemas, functions, RLS policies, indexes         |
| [Implementation Patterns](./patterns.md) | Hybrid messaging, deduplication, optimistic UI    |
| [Quota & Billing](./quota.md)            | Free tier management, calculations, optimization  |
| [Troubleshooting](./troubleshooting.md)  | Debugging, common issues, solutions               |

---

## Executive Summary

UbuMaths implements a **hybrid real-time architecture** using Supabase Realtime:

| Method               | Latency | Quota Impact | Use Case                                    |
| -------------------- | ------- | ------------ | ------------------------------------------- |
| **Broadcast API**    | ~50ms   | FREE         | Typing indicators, reactions, read receipts |
| **postgres_changes** | ~300ms  | COUNTS       | Messages, notifications, presence           |
| **Hybrid**           | 50ms UX | Optimized    | Chat messages (instant + reliable)          |

### Key Metrics

| Metric                  | Value        | Notes                            |
| ----------------------- | ------------ | -------------------------------- |
| Heartbeat Interval      | 180 seconds  | BILLING CRITICAL - do not change |
| Stale Timeout           | 270 seconds  | 180s + 90s buffer                |
| Estimated Monthly Usage | ~1M messages | 50% of 2M free tier              |
| Test Coverage           | 3,830 lines  | 99% pass rate                    |

---

## System Overview

```
Application Layer
├── presenceManager         → Friend online/offline status
├── notificationsRealtimeManager → New notification alerts
├── achievementsRealtimeManager  → Achievement unlock alerts
└── chatStore               → Hybrid chat system
         ↓
    supabaseRealtimeManager (Central Infrastructure)
         ↓
    Supabase Realtime Server (WebSocket)
         ↓
    PostgreSQL Database (RLS enforced)
```

---

## Migration Benefits (vs Custom WebSocket)

| Aspect         | Before                     | After            | Improvement   |
| -------------- | -------------------------- | ---------------- | ------------- |
| Infrastructure | 591 lines custom code      | Zero servers     | Serverless    |
| Quota          | 2.9M msgs/month (exceeded) | ~1M msgs/month   | 66% reduction |
| Security       | No RLS enforcement         | RLS automatic    | Full security |
| Deployment     | Vercel incompatible        | Fully compatible | Simplified    |
| Reconnection   | Manual logic               | Automatic        | Reliable      |

---

## Import Paths

```typescript
// Central infrastructure
import { supabaseRealtimeManager } from '$lib/stores/supabaseRealtime.svelte';

// Specialized stores
import { presenceManager, HEARTBEAT_INTERVAL } from '$lib/stores/presence.svelte';
import { notificationsRealtimeManager } from '$lib/stores/notificationsRealtime.svelte';
import { achievementsRealtimeManager } from '$lib/stores/achievementsRealtime.svelte';
import { chatStore } from '$lib/stores/chat.svelte';
```

---

## Channel Names

| Feature       | Channel Name            | Method           |
| ------------- | ----------------------- | ---------------- |
| Presence      | `user-presence-updates` | postgres_changes |
| Notifications | `user-notifications`    | postgres_changes |
| Achievements  | `achievements-realtime` | postgres_changes |
| Chat          | `chat-{conversationId}` | Hybrid           |

---

## Critical Constants

```typescript
// BILLING CRITICAL - DO NOT CHANGE without recalculating quota
export const HEARTBEAT_INTERVAL = 180000; // 180 seconds (3 minutes)

// Database cleanup timeout (must be > HEARTBEAT_INTERVAL)
const STALE_TIMEOUT = 270; // 270 seconds

// Typing indicator auto-clear
const TYPING_TIMEOUT = 3000; // 3 seconds

// Free tier limit
const MAX_MESSAGES_PER_MONTH = 2_000_000;
```

---

## File Reference

### Core Stores

| File                                             | Lines | Purpose                    |
| ------------------------------------------------ | ----- | -------------------------- |
| `src/lib/stores/supabaseRealtime.svelte.ts`      | 239   | Central channel management |
| `src/lib/stores/presence.svelte.ts`              | 377   | Friend presence tracking   |
| `src/lib/stores/notificationsRealtime.svelte.ts` | 200   | Notification alerts        |
| `src/lib/stores/achievementsRealtime.svelte.ts`  | 265   | Achievement alerts         |
| `src/lib/stores/chat.svelte.ts`                  | 1,437 | Hybrid chat system         |

### Test Files

| File                                             | Lines | Coverage                 |
| ------------------------------------------------ | ----- | ------------------------ |
| `src/lib/stores/supabaseRealtime.svelte.test.ts` | 664   | Channel lifecycle        |
| `src/lib/stores/presence.svelte.test.ts`         | 816   | Heartbeat, tracking      |
| `src/lib/stores/chat.svelte.test.ts`             | 2,350 | Deduplication, messaging |

### Database Migrations

- `supabase/migrations/035_create_user_presence_table.sql`
- `supabase/migrations/037_create_conversation_participants_table.sql`
- `supabase/migrations/038_create_messages_table.sql`
- `supabase/migrations/042_add_chat_constraints_and_indexes.sql`

---

## Related Documentation

- [Claude Quick Reference](../../claude/realtime.md) - Simplified usage guide
- [Supabase Realtime Architecture](../../architecture/supabase-realtime.md) - Historical migration docs
- [Migration Guide](../../guides/websocket-to-realtime-migration.md) - Step-by-step migration
