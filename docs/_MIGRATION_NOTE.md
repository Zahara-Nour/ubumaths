# 📢 Important Architecture Change (2025-10-29)

UbuMaths has migrated from BroadcastChannel + Polling to **Polling-Only** synchronization.

**What this means**:

- ❌ BroadcastChannel API removed
- ❌ CacheEventBus removed
- ✅ Unified `/api/teacher/dashboard-sync` endpoint
- ✅ Simpler architecture (~400 lines removed)

**If you're reading documentation that mentions**:

- `BroadcastChannel`
- `cacheEventBus`
- "instant cross-tab sync"
- "Event Bus"

...these features have been **replaced by polling-only synchronization** (5-second intervals).

**📚 See full migration details**:

- [Polling-Only Sync Migration](architecture/polling-only-sync-migration.md)
- [Updated Cross-Device Sync](features/cross-device-sync.md)
- [CHANGELOG.md](../CHANGELOG.md) - "BroadcastChannel Removal & Architecture Simplification"

**Documentation Status**:

- ✅ Updated: `cross-device-sync.md`, `hybrid-cache-system.md`, `README.md`, `CHANGELOG.md`
- ⚠️ Pending: `warnings/README.md`, `rewards/README.md` (references to BroadcastChannel)
- 🗑️ Deleted: `cache-event-bus-multi-tab.md` (obsolete)

**For developers**: If you encounter broken imports or missing `cacheEventBus`, see the migration guide.
