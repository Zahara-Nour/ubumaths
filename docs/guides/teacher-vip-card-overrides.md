# Teacher VIP Card Override Guide

Guide for teachers to manage which VIP cards their students can draw.

> 🆕 2025-11-04

---

## Table of Contents

1. [Overview](#overview)
2. [Accessing the Teacher Page](#accessing-the-teacher-page)
3. [Understanding the Global Config](#understanding-the-global-config)
4. [Managing Your Card Preferences](#managing-your-card-preferences)
5. [How Overrides Work](#how-overrides-work)
6. [Common Scenarios](#common-scenarios)
7. [Best Practices](#best-practices)
8. [FAQ](#faq)

---

## Overview

As a teacher, you can control which VIP cards your students are allowed to draw. This helps you:

- Prevent students from drawing cards that don't fit your teaching style
- Disable problematic cards (e.g., "Skip homework" if you don't use homework)
- Customize the card experience for your classes

**Important**: Your preferences apply to **ALL** your classes. If you have 3 classes, disabling a card affects students in all 3.

---

## Accessing the Teacher Page

1. Log in with your teacher account
2. Navigate to **Dashboard** → **Professeur** → **Cartes VIP**

**URL**: `/dashboard/teacher/vip-cards`

---

## Understanding the Global Config

At the top of the page, you see the **Global Configuration** (read-only).

**What it shows**:

- Active configuration name (e.g., "Default" or "Christmas 2025")
- Probability distribution:
  - **Communes**: 60% (progress bar)
  - **Rares**: 25% (progress bar)
  - **Épiques**: 12% (progress bar)
  - **Légendaires**: 3% (progress bar)
- Date range (if applicable)

**What you can do**: **Nothing** - this is information only. Only admins can change probabilities.

**Why it's shown**: So you understand the likelihood of each rarity when students draw cards.

---

## Managing Your Card Preferences

Below the global config, you see **Vos Préférences de Cartes** (Your Card Preferences).

### Card Grid

Cards are grouped by rarity (Communes → Légendaires). Each card has:

- **Checkbox**: Enable/disable this card for your students
- **Card image**: Visual preview
- **Card name**: Display name
- **Rarity badge**: Common, Rare, Epic, or Legendary

### Enabling/Disabling Cards

**To disable a card**:

1. **Uncheck** the checkbox next to the card
2. Card is immediately blocked for your students (optimistic UI)
3. Click **Enregistrer** to save changes

**To re-enable a card**:

1. **Check** the checkbox
2. Card becomes available for your students
3. Click **Enregistrer**

**Unsaved Changes Indicator**:

- When you make changes, you'll see **"Modifications non enregistrées"** (Unsaved changes)
- Changes are **NOT** saved until you click **Enregistrer**

**Resetting to Defaults**:

- Click **Réinitialiser** to clear all your overrides
- Confirmation dialog appears
- After reset, students can draw all globally-enabled cards

---

## How Overrides Work

### Hierarchy of Permissions

1. **Admin global setting** (most powerful)
   - If admin disables a card globally, **NO ONE** can draw it
   - You **CANNOT** override this
   - Example: Admin disables "Candy" → Your students cannot draw it, even if you want to enable it

2. **Your overrides** (medium power)
   - You can disable cards for **your students only**
   - You **CANNOT** enable cards that admin disabled
   - Example: You disable "Bonus" → Only your students are affected

3. **Probability config** (applies to enabled cards)
   - Controls likelihood of each rarity
   - Managed by admin

### Intersection Logic (Multiple Teachers)

**Critical rule**: If a student has **multiple teachers**, the **most restrictive** setting wins.

**Example Scenario**:

- Student Emma is in your class **AND** Teacher Bob's class
- You disable "Bonus"
- Bob does not disable "Bonus"
- **Result**: Emma **CANNOT** draw "Bonus" (your override blocks it)

**Why this design?**:

- Ensures students don't bypass restrictions by being in multiple classes
- Respects each teacher's preferences
- "Most restrictive wins" is easier to understand than "average" or "union"

**Implication**:

- Be thoughtful when disabling cards
- Your preferences affect students even if they have other teachers

---

## Common Scenarios

### Scenario 1: "I don't want students drawing 'Skip Homework' cards"

**Solution**:

1. Find "Skip Homework" in the card grid
2. Uncheck the checkbox
3. Click **Enregistrer**
4. Your students can no longer draw this card

---

### Scenario 2: "I want to disable ALL legendary cards"

**Solution**:

1. Scroll to **Cartes Légendaires** section
2. Uncheck all legendary cards (e.g., "Fortune", "Sheikh")
3. Click **Enregistrer**
4. Students will never roll legendary (will fallback to common cards)

**Note**: This effectively changes probabilities for your students:

- Instead of 3% legendary, they get 0%
- That 3% is redistributed to common rarity (fallback)

---

### Scenario 3: "Admin disabled a card I want to use"

**Solution**: You **CANNOT** override admin settings. Contact your admin and request they enable the card globally.

**Why**: Admins disable cards for system-wide reasons (broken cards, redesigns, etc.). Teachers can't re-enable them to maintain system integrity.

---

### Scenario 4: "I changed my mind, reset everything"

**Solution**:

1. Click **Réinitialiser** button
2. Confirm in dialog
3. All your overrides are deleted
4. Students can draw all globally-enabled cards again

**Note**: This doesn't affect other teachers' preferences.

---

### Scenario 5: "How do I know which cards are globally disabled?"

**Indicators**:

- Cards that are globally disabled do **NOT** appear in your grid
- You only see cards that are globally enabled (and you can choose to disable them)

**Example**:

- Admin disabled "Candy" and "Captain"
- Your grid has 24 cards instead of 26
- You can disable any of those 24, but cannot enable the missing 2

---

## Best Practices

### 1. Disable Thoughtfully

Ask yourself:

- Does this card work with my teaching style?
- Is this card fair in my classes?
- Does this card cause problems (e.g., students gaming the system)?

**Don't** disable cards just because they're powerful. Cards are meant to be fun!

---

### 2. Communicate with Students

If you disable popular cards:

- Tell students **WHY** you disabled them
- Explain your reasoning (fairness, classroom rules, etc.)
- Students appreciate transparency

---

### 3. Review Periodically

Every quarter/semester:

- Review your disabled cards
- Re-enable cards if reasons changed
- Disable new cards if needed

---

### 4. Coordinate with Other Teachers

If your students have multiple teachers:

- Talk to other teachers about their card preferences
- Avoid conflicting goals (e.g., you disable "Bonus", they expect it enabled)
- Remember: **Most restrictive wins**, so your disable affects their students too

---

### 5. Test Before Disabling

If unsure about a card:

1. Let it run for a week
2. Observe student behavior
3. Then decide to disable or keep

Don't disable preemptively without seeing the impact.

---

## FAQ

### "Do my preferences affect other teachers' students?"

**Short answer**: Only if they're **YOUR students too**.

**Long answer**:

- If Student A is **ONLY** in your class → Your preferences affect them
- If Student B is in your class **AND** Teacher C's class → Your preferences affect them (intersection logic)
- If Student D is **ONLY** in Teacher C's class → Your preferences do **NOT** affect them

---

### "What happens when I disable a card mid-draw?"

**Answer**: Changes apply **immediately** after you click **Enregistrer**.

- Student Emma is drawing 10 cards
- You disable "Bonus" midway
- Cards drawn **before** you saved: May include "Bonus"
- Cards drawn **after** you saved: Will NOT include "Bonus"

---

### "Can I enable cards that admin disabled?"

**Answer**: **NO**. You can only disable cards that are globally enabled. Admin settings override yours.

---

### "How do I know if a student has me as their only teacher?"

**Answer**: Not visible in this UI. Contact your admin or check the student's class memberships in the admin dashboard.

---

### "What if I accidentally disable all cards?"

**Answer**: Don't worry! The system prevents this:

- You must have **at least 1 card enabled per rarity**
- If you try to disable all commons, you'll see an error
- This prevents students from being unable to draw any cards

---

### "Can I create custom cards?"

**Answer**: **NO**. Only admins can create new card templates. You can request new cards from your admin.

---

### "Do students see which cards I disabled?"

**Answer**: **NO**. Students just see cards they can draw. They don't know which teacher disabled which cards.

---

### "What happens if ALL my students' teachers disable the same card?"

**Answer**: Students cannot draw that card. Intersection logic ensures the most restrictive setting wins across all teachers.

---

## Troubleshooting

### "Save button won't click"

**Possible causes**:

1. Validation error (e.g., trying to disable all cards in a rarity)
2. No changes made (nothing to save)

**Solution**:

1. Check for error messages above the button
2. Ensure at least 1 card per rarity is enabled
3. Make at least one change before saving

---

### "I disabled a card but student still drew it"

**Possible causes**:

1. Changes not saved (forgot to click **Enregistrer**)
2. Card was drawn before you saved changes
3. Wrong card (student drew similar card)

**Solutions**:

1. Verify card is unchecked in your preferences
2. Check when card was drawn (timestamp in student's inventory)
3. Double-check card ID with student

---

### "Reset button confirmation won't show"

**Cause**: Browser dialog blocker

**Solution**:

1. Allow dialogs/popups from your school's domain
2. Try different browser
3. Contact IT support if issue persists

---

## Support

Questions? Contact your school admin or refer to:

- **Admin VIP Card Management Guide** (for admins)
- **Database Schema Documentation** (for developers)

---

**Last updated**: 2025-11-04  
**Version**: 1.0
