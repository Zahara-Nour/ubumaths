# Admin VIP Card Management Guide

Guide for administrators to manage VIP card templates and probability configurations.

> 🆕 2025-11-04

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Admin Page](#accessing-the-admin-page)
3. [Managing Card Templates](#managing-card-templates)
   - [Creating a New Card](#creating-a-new-card)
   - [Editing Cards](#editing-cards)
   - [Uploading Card Images](#uploading-card-images)
   - [Enabling/Disabling Cards](#enablingdisabling-cards)
   - [Deleting Cards](#deleting-cards)
4. [Managing Probability Configurations](#managing-probability-configurations)
   - [Creating Event Configs](#creating-event-configs)
   - [Activating Configs](#activating-configs)
   - [Editing Configs](#editing-configs)
   - [Deleting Configs](#deleting-configs)
5. [Understanding Teacher Overrides](#understanding-teacher-overrides)
6. [Best Practices](#best-practices)
7. [Troubleshooting](#troubleshooting)

---

## Overview

The VIP card system allows students to earn and draw virtual cards with various effects. As an admin, you control:

- **Card Templates**: The 26 base cards available in the system (bonus, choix, fortune, etc.)
- **Probability Configurations**: How likely each rarity is to be drawn (common, rare, epic, legendary)
- **Global Enable/Disable**: Which cards are available system-wide

Teachers can further restrict which cards their students can draw, but they cannot enable cards you've disabled globally.

**Key Concepts**:

- **Rarity Tiers**: Common (60%), Rare (25%), Epic (12%), Legendary (3%) by default
- **Intersection Logic**: If ANY teacher disables a card, student cannot draw it
- **Event Configs**: Special probability distributions for holidays/events

---

## Accessing the Admin Page

1. Log in with an admin account
2. Navigate to **Dashboard** → **Admin** → **Cartes VIP**
3. You'll see two tabs: **Cartes** (Templates) and **Configurations** (Probabilities)

**URL**: `/dashboard/admin/vip-cards`

**Required Permission**: `role = 'admin'` in `profiles` table

---

## Managing Card Templates

### Cartes Tab

The **Cartes** tab shows all 26 VIP cards grouped by rarity:

- **Communes** (8 cards): 6 enabled, 2 disabled
- **Rares** (10 cards): 9 enabled, 1 disabled
- **Épiques** (6 cards): All enabled
- **Légendaires** (2 cards): All enabled

Each card displays:

- Card image (WebP format, 256x256 or 512x512px)
- Card name and description (French)
- Rarity badge (colored pill: green/blue/purple/gold)
- Enabled/disabled status (toggle switch with optimistic UI)
- Action buttons: **Modifier**, **Supprimer**, **Upload Image**

**Default Disabled Cards** (as of 2025-11-04):

- `candy` (common) - Not implemented
- `captain` (common) - Causing classroom issues
- `team` (rare) - Being redesigned

---

### Creating a New Card

**IMPORTANT**: This is an advanced operation. Most admins will only need to enable/disable existing cards.

**Steps**:

1. Click **+ Nouvelle Carte** button (top-right)
2. Fill in the form:
   - **ID**: Lowercase kebab-case (e.g., `super-bonus`)
   - **Nom**: Display name in French (e.g., `Super Bonus`)
   - **Description**: What the card does (max 500 characters)
   - **Rareté**: Common, Rare, Épique, or Légendaire
   - **Catégorie**: Bonus, Privilège, Social, or Power (optional)
   - **Activée**: Whether card is enabled by default
   - **Chemin Image**: Path to image (e.g., `/images/vip-cards/super-bonus@0.5x.webp`)
   - **Action** (optional): Card effect (JSON: `{"type": "draw_cards", "count": 2}`)
   - **Ordre de tri**: Display order (0 = first)
3. Click **Créer**
4. Upload an image immediately (see next section)

---

### Editing Cards

1. Find the card in the grid
2. Click **Modifier** button
3. Update fields as needed
4. Click **Enregistrer**

**Common edits**:

- Change description
- Update sort order
- Change category

**Caution**:

- Changing rarity affects probability calculations
- Changing ID breaks existing card instances in database

---

### Uploading Card Images

Card images must be **WebP format** (recommended) or PNG/JPEG. Max **2MB**.

**Steps**:

1. Find the card in the grid
2. Click **Upload Image** button (camera icon 📷)
3. Drag-and-drop a WebP image OR click to browse
4. Preview appears before upload
5. Click **Upload**
6. Image is stored in Supabase Storage bucket `vip-card-images`
7. Card's `image_path` field is updated automatically

**Image Requirements**:

- Format: WebP preferred (PNG, JPEG, GIF, SVG also supported)
- Size: Max 2MB (enforced by API)
- Recommended dimensions: 256x256 or 512x512 pixels
- File naming: Stored as `{card_id}@0.5x.webp`

**Tools for converting to WebP**:

- Online: [Squoosh](https://squoosh.app/)
- Command line: `cwebp input.png -o output.webp`

---

### Enabling/Disabling Cards

Toggle the switch next to each card to enable/disable it globally.

**What happens when you disable a card**:

- Students **CANNOT** draw this card (filtered by draw function)
- Teachers **CANNOT** override this (can't re-enable globally disabled cards)
- Existing card instances students already own are **NOT** affected
- Card disappears from teacher override UI

**UI Feedback**:

- Toggle updates instantly (optimistic UI)
- If API fails, toggle reverts automatically
- Success/error toast appears

---

### Deleting Cards

**WARNING**: Deleting cards is **irreversible**.

**Before deleting**:

1. Check if students own instances of this card
2. Consider disabling instead of deleting
3. Ensure teachers aren't expecting this card

**Steps**:

1. Click **Supprimer** button
2. Confirm deletion in dialog
3. Card is permanently removed from database

**What happens to existing instances?**:

- Database foreign keys are set to CASCADE
- All student-owned instances of this card are **deleted**
- All teacher overrides for this card are **deleted**

**Best practice**: Use **disable** instead of delete unless you're absolutely sure.

---

## Managing Probability Configurations

### Configurations Tab

The **Configurations** tab shows all probability configurations:

- **Active** config (green checkmark ✅, highlighted border)
- **Inactive** configs (gray, available for activation)

Each config shows:

- Config name
- Probabilities: `Common% / Rare% / Epic% / Legendary%`
- Active status
- Date range (if specified)
- Actions: Edit, Delete, Activate

**Default config**:

- Name: `"Default"`
- Probabilities: `60 / 25 / 12 / 3`
- Always exists, cannot be deleted while active
- Can be edited

---

### Creating Event Configs

Event configs are special probability distributions for holidays or events.

**Example use case**: "Christmas 2025" config with boosted legendary rate (60/20/10/10) for December.

**Steps**:

1. Click **+ Nouvelle Configuration**
2. Fill in form:
   - **Nom**: Descriptive name (e.g., `Christmas 2025`)
   - **Description**: What makes this config special
   - **Probabilities**: Adjust 4 sliders (must sum to 100%)
     - Common: 0-100%
     - Rare: 0-100%
     - Epic: 0-100%
     - Legendary: 0-100%
   - **Date de début** (optional): When config becomes valid
   - **Date de fin** (optional): When config expires
3. Sliders auto-adjust to maintain 100% total
4. Click **Créer**

**Validation**:

- Probabilities **must** sum to exactly 100%
- UI shows ✅ or ❌ indicator
- Save button disabled until valid

**Tips**:

- Start by adjusting the slider you want to change most
- Other sliders auto-adjust proportionally
- Use description to explain why this config exists

---

### Activating Configs

Only **ONE** config can be active at a time. Activating a config deactivates all others.

**Steps**:

1. Find the config you want to activate
2. Click **Activer** button
3. Confirm in dialog
4. All other configs are deactivated
5. New config becomes active immediately

**What happens when you activate**:

- Previous active config is deactivated
- New config is activated
- **All future card draws** use new probabilities
- Existing cards students own are **NOT** affected
- Database transaction ensures atomicity

**Teacher impact**:

- Teachers see the new active config on their page (read-only)
- Teachers **CANNOT** change which config is active
- Teachers can still enable/disable specific cards

---

### Editing Configs

1. Find config in list
2. Click **Modifier**
3. Update fields (name, description, probabilities, dates)
4. Click **Enregistrer**

**Note**: You can edit the **active** config. Changes apply immediately to all future draws.

---

### Deleting Configs

**Restriction**: You **CANNOT** delete the active config.

**Steps**:

1. If config is active, activate a different config first
2. Click **Supprimer**
3. Confirm deletion
4. Config is permanently removed

---

## Understanding Teacher Overrides

Teachers can enable/disable cards for **their students** on the Teacher VIP Cards page.

**Hierarchy of permissions**:

1. **Admin global enable/disable** (most powerful)
   - If you disable a card globally, **NO ONE** can draw it
   - Teachers cannot override this
2. **Teacher overrides** (medium power)
   - Teachers can disable cards for their students
   - Teachers cannot enable cards you've disabled
3. **Probability configs** (applies to enabled cards only)

**Intersection logic**:

- If a student has **multiple teachers**, the **most restrictive** setting wins
- If **ANY** teacher disables a card, the student cannot draw it
- Example:
  - Student has 3 teachers: Alice, Bob, Charlie
  - Alice disables "bonus"
  - Bob and Charlie have no overrides
  - Result: Student **CANNOT** draw "bonus" (Alice blocked it)

**As an admin, you can**:

- View all teacher overrides (read-only in database)
- See which teachers are restricting which cards
- **NOT** modify teacher overrides (teachers manage their own)

**Why this design?**:

- Respects teacher autonomy
- Teachers know their classes best
- Prevents admin micromanagement

---

## Best Practices

### Card Management

1. **Disable instead of delete**: Preserves data, can be re-enabled later
2. **Test new cards**: Create card as disabled, test with test student, then enable
3. **Communicate changes**: Tell teachers before enabling/disabling popular cards
4. **Image optimization**: Use WebP format, compress images before upload
5. **Descriptive IDs**: Use clear kebab-case IDs (e.g., `mega-bonus` not `mb1`)

### Probability Configs

1. **Name clearly**: Use format `"Event YYYY"` (e.g., `"Christmas 2025"`)
2. **Set date ranges**: Prevents forgetting to deactivate event configs
3. **Document reasoning**: Use description field to explain why config exists
4. **Balance carefully**: Too high legendary% makes cards less special
5. **Announce events**: Tell students about special probability periods

### General

1. **Backup before changes**: Export database before major card changes
2. **Monitor draw statistics**: Check if probabilities match expectations
3. **Test with dummy students**: Create test accounts to verify behavior
4. **Review teacher feedback**: Teachers will tell you if a card is problematic

---

## Troubleshooting

### "Card image not loading"

**Possible causes**:

1. Image not uploaded to storage bucket
2. Wrong image path in `image_path` field
3. Storage bucket not public
4. Network/CDN issue

**Solutions**:

1. Check storage bucket in Supabase Dashboard
2. Verify `image_path` matches actual file location
3. Ensure bucket RLS policies allow public SELECT
4. Try accessing image URL directly in browser

---

### "Students reporting they can't draw a specific card"

**Possible causes**:

1. Card is disabled globally
2. One of their teachers disabled it
3. Selected rarity is empty after teacher overrides
4. Bug in draw function

**Solutions**:

1. Check card's enabled status in admin page
2. Ask student's teachers if they disabled the card
3. Check database: `SELECT * FROM teacher_vip_card_overrides WHERE card_id = 'card_id';`
4. Check function logs for errors

---

### "Probability sliders won't sum to 100%"

**Cause**: Rounding errors when auto-adjusting

**Solution**:

1. Manually adjust the smallest probability up/down by 1%
2. UI will show ✅ when sum = 100%
3. If stuck, refresh page and start over

---

### "Config won't delete"

**Cause**: Config is currently active

**Solution**:

1. Activate a different config first (e.g., "Default")
2. Then delete the unwanted config

---

### "Teacher says they can't see new card"

**Possible causes**:

1. Card is disabled globally
2. Teacher page hasn't refreshed
3. Card doesn't exist in `vip_card_templates`

**Solutions**:

1. Check card is enabled in admin page
2. Tell teacher to refresh their browser (Cmd+R or Ctrl+R)
3. Verify card exists in database

---

**Last updated**: 2025-11-04  
**Version**: 1.0
