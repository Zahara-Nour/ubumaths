# Moderation UI Implementation Specification

## Overview
Create comprehensive UI components for the moderation system (Phase 3 of 5-phase implementation).

## Database Schema Reference

### user_restrictions table
```typescript
{
  id: string; // UUID
  user_id: string; // UUID, references profiles
  scope_type: 'conversation' | 'global';
  scope_id: string | null; // UUID, conversation ID or null for global
  restriction_type: 'mute' | 'timeout' | 'ban';
  reason: string; // min 5 chars
  restricted_by: string; // UUID, references profiles
  expires_at: string | null; // ISO timestamp or null = permanent
  created_at: string; // ISO timestamp
  updated_at: string; // ISO timestamp
}
```

### moderation_logs table
```typescript
{
  id: string; // UUID
  moderator_id: string; // UUID, references profiles
  action: 'delete_message' | 'mute_user' | 'unmute_user' | 'timeout_user' | 'ban_user' | 'unban_user' | 'review_report' | 'export_conversation';
  target_type: 'message' | 'user' | 'conversation' | 'report';
  target_id: string; // UUID
  reason: string | null;
  metadata: Record<string, unknown>; // JSONB
  created_at: string; // ISO timestamp
}
```

## API Endpoints

### POST /api/moderation/restrict-user
**Request:**
```typescript
{
  userId: string; // UUID
  scopeType: 'conversation' | 'global';
  scopeId?: string | null; // UUID, required if scopeType is 'conversation'
  restrictionType: 'mute' | 'timeout' | 'ban';
  reason: string; // 5-500 chars
  expiresAt: string | null; // ISO timestamp or null for permanent
}
```
**Response (201):**
```typescript
{
  success: true;
  restrictionId: string; // UUID
}
```

### DELETE /api/moderation/unrestrict-user
**Request:**
```typescript
{
  restrictionId: string; // UUID
}
```
**Response (200):**
```typescript
{
  success: true;
  message: string;
}
```

### DELETE /api/moderation/messages/[id]
**Request:**
```typescript
{
  reason: string; // 5-500 chars
}
```
**Response (200):**
```typescript
{
  success: true;
  message: string;
}
```

## Components to Create

### 1. RestrictUserDialog.svelte
**Location:** `/Users/david/Coding/js/ubumaths/src/lib/components/moderation/RestrictUserDialog.svelte`

**Props:**
```typescript
let {
  open = $bindable(false),
  userId,
  userName,
  conversationId = null, // null = global restriction
  onSuccess = () => {}
}: {
  open?: boolean;
  userId: string;
  userName: string;
  conversationId?: string | null;
  onSuccess?: () => void;
} = $props();
```

**Features:**
- Shadcn Dialog component
- Radio group for restriction type: Mute | Timeout | Ban
- If conversationId provided: Toggle for "Cette conversation seulement" vs "Toutes les conversations"
- If Timeout selected: Datetime picker for expiresAt (use native HTML input type="datetime-local")
- Textarea for reason (min 5 chars, max 500)
- Show character count below textarea
- Submit button disabled until form valid
- Loading state during API call
- Toast notification on success/error using `toaster` from `$lib/stores/toaster.svelte`
- Call onSuccess() callback after successful restriction
- Clear form on close

**UI Text (French):**
- Dialog title: "Restreindre [userName]"
- Restriction types:
  - "Muet" (Mute) - "L'utilisateur ne peut plus envoyer de messages"
  - "Temporaire" (Timeout) - "L'utilisateur est bloqué temporairement"
  - "Ban" (Ban) - "L'utilisateur est banni définitivement"
- Scope toggle: "Cette conversation seulement" / "Toutes les conversations"
- Expiration label: "Expiration"
- Reason label: "Raison" (placeholder: "Expliquez pourquoi vous restreignez cet utilisateur...")
- Submit button: "Restreindre"
- Cancel button: "Annuler"
- Success toast: "Restriction appliquée avec succès"
- Error toast: "Erreur lors de la restriction"

**Icons:** Ban, Clock, AlertTriangle from lucide-svelte

---

### 2. RestrictedUserBanner.svelte
**Location:** `/Users/david/Coding/js/ubumaths/src/lib/components/moderation/RestrictedUserBanner.svelte`

**Props:**
```typescript
let {
  restriction
}: {
  restriction: {
    restriction_type: 'mute' | 'timeout' | 'ban';
    reason: string;
    expires_at: string | null;
    scope_type: 'conversation' | 'global';
  };
} = $props();
```

