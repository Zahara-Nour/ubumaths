# Notification Database Schema

Database schema, migrations, and RLS policies for the notification system.

## Tables

### notifications

Main table storing all notification data.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Content
  title TEXT NOT NULL,
  message TEXT NOT NULL,  -- Rich text HTML (sanitized)
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'announcement', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'normal'
    CHECK (priority IN ('normal', 'important', 'urgent')),

  -- Optional action (redirect link)
  action_label TEXT,      -- e.g., "Voir le devoir"
  action_url TEXT,        -- e.g., "/dashboard/student/devoirs/123"

  -- Targeting
  target_type TEXT NOT NULL
    CHECK (target_type IN ('all', 'role', 'classes', 'users')),
  target_roles TEXT[],    -- ['student', 'teacher'] if target_type='role'
  target_class_ids UUID[], -- Class IDs if target_type='classes'
  target_user_ids UUID[], -- User IDs if target_type='users'

  -- Management
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  deleted_at TIMESTAMPTZ,  -- Soft delete by creator

  -- System metadata (for automatic notifications)
  is_system BOOLEAN NOT NULL DEFAULT false,
  system_event_type TEXT  -- 'assignment_created', 'assessment_assigned', etc.
);
```

### Column Details

| Column              | Type        | Constraints     | Description                      |
| ------------------- | ----------- | --------------- | -------------------------------- |
| `id`                | UUID        | PK              | Notification identifier          |
| `created_at`        | TIMESTAMPTZ | NOT NULL        | Creation timestamp               |
| `created_by`        | UUID        | FK profiles(id) | Creator (null for system)        |
| `title`             | TEXT        | NOT NULL        | Notification title               |
| `message`           | TEXT        | NOT NULL        | HTML content (sanitized)         |
| `type`              | TEXT        | CHECK           | info/alert/announcement/reminder |
| `priority`          | TEXT        | CHECK, DEFAULT  | normal/important/urgent          |
| `action_label`      | TEXT        | -               | Button label                     |
| `action_url`        | TEXT        | -               | Button destination               |
| `target_type`       | TEXT        | NOT NULL, CHECK | all/role/classes/users           |
| `target_roles`      | TEXT[]      | -               | Target roles array               |
| `target_class_ids`  | UUID[]      | -               | Target class IDs                 |
| `target_user_ids`   | UUID[]      | -               | Target user IDs                  |
| `expires_at`        | TIMESTAMPTZ | NOT NULL        | Expiration (default +30 days)    |
| `deleted_at`        | TIMESTAMPTZ | -               | Soft delete timestamp            |
| `is_system`         | BOOLEAN     | NOT NULL        | System notification flag         |
| `system_event_type` | TEXT        | -               | Event type for system notifs     |

### notification_reads

Tracks which users have read which notifications.

```sql
CREATE TABLE notification_reads (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  notification_id UUID NOT NULL REFERENCES notifications(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  read_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE(notification_id, user_id)
);
```

| Column            | Type        | Constraints  | Description            |
| ----------------- | ----------- | ------------ | ---------------------- |
| `id`              | UUID        | PK           | Read record identifier |
| `notification_id` | UUID        | FK, NOT NULL | Notification reference |
| `user_id`         | UUID        | FK, NOT NULL | User who read          |
| `read_at`         | TIMESTAMPTZ | NOT NULL     | When read              |
| `created_at`      | TIMESTAMPTZ | NOT NULL     | Record creation        |

**Unique Constraint**: `(notification_id, user_id)` - one read per user per notification.

---

## Indexes

```sql
-- Active notifications by date
CREATE INDEX idx_notifications_active ON notifications(created_at DESC)
  WHERE deleted_at IS NULL;

-- Notifications by creator
CREATE INDEX idx_notifications_created_by ON notifications(created_by)
  WHERE deleted_at IS NULL;

-- Read status lookup by user
CREATE INDEX idx_notification_reads_user
  ON notification_reads(user_id, notification_id);

-- Read status lookup by notification
CREATE INDEX idx_notification_reads_notification
  ON notification_reads(notification_id);

-- Target type filtering
CREATE INDEX idx_notifications_target_type ON notifications(target_type)
  WHERE deleted_at IS NULL;

-- Expiration filtering
CREATE INDEX idx_notifications_expires_at ON notifications(expires_at)
  WHERE deleted_at IS NULL;
```

---

## Row Level Security (RLS)

### notifications Table

**SELECT Policy**: Users can view notifications targeting them

```sql
CREATE POLICY "Users can view notifications targeting them"
  ON notifications
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND expires_at > now()
    AND (
      -- All users
      target_type = 'all'
      -- By role
      OR (target_type = 'role'
          AND (SELECT role::TEXT FROM profiles WHERE id = auth.uid())
              = ANY(target_roles))
      -- By class membership
      OR (target_type = 'classes' AND EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.student_id = auth.uid()
        AND cm.class_id = ANY(target_class_ids)
      ))
      -- Directly targeted
      OR (target_type = 'users' AND auth.uid() = ANY(target_user_ids))
      -- Creator can always see their notifications
      OR created_by = auth.uid()
    )
  );
