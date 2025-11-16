# Google Classroom Topic Auto-Selection Implementation

**Date**: 2025-11-16
**Status**: ✅ Completed

## Overview

Modified the Google Classroom material sharing UI to automatically use a material's Google Classroom topic when sharing, eliminating the need for manual selection when the material already has an assigned topic.

## Changes Made

### 1. ShareMaterialDialog.svelte

**File**: `/src/lib/components/google/ShareMaterialDialog.svelte`

**Changes**:

1. **Added `materialTopic` prop** (line 77):
   ```typescript
   interface Props {
     material: Material;
     materialTopic?: { id: string; name: string } | null;  // NEW
     onClose: () => void;
     onSuccess: () => void;
   }
   ```

2. **Modified class config initialization** (lines 132-147):
   - Check if material has auto topic: `const hasAutoTopic = !!materialTopic;`
   - Force topics mode if auto: `useTopics: hasAutoTopic ? true : true`
   - Auto-fill topic ID: `topicId: hasAutoTopic && materialTopic ? materialTopic.id : ''`
   - Skip topics array fetch if auto: `topics: hasAutoTopic ? [] : []`

3. **Skip topic fetching when auto-selecting** (lines 187-190):
   ```typescript
   async function fetchTopicsForClass(classId: string) {
     // Skip fetching if material has auto topic
     if (materialTopic) {
       return;
     }
     // ... rest of fetch logic
   }
   ```

4. **Updated template to show read-only topic** (lines 371-451):
   - Hide organization toggle when `materialTopic` exists
   - Show read-only topic display with "(automatique)" label
   - Hide topic/category selection dropdowns when auto-selecting
   - Use BookOpen icon for visual consistency

5. **Added BookOpen import** (line 30):
   ```typescript
   import { Loader2, BookOpen } from 'lucide-svelte';
   ```

### 2. ShareMultipleMaterialsDialog.svelte

**File**: `/src/lib/components/google/ShareMultipleMaterialsDialog.svelte`

**Changes**:

1. **Added `autoSelectTopic` prop** (line 87):
   ```typescript
   interface Props {
     materials: Material[];
     topicName?: string;
     topicId?: string;
     autoSelectTopic?: boolean;  // NEW
     onClose: () => void;
     onSuccess: () => void;
   }
   ```

2. **Updated destructuring** (line 96):
   ```typescript
   let { materials, topicName, topicId, autoSelectTopic = false, onClose, onSuccess }: Props = $props();
   ```

3. **Modified class config initialization** (lines 154-167):
   - Force topics mode if auto: `useTopics: autoSelectTopic ? true : true`
   - Auto-fill topic ID if provided: `topicId: autoSelectTopic && topicId ? topicId : ''`
   - Skip topics array fetch if auto: `topics: autoSelectTopic ? [] : []`

4. **Skip topic fetching when auto-selecting** (lines 207-210):
   ```typescript
   async function fetchTopicsForClass(classId: string) {
     // Skip fetching if auto-selecting topic
     if (autoSelectTopic && topicId) {
       return;
     }
     // ... rest of fetch logic
   }
   ```

5. **Added informational banner** (lines 430-439):
   ```svelte
   {#if autoSelectTopic && topicName}
     <div class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
       <BookOpen class="h-4 w-4 text-blue-600 dark:text-blue-400" />
       <span class="text-sm text-blue-900 dark:text-blue-100">
         Les ressources sélectionnées ont la rubrique <strong>{topicName}</strong>
       </span>
     </div>
   {/if}
   ```

6. **Updated template for class configuration** (lines 485-565):
   - Hide organization toggle when `autoSelectTopic` is true
   - Show read-only topic display with "(automatique)" label
   - Hide topic/category selection dropdowns when auto-selecting

7. **Added BookOpen import** (line 32):
   ```typescript
   import { Loader2, BookOpen } from 'lucide-svelte';
   ```

### 3. Google Dashboard Page (+page.svelte)

**File**: `/src/routes/(protected)/dashboard/teacher/google/+page.svelte`

**Changes**:

1. **Added state variable** (line 185):
   ```typescript
   let selectedAutoSelectTopic = $state(false);
   ```

2. **Updated individual share dialog** (line 1301):
   ```svelte
   <ShareMaterialDialog
     material={{ ... }}
     materialTopic={selectedMaterial.topic}  <!-- NEW -->
     onClose={() => { ... }}
     onSuccess={async () => { ... }}
   />
   ```

3. **Updated bulk share button handler** (lines 668-679):
   ```typescript
   onclick={() => {
     selectedTopicMaterials = topicMaterials;
     selectedTopicName = topic.name;
     selectedTopicId = topic.id;

     // Check if ALL materials have the same topic
     const allHaveSameTopic = topicMaterials.every(
       (m) => m.topic?.id === topic.id
     );
     selectedAutoSelectTopic = allHaveSameTopic;

     bulkShareDialogOpen = true;
   }}
   ```