**Features:**
- Shadcn Alert component with variant based on restriction_type:
  - mute: "warning" (yellow)
  - timeout: "default" (blue)
  - ban: "destructive" (red)
- Show icon based on restriction type (Ban, Clock, or AlertTriangle)
- Show reason
- If expires_at not null: Show countdown timer using formatDistanceToNow from date-fns
- If global: "Vous êtes restreint de toutes les conversations"
- If conversation: "Vous êtes restreint de cette conversation"
- Responsive design (mobile-first)

**UI Text (French):**
- Mute: "Vous êtes muté"
- Timeout: "Vous êtes temporairement bloqué"
- Ban: "Vous êtes banni"
- Reason prefix: "Raison : "
- Expiration: "Restriction expire dans [time]"
- Global scope: "Vous êtes restreint de toutes les conversations"
- Conversation scope: "Vous êtes restreint de cette conversation"

---

### 3. ModerationLogsTable.svelte
**Location:** `/Users/david/Coding/js/ubumaths/src/lib/components/moderation/ModerationLogsTable.svelte`

**Props:**
```typescript
let {
  logs
}: {
  logs: Array<{
    id: string;
    action: string;
    target_type: string;
    target_id: string;
    reason: string | null;
    metadata: Record<string, unknown>;
    created_at: string;
    moderator?: { firstname: string; lastname: string };
  }>;
} = $props();
```

**Features:**
- Shadcn Table component
- Columns: Date | Action | Cible | Raison | Modérateur
- Action column: Badge with color based on action type
  - delete_message: destructive (red)
  - mute_user, timeout_user: warning (yellow)
  - ban_user: destructive (red)
  - unmute_user, unban_user: success (green) - use "outline" variant with green text
- Format dates with formatDistanceToNow from date-fns (e.g., "il y a 5 minutes")
- Client-side pagination (20 per page)
- Shadcn Button for "Précédent" / "Suivant" pagination
- Empty state if no logs: "Aucune action de modération enregistrée"
- Responsive: Stack columns on mobile

**UI Text (French):**
- Column headers: "Date" | "Action" | "Cible" | "Raison" | "Modérateur"
- Action translations:
  - delete_message: "Message supprimé"
  - mute_user: "Utilisateur muté"
  - unmute_user: "Utilisateur démuté"
  - timeout_user: "Utilisateur suspendu"
  - ban_user: "Utilisateur banni"
  - unban_user: "Utilisateur débanni"
- Target type translations:
  - message: "Message"
  - user: "Utilisateur"
  - conversation: "Conversation"
  - report: "Signalement"
- Empty state: "Aucune action de modération enregistrée"
- Pagination: "Précédent" / "Suivant"
- Page info: "Page [current] sur [total]"

---

### 4. ActiveRestrictionsTable.svelte
**Location:** `/Users/david/Coding/js/ubumaths/src/lib/components/moderation/ActiveRestrictionsTable.svelte`

**Props:**
```typescript
let {
  restrictions,
  onUnrestrict
}: {
  restrictions: Array<{
    id: string;
    user_id: string;
    restriction_type: 'mute' | 'timeout' | 'ban';
    scope_type: 'conversation' | 'global';
    scope_id: string | null;
    reason: string;
    expires_at: string | null;
    created_at: string;
    user?: { firstname: string; lastname: string };
    conversation?: { name: string | null };
  }>;
  onUnrestrict?: (restrictionId: string) => void;
} = $props();
```

**Features:**
- Shadcn Table component
- Columns: Utilisateur | Type | Portée | Raison | Expire | Actions
- Type column: Badge with color (mute: yellow, timeout: blue, ban: red)
- Portée column: Show conversation name or "Global"
- Expire column: Show countdown if temporary using formatDistanceToNow, "Jamais" if permanent
- Actions column: "Retirer" button (Shadcn Button with "ghost" variant)
- Shadcn AlertDialog for confirmation before removing restriction
  - Title: "Confirmer la suppression"
  - Description: "Êtes-vous sûr de vouloir retirer cette restriction pour [userName] ?"
  - Cancel: "Annuler"
  - Confirm: "Retirer" (destructive variant)
- Loading state during API call (disable button, show spinner)
- Toast notification on success/error
- Call onUnrestrict callback after successful removal
- Empty state if no restrictions: "Aucune restriction active"
- Responsive: Stack columns on mobile

**UI Text (French):**
- Column headers: "Utilisateur" | "Type" | "Portée" | "Raison" | "Expire" | "Actions"
- Type translations:
  - mute: "Muet"
  - timeout: "Suspendu"
  - ban: "Banni"