```

**INSERT Policy (Teachers)**: Teachers can create for their classes/students

```sql
CREATE POLICY "Teachers can create notifications for their classes"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND (
      -- Can target their own classes
      (target_type = 'classes' AND target_class_ids <@ (
        SELECT array_agg(id) FROM classes WHERE teacher_id = auth.uid()
      ))
      -- Can target their own students
      OR (target_type = 'users' AND target_user_ids <@ (
        SELECT array_agg(DISTINCT cm.student_id)
        FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      ))
    )
  );
```

**INSERT Policy (Admins)**: Admins can create any notification

```sql
CREATE POLICY "Admins can create any notification"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

**UPDATE Policy (Owners)**: Users can soft-delete their own notifications

```sql
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

**UPDATE Policy (Admins)**: Admins can delete any notification

```sql
CREATE POLICY "Admins can delete any notification"
  ON notifications
  FOR UPDATE
  USING ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin');
```

### notification_reads Table

**SELECT Policy (Own reads)**: Users can view their own read status

```sql
CREATE POLICY "Users can view their own read status"
  ON notification_reads
  FOR SELECT
  USING (user_id = auth.uid());
```

**INSERT Policy**: Users can mark notifications as read

```sql
CREATE POLICY "Users can mark notifications as read"
  ON notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

**SELECT Policy (Creators)**: Creators/admins can view read stats

```sql
CREATE POLICY "Creators can view read stats for their notifications"
  ON notification_reads
  FOR SELECT
  USING (
    EXISTS (
      SELECT 1 FROM notifications n
      WHERE n.id = notification_reads.notification_id
      AND (
        n.created_by = auth.uid()
        OR (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
      )
    )
  );
```

---

## Targeting Logic

### Target Type: `all`

All users see this notification.

```sql
WHERE target_type = 'all'
```

### Target Type: `role`

Users with matching role see this notification.

```sql
WHERE target_type = 'role'
  AND (SELECT role::TEXT FROM profiles WHERE id = auth.uid())
      = ANY(target_roles)

-- Example: target_roles = ['student', 'teacher']
```

### Target Type: `classes`

Members of targeted classes see this notification.

```sql
WHERE target_type = 'classes'
  AND EXISTS (
    SELECT 1 FROM class_members cm
    WHERE cm.student_id = auth.uid()
    AND cm.class_id = ANY(target_class_ids)
  )

-- Example: target_class_ids = ['uuid-1', 'uuid-2']
```

### Target Type: `users`

Specifically targeted users see this notification.

```sql
WHERE target_type = 'users'
  AND auth.uid() = ANY(target_user_ids)

-- Example: target_user_ids = ['student-uuid-1', 'student-uuid-2']
```

---

## Query Patterns

### Fetch Unread Notifications

The server-side query builds targeting conditions:

