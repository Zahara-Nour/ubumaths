# Système d'Amis (Friends System)

> Documentation complète du système d'amitié et de présence temps réel d'UbuMaths

**Date de l'analyse** : 2025-01-09
**Statut** : Production (7/10 - Fondation solide, nécessite améliorations de scaling)

---

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Quick Reference](#quick-reference)
- [Qui peut être amis avec qui ?](#qui-peut-être-amis-avec-qui-)
- [Flow des demandes d'ami](#flow-des-demandes-dami)
- [Acceptation et rejet](#acceptation-et-rejet)
- [Réciprocité des amitiés](#réciprocité-des-amitiés)
- [Suppression d'amis](#suppression-damis)
- [Permissions et sécurité](#permissions-et-sécurité)
- [Fichiers clés](#fichiers-clés)
- [Documentation détaillée](#documentation-détaillée)

---

## Vue d'ensemble

Le système Friends d'UbuMaths est un **système de présence temps réel basé sur WebSocket** qui permet aux élèves et enseignants de se connecter, suivre leur statut en ligne/hors ligne, et interagir de manière sécurisée.

### Fonctionnalités principales

- ✅ Demandes d'ami avec types (Camarade / Mentor)
- ✅ Présence temps réel (online/offline) via WebSocket
- ✅ Heartbeat automatique toutes les 60 secondes
- ✅ Modération par les enseignants
- ✅ Privacy-first avec RLS Supabase
- ✅ Support cross-role (Élève ↔ Professeur)

### Architecture

```
┌─────────────────────┐
│   Client (Svelte)   │
│  friendsManager     │
└──────────┬──────────┘
           │
           ├─── HTTP ────► Supabase (friendships table)
           │
           └─ WebSocket ─► Custom WS Server (port 3001)
                              │
                              ├─► user_presence table
                              └─► Broadcast presence updates
```

### Note globale : 7/10

**Points forts** :

- Architecture WebSocket solide et fiable
- Sécurité RLS privacy-first
- Code moderne (Svelte 5, TypeScript strict)

**Points faibles** :

- ❌ Pas de rate limiting (spam possible)
- ❌ Pas de notifications
- ❌ Pas de pagination (problème à 1000+ amis)
- ❌ Pas de caching

---

## Quick Reference

### Endpoints et Routes

| Route                           | Type | Description                      |
| ------------------------------- | ---- | -------------------------------- |
| `/dashboard/friends`            | Page | Interface utilisateur principale |
| `/dashboard/admin/friendships`  | Page | Modération enseignants           |
| WebSocket `ws://localhost:3001` | WS   | Serveur de présence temps réel   |

### Tables Database

| Table           | Description                      |
| --------------- | -------------------------------- |
| `friendships`   | Demandes et amitiés acceptées    |
| `user_presence` | Statut online/offline temps réel |
| `profiles`      | Informations utilisateur         |

### Composants principaux

| Composant        | Fichier                                    | Rôle                     |
| ---------------- | ------------------------------------------ | ------------------------ |
| `FriendsManager` | `src/lib/stores/friends.svelte.ts`         | Business logic           |
| `AddFriend`      | `src/lib/components/AddFriend.svelte`      | Recherche et envoi       |
| `FriendRequests` | `src/lib/components/FriendRequests.svelte` | Demandes reçues/envoyées |
| `FriendsList`    | `src/lib/components/FriendsList.svelte`    | Liste amis + présence    |

### Statuts d'amitié

| Statut     | Description        | Visible par                 |
| ---------- | ------------------ | --------------------------- |
| `pending`  | Demande en attente | Requester + Addressee       |
| `accepted` | Amitié active      | Les deux parties            |
| `rejected` | Demande refusée    | Requester (badge "Refusée") |

---

## Qui peut être amis avec qui ?

**Système inter-rôles complet** :

- ✅ **Élève ↔ Élève** : Amitiés classiques (type "Camarade")
- ✅ **Élève ↔ Professeur** : Relation de mentorat (type "Mentor")
- ✅ **Professeur ↔ Élève** : Inverse également supporté
- ✅ **Agnostique au rôle** : Tout utilisateur peut envoyer une demande

### Contraintes de sécurité

```sql
-- Migration 034_create_friendships_table.sql
CONSTRAINT no_self_friendship CHECK (requester_id != addressee_id)
CONSTRAINT unique_friendship UNIQUE (requester_id, addressee_id)
```

- ❌ **Impossible** de s'ajouter soi-même
- ❌ **Impossible** de dupliquer une demande existante (A → B déjà existant)

---

## Flow des demandes d'ami

### Parcours utilisateur complet

```
1. Navigation → /dashboard/friends
   ↓
2. Clic sur onglet "Ajouter"
   ↓
3. Recherche utilisateur
   - Min 2 caractères
   - Recherche dans full_name, firstname, lastname
   - Max 20 résultats
   - Exclut soi-même
   ↓
4. Sélection du type d'amitié
   - "Camarade" (classmate)
   - "Mentor" (mentor)
   ↓
5. Clic sur "Ajouter"
   ↓
6. Insertion en base
   INSERT INTO friendships:
   {
     requester_id: currentUserId,
     addressee_id: friendId,
     status: 'pending',
     friendship_type: friendshipType
   }
   ↓
7. Toast de confirmation
   "Demande d'ami envoyée !"
```

### Code reference

**Recherche** : `src/lib/components/AddFriend.svelte:32-45`
**Envoi** : `src/lib/stores/friends.svelte.ts:133-158`

### Type d'amitié

| Type        | Label    | Usage                      |
| ----------- | -------- | -------------------------- |
| `classmate` | Camarade | Amitiés entre élèves       |
| `mentor`    | Mentor   | Relations élève-professeur |

---

## Acceptation et rejet

### Flow d'acceptation

```
1. Destinataire voit badge rouge sur "Demandes reçues"
   ↓
2. Affichage de la demande
   - Avatar + nom du requester
   - Type d'amitié (badge)
   - Indicateur si professeur
   - Boutons : Accepter | Refuser
   ↓
3. Clic sur "Accepter"
   ↓
4. UPDATE friendships SET status = 'accepted'
   ↓
5. Résultat
   - Toast "Demande d'ami acceptée !"
   - Apparaît dans "Mes amis" pour LES DEUX parties
   - Présence en ligne activée (WebSocket)
```

**Code reference** : `src/lib/components/FriendRequests.svelte:12-19`

### Flow de rejet

```
1. Clic sur "Refuser"
   ↓
2. UPDATE friendships SET status = 'rejected'
   ↓
3. Résultat
   - Toast "Demande d'ami refusée"
   - Record GARDE en base (pas supprimé)
   - Disparaît de l'UI pour les deux parties
   - Badge "Refusée" visible pour le requester dans recherche
```

**Code reference** : `src/lib/components/FriendRequests.svelte:21-28`

### Distinction importante

| Action       | Opération SQL                | Garde le record ? | Raison                |
| ------------ | ---------------------------- | ----------------- | --------------------- |
| **Reject**   | `UPDATE status = 'rejected'` | ✅ Oui            | Analytics, modération |
| **Unfriend** | `DELETE FROM friendships`    | ❌ Non            | Privacy-first         |
| **Cancel**   | `DELETE FROM friendships`    | ❌ Non            | Privacy-first         |

### Permission RLS critique

```sql
-- Seul l'addressee peut accepter/refuser
CREATE POLICY "Addressee can update friendship status"
  ON friendships FOR UPDATE
  USING (auth.uid() = addressee_id);
```

→ Le requester **ne peut pas** modifier le statut de sa propre demande.

---

## Réciprocité des amitiés

### Stockage unidirectionnel

```sql
-- UN SEUL record en base
friendships {
  requester_id: Alice,
  addressee_id: Bob,
  status: 'accepted'
}
```

### Comportement bidirectionnel

```typescript
// src/lib/stores/friends.svelte.ts:37-41
const { data } = await supabase
	.from('friendships')
	.select('*')
	.or(`requester_id.eq.${userId},addressee_id.eq.${userId}`)
	.eq('status', 'accepted');
```

**Résultat** : Les deux parties voient l'amitié dans "Mes amis"

### Fonctionnalités symétriques

Les deux amis peuvent :

- 👁️ Voir le statut en ligne/hors ligne de l'autre
- 💬 Initier une conversation (si chat implémenté)
- 🗑️ Supprimer l'amitié (unfriend)

### RLS bidirectionnelle

```sql
CREATE POLICY "Users can view own friendships"
  ON friendships FOR SELECT
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);
```

**Conclusion** : L'amitié fonctionne comme une relation bidirectionnelle du point de vue UX, même si techniquement il n'y a qu'un seul record en base.

---

## Suppression d'amis

### 3 scénarios différents

#### A. Unfriend (Retirer un ami accepté)

```
1. "Mes amis" → Menu (⋮) sur un ami → "Retirer des amis"
   ↓
2. Dialogue de confirmation
   ↓
3. DELETE FROM friendships WHERE id = friendshipId
   ↓
4. Résultat
   - Toast "Ami retiré avec succès"
   - Disparaît pour LES DEUX parties
   - Présence en ligne désactivée
```

**Code** : `src/lib/stores/friends.svelte.ts:219-239`

#### B. Annuler une demande envoyée

```
1. "Demandes envoyées" → Bouton "Annuler"
   ↓
2. Dialogue de confirmation
   ↓
3. DELETE FROM friendships WHERE id = friendshipId
   ↓
4. Résultat
   - Toast "Demande annulée"
   - Disparaît pour les deux parties
```

**Code** : `src/lib/components/FriendRequests.svelte:30-39`

#### C. Modération enseignant (Force Delete)

```
1. Enseignant → /dashboard/admin/friendships
   ↓
2. Filtrer par classe / Rechercher par nom
   ↓
3. Form action DELETE
   ↓
4. Vérification rôle teacher/admin
   ↓
5. DELETE FROM friendships WHERE id = friendshipId
   ↓
6. Résultat
   - Toast "Amitié supprimée"
   - Disparaît pour les deux élèves
```

**Code** : `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts:110-148`

### Permissions DELETE

```sql
-- Utilisateurs peuvent supprimer leurs propres amitiés
CREATE POLICY "Users can delete own friendships"
  ON friendships FOR DELETE
  USING (auth.uid() = requester_id OR auth.uid() = addressee_id);

-- Enseignants peuvent supprimer les amitiés étudiantes
CREATE POLICY "Teachers can delete student friendships"
  ON friendships FOR DELETE
  USING (
    EXISTS (
      SELECT 1 FROM profiles
      WHERE profiles.id = auth.uid()
      AND profiles.role = 'teacher'
    )
  );
```

---

## Permissions et sécurité

### Matrice de permissions

| Action                            | Étudiant | Enseignant | Admin |
| --------------------------------- | -------- | ---------- | ----- |
| Voir ses amitiés                  | ✅       | ✅         | ✅    |
| Voir toutes les amitiés           | ❌       | ✅         | ✅    |
| Créer demande                     | ✅       | ✅         | ✅    |
| Accepter/refuser (addressee)      | ✅       | ✅         | ✅    |
| Supprimer ses amitiés             | ✅       | ✅         | ✅    |
| Supprimer n'importe quelle amitié | ❌       | ✅         | ✅    |

### RLS Policies récapitulatives

```sql
-- SELECT (Voir)
✅ requester_id = auth.uid() OR addressee_id = auth.uid()
✅ Teachers peuvent voir toutes les friendships

-- INSERT (Créer demande)
✅ requester_id = auth.uid() uniquement

-- UPDATE (Accepter/Refuser)
✅ addressee_id = auth.uid() uniquement

-- DELETE (Supprimer)
✅ requester_id = auth.uid() OR addressee_id = auth.uid()
✅ Teachers peuvent supprimer les friendships étudiantes
```

### Protections implémentées

| Protection        | Statut | Mécanisme                                        |
| ----------------- | ------ | ------------------------------------------------ |
| Self-friending    | ✅     | Constraint `no_self_friendship`                  |
| Duplicate request | ✅     | Unique constraint `(requester_id, addressee_id)` |
| XSS               | ✅     | Svelte auto-escape                               |
| SQL Injection     | ✅     | Supabase parameterized queries                   |
| CSRF              | ⚠️     | Direct Supabase (pas d'API endpoints)            |

### Vulnérabilités identifiées

| Vulnérabilité                  | Priorité | Impact                    |
| ------------------------------ | -------- | ------------------------- |
| ❌ Pas de rate limiting        | **P0**   | Spam de demandes possible |
| ❌ Pas de cooldown après rejet | **P0**   | Harcèlement possible      |
| ❌ Pas de validation Zod       | **P1**   | Input non validé          |

---

## Fichiers clés

### Backend / Business Logic

| Fichier                                                  | Lignes | Rôle                             |
| -------------------------------------------------------- | ------ | -------------------------------- |
| `src/lib/stores/friends.svelte.ts`                       | 1-316  | FriendsManager (store principal) |
| `supabase/migrations/034_create_friendships_table.sql`   | 1-70   | Schema + RLS                     |
| `supabase/migrations/035_create_user_presence_table.sql` | 1-100  | Présence temps réel              |
| `src/lib/server/websocket-server.ts`                     | 1-400  | Serveur WebSocket custom         |
| `src/lib/stores/websocket.svelte.ts`                     | 1-250  | Client WebSocket                 |

### Frontend Components

| Fichier                                                 | Lignes | Rôle                      |
| ------------------------------------------------------- | ------ | ------------------------- |
| `src/lib/components/AddFriend.svelte`                   | 26-56  | Recherche + envoi demande |
| `src/lib/components/FriendRequests.svelte`              | 12-108 | Demandes reçues/envoyées  |
| `src/lib/components/FriendsList.svelte`                 | 20-109 | Amis acceptés + présence  |
| `src/routes/(protected)/dashboard/friends/+page.svelte` | 1-150  | Page principale           |

### Modération

| Fichier                                                              | Lignes | Rôle                      |
| -------------------------------------------------------------------- | ------ | ------------------------- |
| `src/routes/(protected)/dashboard/admin/friendships/+page.server.ts` | 1-148  | Load + actions modération |
| `src/routes/(protected)/dashboard/admin/friendships/+page.svelte`    | 1-250  | UI modération             |

---

## Documentation détaillée

Pour approfondir des aspects spécifiques :

- **[Analyse technique complète](../architecture/friends-system-technical.md)** : WebSocket, performance, database
- **[Modération et sécurité](./friends-moderation.md)** : RLS, enseignants, gaps de sécurité
- **[Gaps et roadmap](./friends-gaps-roadmap.md)** : Features manquantes, priorités, estimations

---

## Changelog

| Date       | Changement                                            |
| ---------- | ----------------------------------------------------- |
| 2025-01-09 | Documentation initiale complète (analyse approfondie) |

---

**Maintenu par** : Équipe de développement UbuMaths
**Dernière mise à jour** : 2025-01-09