- Scope: Conversation name or "Global"
- Expiration: formatDistanceToNow or "Jamais"
- Remove button: "Retirer"
- Confirmation dialog:
  - Title: "Confirmer la suppression"
  - Description: "Êtes-vous sûr de vouloir retirer cette restriction pour [userName] ?"
  - Cancel: "Annuler"
  - Confirm: "Retirer"
- Success toast: "Restriction retirée avec succès"
- Error toast: "Erreur lors du retrait de la restriction"
- Empty state: "Aucune restriction active"

**Icons:** Trash2 from lucide-svelte

---

### 5. Teacher Moderation Page
**Location:** `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/teacher/moderation/+page.svelte`
**Data loader:** `/Users/david/Coding/js/ubumaths/src/routes/(protected)/dashboard/teacher/moderation/+page.server.ts`

**+page.server.ts features:**
```typescript
import type { PageServerLoad } from './$types';
import { error } from '@sveltejs/kit';

export const load: PageServerLoad = async ({ locals }) => {
  // Check authentication
  if (!locals.user) {
    throw error(401, 'Not authenticated');
  }

  // Check teacher role
  if (!['teacher', 'admin'].includes(locals.user.role)) {
    throw error(403, 'Access denied');
  }

  const supabase = locals.supabase;

  // Fetch active restrictions for this teacher's students
  const { data: restrictions, error: restrictionsError } = await supabase
    .from('user_restrictions')
    .select(`
      *,
      user:profiles!user_restrictions_user_id_fkey(id, firstname, lastname),
      restricted_by_profile:profiles!user_restrictions_restricted_by_fkey(firstname, lastname),
      conversation:conversations(name)
    `)
    .eq('restricted_by', locals.user.id)
    .or(`expires_at.is.null,expires_at.gt.${new Date().toISOString()}`)
    .order('created_at', { ascending: false });

  if (restrictionsError) {
    console.error('Failed to fetch restrictions:', restrictionsError);
    throw error(500, 'Failed to load restrictions');
  }

  // Fetch moderation logs for this teacher
  const { data: logs, error: logsError } = await supabase
    .from('moderation_logs')
    .select(`
      *,
      moderator:profiles!moderation_logs_moderator_id_fkey(firstname, lastname)
    `)
    .eq('moderator_id', locals.user.id)
    .order('created_at', { ascending: false })
    .limit(100);

  if (logsError) {
    console.error('Failed to fetch logs:', logsError);
    throw error(500, 'Failed to load logs');
  }

  return {
    restrictions: restrictions || [],
    logs: logs || []
  };
};
```

**+page.svelte features:**
- Shadcn Tabs component for navigation: "Restrictions" | "Logs"
- **Restrictions tab:**
  - Use ActiveRestrictionsTable component
  - onUnrestrict: Call DELETE /api/moderation/unrestrict-user, then invalidateAll()
- **Logs tab:**
  - Use ModerationLogsTable component
- Page title: "Modération" with ShieldAlert icon
- Responsive layout (mobile-first)

**UI Text (French):**
- Page title: "Modération"
- Tab labels:
  - "Restrictions actives"
  - "Historique"

**Icons:** ShieldAlert from lucide-svelte

---

### 6. Message Context Menu Integration
**Location:** Update `/Users/david/Coding/js/ubumaths/src/lib/components/chat/ChatMessageList.svelte`

**Changes needed:**
1. Add prop for current user role:
```typescript
let {
  messages,
  currentUserId,
  currentUserRole, // NEW
  typingUsers = [],
  hasMore = false,
  isLoading = false,
  onLoadMore,
  onReact,
  onReport,
  onDelete // NEW
}: Props = $props();
```

2. In the message actions DropdownMenu (lines 292-306), add:
```svelte
<!-- After the Report option -->
{#if currentUserRole === 'teacher' || currentUserRole === 'admin'}
  <DropdownMenu.Separator />
  <DropdownMenu.Item
    onclick={() => onDelete?.(message.id)}
    class="text-destructive focus:text-destructive"
  >
    <Trash2 class="mr-2 h-4 w-4" />
    Supprimer le message
  </DropdownMenu.Item>
{/if}
```

3. Update the message bubble to show deleted state:
```svelte
{#if message.deleted_at}
  <div class="italic text-muted-foreground">
    Message supprimé par un modérateur
  </div>
{:else}
  <!-- Existing rich text content -->
  <div class="prose prose-sm max-w-none {isOwnMessage(message) ? 'prose-invert' : ''}">
    <RichTextDisplay content={message.content} />
  </div>
{/if}
```