```typescript
// 1. Build OR conditions
const conditions = [`target_type.eq.all`];

// By role
conditions.push(`and(target_type.eq.roles,target_roles.cs.{${profile.role}})`);

// By classes (if user has classes)
if (profile.class_ids?.length > 0) {
	conditions.push(
		`and(target_type.eq.classes,target_class_ids.ov.{${profile.class_ids.join(',')}})`
	);
}

// Directly targeted
conditions.push(`and(target_type.eq.users,target_user_ids.cs.{${userId}})`);

// 2. Query with OR conditions
const { data } = await supabase
	.from('notifications')
	.select(`*, creator:profiles!created_by(firstname, lastname, full_name)`)
	.is('deleted_at', null)
	.gt('expires_at', new Date().toISOString())
	.or(conditions.join(','))
	.order('priority', { ascending: false })
	.order('created_at', { ascending: false });

// 3. Filter unread (separate query for read status)
const { data: reads } = await supabase
	.from('notification_reads')
	.select('notification_id')
	.eq('user_id', userId)
	.in('notification_id', notificationIds);

const readSet = new Set(reads.map((r) => r.notification_id));
const unread = allNotifications.filter((n) => !readSet.has(n.id));
```

**Note**: Supabase doesn't support anti-joins (NOT EXISTS), so we fetch all targeted notifications and filter unread in-memory.

### Mark as Read (Upsert)

```typescript
const { error } = await supabase.from('notification_reads').insert({
	notification_id: notificationId,
	user_id: userId
});

// Handle duplicate key error (already read)
if (error?.code === '23505') {
	return { success: true }; // Already marked, no action needed
}
```

### Batch Read Status

```typescript
// Get read status for multiple notifications at once
const { data: reads } = await supabase
	.from('notification_reads')
	.select('notification_id')
	.eq('user_id', userId)
	.in('notification_id', notificationIds);
```

### Cleanup Expired

```typescript
const { data, error } = await supabase
	.from('notifications')
	.delete()
	.lt('expires_at', new Date().toISOString())
	.select('id');
```

---

## Migration File

Location: `supabase/migrations/081_create_notifications_system.sql`

### Apply Migration

```bash
pnpm db:migrate
```

### Migration Contents

1. Creates `notifications` table
2. Creates `notification_reads` table
3. Creates indexes
4. Enables RLS on both tables
5. Creates RLS policies
6. Grants permissions to authenticated users
7. Adds documentation comments

---

## System Event Types

Standard values for `system_event_type`:

| Event Type              | Description                      |
| ----------------------- | -------------------------------- |
| `assignment_created`    | New assignment/homework          |
| `resource_added`        | New resource in class            |
| `assessment_assigned`   | New assessment                   |
| `reward_earned`         | Gidouilles earned                |
| `badge_unlocked`        | Badge achievement                |
| `pending_user`          | Admin: new user pending approval |
| `maintenance_scheduled` | System maintenance               |
| `feature_released`      | New feature announcement         |

---

## Performance Considerations

### Index Usage

- `idx_notifications_active`: Used by most queries (active notifications by date)
- `idx_notification_reads_user`: Used for filtering unread
- `idx_notifications_target_type`: Used for targeting queries

### Pagination

Server-side pagination prevents loading large datasets:

```typescript
// In-memory pagination after targeting filter
const paginatedNotifications = allUnreadNotifications.slice(offset, offset + limit);
```

### N+1 Prevention

Read counts are fetched in batch:

```typescript
// Instead of N queries (one per notification)
const { data: allReads } = await supabase
	.from('notification_reads')
	.select('notification_id')
	.in('notification_id', notificationIds);
```

---

## Data Retention

- **Default expiration**: 30 days after creation
- **Soft delete**: `deleted_at` timestamp (not hard delete)
- **Cleanup job**: `cleanupExpiredNotifications()` can hard-delete expired

```typescript
// Cleanup expired notifications
const result = await cleanupExpiredNotifications(supabase);
console.log(`Deleted ${result.deletedCount} expired notifications`);
```