4. **Updated bulk share dialog** (lines 1354, 1360, 1367):
   ```svelte
   <ShareMultipleMaterialsDialog
     materials={selectedTopicMaterials}
     topicName={selectedTopicName}
     topicId={selectedTopicId}
     autoSelectTopic={selectedAutoSelectTopic}  <!-- NEW -->
     onClose={() => {
       // ... reset selectedAutoSelectTopic = false
     }}
     onSuccess={async () => {
       // ... reset selectedAutoSelectTopic = false
     }}
   />
   ```

## User Experience

### Before

1. **Material with topic → Individual share**:
   - User must manually select topic from dropdown
   - Even though material already has the topic assigned

2. **Bulk share → All materials have same topic**:
   - User must manually select topic for each class
   - Repetitive and error-prone

### After

1. **Material with topic → Individual share**:
   - Topic automatically selected
   - UI shows read-only topic name with "(automatique)" label
   - No organization toggle shown
   - No topic dropdown shown
   - Cleaner, faster workflow

2. **Material without topic → Individual share**:
   - Current behavior maintained
   - Organization toggle visible
   - Topic/category selection optional

3. **Bulk share → All materials have same topic**:
   - Topic automatically selected
   - Informational blue banner shows: "Les ressources sélectionnées ont la rubrique **[Topic Name]**"
   - Read-only topic display per class
   - No manual selection needed

4. **Bulk share → Different topics**:
   - Current manual selection behavior
   - No auto-selection (different topics = ambiguous)

## Technical Details

### Auto-Selection Logic

**Individual Share**:
```typescript
const hasAutoTopic = !!materialTopic;
// If material.topic exists → auto-select
```

**Bulk Share**:
```typescript
const allHaveSameTopic = topicMaterials.every((m) => m.topic?.id === topic.id);
// If ALL materials have the SAME topic → auto-select
```

### UI Patterns

1. **Read-only topic display**:
   ```svelte
   <div class="flex items-center gap-2 rounded-md border border-input bg-muted px-3 py-2">
     <BookOpen class="h-4 w-4 text-muted-foreground" />
     <span class="text-sm">{topicName}</span>
     <span class="ml-auto text-xs text-muted-foreground">(automatique)</span>
   </div>
   ```

2. **Informational banner** (bulk share):
   ```svelte
   <div class="flex items-center gap-2 rounded-md border border-blue-200 bg-blue-50 px-3 py-2">
     <BookOpen class="h-4 w-4 text-blue-600" />
     <span class="text-sm text-blue-900">
       Les ressources sélectionnées ont la rubrique <strong>{topicName}</strong>
     </span>
   </div>
   ```

### Data Flow

1. **Material object structure**:
   ```typescript
   interface Material {
     id: string;
     title: string;
     description: string | null;
     topic: { id: string; name: string } | null;  // Key field
     // ...
   }
   ```

2. **Props propagation**:
   ```
   +page.svelte (selectedMaterial.topic)
     ↓
   ShareMaterialDialog (materialTopic prop)
     ↓
   classConfigs initialization (topicId auto-fill)
     ↓
   Template (conditional rendering)
   ```

## Testing Checklist

- [x] Build passes (`pnpm build`)
- [ ] Manual testing needed:
  - [ ] Individual share with topic → shows auto-selected topic
  - [ ] Individual share without topic → shows manual selection
  - [ ] Bulk share (all same topic) → shows auto-selected topic
  - [ ] Bulk share (different topics) → shows manual selection
  - [ ] Dark mode compatibility
  - [ ] Responsive layout (mobile/tablet)
  - [ ] French text correctness

## Files Modified

1. `/src/lib/components/google/ShareMaterialDialog.svelte` (80 lines changed)
2. `/src/lib/components/google/ShareMultipleMaterialsDialog.svelte` (85 lines changed)
3. `/src/routes/(protected)/dashboard/teacher/google/+page.svelte` (25 lines changed)

Total: ~190 lines changed across 3 files

## Related Systems

- **Backend**: No changes needed (existing topic field already supported)
- **API**: `/api/google/materials/[id]/share` already accepts `topicId` parameter
- **Database**: `google_materials` table already has topic relationship
- **Validation**: Existing Zod schemas already validate topic IDs

## Future Enhancements

1. **Topic override option**: Allow users to override auto-selected topic if needed
2. **Bulk edit topics**: Change topic for multiple materials at once
3. **Topic suggestions**: Suggest topics based on material content
4. **Topic statistics**: Show which topics are most used

## Notes

- Google Topics and UbuMaths Categories remain separate, independent systems
- This only affects the UI workflow, not the underlying data structure
- Auto-selection only occurs when topic is explicitly set on material
- Manual selection is still available when no topic is assigned