4. Create DeleteMessageDialog component to handle deletion:
**Location:** `/Users/david/Coding/js/ubumaths/src/lib/components/moderation/DeleteMessageDialog.svelte`

```typescript
let {
  open = $bindable(false),
  messageId,
  onSuccess = () => {}
}: {
  open?: boolean;
  messageId: string | null;
  onSuccess?: () => void;
} = $props();
```

**Features:**
- Shadcn AlertDialog for confirmation
- Textarea for reason (min 5 chars, max 500)
- Show character count
- Submit button disabled until reason valid
- Loading state during API call
- Toast notification on success/error
- Call onSuccess() callback after successful deletion

**UI Text (French):**
- Title: "Supprimer ce message ?"
- Description: "Cette action est irréversible. Le message sera masqué pour tous les participants."
- Reason label: "Raison de la suppression"
- Reason placeholder: "Expliquez pourquoi vous supprimez ce message..."
- Cancel button: "Annuler"
- Confirm button: "Supprimer le message" (destructive variant)
- Success toast: "Message supprimé avec succès"
- Error toast: "Erreur lors de la suppression du message"

---

## Design System Requirements

1. **All UI text in French** (see above for translations)
2. **Use Shadcn-svelte components:**
   - Dialog, AlertDialog
   - Alert (for RestrictedUserBanner)
   - Table
   - Badge
   - Button
   - Textarea
   - Label
   - Tabs
3. **Use MySelect for any dropdowns** (NOT Shadcn Select)
4. **Use MyCheckbox for checkboxes** (NOT Shadcn Checkbox directly)
5. **Use Svelte 5 runes:**
   - `$state()` for reactive state
   - `$derived()` for computed values
   - `$effect()` for side effects
   - `$props()` for component props
   - `$bindable()` for two-way binding
6. **Use Tailwind CSS** with semantic tokens (bg-background, text-foreground, etc.)
7. **Use toaster** from `$lib/stores/toaster.svelte` for notifications
8. **Use lucide-svelte icons**
9. **Loading states:** Disable buttons and show spinner during API calls
10. **Error handling:** Show toast notifications for errors
11. **Accessibility:** Proper ARIA labels, keyboard navigation
12. **Responsive:** Mobile-first approach, stack columns on mobile
13. **Event handlers:** Lowercase (onclick, onsubmit, etc.)

## Date Formatting

Use `date-fns` for date formatting:
```typescript
import { formatDistanceToNow } from 'date-fns';
import { fr } from 'date-fns/locale';

const timeAgo = formatDistanceToNow(new Date(timestamp), {
  addSuffix: true,
  locale: fr
});
```

## File Structure

```
src/
├── lib/
│   └── components/
│       └── moderation/
│           ├── RestrictUserDialog.svelte
│           ├── RestrictedUserBanner.svelte
│           ├── ModerationLogsTable.svelte
│           ├── ActiveRestrictionsTable.svelte
│           └── DeleteMessageDialog.svelte
└── routes/
    └── (protected)/
        └── dashboard/
            └── teacher/
                └── moderation/
                    ├── +page.svelte
                    └── +page.server.ts
```

## Testing Checklist

After implementation, verify:
- [ ] All components use Svelte 5 runes (no Svelte 4 patterns)
- [ ] All API calls handle loading/error states
- [ ] All text is in French
- [ ] All components are accessible (ARIA labels, keyboard navigation)
- [ ] No TypeScript `any` types
- [ ] No build errors, no TypeScript errors
- [ ] Responsive design works on mobile
- [ ] Toast notifications appear on success/error
- [ ] Forms validate before submission
- [ ] Confirmation dialogs work correctly
- [ ] Tables paginate correctly
- [ ] Date formatting works with French locale
- [ ] Icons display correctly
- [ ] All event handlers use lowercase (onclick, not on:click)

## Success Criteria

1. Teacher can view active restrictions in a table
2. Teacher can remove restrictions with confirmation dialog
3. Teacher can view moderation history in a table
4. Teacher can delete messages from chat with reason
5. Restricted users see a banner explaining their restriction
6. All components are fully accessible and responsive
7. No TypeScript errors, no build errors
8. All text is in French
9. All components follow UbuMaths design system

## Notes

- The moderation page should follow the same layout/styling as other teacher dashboard pages (check +layout.svelte)
- Use existing patterns from other teacher pages for consistency
- The RestrictUserDialog will be used in future phases when implementing the "Restrict User" action from various places (chat, reports, etc.)
- The RestrictedUserBanner will be integrated into chat components in Phase 4
- Phase 6 will add the "Messages" tab with reported messages
