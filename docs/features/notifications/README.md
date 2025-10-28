# Système de Notifications - UbuMaths

Documentation complète du système de notifications.

## Table des Matières

- [Vue d'ensemble](#vue-densemble)
- [Architecture](#architecture)
- [Interface Utilisateur](#interface-utilisateur)
- [Notifications Manuelles](#notifications-manuelles)
- [Notifications Automatiques](#notifications-automatiques)
- [Cleanup Automatique](#cleanup-automatique)
- [Testing](#testing)

---

## Vue d'ensemble

Le système de notifications permet :

- **Notifications manuelles** : Professeurs et admins peuvent créer des notifications ciblées
- **Notifications automatiques** : Le système crée automatiquement des notifications pour certains événements
- **Banner sticky** : Affiche les notifications non lues en carousel en haut du dashboard
- **Dropdown sidebar** : Badge avec nombre de notifications non lues
- **Page dédiée** : Liste complète de toutes les notifications non lues
- **Statistiques** : Les créateurs peuvent voir qui a lu leurs notifications

---

## Architecture

### Base de Données

**Tables**:

- `notifications` : Stocke toutes les notifications avec ciblage intelligent
- `notification_reads` : Suit qui a lu quoi

**Migration**: `supabase/migrations/081_create_notifications_system.sql`

**Types de ciblage**:

- `all` : Tous les utilisateurs
- `role` : Par rôle (student, teacher, admin)
- `classes` : Élèves de classes spécifiques
- `users` : Utilisateurs spécifiques

**Priorités**:

- `normal` : Notification standard
- `important` : Notification importante (ex: maintenance)
- `urgent` : Notification urgente (apparaît en premier)

**Types**:

- `info` : Information générale (🔔)
- `alert` : Alerte (⚠️)
- `announcement` : Annonce (📢)
- `reminder` : Rappel (⏰)

### Backend

**Fichiers clés**:

- `src/lib/types/notification.ts` : Types TypeScript
- `src/lib/server/notifications.ts` : Utilitaires serveur (CRUD)
- `src/lib/server/auto-notifications.ts` : Helpers pour notifications automatiques
- `src/routes/api/notifications/*` : Routes API

### Frontend

**Fichiers clés**:

- `src/lib/stores/notifications.svelte.ts` : Store avec polling
- `src/lib/components/notifications/NotificationBanner.svelte` : Carousel sticky
- `src/lib/components/notifications/NotificationDropdown.svelte` : Dropdown sidebar
- `src/routes/(protected)/dashboard/notifications/+page.svelte` : Page complète

---

## Interface Utilisateur

### 1. Notification Banner (Sticky Carousel)

Affiché en haut du dashboard, au-dessus du contenu principal.

**Caractéristiques**:

- Sticky position (reste visible lors du scroll)
- Carousel si plusieurs notifications
- Affiche max 5 notifications
- Couleurs selon priorité (urgent=rouge, important=orange, normal=bleu)
- Actions : "Marquer comme lue", Bouton d'action optionnel, Fermer
- Navigation avec flèches ←/→

**Composant**: `NotificationBanner.svelte`

### 2. Notification Dropdown (Sidebar)

Icône cloche dans la sidebar avec badge de compteur.

**Caractéristiques**:

- Badge rouge avec nombre (max "9+")
- Popover au clic
- Affiche 5 dernières notifications
- Bouton "Tout marquer comme lu"
- Lien "Voir toutes les notifications"

**Composant**: `NotificationDropdown.svelte`

### 3. Page Notifications Complète

Route : `/dashboard/notifications`

**Caractéristiques**:

- Liste complète des notifications non lues
- Affiche le message HTML complet
- Boutons d'action si présents
- Bouton "Marquer comme lue" par notification
- État vide si aucune notification

### 4. Polling Automatique

**🆕 2025-10-28** : Système de polling unifié pour optimiser les performances.

Le système utilise désormais un **polling unifié** qui combine les notifications et les messages en une seule requête, réduisant l'overhead de 50%.

**Architecture**:

```typescript
// Polling central dans dashboard/+layout.svelte
import { activityStore } from '$lib/stores/activity.svelte';

$effect(() => {
	// Démarre le polling unifié (notifications + messages)
	activityStore.startPolling(30000);

	return () => {
		activityStore.stopPolling();
	};
});
```

**Avantages**:

- ✅ **50% moins de requêtes HTTP** (1 au lieu de 2 toutes les 30s)
- ✅ **Exécution parallèle** avec `Promise.all()` côté serveur
- ✅ **Un seul endpoint** : `/api/activity/unread-counts`
- ✅ **Rétrocompatible** : `notificationStore.unreadCount` fonctionne toujours

**Comment ça marche**:

1. `activityStore` interroge `/api/activity/unread-counts` toutes les 30s
2. L'endpoint retourne `{ notifications: 5, messages: 3 }`
3. `activityStore` met à jour `notificationStore.unreadCount` et `privateMessages.unreadCount`
4. Les composants lisent simplement leurs stores respectifs

**Pour en savoir plus** : [Polling Patterns Guide](../../development/polling-patterns.md)

---

## Notifications Manuelles

### Pour les Professeurs

**Route**: `/dashboard/teacher/notifications`

**Permissions**:

- Peut cibler ses propres classes
- Peut cibler ses propres élèves

**Interface**:

1. Formulaire de création :
   - Type et Priorité
   - Titre et Message (rich text)
   - Ciblage : Classes entières OU Élèves spécifiques
   - Action optionnelle (label + URL)

2. Liste des notifications envoyées :
   - Titre et date
   - Destinataires
   - Statistiques de lecture (X/Y lu, %)
   - Barre de progression
   - Bouton supprimer

**Exemple de création**:

```typescript
// Form action dans +page.server.ts
const result = await createNotification(
	supabase,
	{
		title: 'Devoir pour demain',
		message: "<p>N'oubliez pas de faire le devoir de maths pages 42-43</p>",
		type: 'reminder',
		priority: 'important',
		target_type: 'classes',
		target_class_ids: ['class-uuid-1', 'class-uuid-2'],
		action_label: 'Voir les devoirs',
		action_url: '/dashboard/student/devoirs'
	},
	session.user.id
);
```

### Pour les Admins

**Route**: `/dashboard/admin/notifications`

**Permissions**:

- Peut cibler tous les utilisateurs
- Peut cibler par rôle (admin, teacher, student)
- Peut cibler des classes
- Peut cibler des utilisateurs spécifiques

**Interface**:
Similaire aux professeurs mais avec plus d'options de ciblage.

**Exemple - Notification maintenance**:

```typescript
const result = await createNotification(
	supabase,
	{
		title: 'Maintenance programmée',
		message: '<p>Le site sera indisponible dimanche de 2h à 4h du matin</p>',
		type: 'alert',
		priority: 'important',
		target_type: 'all' // Tous les utilisateurs
	},
	session.user.id
);
```

**Exemple - Nouvelle fonctionnalité pour professeurs**:

```typescript
const result = await createNotification(
	supabase,
	{
		title: 'Nouvelle fonctionnalité : Export Excel',
		message: '<p>Vous pouvez maintenant exporter vos résultats en Excel !</p>',
		type: 'announcement',
		priority: 'normal',
		target_type: 'role',
		target_roles: ['teacher'],
		action_label: 'Découvrir',
		action_url: '/dashboard/teacher/exports'
	},
	session.user.id
);
```

---

## Notifications Automatiques

Le système crée automatiquement des notifications pour certains événements.

### Fichier : `src/lib/server/auto-notifications.ts`

Ce fichier contient des helpers pour créer des notifications automatiques.

### 1. Nouveau Devoir Assigné

**Quand** : Un professeur crée un devoir

**Intégration** : Appeler dans la form action de création de devoir

```typescript
import { notifyNewAssignment } from '$lib/server/auto-notifications';

// Dans votre form action après création du devoir
await notifyNewAssignment(supabase, {
	assignmentId: newAssignment.id,
	assignmentTitle: newAssignment.title,
	classId: newAssignment.class_id,
	teacherName: `${profile.firstname} ${profile.lastname}`
});
```

**Notification créée**:

- Titre : "Nouveau devoir assigné"
- Message : "[Prof] a assigné un nouveau devoir : [Titre]"
- Cible : Élèves de la classe
- Action : "Voir le devoir" → `/dashboard/student/devoirs/[id]`

### 2. Nouvelle Ressource Ajoutée

**Quand** : Un professeur ajoute une ressource

```typescript
import { notifyNewResource } from '$lib/server/auto-notifications';

await notifyNewResource(supabase, {
	resourceId: newResource.id,
	resourceTitle: newResource.title,
	classId: newResource.class_id,
	teacherName: `${profile.firstname} ${profile.lastname}`
});
```

**Notification créée**:

- Titre : "Nouvelle ressource disponible"
- Message : "[Prof] a ajouté une nouvelle ressource : [Titre]"
- Cible : Élèves de la classe
- Action : "Voir la ressource" → `/dashboard/student/resources/[id]`

### 3. Récompense Gagnée (Gidouilles)

**Quand** : Un élève gagne des gidouilles

```typescript
import { notifyRewardEarned } from '$lib/server/auto-notifications';

await notifyRewardEarned(supabase, {
	studentId: student.id,
	amount: 50,
	reason: 'Excellent travail sur le devoir de géométrie !' // optionnel
});
```

**Notification créée**:

- Titre : "🎉 [X] gidouilles gagnées !"
- Message : "Vous avez gagné [X] gidouilles ! [raison]"
- Cible : Élève spécifique

### 4. Carte VIP Gagnée

**Quand** : Un élève gagne une carte VIP

```typescript
import { notifyVipCardEarned } from '$lib/server/auto-notifications';

await notifyVipCardEarned(supabase, {
	studentId: student.id,
	cardType: 'golden',
	cardName: 'Carte Dorée de Mathématiques'
});
```

**Notification créée**:

- Titre : "✨ Nouvelle carte VIP !"
- Message : "Félicitations ! Vous avez obtenu une nouvelle carte VIP : [Nom]"
- Cible : Élève spécifique
- Action : "Voir mes cartes" → `/dashboard/student/vip-cards`

### 5. Badge Débloqué

**Quand** : Un élève débloque un badge

```typescript
import { notifyBadgeUnlocked } from '$lib/server/auto-notifications';

await notifyBadgeUnlocked(supabase, {
	studentId: student.id,
	badgeName: 'Maître des Équations',
	badgeDescription: 'Résoudre 100 équations correctement' // optionnel
});
```

**Notification créée**:

- Titre : "🏆 Nouveau badge débloqué !"
- Message : "Bravo ! Vous avez débloqué le badge [Nom]"
- Cible : Élève spécifique
- Action : "Voir mes badges" → `/dashboard/student/badges`

### 6. Maintenance Système (Admin)

**Quand** : Admin annonce une maintenance

```typescript
import { notifyMaintenance } from '$lib/server/auto-notifications';

await notifyMaintenance(supabase, {
	date: 'dimanche 25 octobre à 2h du matin',
	duration: '2 heures',
	description: 'Mise à jour de sécurité importante'
});
```

### 7. Nouvelle Fonctionnalité (Admin)

**Quand** : Admin annonce une nouvelle fonctionnalité

```typescript
import { notifyFeatureRelease } from '$lib/server/auto-notifications';

await notifyFeatureRelease(supabase, {
	featureName: 'Mode Sombre',
	description: 'Vous pouvez maintenant activer le mode sombre dans les paramètres !',
	targetRoles: ['student', 'teacher'], // optionnel, par défaut = tous
	actionUrl: '/dashboard/settings' // optionnel
});
```

---

## Cleanup Automatique

Les notifications expirées (> 30 jours) doivent être supprimées régulièrement.

### Route API

**Endpoint**: `/api/notifications/cleanup`

**Méthodes**: GET ou POST

**Utilisation manuelle**:

```bash
curl -X POST https://your-domain.com/api/notifications/cleanup
```

### Cron Job Vercel (Recommandé)

Ajouter dans `vercel.json` :

```json
{
	"crons": [
		{
			"path": "/api/notifications/cleanup",
			"schedule": "0 2 * * *"
		}
	]
}
```

Cela exécutera le cleanup tous les jours à 2h du matin UTC.

**Sécurité (optionnel)** :

Pour sécuriser l'endpoint avec un secret :

1. Ajouter `CRON_SECRET` dans vos variables d'environnement Vercel

2. Décommenter dans `+server.ts` :

```typescript
const authHeader = request.headers.get('authorization');
if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
	return json({ error: 'Unauthorized' }, { status: 401 });
}
```

3. Configurer le header dans `vercel.json` :

```json
{
	"crons": [
		{
			"path": "/api/notifications/cleanup",
			"schedule": "0 2 * * *",
			"headers": {
				"Authorization": "Bearer YOUR_SECRET"
			}
		}
	]
}
```

---

## Testing

### 1. Test Manuel - Créer une Notification

1. Push la migration : `pnpm db:migrate`
2. Lancer le dev server : `pnpm dev -- --port 5175`
3. Se connecter en tant que professeur ou admin
4. Aller sur `/dashboard/teacher/notifications` ou `/dashboard/admin/notifications`
5. Créer une notification test
6. Vérifier qu'elle apparaît dans le banner et le dropdown

### 2. Test Automatique - Notification de Devoir

Quand vous aurez une form action pour créer un devoir, ajoutez :

```typescript
import { notifyNewAssignment } from '$lib/server/auto-notifications';

// Après création du devoir
const { data: profile } = await supabase
	.from('profiles')
	.select('firstname, lastname')
	.eq('id', session.user.id)
	.single();

await notifyNewAssignment(supabase, {
	assignmentId: newAssignment.id,
	assignmentTitle: newAssignment.title,
	classId: newAssignment.class_id,
	teacherName: profile ? `${profile.firstname} ${profile.lastname}` : 'Votre professeur'
});
```

### 3. Test du Cleanup

```bash
# Test manuel
curl -X GET http://localhost:5175/api/notifications/cleanup

# Devrait retourner :
{
  "success": true,
  "deletedCount": 0,
  "message": "Cleaned up 0 expired notification(s)"
}
```

### 4. Test du Polling

1. Ouvrir le dashboard
2. Ouvrir la console du navigateur
3. Créer une notification depuis un autre onglet/compte
4. Attendre 30 secondes
5. Le badge devrait se mettre à jour automatiquement

---

## Checklist de Déploiement

- [ ] Migration pushée à Supabase production
- [ ] Variables d'environnement configurées sur Vercel
- [ ] Cron job configuré dans `vercel.json`
- [ ] Tests manuels passés en staging
- [ ] Notifications automatiques intégrées dans les form actions existantes
- [ ] Documentation partagée avec l'équipe

---

## Troubleshooting

### Le badge ne se met pas à jour

- Vérifier que le polling est démarré (console browser)
- Vérifier les appels API dans l'onglet Network
- Vérifier les RLS policies dans Supabase

### Les notifications n'apparaissent pas

- Vérifier le ciblage (target*type et target*\*\_ids)
- Vérifier que la notification n'est pas expirée
- Vérifier que deleted_at est NULL
- Vérifier les RLS policies

### Erreur de permission lors de la création

- Vérifier que l'utilisateur a le bon rôle
- Pour teachers : vérifier qu'ils ciblent leurs propres classes/élèves
- Vérifier les logs serveur

---

## API Reference

### Routes

| Route                              | Méthode | Description                          |
| ---------------------------------- | ------- | ------------------------------------ |
| `/api/notifications/unread`        | GET     | Liste des notifications non lues     |
| `/api/notifications/unread-count`  | GET     | Nombre de notifications non lues     |
| `/api/notifications/mark-read`     | POST    | Marquer une notification comme lue   |
| `/api/notifications/mark-all-read` | POST    | Marquer toutes comme lues            |
| `/api/notifications/cleanup`       | POST    | Supprimer les notifications expirées |

### Functions Serveur

Voir `src/lib/server/notifications.ts` et `src/lib/server/auto-notifications.ts` pour la documentation complète.

---

## Feuille de Route Future

Améliorations potentielles :

- [ ] Temps réel avec Supabase Realtime (au lieu du polling)
- [ ] Préférences utilisateur (activer/désactiver certains types)
- [ ] Historique des notifications lues
- [ ] Notification push (navigateur)
- [ ] Email pour notifications importantes
- [ ] Templates de notifications
- [ ] Statistiques avancées (taux d'ouverture, meilleur moment, etc.)
