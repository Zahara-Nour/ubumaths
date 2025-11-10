# Système de Notifications UbuMaths

Documentation complète du système de notifications intelligent d'UbuMaths.

**Date de création** : 2025-11-09
**Dernière mise à jour** : 2025-11-10
**Version** : 1.2 (Delete Rate Limiting + Race Condition Fix)
**Status** : Production-ready

---

## Table des matières

1. [Vue d'ensemble](#vue-densemble)
2. [Architecture](#architecture)
3. [Schéma de base de données](#schéma-de-base-de-données)
4. [Politiques RLS](#politiques-rls)
5. [API Endpoints](#api-endpoints)
6. [Fonctions serveur](#fonctions-serveur)
7. [Helpers d'auto-notification](#helpers-dauto-notification)
8. [Composants UI](#composants-ui)
9. [Gestion d'état](#gestion-détat)
10. [Types TypeScript](#types-typescript)
11. [Permissions et sécurité](#permissions-et-sécurité)
12. [Guide d'intégration](#guide-dintégration)
13. [UX et design](#ux-et-design)
14. [Limitation de débit (Rate Limiting)](#limitation-de-débit-rate-limiting) 🆕
15. [Problèmes connus](#problèmes-connus)
16. [Roadmap](#roadmap)
17. [Dépannage](#dépannage)
18. [Bonnes pratiques](#bonnes-pratiques)

---

## Vue d'ensemble

Le système de notifications UbuMaths permet aux enseignants et administrateurs d'envoyer des messages ciblés aux utilisateurs, et au système de générer automatiquement des notifications pour certains événements.

### Caractéristiques principales

- **Ciblage intelligent** : Envoi à tous, par rôle, par classes, ou utilisateurs spécifiques
- **Niveaux de priorité** : Normal, Important, Urgent (avec coloration visuelle)
- **Types de notifications** : Info, Alerte, Annonce, Rappel
- **Actions intégrées** : Boutons avec liens directs (ex: "Voir l'évaluation")
- **Notifications système** : Génération automatique pour événements (évaluations, erreurs, etc.)
- **Affichage multiple** : Bannière sticky, dropdown sidebar, page complète
- **Soft delete** : Les créateurs/admins peuvent supprimer leurs notifications
- **Expiration automatique** : Nettoyage des notifications expirées (30 jours par défaut)
- **Optimistic UI** : Mise à jour instantanée de l'interface

### Architecture simplifiée

```
┌─────────────────────────────────────────────────────────────┐
│                     CRÉATION                                 │
├─────────────────────────────────────────────────────────────┤
│                                                               │
│  Manuelle (Teachers/Admins)    Automatique (System)         │
│         │                              │                      │
│         ├── createNotification()       ├── notifyNewAssessment() │
│         │   (avec validation)          ├── notifyRewardEarned()  │
│         │                              └── notifyMaintenance()   │
│         │                                                     │
│         └─────────────┬──────────────────┘                   │
│                       ▼                                       │
│              ┌─────────────────┐                             │
│              │ notifications   │                             │
│              │ (Table)         │                             │
│              └─────────────────┘                             │
│                       │                                       │
└───────────────────────┼───────────────────────────────────────┘
                        │
┌───────────────────────┼───────────────────────────────────────┐
│                  AFFICHAGE                                    │
├───────────────────────┼───────────────────────────────────────┤
│                       ▼                                       │
│         ┌─────────────────────────┐                          │
│         │ API /notifications/*    │                          │
│         │ - /unread               │                          │
│         │ - /unread-count         │                          │
│         │ - /mark-read            │                          │
│         │ - /mark-all-read        │                          │
│         └──────────┬──────────────┘                          │
│                    ▼                                          │
│         ┌─────────────────────────┐                          │
│         │ notificationStore       │                          │
│         │ (Svelte 5 runes)        │                          │
│         └──────────┬──────────────┘                          │
│                    │                                          │
│         ┌──────────┴──────────────┬──────────────┐          │
│         ▼                         ▼              ▼           │
│  NotificationBanner    NotificationDropdown   +page.svelte  │
│  (Sticky header)       (Sidebar popover)      (Full list)   │
│                                                               │
└───────────────────────────────────────────────────────────────┘
```

---

## Architecture

### Structure des fichiers

```
src/
├── lib/
│   ├── server/
│   │   ├── notifications.ts              # Fonctions CRUD serveur
│   │   ├── auto-notifications.ts         # Helpers automatiques
│   │   └── validation/
│   │       └── notifications.ts          # Schémas Zod
│   ├── stores/
│   │   └── notifications.svelte.ts       # Store Svelte 5
│   ├── components/
│   │   └── notifications/
│   │       ├── NotificationBanner.svelte # Bannière sticky
│   │       └── NotificationDropdown.svelte # Dropdown sidebar
│   └── types/
│       └── notification.ts               # Types + helpers
├── routes/
│   ├── (protected)/
│   │   └── dashboard/
│   │       └── notifications/
│   │           └── +page.svelte          # Page complète
│   └── api/
│       └── notifications/
│           ├── unread/+server.ts         # GET notifications
│           ├── unread-count/+server.ts   # GET count only
│           ├── mark-read/+server.ts      # POST mark read
│           ├── mark-all-read/+server.ts  # POST mark all
│           └── cleanup/+server.ts        # POST/GET cleanup (cron)
└── supabase/
    └── migrations/
        └── 081_create_notifications_system.sql
```

---

## Schéma de base de données

### Table `notifications`

Stocke toutes les notifications avec système de ciblage intelligent.

```sql
CREATE TABLE notifications (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  created_by UUID REFERENCES profiles(id) ON DELETE SET NULL,

  -- Contenu
  title TEXT NOT NULL,
  message TEXT NOT NULL, -- HTML enrichi
  type TEXT NOT NULL CHECK (type IN ('info', 'alert', 'announcement', 'reminder')),
  priority TEXT NOT NULL DEFAULT 'normal' CHECK (priority IN ('normal', 'important', 'urgent')),

  -- Action optionnelle (lien de redirection)
  action_label TEXT, -- ex: "Voir le devoir"
  action_url TEXT,   -- ex: "/dashboard/student/devoirs/123"

  -- Ciblage
  target_type TEXT NOT NULL CHECK (target_type IN ('all', 'role', 'classes', 'users')),
  target_roles TEXT[],      -- ['student', 'teacher'] si target_type='role'
  target_class_ids UUID[],  -- IDs de classes si target_type='classes'
  target_user_ids UUID[],   -- IDs d'utilisateurs si target_type='users'

  -- Gestion
  expires_at TIMESTAMPTZ NOT NULL DEFAULT (now() + INTERVAL '30 days'),
  deleted_at TIMESTAMPTZ, -- Soft delete par créateur

  -- Métadonnées système (pour notifications automatiques)
  is_system BOOLEAN NOT NULL DEFAULT false,
  system_event_type TEXT -- 'assignment_created', 'resource_added', etc.
);
```

### Table `notification_reads`

Suivi des lectures de notifications par utilisateur.

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

### Index de performance

7 index optimisés pour des requêtes rapides :

| Index                                 | Colonnes                                     | But                        |
| ------------------------------------- | -------------------------------------------- | -------------------------- |
| `idx_notifications_active`            | `created_at DESC` WHERE `deleted_at IS NULL` | Liste active triée         |
| `idx_notifications_created_by`        | `created_by` WHERE `deleted_at IS NULL`      | Notifications par créateur |
| `idx_notification_reads_user`         | `user_id, notification_id`                   | Statut de lecture par user |
| `idx_notification_reads_notification` | `notification_id`                            | Statistiques de lecture    |
| `idx_notifications_target_type`       | `target_type` WHERE `deleted_at IS NULL`     | Filtrage par type de cible |
| `idx_notifications_expires_at`        | `expires_at` WHERE `deleted_at IS NULL`      | Nettoyage expirations      |
| Index implicite                       | `id` (PRIMARY KEY)                           | Lookup par ID              |

---

## Politiques RLS

### Notifications

#### SELECT : "Users can view notifications targeting them"

Les utilisateurs peuvent voir les notifications qui les ciblent :

```sql
CREATE POLICY "Users can view notifications targeting them"
  ON notifications
  FOR SELECT
  USING (
    deleted_at IS NULL
    AND expires_at > now()
    AND (
      -- Tous les utilisateurs
      target_type = 'all'
      -- Par rôle
      OR (target_type = 'role' AND (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = ANY(target_roles))
      -- Par classe (membre de la classe ciblée)
      OR (target_type = 'classes' AND EXISTS (
        SELECT 1 FROM class_members cm
        WHERE cm.student_id = auth.uid()
        AND cm.class_id = ANY(target_class_ids)
      ))
      -- Directement ciblé
      OR (target_type = 'users' AND auth.uid() = ANY(target_user_ids))
      -- Le créateur peut toujours voir ses notifications
      OR created_by = auth.uid()
    )
  );
```

**Logique** : Requête OR complexe vérifiant le ciblage. Note : Le créateur voit toujours ses propres notifications.

#### INSERT : "Teachers can create notifications for their classes"

Les enseignants peuvent créer des notifications pour leurs classes/élèves uniquement :

```sql
CREATE POLICY "Teachers can create notifications for their classes"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'teacher'
    AND (
      -- Peut cibler ses propres classes
      (target_type = 'classes' AND target_class_ids <@ (
        SELECT array_agg(id) FROM classes WHERE teacher_id = auth.uid()
      ))
      -- Peut cibler ses propres élèves
      OR (target_type = 'users' AND target_user_ids <@ (
        SELECT array_agg(DISTINCT cm.student_id)
        FROM class_members cm
        JOIN classes c ON c.id = cm.class_id
        WHERE c.teacher_id = auth.uid()
      ))
    )
  );
```

**Validation** : Vérifie que les classes/élèves ciblés appartiennent bien à l'enseignant.

#### INSERT : "Admins can create any notification"

Les admins peuvent créer n'importe quelle notification :

```sql
CREATE POLICY "Admins can create any notification"
  ON notifications
  FOR INSERT
  WITH CHECK (
    (SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin'
  );
```

#### UPDATE : "Users can delete their own notifications"

Soft delete par le créateur :

```sql
CREATE POLICY "Users can delete their own notifications"
  ON notifications
  FOR UPDATE
  USING (created_by = auth.uid())
  WITH CHECK (created_by = auth.uid());
```

#### UPDATE : "Admins can delete any notification"

Les admins peuvent supprimer n'importe quelle notification :

```sql
CREATE POLICY "Admins can delete any notification"
  ON notifications
  FOR UPDATE
  USING ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin')
  WITH CHECK ((SELECT role::TEXT FROM profiles WHERE id = auth.uid()) = 'admin');
```

### Notification Reads

#### SELECT : "Users can view their own read status"

```sql
CREATE POLICY "Users can view their own read status"
  ON notification_reads
  FOR SELECT
  USING (user_id = auth.uid());
```

#### INSERT : "Users can mark notifications as read"

```sql
CREATE POLICY "Users can mark notifications as read"
  ON notification_reads
  FOR INSERT
  WITH CHECK (user_id = auth.uid());
```

#### SELECT : "Creators can view read stats for their notifications"

Les créateurs/admins peuvent voir les stats de lecture :

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

## API Endpoints

Tous les endpoints requièrent l'authentification (`requireAuth` middleware).

### GET `/api/notifications/unread`

Récupère toutes les notifications non lues de l'utilisateur.

**Authentification** : Requise
**Méthode** : GET
**Paramètres** : Aucun

**Réponse** :

```typescript
{
  notifications: NotificationWithDetails[],
  count: number
}
```

**Exemple** :

```typescript
const response = await fetch('/api/notifications/unread');
const { notifications, count } = await response.json();
// notifications: [{id, title, message, type, priority, creator, is_read, ...}, ...]
// count: 5
```

**Tri** : Priorité (urgent > important > normal) puis date (récent d'abord).

---

### GET `/api/notifications/unread-count`

Récupère uniquement le nombre de notifications non lues (requête plus légère).

**Authentification** : Requise
**Méthode** : GET
**Paramètres** : Aucun

**Validation de réponse** : `unreadNotificationsCountResponseSchema` (Zod)

**Réponse** :

```typescript
{
	count: number;
}
```

**Exemple** :

```typescript
const response = await fetch('/api/notifications/unread-count');
const { count } = await response.json();
// count: 5
```

**Usage** : Pour le badge de notification sans charger toutes les données.

---

### POST `/api/notifications/mark-read`

Marque une notification spécifique comme lue.

**Authentification** : Requise
**Méthode** : POST
**Content-Type** : `application/json`

**Body** :

```typescript
{
	notificationId: string; // UUID
}
```

**Validation** : `markNotificationReadSchema` (Zod) ✅

**Réponse** :

```typescript
{
	success: true;
}
```

**Exemple** :

```typescript
const response = await fetch('/api/notifications/mark-read', {
	method: 'POST',
	headers: { 'Content-Type': 'application/json' },
	body: JSON.stringify({ notificationId: 'uuid-here' })
});

const { success } = await response.json();
```

**Erreurs** :

- `400` : Invalid UUID format
- `500` : Database error

**Idempotence** : Duplicate reads ignorées (code `23505`).

---

### POST `/api/notifications/mark-all-read`

Marque toutes les notifications non lues comme lues.

**Authentification** : Requise
**Méthode** : POST
**Body** : Aucun

**Réponse** :

```typescript
{
	success: true;
}
```

**Exemple** :

```typescript
const response = await fetch('/api/notifications/mark-all-read', {
	method: 'POST'
});

const { success } = await response.json();
```

**Performance** : Batch insert des lecture records.

---

### POST/GET `/api/notifications/cleanup`

Nettoie les notifications expirées (hard delete). Endpoint prévu pour Vercel Cron.

**Authentification** : Aucune (pensé pour cron job)
**Méthodes** : POST (cron) / GET (test manuel)
**Body** : Aucun

**Réponse** :

```typescript
{
  success: true,
  deletedCount: number,
  message: string
}
```

**Exemple (cron)** :

```json
// vercel.json
{
	"crons": [
		{
			"path": "/api/notifications/cleanup",
			"schedule": "0 2 * * *"
		}
	]
}
```

**Exemple (manuel)** :

```bash
curl https://ubumaths.com/api/notifications/cleanup
```

**Job Tracking** : Logs vers `background_job_runs` table via `start_job_run()` / `complete_job_run()`.

**Sécurité** : ⚠️ Pas de vérification de secret cron (commentée). Ajouter `CRON_SECRET` si souhaité.

---

## Fonctions serveur

Toutes dans `/src/lib/server/notifications.ts`.

### `createNotification()`

Crée une notification manuelle (enseignant ou admin).

**Signature** :

```typescript
async function createNotification(
	supabase: SupabaseClient<Database>,
	data: CreateNotificationData,
	createdBy: string
): Promise<{ success: boolean; id?: string; error?: string }>;
```

**Validation** :

- ✅ Vérifie le rôle du créateur (teacher/admin)
- ✅ Teachers : Validation que les classes/élèves ciblés leur appartiennent
- ✅ Admins : Aucune restriction

**Paramètres** :

```typescript
interface CreateNotificationData {
	title: string;
	message: string; // HTML enrichi
	type: NotificationType;
	priority: NotificationPriority;
	action_label?: string;
	action_url?: string;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	expires_at?: string; // ISO date, défaut +30 jours
}
```

**Retour** :

```typescript
{ success: true, id: "uuid" }
// ou
{ success: false, error: "Message d'erreur" }
```

**Erreurs possibles** :

- `"Utilisateur non trouvé"`
- `"Les professeurs ne peuvent cibler que leurs classes ou élèves"`
- `"Vous ne pouvez cibler que vos propres classes"`
- `"Vous ne pouvez cibler que vos propres élèves"`
- `"Erreur lors de la création de la notification"`

**Exemple** :

```typescript
import { createNotification } from '$lib/server/notifications';

const result = await createNotification(
	supabase,
	{
		title: 'Nouveau devoir',
		message: '<p>Vous avez un nouveau devoir de maths.</p>',
		type: 'info',
		priority: 'normal',
		action_label: 'Voir le devoir',
		action_url: '/dashboard/student/devoirs/123',
		target_type: 'classes',
		target_class_ids: ['class-uuid']
	},
	teacherId
);

if (result.success) {
	console.log('Notification créée:', result.id);
}
```

---

### `createSystemNotification()`

Crée une notification système automatique (bypass permission checks).

**Signature** :

```typescript
async function createSystemNotification(
	supabase: SupabaseClient<Database>,
	data: CreateSystemNotificationData
): Promise<{ success: boolean; error?: string }>;
```

**Différences avec `createNotification()` :**

- ✅ Pas de vérification de permissions
- ✅ `created_by` = NULL
- ✅ `is_system` = TRUE
- ✅ Inclut `system_event_type`

**Paramètres** :

```typescript
interface CreateSystemNotificationData {
	title: string;
	message: string;
	type: NotificationType;
	priority: NotificationPriority;
	system_event_type: SystemEventType;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	action_label?: string;
	action_url?: string;
}
```

**Exemple** :

```typescript
import { createSystemNotification } from '$lib/server/notifications';

await createSystemNotification(supabase, {
	title: 'Nouvelle évaluation',
	message: '<p>Mme Dupont vous a assigné une nouvelle évaluation.</p>',
	type: 'info',
	priority: 'important',
	system_event_type: 'assessment_assigned',
	target_type: 'classes',
	target_class_ids: ['class-uuid'],
	action_label: "Voir l'évaluation",
	action_url: '/dashboard/student/assessments'
});
```

---

### `getUnreadNotifications()`

Récupère les notifications non lues pour un utilisateur.

**Signature** :

```typescript
async function getUnreadNotifications(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<NotificationWithDetails[]>;
```

**Logique** :

1. Récupère le rôle et classes de l'utilisateur
2. Construit des conditions OR pour le ciblage :
   - `target_type = 'all'`
   - `target_type = 'role' AND user.role IN target_roles`
   - `target_type = 'classes' AND user.class_ids ∩ target_class_ids`
   - `target_type = 'users' AND userId IN target_user_ids`
3. Joint avec `profiles` pour info créateur
4. Récupère le statut de lecture depuis `notification_reads`
5. Filtre les notifications déjà lues
6. Trie par priorité (urgent > important > normal) puis date (récent)

**Retour** : Array de `NotificationWithDetails[]` (avec `creator` enrichi, `is_read = false`).

**Exemple** :

```typescript
import { getUnreadNotifications } from '$lib/server/notifications';

const notifications = await getUnreadNotifications(supabase, userId);
// [
//   {
//     id: "uuid",
//     title: "Nouvelle évaluation",
//     message: "<p>...</p>",
//     type: "info",
//     priority: "important",
//     creator: { firstname: "Marie", lastname: "Dupont" },
//     is_read: false,
//     ...
//   }
// ]
```

---

### `getUnreadCount()`

Récupère le nombre de notifications non lues.

**Signature** :

```typescript
async function getUnreadCount(supabase: SupabaseClient<Database>, userId: string): Promise<number>;
```

**Implémentation** : Appelle `getUnreadNotifications()` et retourne `.length`.

**Note** : Pourrait être optimisé avec un COUNT SQL direct.

---

### `markAsRead()`

Marque une notification comme lue.

**Signature** :

```typescript
async function markAsRead(
	supabase: SupabaseClient<Database>,
	notificationId: string,
	userId: string
): Promise<{ success: boolean; error?: string }>;
```

**Logique** : Insert dans `notification_reads`. Ignore duplicate key errors (code `23505`).

**Exemple** :

```typescript
const result = await markAsRead(supabase, notificationId, userId);
if (result.success) {
	console.log('Notification marquée comme lue');
}
```

---

### `markAllAsRead()`

Marque toutes les notifications non lues comme lues.

**Signature** :

```typescript
async function markAllAsRead(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<{ success: boolean; error?: string }>;
```

**Logique** : Récupère toutes les notifications non lues, puis batch insert des read records.

**Performance** : Optimisé avec batch insert.

---

### `deleteNotification()`

Soft delete d'une notification (créateur ou admin uniquement).

**Signature** :

```typescript
async function deleteNotification(
	supabase: SupabaseClient<Database>,
	notificationId: string,
	userId: string
): Promise<{ success: boolean; error?: string }>;
```

**Validation** :

- ✅ Vérifie que l'utilisateur est le créateur OU admin
- ✅ Refuse si ni créateur ni admin

**Erreurs** :

- `"Notification ou utilisateur non trouvé"`
- `"Permission refusée"`
- `"Erreur lors de la suppression"`

---

### `getCreatedNotifications()`

Récupère les notifications créées par un utilisateur avec statistiques de lecture.

**Signature** :

```typescript
async function getCreatedNotifications(
	supabase: SupabaseClient<Database>,
	userId: string
): Promise<NotificationStats[]>;
```

**Optimisation N+1** : ✅ Batch queries pour éviter N requêtes séparées.

**Statistiques retournées** :

```typescript
interface NotificationStats {
	id: string;
	title: string;
	created_at: string;
	type: NotificationType;
	priority: NotificationPriority;
	target_type: NotificationTargetType;
	target_summary: string; // "Classe 5A (24 élèves)" ou "3 élèves"
	total_recipients: number;
	read_count: number;
	read_percentage: number; // (read_count / total_recipients) * 100
}
```

**Usage** : Page de gestion des notifications pour enseignants/admins.

---

### `cleanupExpiredNotifications()`

Hard delete des notifications expirées.

**Signature** :

```typescript
async function cleanupExpiredNotifications(
	supabase: SupabaseClient<Database>
): Promise<{ success: boolean; deletedCount?: number; error?: string }>;
```

**Logique** : Supprime toutes les notifications où `expires_at < now()`.

**Exemple** :

```typescript
const result = await cleanupExpiredNotifications(supabase);
// { success: true, deletedCount: 42 }
```

---

## Helpers d'auto-notification

Fonctions dans `/src/lib/server/auto-notifications.ts` pour créer automatiquement des notifications système.

### `notifyNewAssessment()` ✅ ACTIF

Notification lors de l'assignation d'une évaluation.

**Signature** :

```typescript
async function notifyNewAssessment(
	supabase: SupabaseClient<Database>,
	data: {
		assessmentId: string;
		assessmentTitle: string;
		teacherName: string;
		classIds?: string[];
		studentIds?: string[];
	}
): Promise<void>;
```

**Exemple** :

```typescript
await notifyNewAssessment(supabase, {
	assessmentId: 'uuid',
	assessmentTitle: 'Évaluation Chapitre 5',
	teacherName: 'Mme Dupont',
	classIds: ['class-uuid']
});
```

**Intégration** : `/api/assessments/[id]/assign` ✅

**Message généré** :

> **Nouvelle évaluation assignée**
> Mme Dupont vous a assigné une nouvelle évaluation : Évaluation Chapitre 5

**Priorité** : Important
**Type** : Info
**Action** : "Voir l'évaluation" → `/dashboard/student/assessments`

---

### `notifyNewAssignment()` 📦 PRÉPARÉ

Notification lors de la création d'un devoir.

**Signature** :

```typescript
async function notifyNewAssignment(
	supabase: SupabaseClient<Database>,
	data: {
		assignmentId: string;
		assignmentTitle: string;
		classId: string;
		teacherName: string;
	}
): Promise<void>;
```

**Status** : Préparé mais non intégré.

---

### `notifyNewResource()` 📦 PRÉPARÉ

Notification lors de l'ajout d'une ressource.

**Signature** :

```typescript
async function notifyNewResource(
	supabase: SupabaseClient<Database>,
	data: {
		resourceId: string;
		resourceTitle: string;
		classId: string;
		teacherName: string;
	}
): Promise<void>;
```

**Status** : Préparé mais non intégré.

---

### `notifyRewardEarned()` 📦 PRÉPARÉ

Notification lors de l'obtention de gidouilles (points).

**Signature** :

```typescript
async function notifyRewardEarned(
	supabase: SupabaseClient<Database>,
	data: {
		studentId: string;
		amount: number;
		reason?: string;
	}
): Promise<void>;
```

**Exemple** :

```typescript
await notifyRewardEarned(supabase, {
	studentId: 'uuid',
	amount: 50,
	reason: 'Pour avoir terminé tous tes devoirs cette semaine !'
});
```

**Message généré** :

> **🎉 50 gidouilles gagnées !**
> Vous avez gagné 50 gidouilles ! Pour avoir terminé tous tes devoirs cette semaine !

---

### `notifyVipCardEarned()` 📦 PRÉPARÉ

Notification lors de l'obtention d'une carte VIP.

**Signature** :

```typescript
async function notifyVipCardEarned(
	supabase: SupabaseClient<Database>,
	data: {
		studentId: string;
		cardType: string;
		cardName: string;
	}
): Promise<void>;
```

**Action** : "Voir mes cartes" → `/dashboard/student/vip-cards`

---

### `notifyBadgeUnlocked()` 📦 PRÉPARÉ

Notification lors du déblocage d'un badge.

**Signature** :

```typescript
async function notifyBadgeUnlocked(
	supabase: SupabaseClient<Database>,
	data: {
		studentId: string;
		badgeName: string;
		badgeDescription?: string;
	}
): Promise<void>;
```

---

### `notifyMaintenance()` 📦 PRÉPARÉ

Notification de maintenance programmée (pour admins).

**Signature** :

```typescript
async function notifyMaintenance(
	supabase: SupabaseClient<Database>,
	data: {
		date: string;
		duration: string;
		description: string;
	}
): Promise<void>;
```

**Type** : Alert
**Priorité** : Important
**Ciblage** : Tous les utilisateurs

---

### `notifyFeatureRelease()` 📦 PRÉPARÉ

Notification de nouvelle fonctionnalité.

**Signature** :

```typescript
async function notifyFeatureRelease(
	supabase: SupabaseClient<Database>,
	data: {
		featureName: string;
		description: string;
		targetRoles?: string[];
		actionUrl?: string;
	}
): Promise<void>;
```

**Type** : Announcement
**Priorité** : Normal

---

## Composants UI

### NotificationBanner.svelte

Bannière sticky en haut de page affichant les 5 notifications les plus importantes.

**Emplacement** : `/src/lib/components/notifications/NotificationBanner.svelte`

**Caractéristiques** :

- Sticky header (`sticky top-0 z-50`)
- Carousel pour naviguer entre notifications (si > 1)
- Couleur de fond adaptée à la priorité (urgent=rouge, important=orange, normal=bleu)
- Icône de type (🔔 📢 ⚠️ ⏰)
- Nom du créateur + temps relatif
- Bouton d'action optionnel
- Bouton "Marquer comme lue"
- Bouton fermer (X)
- Limite : 5 notifications max

**Props** : Aucune (utilise le store directement)

**État interne** :

```typescript
let currentIndex = $state(0); // Index du carousel
```

**Getters dérivés** :

```typescript
const notifications = $derived(notificationStore.getTopNotifications(5));
const hasNotifications = $derived(notifications.length > 0);
const currentNotification = $derived(notifications[currentIndex] || null);
const showCarousel = $derived(notifications.length > 1);
```

**Méthodes** :

- `handlePrev()` : Navigation carousel précédent
- `handleNext()` : Navigation carousel suivant
- `handleDismiss()` : Marquer comme lue + fermer
- `handleAction()` : Marquer comme lue + rediriger vers `action_url`

**Utilisation** :

```svelte
<script>
	import NotificationBanner from '$lib/components/notifications/NotificationBanner.svelte';
</script>

<NotificationBanner />
```

**Placement** : Généralement dans le layout principal pour visibilité globale.

---

### NotificationDropdown.svelte

Dropdown dans la sidebar affichant les notifications récentes.

**Emplacement** : `/src/lib/components/notifications/NotificationDropdown.svelte`

**Caractéristiques** :

- Icône cloche (Bell) avec badge de count
- Popover Shadcn-svelte (`Popover.Root`)
- Badge rouge avec nombre (max "9+")
- Liste scrollable (max 400px)
- Top 5 notifications affichées
- Lien "Voir toutes les notifications" si plus de 5
- Bouton "Tout marquer lu"
- Hover : Bouton "Lue" apparaît
- Click : Marque comme lue + redirige si `action_url`

**État interne** :

```typescript
let isOpen = $state(false); // État du popover
```

**Getters dérivés** :

```typescript
const notifications = $derived(notificationStore.getTopNotifications(5));
const unreadCount = $derived(notificationStore.unreadCount);
const hasNotifications = $derived(notifications.length > 0);
const hasMore = $derived(unreadCount > 5);
```

**Méthodes** :

- `handleMarkAsRead(id)` : Marquer une notification spécifique
- `handleMarkAllAsRead()` : Marquer toutes comme lues + fermer popover
- `handleNotificationClick(notification)` : Marquer comme lue + fermer + rediriger
- `handleViewAll()` : Fermer + rediriger vers `/dashboard/notifications`

**Utilisation** :

```svelte
<script>
	import NotificationDropdown from '$lib/components/notifications/NotificationDropdown.svelte';
</script>

<NotificationDropdown />
```

**Placement** : Dans la sidebar, à côté des autres icônes de navigation.

---

### Page `/dashboard/notifications`

Page complète listant toutes les notifications non lues.

**Emplacement** : `/src/routes/(protected)/dashboard/notifications/+page.svelte`

**Caractéristiques** :

- Titre + description
- Bouton "Tout marquer comme lu"
- Loading spinner
- Liste complète des notifications (pas de limite)
- Coloration par priorité
- HTML sanitisé (`sanitizeHtml()`)
- Bouton d'action intégré
- Hover : Bouton "Marquer comme lue"
- Empty state si aucune notification

**Lifecycle** :

```typescript
onMount(() => {
	notificationStore.fetchUnread(); // Charge les notifications
});
```

**Structure HTML** :

```svelte
<div class="space-y-6">
	<!-- Header -->
	<div class="flex items-center justify-between">
		<h1>Notifications</h1>
		<Button onclick={handleMarkAllAsRead}>Tout marquer comme lu</Button>
	</div>

	<!-- Loading -->
	{#if isLoading}
		<Spinner />
	{:else if hasNotifications}
		<!-- Liste -->
		{#each notifications as notification}
			<div class="rounded-lg border {priority - colors}">
				<!-- Notification content -->
			</div>
		{/each}
	{:else}
		<!-- Empty state -->
		<Bell /> Aucune notification
	{/if}
</div>
```

---

## Gestion d'état

### NotificationStore (Svelte 5 runes)

Store singleton pour gérer l'état client des notifications.

**Emplacement** : `/src/lib/stores/notifications.svelte.ts`

**État réactif** :

```typescript
class NotificationStore {
	unreadCount = $state(0);
	notifications = $state<NotificationWithDetails[]>([]);
	isLoading = $state(false);
	error = $state<string | null>(null);
}
```

**Méthodes publiques** :

#### `fetchUnread()`

Récupère toutes les notifications non lues depuis `/api/notifications/unread`.

```typescript
async fetchUnread(): Promise<void>
```

**Side effects** :

- `isLoading = true` au début
- Met à jour `notifications` et `unreadCount`
- Gère les erreurs → `error = "Erreur..."`
- `isLoading = false` à la fin

**Exemple** :

```typescript
await notificationStore.fetchUnread();
```

---

#### `fetchUnreadCount()`

Récupère uniquement le count depuis `/api/notifications/unread-count` (plus léger).

```typescript
async fetchUnreadCount(): Promise<void>
```

**Usage** : Pour mettre à jour le badge sans recharger toutes les notifications.

---

#### `markAsRead()`

Marque une notification comme lue avec mise à jour optimiste.

```typescript
async markAsRead(notificationId: string): Promise<boolean>
```

**Logique** :

1. Appel POST `/api/notifications/mark-read`
2. **Optimistic update** : Retire immédiatement de `notifications[]` et décrémente `unreadCount`
3. Si erreur : Rollback via `fetchUnread()`

**Retour** : `true` si succès, `false` si erreur.

---

#### `markAllAsRead()`

Marque toutes les notifications comme lues avec mise à jour optimiste.

```typescript
async markAllAsRead(): Promise<boolean>
```

**Logique** :

1. Appel POST `/api/notifications/mark-all-read`
2. **Optimistic update** : `notifications = []`, `unreadCount = 0`
3. Si erreur : Rollback via `fetchUnread()`

---

#### `reset()`

Réinitialise le store (utile lors de la déconnexion).

```typescript
reset(): void
```

---

**Getters dérivés** :

#### `sortedNotifications`

```typescript
get sortedNotifications(): NotificationWithDetails[]
```

Retourne les notifications triées (déjà triées par le serveur).

---

#### `getTopNotifications(limit = 5)`

```typescript
getTopNotifications(limit = 5): NotificationWithDetails[]
```

Retourne les N premières notifications pour bannière/dropdown.

---

#### `hasUrgentNotifications`

```typescript
get hasUrgentNotifications(): boolean
```

Vérifie s'il y a des notifications urgentes.

---

#### `urgentCount`

```typescript
get urgentCount(): number
```

Nombre de notifications urgentes.

---

**Singleton** :

```typescript
export const notificationStore = new NotificationStore();
```

**Usage** :

```svelte
<script>
	import { notificationStore } from '$lib/stores/notifications.svelte';

	const unreadCount = $derived(notificationStore.unreadCount);
	const notifications = $derived(notificationStore.notifications);
</script>

{#if unreadCount > 0}
	<span>{unreadCount} nouvelles notifications</span>
{/if}
```

---

## Types TypeScript

Tous dans `/src/lib/types/notification.ts`.

### Types de base (réexportés de `database.ts`)

```typescript
type NotificationType = 'info' | 'alert' | 'announcement' | 'reminder';
type NotificationPriority = 'normal' | 'important' | 'urgent';
type NotificationTargetType = 'all' | 'role' | 'classes' | 'users';
type SystemEventType =
	| 'assignment_created'
	| 'assessment_assigned'
	| 'resource_added'
	| 'reward_earned'
	| 'badge_unlocked'
	| 'maintenance_scheduled'
	| 'feature_released';
```

### Interfaces

#### `CreateNotificationData`

```typescript
interface CreateNotificationData {
	title: string;
	message: string; // HTML enrichi
	type: NotificationType;
	priority: NotificationPriority;
	action_label?: string;
	action_url?: string;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	expires_at?: string; // ISO date, défaut +30 jours
}
```

---

#### `CreateSystemNotificationData`

```typescript
interface CreateSystemNotificationData {
	title: string;
	message: string;
	type: NotificationType;
	priority: NotificationPriority;
	system_event_type: SystemEventType;
	target_type: NotificationTargetType;
	target_roles?: string[];
	target_class_ids?: string[];
	target_user_ids?: string[];
	action_label?: string;
	action_url?: string;
}
```

---

#### `NotificationWithDetails`

Notification enrichie avec info créateur et statut de lecture.

```typescript
interface NotificationWithDetails {
	id: string;
	created_at: string;
	created_by: string | null;
	title: string;
	message: string;
	type: NotificationType;
	priority: NotificationPriority;
	action_label: string | null;
	action_url: string | null;
	target_type: NotificationTargetType;
	expires_at: string;
	is_system: boolean;
	system_event_type: SystemEventType | null;

	// Champs enrichis
	creator?: {
		firstname: string | null;
		lastname: string | null;
		full_name?: string | null;
	};
	is_read: boolean;
	read_at?: string;
}
```

---

#### `NotificationStats`

Statistiques pour page de gestion.

```typescript
interface NotificationStats {
	id: string;
	title: string;
	created_at: string;
	type: NotificationType;
	priority: NotificationPriority;
	target_type: NotificationTargetType;
	target_summary: string; // "Classe 5A (24 élèves)"
	total_recipients: number;
	read_count: number;
	read_percentage: number; // (read_count / total) * 100
}
```

---

### Constantes

#### `NOTIFICATION_TYPE_ICONS`

```typescript
const NOTIFICATION_TYPE_ICONS: Record<NotificationType, string> = {
	info: '🔔',
	alert: '⚠️',
	announcement: '📢',
	reminder: '⏰'
};
```

---

#### `NOTIFICATION_PRIORITY_COLORS`

```typescript
const NOTIFICATION_PRIORITY_COLORS: Record<
	NotificationPriority,
	{ bg: string; border: string; text: string }
> = {
	urgent: {
		bg: 'bg-red-50 dark:bg-red-950',
		border: 'border-red-200 dark:border-red-800',
		text: 'text-red-900 dark:text-red-100'
	},
	important: {
		bg: 'bg-orange-50 dark:bg-orange-950',
		border: 'border-orange-200 dark:border-orange-800',
		text: 'text-orange-900 dark:text-orange-100'
	},
	normal: {
		bg: 'bg-blue-50 dark:bg-blue-950',
		border: 'border-blue-200 dark:border-blue-800',
		text: 'text-blue-900 dark:text-blue-100'
	}
};
```

---

#### `NOTIFICATION_TYPE_LABELS`

```typescript
const NOTIFICATION_TYPE_LABELS: Record<NotificationType, string> = {
	info: 'Information',
	alert: 'Alerte',
	announcement: 'Annonce',
	reminder: 'Rappel'
};
```

---

#### `NOTIFICATION_PRIORITY_LABELS`

```typescript
const NOTIFICATION_PRIORITY_LABELS: Record<NotificationPriority, string> = {
	normal: 'Normale',
	important: 'Importante',
	urgent: 'Urgente'
};
```

---

### Fonctions helpers

#### `formatCreatorName()`

Formate le nom du créateur de notification.

```typescript
function formatCreatorName(notification: NotificationWithDetails): string;
```

**Logique** :

- Si `is_system` → `"Système"`
- Si `firstname` + `lastname` → `"Prénom Nom"`
- Si `full_name` → `full_name`
- Sinon → `"Utilisateur"`

---

#### `getRelativeTime()`

Formate le temps relatif en français.

```typescript
function getRelativeTime(dateString: string): string;
```

**Exemples** :

- `< 1 min` → `"À l'instant"`
- `< 60 min` → `"Il y a 5 min"`
- `< 24h` → `"Il y a 3h"`
- `1 jour` → `"Hier"`
- `< 7 jours` → `"Il y a 3 jours"`
- `≥ 7 jours` → `"15 nov."`

---

## Permissions et sécurité

### Qui peut envoyer des notifications ?

| Rôle        | Restrictions                                    | Validation                               |
| ----------- | ----------------------------------------------- | ---------------------------------------- |
| **Student** | ❌ Aucun droit d'envoi                          | RLS refuse INSERT                        |
| **Teacher** | ✅ Peut envoyer à ses classes/élèves uniquement | `createNotification()` vérifie ownership |
| **Admin**   | ✅ Peut envoyer à tout le monde                 | Aucune restriction                       |
| **System**  | ✅ Bypass toutes les règles                     | `createSystemNotification()`             |

### À qui peut-on envoyer ?

#### Enseignants

**Autorisé** :

- ✅ `target_type = 'classes'` avec leurs propres classes
- ✅ `target_type = 'users'` avec leurs propres élèves

**Interdit** :

- ❌ `target_type = 'all'`
- ❌ `target_type = 'role'`
- ❌ Classes/élèves d'autres enseignants

**Validation** :

```typescript
// Validation côté serveur dans createNotification()
if (profile.role === 'teacher') {
	if (data.target_type === 'all' || data.target_type === 'roles') {
		return { success: false, error: '...' };
	}

	// Vérifie ownership des classes
	const { data: teacherClasses } = await supabase
		.from('class_members')
		.select('class_id')
		.eq('teacher_id', createdBy);

	const teacherClassIds = teacherClasses?.map((cm) => cm.class_id) || [];
	const invalidClasses = data.target_class_ids.filter((id) => !teacherClassIds.includes(id));

	if (invalidClasses.length > 0) {
		return { success: false, error: 'Vous ne pouvez cibler que vos propres classes' };
	}
}
```

#### Admins

**Autorisé** : Tout

**Validation** : Aucune restriction.

---

### Mesures de sécurité

#### ✅ Implémenté

1. **RLS Policies** : Toutes les opérations sont protégées par Row Level Security
2. **Validation Zod sur API** : Tous les endpoints API utilisent des schémas Zod
   - `markNotificationReadSchema` : Valide UUID
   - `unreadNotificationsCountResponseSchema` : Valide réponse
3. **Middleware auth** : `requireAuth()` sur tous les endpoints
4. **Permission checks** : `createNotification()` vérifie le rôle et ownership
5. **Soft delete** : Notifications marquées `deleted_at` au lieu de supprimées
6. **Expiration automatique** : Nettoyage des anciennes notifications
7. **HTML sanitization** : `sanitizeHtml()` utilisé sur affichage (⚠️ côté client uniquement)

#### ⚠️ Problèmes de sécurité

1. **Pas de rate limiting** : Risque de spam de notifications
2. **Validation manuelle sur formulaires** : Les formulaires de création ne valident PAS avec Zod (seulement vérifications manuelles)
3. **Pas de sanitization HTML côté serveur** : Les messages HTML ne sont pas nettoyés avant stockage → Risque XSS
4. **Pas de CRON secret** : L'endpoint `/api/notifications/cleanup` n'est pas protégé par secret

#### 🔴 Risques critiques

**XSS via message HTML** :

Un admin/teacher malveillant pourrait injecter du HTML/JavaScript :

```typescript
// ❌ DANGEREUX
await createNotification(
	supabase,
	{
		title: 'Test',
		message: '<script>alert("XSS")</script>', // ⚠️ Pas de validation
		type: 'info',
		priority: 'normal',
		target_type: 'all'
	},
	userId
);
```

**Spam de notifications** :

Aucune limite de fréquence → Un enseignant pourrait envoyer 1000 notifications par seconde.

---

## Guide d'intégration

### Comment ajouter des notifications depuis une feature

#### Étape 1 : Importer le helper approprié

```typescript
import { notifyNewAssessment } from '$lib/server/auto-notifications';
```

**Helpers disponibles** :

- `notifyNewAssignment()` - Nouveau devoir
- `notifyNewAssessment()` - Nouvelle évaluation ✅ ACTIF
- `notifyNewResource()` - Nouvelle ressource
- `notifyRewardEarned()` - Gidouilles gagnées
- `notifyVipCardEarned()` - Carte VIP obtenue
- `notifyBadgeUnlocked()` - Badge débloqué
- `notifyMaintenance()` - Maintenance programmée
- `notifyFeatureRelease()` - Nouvelle fonctionnalité

#### Étape 2 : Appeler après votre action métier

```typescript
// Exemple : Après avoir assigné une évaluation
export const POST: RequestHandler = async ({ locals, params, request }) => {
	const { user, profile } = await requireRole(locals, 'teacher');

	// 1. Logique métier (assigner l'évaluation)
	const result = await assignAssessment(locals.supabase, data, user.id);

	if (result.error) {
		throw error(500, 'Failed to assign assessment');
	}

	// 2. Récupérer les infos pour la notification
	const { data: assessment } = await getAssessment(locals.supabase, assessmentId);

	// 3. Envoyer la notification
	if (assessment) {
		const teacherName = `${profile.firstname} ${profile.lastname}` || 'Votre professeur';

		await notifyNewAssessment(locals.supabase, {
			assessmentId: assessment.id,
			assessmentTitle: assessment.title,
			teacherName,
			classIds: data.class_ids,
			studentIds: data.student_ids
		});
	}

	return json({ success: true });
};
```

#### Étape 3 : Tester

1. Déclencher l'action (ex: assigner une évaluation)
2. Vérifier que la notification apparaît dans :
   - NotificationBanner (si dans le top 5)
   - NotificationDropdown (icône cloche)
   - `/dashboard/notifications`
3. Vérifier le ciblage (seuls les utilisateurs ciblés voient la notification)

---

### Créer un nouveau helper personnalisé

Si aucun helper n'existe pour votre cas :

#### 1. Ajouter dans `/src/lib/server/auto-notifications.ts`

```typescript
/**
 * Create notification when a student submits homework
 */
export async function notifyHomeworkSubmitted(
	supabase: SupabaseClientType,
	data: {
		homeworkTitle: string;
		studentName: string;
		teacherId: string;
	}
): Promise<void> {
	try {
		await createSystemNotification(supabase, {
			title: 'Devoir rendu',
			message: `<p><strong>${data.studentName}</strong> a rendu son devoir : <strong>${data.homeworkTitle}</strong></p>`,
			type: 'info',
			priority: 'normal',
			system_event_type: 'assignment_created', // Ou créer un nouveau type
			target_type: 'users',
			target_user_ids: [data.teacherId],
			action_label: 'Voir le devoir',
			action_url: `/dashboard/teacher/homeworks/${data.homeworkId}`
		});
	} catch (error) {
		console.error('Error creating homework notification:', error);
		// Don't throw - notification failure shouldn't break the submission
	}
}
```

#### 2. Ajouter le `system_event_type` si nécessaire

Dans `/src/lib/types/database.ts` (si besoin d'un nouveau type) :

```typescript
type SystemEventType =
	| 'assignment_created'
	| 'assessment_assigned'
	| 'resource_added'
	| 'reward_earned'
	| 'badge_unlocked'
	| 'maintenance_scheduled'
	| 'feature_released'
	| 'homework_submitted'; // 🆕 Nouveau type
```

#### 3. Intégrer dans votre code

```typescript
import { notifyHomeworkSubmitted } from '$lib/server/auto-notifications';

// Après la soumission du devoir
await notifyHomeworkSubmitted(supabase, {
	homeworkTitle: 'Exercices Chapitre 3',
	studentName: 'Jean Dupont',
	teacherId: 'uuid-teacher'
});
```

---

### Intégrations actuelles

| Feature         | Helper utilisé          | Status     | Fichier                                   |
| --------------- | ----------------------- | ---------- | ----------------------------------------- |
| Évaluations     | `notifyNewAssessment()` | ✅ Actif   | `/api/assessments/[id]/assign/+server.ts` |
| Erreurs système | Notification manuelle   | ✅ Actif   | Error monitoring                          |
| Devoirs         | `notifyNewAssignment()` | 📦 Préparé | -                                         |
| Ressources      | `notifyNewResource()`   | 📦 Préparé | -                                         |
| Récompenses     | `notifyRewardEarned()`  | 📦 Préparé | -                                         |
| Cartes VIP      | `notifyVipCardEarned()` | 📦 Préparé | -                                         |
| Badges          | `notifyBadgeUnlocked()` | 📦 Préparé | -                                         |

---

## UX et design

### 3 modes d'affichage

#### 1. Bannière sticky (NotificationBanner)

**Visibilité** : Haute (sticky top, impossible à manquer)
**Interruption** : Moyenne (peut être fermée)
**Usage** : Notifications importantes/urgentes nécessitant une action

**Avantages** :

- ✅ Impossible à manquer
- ✅ Carousel pour naviguer entre notifications
- ✅ Action directe (bouton CTA)

**Inconvénients** :

- ❌ Prend de l'espace vertical
- ❌ Peut être perturbant pendant travail

---

#### 2. Dropdown sidebar (NotificationDropdown)

**Visibilité** : Moyenne (badge visible, contenu masqué)
**Interruption** : Faible (utilisateur choisit d'ouvrir)
**Usage** : Consultation rapide des notifications

**Avantages** :

- ✅ Non intrusif
- ✅ Badge indique le nombre
- ✅ Accès rapide sans navigation

**Inconvénients** :

- ❌ Limité à 5 notifications
- ❌ Nécessite un clic pour voir

---

#### 3. Page complète (/dashboard/notifications)

**Visibilité** : Faible (nécessite navigation)
**Interruption** : Nulle
**Usage** : Consultation exhaustive, gestion

**Avantages** :

- ✅ Toutes les notifications visibles
- ✅ Plus d'espace pour le contenu
- ✅ Pas de limite

**Inconvénients** :

- ❌ Nécessite navigation explicite
- ❌ Pas de rappel visuel

---

### Coloration par priorité

| Priorité      | Couleur | Classes Tailwind                                 | Usage                                    |
| ------------- | ------- | ------------------------------------------------ | ---------------------------------------- |
| **Urgent**    | Rouge   | `bg-red-50 border-red-200 text-red-900`          | Alertes critiques, maintenance imminente |
| **Important** | Orange  | `bg-orange-50 border-orange-200 text-orange-900` | Nouvelle évaluation, rappels importants  |
| **Normal**    | Bleu    | `bg-blue-50 border-blue-200 text-blue-900`       | Info générale, nouvelles ressources      |

**Dark mode** : Variantes `-950/-800/-100` appliquées automatiquement.

---

### Icônes de type

| Type           | Emoji | Signification         |
| -------------- | ----- | --------------------- |
| `info`         | 🔔    | Information générale  |
| `alert`        | ⚠️    | Alerte/avertissement  |
| `announcement` | 📢    | Annonce/communication |
| `reminder`     | ⏰    | Rappel                |

---

### Animations et transitions

**Carousel** :

- Pas d'animation automatique (manuel uniquement via chevrons)
- Transition instantanée entre notifications

**Dropdown** :

- Popover Shadcn-svelte avec animation d'ouverture
- Badge apparaît/disparaît avec transition

**Hover states** :

- Bouton "Lue" : `opacity-0 → opacity-100` au hover
- Carte notification : `hover:shadow-md` transition

**Loading** :

- Spinner avec `animate-spin` pendant `fetchUnread()`

---

### Interactions utilisateur

#### Marquer comme lue

**Options** :

1. Clic sur notification → Marque comme lue + redirige si `action_url`
2. Bouton "Marquer comme lue" (hover) → Marque sans redirection
3. Bouton X (bannière) → Marque comme lue + ferme bannière
4. Bouton "Tout marquer lu" → Marque toutes les notifications

**Feedback** :

- Optimistic update : Notification disparaît immédiatement
- Si erreur : Rollback + refetch

---

#### Navigation avec action

Si `action_label` et `action_url` présents :

1. Bouton CTA affiché (`action_label`)
2. Clic → Marque comme lue + `goto(action_url)`

**Exemples** :

- "Voir l'évaluation" → `/dashboard/student/assessments`
- "Voir le devoir" → `/dashboard/student/devoirs/123`
- "Voir mes cartes" → `/dashboard/student/vip-cards`

---

### Support dark mode

Toutes les couleurs utilisent les variantes dark de Tailwind :

```typescript
bg: 'bg-blue-50 dark:bg-blue-950';
border: 'border-blue-200 dark:border-blue-800';
text: 'text-blue-900 dark:text-blue-100';
```

**Contraste** : Vérifié pour accessibilité WCAG AA.

---

## Limitation de débit (Rate Limiting)

### Vue d'ensemble

Le système de notifications implémente une limitation de débit (rate limiting) robuste pour prévenir les abus et le spam. La limite est basée sur une base de données Supabase avec stratégie fail-open pour garantir la disponibilité.

**Date d'implémentation** : 2025-11-10
**Dernière mise à jour** : 2025-11-10 (Security fixes: delete rate limiting + race condition)
**Status** : Production-ready (65/65 tests passing)

### Configuration des limites

| Action                       | Limite           | Fenêtre    | Rôle      |
| ---------------------------- | ---------------- | ---------- | --------- |
| **Création de notification** | 10 notifications | 1 heure    | Teacher   |
| **Création de notification** | 50 notifications | 1 heure    | Admin     |
| **Marquage lecture**         | 30 actions       | 15 minutes | All users |
| **Suppression**              | 20 suppressions  | 1 heure    | Teacher   |
| **Suppression**              | 100 suppressions | 1 heure    | Admin     |

### Endpoints protégés

#### API Endpoints

1. **POST `/api/notifications/mark-read`**
   - Limite : 30 actions / 15 minutes
   - Fonction : `checkNotificationMarkRateLimit(userId)`
   - Message d'erreur : "Trop de requêtes de marquage. Veuillez patienter quelques instants."

2. **POST `/api/notifications/mark-all-read`**
   - Limite : 30 actions / 15 minutes
   - Fonction : `checkNotificationMarkRateLimit(userId)`
   - Message d'erreur : "Trop de requêtes de marquage. Veuillez patienter quelques instants."

#### Form Actions

3. **Teacher Create Action** (`/dashboard/teacher/notifications`)
   - Limite : 10 notifications / heure
   - Fonction : `checkNotificationCreateRateLimit(userId, 'teacher')`
   - Message d'erreur : "Vous avez atteint la limite de création de notifications. Veuillez réessayer plus tard."

4. **Admin Create Action** (`/dashboard/admin/notifications`)
   - Limite : 50 notifications / heure
   - Fonction : `checkNotificationCreateRateLimit(userId, 'admin')`
   - Message d'erreur : "Vous avez atteint la limite de création de notifications. Veuillez réessayer plus tard."

5. **Teacher Delete Action** (`/dashboard/teacher/notifications`)
   - Limite : 20 suppressions / heure
   - Fonction : `checkNotificationDeleteRateLimit(userId, 'teacher')`
   - Message d'erreur : "Vous avez atteint la limite de suppression de notifications. Veuillez réessayer plus tard."

6. **Admin Delete Action** (`/dashboard/admin/notifications`)
   - Limite : 100 suppressions / heure
   - Fonction : `checkNotificationDeleteRateLimit(userId, 'admin')`
   - Message d'erreur : "Vous avez atteint la limite de suppression de notifications. Veuillez réessayer plus tard."

### Architecture

#### Database-Backed Implementation

**Stockage** : Table `rate_limits` dans Supabase

```sql
CREATE TABLE rate_limits (
  key TEXT PRIMARY KEY,
  count INTEGER NOT NULL DEFAULT 0,
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
```

**Avantages** :

- ✅ Transactionnel (garanties ACID de Postgres)
- ✅ Pas de dépendance externe (pas de Redis requis)
- ✅ Nettoyage automatique via fonction database
- ✅ Idéal pour déploiements single-instance

**Fail-Open Strategy** :

- En cas d'erreur database, les requêtes sont **autorisées** (fail-open)
- Prévient les DoS si la database est indisponible
- Logs d'erreur pour monitoring

**Race Condition Protection** : 🆕 2025-11-10

Le rate limiter utilise des opérations atomiques pour prévenir les race conditions lors de requêtes concurrentes :

```typescript
// ✅ Atomic UPDATE operation (thread-safe)
const { data, error } = await supabase
	.from('rate_limits')
	.update({ count: sql`count + 1` })
	.eq('key', key)
	.lt('count', maxRequests)
	.gt('expires_at', new Date().toISOString())
	.select('count')
	.single();

// Si data === null, la limite est atteinte ou expirée
if (!data) {
	return { allowed: false, ... };
}
```

**Avantages** :

- ✅ **Thread-safe** : PostgreSQL garantit l'atomicité au niveau de la ligne
- ✅ **Prévient overflow** : `UPDATE ... WHERE count < max` garantit que count ne dépasse jamais la limite
- ✅ **Zero downtime** : Pas de migration requise, changement transparent
- ✅ **Performance** : Une seule requête database au lieu de read-then-write

**Pattern technique** :

- Utilise `UPDATE ... WHERE count < max AND expires_at > NOW() RETURNING count`
- Si aucune ligne n'est retournée (`data === null`), la limite est atteinte
- Évite le pattern read-then-write qui est vulnérable aux race conditions

#### Service Role Client

Le rate limiter utilise un client singleton avec service role pour :

- Bypass RLS (la table `rate_limits` nécessite `service_role`)
- Réutiliser les connexions HTTP (amélioration performance)
- Prévenir l'épuisement du pool de connexions

```typescript
// Singleton pattern avec HMR safety
const serviceRoleClientInstance = getServiceRoleClient();
```

### Implémentation

#### Exemple 1 : Rate Limiting sur API Endpoint

```typescript
// src/routes/api/notifications/mark-read/+server.ts
import { checkNotificationMarkRateLimit } from '$lib/server/rateLimiter';

export const POST: RequestHandler = async ({ request, locals }) => {
	const { user } = await requireAuth(locals);

	// ====================================================================
	// SECURITY: Rate Limiting
	// ====================================================================
	const rateLimitResult = await checkNotificationMarkRateLimit(user.id);
	if (!rateLimitResult.allowed) {
		return json(
			{ error: rateLimitResult.message },
			{
				status: 429,
				headers: {
					'Retry-After': rateLimitResult.retryAfter?.toString() || '900'
				}
			}
		);
	}

	// Proceed with business logic...
};
```

#### Exemple 2 : Rate Limiting sur Form Action (Create)

```typescript
// src/routes/(protected)/dashboard/teacher/notifications/+page.server.ts
import { checkNotificationCreateRateLimit } from '$lib/server/rateLimiter';

export const actions: Actions = {
	create: async ({ request, locals: { user } }) => {
		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationCreateRateLimit(user.id, 'teacher');
		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// Proceed with notification creation...
	}
};
```

#### Exemple 3 : Rate Limiting sur Form Action (Delete) 🆕 2025-11-10

```typescript
// src/routes/(protected)/dashboard/teacher/notifications/+page.server.ts
import { checkNotificationDeleteRateLimit } from '$lib/server/rateLimiter';

export const actions: Actions = {
	delete: async ({ request, locals: { user } }) => {
		// ====================================================================
		// SECURITY: Rate Limiting
		// ====================================================================
		const rateLimitResult = await checkNotificationDeleteRateLimit(user.id, 'teacher');
		if (!rateLimitResult.allowed) {
			return fail(429, { error: rateLimitResult.message });
		}

		// ====================================================================
		// SECURITY: Input Validation
		// ====================================================================
		const formData = await request.formData();
		const validation = deleteNotificationSchema.safeParse({
			notificationId: formData.get('notificationId')
		});

		if (!validation.success) {
			return fail(400, { error: validation.error.issues[0].message });
		}

		// Proceed with notification deletion...
	}
};
```

### Validation d'entrée avec Zod

Tous les endpoints protégés par rate limiting utilisent également des schémas Zod pour valider les entrées.

#### Schémas disponibles

**`markNotificationReadSchema`** : Valide le marquage d'une notification

```typescript
// src/lib/server/validation/notifications.ts
export const markNotificationReadSchema = z.object({
	notificationId: uuidSchema
});

// Usage
const validation = markNotificationReadSchema.safeParse(body);
if (!validation.success) {
	throw error(400, validation.error.issues[0].message);
}
```

**`markAllReadSchema`** : Valide le marquage de toutes les notifications

```typescript
export const markAllReadSchema = z.object({});
// No body required - uses session user ID
```

**`deleteNotificationSchema`** : Valide la suppression d'une notification

```typescript
export const deleteNotificationSchema = z.object({
	notificationId: uuidSchema
});
```

**`createNotificationSchema`** : Valide la création d'une notification

```typescript
export const createNotificationSchema = z.object({
	title: z.string().min(1).max(200),
	message: z.string().min(1).max(5000),
	type: z.enum(['info', 'alert', 'announcement', 'reminder']),
	priority: z.enum(['normal', 'important', 'urgent']),
	targetType: z.enum(['all', 'role', 'classes', 'users']),
	actionLabel: z.string().max(100).optional(),
	actionUrl: z.string().url().max(500).optional(),
	classIds: z.array(z.string().uuid()).optional(),
	userIds: z.array(z.string().uuid()).optional()
});
```

### Tests

**Couverture** : 65 tests (100% passing) 🆕 2025-11-10

**Augmentation** : +23 tests (42 → 65) pour sécurité et race conditions

#### Tests de limite teacher (6 tests)

- ✅ Permet 10 notifications par heure
- ✅ Bloque après 10 notifications
- ✅ Fournit message d'erreur + retryAfter
- ✅ Isole les limites par utilisateur
- ✅ Réinitialise après expiration
- ✅ Gère missing userId (fail-open)

#### Tests de limite admin (3 tests)

- ✅ Permet 50 notifications par heure
- ✅ Bloque après 50 notifications
- ✅ Admins ont limite plus élevée que teachers

#### Tests de marquage lecture (4 tests)

- ✅ Permet 30 actions / 15 minutes
- ✅ Bloque après 30 actions
- ✅ Fournit message d'erreur + retryAfter
- ✅ Isole les limites par utilisateur

#### Tests de suppression (17 tests) 🆕 2025-11-10

##### Tests de limite teacher (6 tests)

- ✅ Permet 20 suppressions par heure
- ✅ Bloque après 20 suppressions
- ✅ Fournit message d'erreur + retryAfter
- ✅ Isole les limites par utilisateur
- ✅ Réinitialise après expiration
- ✅ Gère missing userId (fail-open)

##### Tests de limite admin (5 tests)

- ✅ Permet 100 suppressions par heure
- ✅ Bloque après 100 suppressions
- ✅ Admins ont limite plus élevée que teachers
- ✅ Isole les limites par utilisateur
- ✅ Réinitialise après expiration

##### Tests de validation Zod (3 tests)

- ✅ Valide UUID du notificationId
- ✅ Rejette ID invalide avec message d'erreur
- ✅ Rejette ID manquant

##### Tests d'intégration (3 tests)

- ✅ Rate limiting + validation Zod combinés
- ✅ Ordre d'exécution correct (rate limit → validation)
- ✅ Messages d'erreur appropriés pour chaque cas

#### Tests de race condition (6 tests) 🆕 2025-11-10

- ✅ Opération atomique UPDATE thread-safe
- ✅ Prévient overflow avec count < max
- ✅ Requêtes concurrentes respectent la limite
- ✅ Une seule requête database par appel
- ✅ Retourne null si limite atteinte
- ✅ Gère expiration correctement

#### Tests de rôles (3 tests)

- ✅ Applique limites différentes selon rôle
- ✅ Suit limites indépendamment par utilisateur
- ✅ Défaut à limite teacher pour rôles invalides

**Exécuter les tests** :

```bash
pnpm test:unit src/lib/server/rateLimiter.test.ts
```

### Considérations de sécurité

#### ✅ Implémenté

1. **Rate limiting sur API** : Tous les endpoints sensibles protégés
2. **Rate limiting sur formulaires** : Actions teacher/admin protégées (create + delete)
3. **Validation Zod** : Toutes les entrées validées
4. **Limites par rôle** : Admins ont limite plus élevée (50 vs 10 create, 100 vs 20 delete)
5. **Fail-open** : Disponibilité garantie même si DB down
6. **Logging** : Tentatives de dépassement loggées
7. **Retry-After header** : Client informé du temps d'attente
8. **Race condition protection** : Opérations atomiques UPDATE pour thread-safety 🆕 2025-11-10
9. **Delete rate limiting** : Actions de suppression protégées contre spam 🆕 2025-11-10

#### ✅ Problèmes de sécurité résolus (2025-11-10)

##### ~~Issue #15 : Delete action non rate limited~~ ✅ RÉSOLU

**Date de résolution** : 2025-11-10

**Implémentation** :

- ✅ Fonction `checkNotificationDeleteRateLimit()` créée
- ✅ Appliquée aux pages teacher et admin notifications
- ✅ Limites : Teacher 20/h, Admin 100/h
- ✅ 17 tests complets (100% passing)

**Commit** : `b4fa6c2` - fix(security): complete notification rate limiting security audit fixes

##### ~~Issue #16 : Race condition sur requêtes concurrentes~~ ✅ RÉSOLU

**Date de résolution** : 2025-11-10

**Implémentation** :

- ✅ Refactorisé `checkRateLimit()` avec opérations atomiques
- ✅ Pattern `UPDATE ... WHERE count < max AND expires_at > NOW()`
- ✅ PostgreSQL row-level locking garantit thread-safety
- ✅ 6 tests de race condition (100% passing)
- ✅ Zero downtime (pas de migration requise)

**Commit** : `b4fa6c2` - fix(security): complete notification rate limiting security audit fixes

### Exemples d'utilisation

#### Exemple 1 : Afficher message d'erreur à l'utilisateur

```svelte
<!-- Teacher notification form -->
<script>
	let errorMessage = $state<string | null>(null);

	async function handleSubmit() {
		const response = await fetch('/dashboard/teacher/notifications', {
			method: 'POST',
			body: formData
		});

		if (response.status === 429) {
			const data = await response.json();
			errorMessage = data.error;
			// "Vous avez atteint la limite de création de notifications. Veuillez réessayer plus tard."
		}
	}
</script>

{#if errorMessage}
	<Alert variant="destructive">{errorMessage}</Alert>
{/if}
```

#### Exemple 2 : Afficher countdown de retry

```typescript
// Client-side countdown
const rateLimitResult = await checkNotificationCreateRateLimit(userId, 'teacher');
if (!rateLimitResult.allowed && rateLimitResult.retryAfter) {
	const retryAt = new Date(Date.now() + rateLimitResult.retryAfter * 1000);
	showCountdown(retryAt); // Afficher "Réessayez dans 45 minutes"
}
```

#### Exemple 3 : Logs de monitoring

```typescript
// Rate limiter logs automatically
if (!result.allowed) {
	logger.warn('Notification creation rate limit exceeded', {
		userId: maskKey(key), // "a1b2***" (PII masked)
		role,
		maxAttempts
	});
}
```

### Bonnes pratiques

1. **Toujours vérifier rate limit AVANT validation Zod**
   - Rate limiting est plus rapide que parsing/validation
   - Économise ressources CPU si rate limited

2. **Retourner 429 avec Retry-After header**
   - Standard HTTP pour rate limiting
   - Clients peuvent implémenter retry automatique

3. **Logger les dépassements**
   - Permet monitoring des abus potentiels
   - Masquer PII avec `maskKey()`

4. **Fail-open pour disponibilité**
   - Ne jamais bloquer si database indisponible
   - Logs d'erreur pour investigation

5. **Tester avec utilisateurs réels**
   - Vérifier que limites ne bloquent pas usage légitime
   - Ajuster si nécessaire

### Migration de Redis vers Database

**Historique** : Précédemment implémenté avec Redis (compteurs atomiques)

**Raison du changement** :

- Simplification de l'architecture (pas de Redis externe)
- Meilleure fiabilité pour déploiement single-instance
- Garanties transactionnelles de Postgres

**Compatibilité** : Aucune migration de données requise (rate limits sont éphémères)

---

## Problèmes connus

### 🔴 Critique (Sécurité)

#### 1. ✅ RÉSOLU : Rate limiting implémenté

**Status** : Production-ready (2025-11-10)

**Implémentation** :

- ✅ Rate limiting sur API endpoints
- ✅ Rate limiting sur form actions
- ✅ Validation Zod sur toutes les entrées
- ✅ Limites par rôle (teacher: 10/h, admin: 50/h)
- ✅ 42 tests (100% passing)

**Voir** : [Section Rate Limiting](#limitation-de-débit-rate-limiting) ci-dessus

---

#### 2. ✅ RÉSOLU : Validation Zod sur formulaires

**Status** : Production-ready (2025-11-10)

**Implémentation** : Tous les formulaires de création de notifications utilisent maintenant des schémas Zod :

- ✅ `createNotificationSchema` pour création
- ✅ `deleteNotificationSchema` pour suppression
- ✅ Validation côté serveur dans les form actions
- ✅ Messages d'erreur français descriptifs

**Voir** : [Section Validation avec Zod](#validation-dentrée-avec-zod) ci-dessus

---

#### 3. Pas de sanitization HTML côté serveur

**Risque** : XSS si un admin/teacher injecte du JavaScript dans `message`.

**Impact** :

- Exécution de code malveillant
- Vol de sessions
- Phishing

**État actuel** :

- ✅ `sanitizeHtml()` utilisé côté client (affichage)
- ❌ **Aucune** sanitization avant stockage database

**Solution recommandée** :

```typescript
import DOMPurify from 'isomorphic-dompurify'; // Version Node.js

export async function createNotification(...) {
  // Sanitize avant stockage
  const cleanMessage = DOMPurify.sanitize(data.message, {
    ALLOWED_TAGS: ['p', 'strong', 'em', 'br', 'ul', 'ol', 'li'],
    ALLOWED_ATTR: []
  });

  await supabase.from('notifications').insert({
    ...data,
    message: cleanMessage // ✅ HTML nettoyé
  });
}
```

---

### 🟠 Haute (Performance & UX)

#### 4. Pas de mises à jour en temps réel

**Problème** : Les notifications ne se rafraîchissent que manuellement.

**Impact** :

- Utilisateur ne voit pas les nouvelles notifications sans refresh
- Mauvaise UX (délai de notification)

**Architecture actuelle** :

> Note: Manual refresh only - no automatic polling (architecture simplified 2025-10-30)

**Solution recommandée** :

```typescript
// Utiliser Supabase Realtime
import { notificationStore } from '$lib/stores/notifications.svelte';

const channel = supabase
	.channel('notifications')
	.on(
		'postgres_changes',
		{
			event: 'INSERT',
			schema: 'public',
			table: 'notifications',
			filter: `user_id=eq.${userId}` // Filtre par ciblage
		},
		(payload) => {
			notificationStore.fetchUnread(); // Rafraîchir automatiquement
		}
	)
	.subscribe();
```

---

#### 5. Pas de pagination

**Problème** : `getUnreadNotifications()` charge TOUTES les notifications non lues.

**Impact** :

- Si 100+ notifications non lues → Requête lente
- Surcharge mémoire côté client
- Mauvaise performance

**Solution recommandée** :

```typescript
// API avec pagination
export async function getUnreadNotifications(
	supabase: SupabaseClient,
	userId: string,
	options: { limit?: number; offset?: number } = {}
): Promise<{ notifications: NotificationWithDetails[]; total: number }> {
	const { limit = 20, offset = 0 } = options;

	// Récupérer avec limite
	const { data: notifications, count } = await supabase
		.from('notifications')
		.select('*', { count: 'exact' })
		// ... filtres ...
		.range(offset, offset + limit - 1);

	return {
		notifications: processNotifications(notifications),
		total: count || 0
	};
}
```

---

#### 6. Pas d'historique de notifications

**Problème** : Seules les notifications non lues sont affichées. Pas d'accès aux notifications lues.

**Impact** :

- Impossible de consulter l'historique
- Perte d'information si marquée lue par erreur

**Solution recommandée** :

Ajouter une fonction `getAllNotifications()` avec filtre read/unread :

```typescript
export async function getAllNotifications(
	supabase: SupabaseClient,
	userId: string,
	filter: 'all' | 'read' | 'unread' = 'all'
): Promise<NotificationWithDetails[]>;
```

---

#### 7. Pas de préférences utilisateur

**Problème** : Impossible de désactiver certains types de notifications.

**Impact** :

- Spam de notifications non désirées
- Mauvaise UX

**Solution recommandée** :

Ajouter table `notification_preferences` :

```sql
CREATE TABLE notification_preferences (
  user_id UUID PRIMARY KEY REFERENCES profiles(id),
  email_enabled BOOLEAN DEFAULT true,
  push_enabled BOOLEAN DEFAULT true,
  disabled_types TEXT[] DEFAULT '{}', -- ['reminder', 'info']
  disabled_events TEXT[] DEFAULT '{}' -- ['resource_added']
);
```

---

### 🟡 Moyenne (Fonctionnalités manquantes)

#### 8. Pas de "mark as unread"

**Impact** : Si marquée lue par erreur, impossible de revenir en arrière.

---

#### 9. Filtrage/tri limité

**Problème** : Impossible de filtrer par type, priorité, ou date.

**Impact** : Recherche difficile dans une longue liste.

---

#### 10. Pas d'actions en masse

**Problème** : Seulement "Tout marquer lu". Pas de "Supprimer toutes", "Marquer sélection", etc.

---

#### 11. Bannière peut être perturbante

**Problème** : Prend de l'espace vertical en permanence.

**Solution** : Option de minimisation ou masquage temporaire.

---

### 🔵 Basse (Polish)

#### 12. Pas de transitions de carousel

**Problème** : Changement de notification instantané (pas fluide).

---

#### 13. Pas de navigation clavier

**Problème** : Impossible de naviguer avec Tab/Enter.

**Impact** : Accessibilité réduite.

---

#### 14. Limites hard-codées

**Problème** : `MAX_NOTIFICATIONS = 5` hard-codé dans les composants.

**Solution** : Extraire en config.

---

#### ~~15. Delete action non rate limited (Medium)~~ ✅ RÉSOLU (2025-11-10)

**Status** : Production-ready

**Problème original** : L'action de suppression de notification n'était PAS rate limited.

**Solution implémentée** :

- ✅ `checkNotificationDeleteRateLimit()` créée et appliquée
- ✅ Limites : Teacher 20/h, Admin 100/h
- ✅ 17 tests complets (100% passing)

**Voir** : [Problèmes de sécurité résolus](#problèmes-de-sécurité-résolus-2025-11-10)

---

#### ~~16. Race condition sur requêtes concurrentes (Medium)~~ ✅ RÉSOLU (2025-11-10)

**Status** : Production-ready

**Problème original** : Requêtes simultanées pouvaient contourner la limite de rate limiting.

**Solution implémentée** :

- ✅ Opérations atomiques UPDATE avec `WHERE count < max`
- ✅ PostgreSQL row-level locking garantit thread-safety
- ✅ 6 tests de race condition (100% passing)

**Voir** : [Race Condition Protection](#race-condition-protection)

---

## Roadmap

### ✅ Phase 1 : Sécurité critique (TERMINÉE - 2025-11-10)

**Objectif** : Éliminer les risques de sécurité.

1. ✅ **Rate limiting sur API** (TERMINÉ)
   - Database-backed rate limiting (Supabase)
   - Limites par endpoint :
     - Teacher create : 10/heure
     - Admin create : 50/heure
     - Mark-read : 30/15min
   - 42 tests (100% passing)

2. ✅ **Validation Zod sur formulaires** (TERMINÉ)
   - `createNotificationSchema` implémenté
   - `deleteNotificationSchema` implémenté
   - Validation côté serveur dans form actions
   - Messages d'erreur français

3. ⚠️ **Sanitization HTML côté serveur** (NON TERMINÉ)
   - Toujours nécessaire pour prévention XSS
   - Recommandation : `isomorphic-dompurify`
   - Whitelist tags : `<p> <strong> <em> <br> <ul> <ol> <li>`

4. ⚠️ **CRON secret pour cleanup** (NON TERMINÉ)
   - Endpoint `/api/notifications/cleanup` non protégé
   - Recommandation : Ajouter `CRON_SECRET` verification

**Status** : Sécurité significativement améliorée (2/4 critiques résolus)

---

### ✅ Phase 1.1 : Issues de sécurité restantes (PARTIELLEMENT TERMINÉE - 2025-11-10)

**Objectif** : Compléter les tâches de sécurité restantes.

1. ⚠️ **Sanitization HTML côté serveur** (NON TERMINÉ)
   - Installer `isomorphic-dompurify`
   - Sanitizer avant stockage dans `createNotification()`
   - Whitelist tags : `<p> <strong> <em> <br> <ul> <ol> <li>`
   - **Priorité** : Haute (XSS prevention)

2. ⚠️ **CRON secret pour cleanup** (NON TERMINÉ)
   - Ajouter variable `CRON_SECRET`
   - Vérifier header `Authorization: Bearer ${CRON_SECRET}`
   - **Priorité** : Moyenne (nécessite accès serveur)

3. ✅ **Rate limiting sur delete action** (TERMINÉ - 2025-11-10)
   - ✅ Fonction `checkNotificationDeleteRateLimit()` créée
   - ✅ Appliquée aux pages teacher et admin notifications
   - ✅ Limites : Teacher 20/h, Admin 100/h
   - ✅ 17 tests complets (100% passing)
   - **Commit** : `b4fa6c2`

4. ✅ **Fix race condition** (TERMINÉ - 2025-11-10)
   - ✅ Refactorisé `checkRateLimit()` avec opérations atomiques
   - ✅ Pattern `UPDATE ... WHERE count < max AND expires_at > NOW()`
   - ✅ PostgreSQL row-level locking garantit thread-safety
   - ✅ 6 tests de race condition (100% passing)
   - ✅ Zero downtime (pas de migration requise)
   - **Commit** : `b4fa6c2`

**Durée totale** : 1.5 jours restants (2/4 tâches complètes)

**Status** : 2 medium-priority security issues résolus, 2 restants (haute priorité)

---

### 🟠 Phase 2 : Performance & UX (Priorité 2)

**Objectif** : Améliorer performance et expérience utilisateur.

5. **Pagination API** (2 jours)
   - Modifier `getUnreadNotifications()` pour supporter limit/offset
   - Ajouter paramètres query `?limit=20&offset=0`
   - Modifier composants pour charger par pages

6. **Mises à jour en temps réel** (3 jours)
   - Implémenter Supabase Realtime subscription
   - Auto-refresh sur INSERT de notification
   - Gérer reconnexion et sync

7. **Historique de notifications** (2 jours)
   - Ajouter fonction `getAllNotifications(filter)`
   - Nouvel onglet "Historique" dans page notifications
   - Filtres : Toutes / Non lues / Lues

8. **Préférences utilisateur** (3 jours)
   - Table `notification_preferences`
   - Page paramètres pour désactiver types/events
   - Filtrage dans `getUnreadNotifications()`

**Durée totale** : ~10 jours

---

### 🟡 Phase 3 : Fonctionnalités avancées (Priorité 3)

**Objectif** : Enrichir les capacités du système.

9. **Mark as unread** (1 jour)
   - DELETE sur `notification_reads`
   - Bouton "Marquer comme non lue"

10. **Filtrage et tri avancés** (2 jours)
    - Filtres : Type, Priorité, Date, Créateur
    - Tri : Date, Priorité, Créateur
    - UI avec dropdowns de filtrage

11. **Actions en masse** (2 jours)
    - Checkboxes pour sélection multiple
    - Actions : Marquer lu, Supprimer, etc.

12. **Templates de notifications** (3 jours)
    - Table `notification_templates`
    - UI pour créer/gérer templates
    - Utilisation dans formulaire de création

13. **Notifications planifiées** (3 jours)
    - Champ `scheduled_at` dans table
    - Cron job pour envoi différé
    - UI pour planification

**Durée totale** : ~11 jours

---

### 🔵 Phase 4 : Canaux multiples (Priorité 4)

**Objectif** : Étendre au-delà de l'in-app.

14. **Notifications email** (5 jours)
    - Intégration SendGrid/Resend
    - Templates email
    - Préférences email par type

15. **Push notifications** (7 jours)
    - Service worker pour web push
    - Gestion permissions
    - Envoi via Firebase Cloud Messaging

16. **SMS pour notifications urgentes** (3 jours)
    - Intégration Twilio
    - Uniquement priority='urgent'
    - Préférences utilisateur

17. **Analytics** (3 jours)
    - Dashboard de statistiques
    - Taux d'ouverture par type/priorité
    - Graphiques d'engagement

**Durée totale** : ~18 jours

---

### Estimation globale

| Phase   | Priorité | Durée estimée | Dépendances           |
| ------- | -------- | ------------- | --------------------- |
| Phase 1 | Critique | 4-5 jours     | Aucune                |
| Phase 2 | Haute    | 10 jours      | Phase 1 terminée      |
| Phase 3 | Moyenne  | 11 jours      | Phase 2 (pagination)  |
| Phase 4 | Basse    | 18 jours      | Phase 3 (préférences) |

**Total** : ~43-44 jours développeur

---

## Dépannage

### "Notifications ne se mettent pas à jour"

**Symptôme** : Nouvelles notifications n'apparaissent pas sans refresh manuel.

**Cause** : Pas de mise à jour en temps réel (architecture simplifiée).

**Solution** :

1. **Court terme** : Rafraîchir manuellement (`F5` ou clic sur icône notifications)
2. **Long terme** : Implémenter Supabase Realtime (voir Roadmap Phase 2)

**Workaround** :

```typescript
// Polling manuel toutes les 30s
setInterval(() => {
	notificationStore.fetchUnreadCount();
}, 30000);
```

---

### "Cannot create notification for all students"

**Symptôme** : Enseignant essaie de cibler "Tous les utilisateurs" → Erreur.

**Cause** : Les enseignants ne peuvent cibler que leurs propres classes/élèves.

**Solution** : Utiliser `target_type = 'classes'` avec les IDs de classes de l'enseignant.

**Vérification** :

```typescript
// Vérifier les classes de l'enseignant
const { data: classes } = await supabase
	.from('classes')
	.select('id, name')
	.eq('teacher_id', teacherId);

// Cibler ces classes
await createNotification(
	supabase,
	{
		target_type: 'classes',
		target_class_ids: classes.map((c) => c.id)
		// ...
	},
	teacherId
);
```

---

### "Notification disappeared"

**Symptôme** : Notification visible hier, plus là aujourd'hui.

**Causes possibles** :

1. **Expirée** : `expires_at` dépassé (défaut +30 jours)
2. **Soft deleted** : Créateur/admin l'a supprimée (`deleted_at` rempli)
3. **Marquée comme lue** : Déplacée vers historique (si implémenté)

**Vérification** :

```sql
-- Vérifier dans database directement
SELECT id, title, expires_at, deleted_at
FROM notifications
WHERE id = 'uuid-here';
```

---

### "Unread count is wrong"

**Symptôme** : Badge affiche 5 mais seulement 3 notifications visibles.

**Causes possibles** :

1. **Cache désynchronisé** : `unreadCount` pas rafraîchi après `markAsRead()`
2. **RLS filtering** : Certaines notifications ciblées mais pas visibles (ex: classe désactivée)
3. **Race condition** : Marquage en cours pendant fetch

**Solution** :

```typescript
// Forcer un refetch complet
await notificationStore.fetchUnread();
```

---

### "Notification content shows HTML tags"

**Symptôme** : `<p>Message</p>` affiché au lieu du texte formaté.

**Cause** : `{@html}` non utilisé dans le composant.

**Vérification** :

```svelte
<!-- ❌ Mauvais -->
<div>{notification.message}</div>

<!-- ✅ Correct -->
<div>{@html sanitizeHtml(notification.message)}</div>
```

---

### "Performance issues with many notifications"

**Symptôme** : Page lente si 100+ notifications.

**Cause** : Pas de pagination, tout chargé en mémoire.

**Solution court terme** :

```typescript
// Limiter côté client
const notifications = $derived(notificationStore.notifications.slice(0, 50));
```

**Solution long terme** : Implémenter pagination API (voir Roadmap).

---

### "Can't send notification to specific student"

**Symptôme** : Erreur "Vous ne pouvez cibler que vos propres élèves".

**Cause** : Élève ne fait pas partie des classes de l'enseignant.

**Vérification** :

```typescript
// Vérifier si élève est dans une classe de l'enseignant
const { data: membership } = await supabase
	.from('class_members')
	.select('class_id')
	.eq('student_id', studentId)
	.eq('teacher_id', teacherId)
	.single();

if (!membership) {
	console.error('Student not in teacher classes');
}
```

---

### "Cleanup job not running"

**Symptôme** : Notifications expirées toujours présentes.

**Vérification** :

1. **Vercel Cron configuré ?**

```json
// vercel.json
{
	"crons": [
		{
			"path": "/api/notifications/cleanup",
			"schedule": "0 2 * * *"
		}
	]
}
```

2. **Job logs** :

```sql
SELECT * FROM background_job_runs
WHERE job_name = 'cleanup_old_notifications'
ORDER BY started_at DESC
LIMIT 10;
```

3. **Test manuel** :

```bash
curl https://ubumaths.com/api/notifications/cleanup
```

---

## Bonnes pratiques

### 1. Toujours utiliser les helpers d'auto-notifications

**❌ Mauvais** :

```typescript
// Créer notification manuellement
await createSystemNotification(supabase, {
	title: 'Nouvelle évaluation',
	message: '...',
	type: 'info'
	// ...
});
```

**✅ Bon** :

```typescript
// Utiliser le helper dédié
await notifyNewAssessment(supabase, {
	assessmentId,
	assessmentTitle,
	teacherName,
	classIds
});
```

**Pourquoi** :

- Cohérence des messages
- Validation des données
- Gestion automatique des erreurs
- Évolution centralisée

---

### 2. Définir la priorité appropriée

**Guidelines** :

| Priorité      | Quand utiliser                              | Exemples                                                      |
| ------------- | ------------------------------------------- | ------------------------------------------------------------- |
| **Urgent**    | Action immédiate requise, impact critique   | Maintenance dans 1h, erreur système critique, compte suspendu |
| **Important** | Nécessite attention rapide, deadline proche | Nouvelle évaluation, devoir à rendre demain, rappel réunion   |
| **Normal**    | Information utile, pas urgent               | Nouvelle ressource, badge débloqué, annonce générale          |

**❌ Mauvais** :

```typescript
// Tout marquer comme urgent
await notifyNewResource(supabase, {
	priority: 'urgent' // ❌ Pas approprié pour une ressource
	// ...
});
```

**✅ Bon** :

```typescript
// Priorité adaptée au contexte
await notifyNewResource(supabase, {
	priority: 'normal' // ✅ Approprié
	// ...
});
```

---

### 3. Fournir toujours un `action_url` si actionable

**❌ Mauvais** :

```typescript
// Notification sans action
await notifyNewAssessment(supabase, {
	assessmentId,
	assessmentTitle: 'Évaluation Chapitre 5',
	teacherName: 'Mme Dupont',
	classIds
	// ❌ Pas d'action_url → Utilisateur ne sait pas où aller
});
```

**✅ Bon** :

```typescript
// Avec action claire
await createSystemNotification(supabase, {
	title: 'Nouvelle évaluation assignée',
	message: '...',
	action_label: "Voir l'évaluation", // ✅ CTA clair
	action_url: '/dashboard/student/assessments' // ✅ Lien direct
	// ...
});
```

---

### 4. Garder les messages concis et clairs

**❌ Mauvais** :

```typescript
message: `
  <p>Bonjour cher élève,</p>
  <p>J'ai le plaisir de vous informer que votre professeur de mathématiques, Madame Marie Dupont, a procédé à l'assignation d'une nouvelle évaluation portant sur le chapitre 5 concernant les équations du second degré.</p>
  <p>Cette évaluation sera disponible dans votre espace personnel et devra être complétée avant la date limite.</p>
  <p>Cordialement,</p>
  <p>L'équipe UbuMaths</p>
`;
```

**✅ Bon** :

```typescript
message: `<p><strong>Mme Dupont</strong> vous a assigné une nouvelle évaluation : <strong>Équations du 2nd degré</strong></p>`;
```

**Guidelines** :

- 1-2 phrases maximum
- Mettre en gras les éléments importants
- Éviter formules de politesse excessives
- Aller droit au but

---

### 5. Tester le ciblage avant envoi à large échelle

**Process recommandé** :

1. **Tester sur 1 utilisateur** :

```typescript
await createNotification(
	supabase,
	{
		target_type: 'users',
		target_user_ids: ['your-test-user-id']
		// ...
	},
	teacherId
);
```

2. **Vérifier réception** : Se connecter comme utilisateur test, vérifier notification

3. **Tester sur 1 petite classe** :

```typescript
await createNotification(
	supabase,
	{
		target_type: 'classes',
		target_class_ids: ['small-test-class-id']
		// ...
	},
	teacherId
);
```

4. **Déployer à l'échelle** seulement après validation

---

### 6. Ne pas bloquer sur échec de notification

**❌ Mauvais** :

```typescript
// Bloquer l'opération si notification échoue
const result = await assignAssessment(supabase, data, userId);

if (!result.success) {
  throw error(500, 'Failed to assign');
}

// ❌ Si notification échoue, tout échoue
await notifyNewAssessment(supabase, ...);
if (!notificationResult.success) {
  throw error(500, 'Failed to notify');
}
```

**✅ Bon** :

```typescript
// Opération principale réussit même si notification échoue
const result = await assignAssessment(supabase, data, userId);

if (!result.success) {
  throw error(500, 'Failed to assign');
}

// ✅ Notification est "best effort", ne bloque pas
try {
  await notifyNewAssessment(supabase, ...);
} catch (error) {
  console.error('Failed to send notification:', error);
  // Continue quand même
}
```

**Pourquoi** : La notification est secondaire. L'action métier (assignation) doit réussir même si notification échoue.

---

### 7. Utiliser des noms de créateurs lisibles

**❌ Mauvais** :

```typescript
const teacherName = user.email; // "marie.dupont@school.fr"
```

**✅ Bon** :

```typescript
const teacherName =
	profile.firstname && profile.lastname
		? `${profile.firstname} ${profile.lastname}` // "Marie Dupont"
		: profile.full_name || 'Votre professeur'; // Fallback
```

---

### 8. Définir des durées d'expiration adaptées

**Guidelines** :

| Type de notification | Durée suggérée      |
| -------------------- | ------------------- |
| Maintenance urgente  | 1-2 jours           |
| Nouvelle évaluation  | 30 jours (défaut)   |
| Ressource ajoutée    | 30 jours            |
| Badge/récompense     | 90 jours (souvenir) |
| Annonce générale     | 7-14 jours          |

**Exemple** :

```typescript
await createSystemNotification(supabase, {
	title: 'Maintenance ce soir',
	expires_at: new Date(Date.now() + 2 * 24 * 60 * 60 * 1000).toISOString() // +2 jours
	// ...
});
```

---

### 9. Utiliser le bon `system_event_type`

Permet de tracker les sources de notifications et filtrer par préférences utilisateur.

**Mapping** :

| Event                   | Type                    |
| ----------------------- | ----------------------- |
| Devoir créé             | `assignment_created`    |
| Évaluation assignée     | `assessment_assigned`   |
| Ressource ajoutée       | `resource_added`        |
| Points gagnés           | `reward_earned`         |
| Badge débloqué          | `badge_unlocked`        |
| Maintenance             | `maintenance_scheduled` |
| Nouvelle fonctionnalité | `feature_released`      |

---

### 10. Monitorer les performances de notification

**Métriques à tracker** :

- Nombre de notifications envoyées par jour
- Taux d'ouverture (read rate)
- Temps moyen avant lecture
- Notifications expirées non lues
- Taux d'erreur d'envoi

**Exemple de query analytics** :

```sql
-- Taux d'ouverture par type de notification (30 derniers jours)
SELECT
  n.type,
  COUNT(DISTINCT n.id) as total_sent,
  COUNT(DISTINCT nr.notification_id) as total_read,
  ROUND(COUNT(DISTINCT nr.notification_id)::numeric / COUNT(DISTINCT n.id) * 100, 2) as read_rate_percent
FROM notifications n
LEFT JOIN notification_reads nr ON nr.notification_id = n.id
WHERE n.created_at > now() - INTERVAL '30 days'
  AND n.deleted_at IS NULL
GROUP BY n.type
ORDER BY read_rate_percent DESC;
```

---

## Conclusion

Le système de notifications UbuMaths offre une infrastructure solide et sécurisée pour communiquer avec les utilisateurs. Avec l'implémentation récente du rate limiting et de la validation Zod (2025-11-10), le système est maintenant production-ready avec des protections robustes contre les abus.

**Fonctionnalités complètes** :

- ✅ Notifications automatiques lors d'événements système
- ✅ Création manuelle par enseignants/admins (rate limited)
- ✅ Ciblage intelligent (tous/rôle/classes/utilisateurs)
- ✅ Affichage multi-modal (bannière/dropdown/page)
- ✅ Gestion optimiste côté client
- ✅ Rate limiting database-backed (42 tests passing)
- ✅ Validation Zod sur tous les endpoints

**Points forts** :

- ✅ RLS policies robustes
- ✅ Validation Zod sur API ET formulaires
- ✅ Rate limiting par rôle (teacher: 10/h, admin: 50/h)
- ✅ Architecture scalable (database-backed, fail-open)
- ✅ UX intuitive (3 modes d'affichage)
- ✅ Intégration simple (helpers auto-notifications)
- ✅ Tests complets (100% passing)
- ✅ Logging et monitoring

**Points d'amélioration prioritaires** :

1. ⚠️ Sanitization HTML serveur (sécurité - medium)
2. ⚠️ CRON secret pour cleanup (sécurité - low)
3. ⚠️ Delete action rate limiting (sécurité - medium)
4. ⚠️ Fix race condition (performance - medium)
5. 🟠 Temps réel (UX - haute)
6. 🟠 Pagination (performance - haute)

**Status global** : Production-ready avec améliorations planifiées

Suivre la roadmap Phase 1.1 pour compléter les tâches de sécurité restantes, puis Phase 2 pour les améliorations UX/performance.

---

**Dernière mise à jour** : 2025-11-10
**Maintenu par** : Équipe UbuMaths
**Version** : 1.1 (Rate Limiting + Zod Validation)
