# Configuration de l'école

**Audience** : Administrateurs système
**Niveau** : Configuration système
**Dernière mise à jour** : 2025-11-13

---

## Vue d'ensemble

Ce guide explique comment configurer le fuseau horaire et la structure de la semaine scolaire pour votre école. Ces paramètres sont essentiels pour le bon fonctionnement des résumés quotidiens et récompenses hebdomadaires.

---

## Pourquoi ces paramètres sont importants

### Fuseau horaire

Le fuseau horaire détermine :

- Quand commence et finit une "journée" pour votre école
- Le calcul de "hier" pour les résumés quotidiens
- L'heure locale d'envoi des notifications (01h00 dans votre fuseau horaire)

**Exemple** :

- École en France (Europe/Paris) : Le cron tourne à 01h00 UTC, soit 02h00 ou 03h00 selon l'heure d'été
- École en Israël (Asia/Jerusalem) : Le cron tourne à 01h00 UTC, soit 03h00 ou 04h00 heure locale

### Structure de la semaine

La structure de la semaine définit :

- Quels jours sont des jours de cours (résumés quotidiens envoyés)
- Quels jours sont des weekends (pas de résumés)
- Quel est le dernier jour de la semaine (jour de distribution des récompenses hebdomadaires)

**Exemple** :

- Système occidental (France) : Lundi-vendredi cours, samedi-dimanche weekend
- Système israélien : Dimanche-jeudi cours, vendredi-samedi weekend
- Système Moyen-Orient (Arabie) : Dimanche-jeudi cours, vendredi-samedi weekend

---

## Accéder à la configuration

### Prérequis

- Rôle : **Admin**
- Accès : Dashboard administrateur

### Navigation

1. Connectez-vous en tant qu'administrateur
2. Accédez au dashboard admin
3. Section "Écoles" → Sélectionnez votre école
4. Cliquez sur "Configurer le fuseau horaire et la semaine"

---

## Configurer le fuseau horaire

### Étape 1 : Ouvrir le modal de configuration

Cliquez sur le bouton "Configurer" à côté du nom de votre école.

### Étape 2 : Sélectionner le fuseau horaire

#### Fuseau horaire actuel

Le modal affiche le fuseau horaire actuellement configuré :

```
Fuseau horaire actuel : Europe/Paris (UTC+01:00)
```

#### Rechercher un fuseau horaire

1. Cliquez sur le menu déroulant "Fuseau horaire"
2. Tapez pour rechercher :
   - Par ville : "Paris", "Jerusalem", "New York"
   - Par région : "Europe", "Asia", "America"
   - Par offset : "+02:00", "-05:00"

#### Liste des fuseaux horaires

Les fuseaux horaires sont regroupés par région :

**Communs** (★)

- Paris (Europe/Paris, UTC+01:00)
- New York (America/New_York, UTC-05:00)
- Los Angeles (America/Los_Angeles, UTC-08:00)
- Tokyo (Asia/Tokyo, UTC+09:00)
- London (Europe/London, UTC+00:00)
- Sydney (Australia/Sydney, UTC+11:00)

**Afrique**

- Cairo, Johannesburg, Lagos, Nairobi, Casablanca, Algiers, Tunis...

**Amérique**

- New York, Los Angeles, Chicago, Denver, Toronto, Vancouver, Mexico City, Sao Paulo...

**Asie**

- Tokyo, Shanghai, Hong Kong, Singapore, Seoul, Bangkok, Dubai, Kolkata, Jerusalem, Riyadh...

**Australie**

- Sydney, Melbourne, Brisbane, Perth, Adelaide, Darwin, Hobart...

**Europe**

- Paris, London, Berlin, Madrid, Rome, Amsterdam, Brussels, Vienna, Moscow, Istanbul...

**Pacifique**

- Auckland, Fiji, Guam, Honolulu, Tahiti, Tongatapu...

### Étape 3 : Vérifier le fuseau horaire

Une fois sélectionné, vérifiez :

- Le nom du fuseau horaire est correct
- L'offset UTC correspond à votre région
- Prendre en compte l'heure d'été/hiver si applicable

---

## Configurer la structure de la semaine

### Étape 1 : Choisir un preset (recommandé)

Trois presets sont disponibles pour faciliter la configuration :

#### Preset 1 : Semaine occidentale (Mon-Fri)

```
Premier jour : Lundi (1)
Dernier jour : Dimanche (0)
Jours de cours : Lundi, Mardi, Mercredi, Jeudi, Vendredi
Jours de weekend : Samedi, Dimanche
```

**Utilisé par** : France, Europe de l'Ouest, États-Unis, Canada, Amérique du Sud

#### Preset 2 : Semaine israélienne (Sun-Thu)

```
Premier jour : Dimanche (0)
Dernier jour : Samedi (6)
Jours de cours : Dimanche, Lundi, Mardi, Mercredi, Jeudi
Jours de weekend : Vendredi, Samedi
```

**Utilisé par** : Israël (par défaut)

#### Preset 3 : Semaine Moyen-Orient (Sun-Thu)

```
Premier jour : Dimanche (0)
Dernier jour : Samedi (6)
Jours de cours : Dimanche, Lundi, Mardi, Mercredi, Jeudi
Jours de weekend : Vendredi, Samedi
```

**Utilisé par** : Arabie Saoudite, Émirats Arabes Unis, autres pays du Moyen-Orient

### Étape 2 : Configuration personnalisée (optionnel)

Si aucun preset ne convient, vous pouvez configurer manuellement :

#### Premier jour de la semaine

- Numéro : 0 (Dimanche) à 6 (Samedi)
- Définit quand commence la semaine scolaire

#### Dernier jour de la semaine

- Numéro : 0 (Dimanche) à 6 (Samedi)
- **Important** : Les récompenses hebdomadaires sont distribuées ce jour

#### Jours de cours

- Sélectionnez tous les jours où l'école a cours
- Les résumés quotidiens sont envoyés ces jours-là

#### Jours de weekend

- Sélectionnez tous les jours sans cours
- Pas de résumés quotidiens ces jours-là

### Étape 3 : Validation

Le système valide automatiquement :

- Tous les jours (0-6) sont assignés (cours ou weekend)
- Aucun jour n'est assigné deux fois
- Au moins un jour de cours est défini
- Au moins un jour de weekend est défini

---

## Exemples de scénarios

### Scénario 1 : École française classique

**Configuration** :

- Fuseau horaire : Europe/Paris
- Preset : Semaine occidentale (Mon-Fri)
- Jours de cours : Lundi à vendredi
- Weekend : Samedi et dimanche

**Résultat** :

- Résumés quotidiens : Envoyés du mardi au samedi (pour lun-ven)
- Récompenses hebdomadaires : Envoyées le lundi matin (évalue la semaine précédente)
- Heure d'envoi : 02h00 ou 03h00 heure de Paris (selon heure d'été)

### Scénario 2 : École israélienne

**Configuration** :

- Fuseau horaire : Asia/Jerusalem
- Preset : Semaine israélienne (Sun-Thu)
- Jours de cours : Dimanche à jeudi
- Weekend : Vendredi et samedi

**Résultat** :

- Résumés quotidiens : Envoyés du lundi au vendredi (pour dim-jeu)
- Récompenses hebdomadaires : Envoyées le dimanche matin (évalue la semaine précédente)
- Heure d'envoi : 03h00 ou 04h00 heure d'Israël (selon heure d'été)

### Scénario 3 : École avec semaine de 4 jours

**Configuration** :

- Fuseau horaire : America/Denver
- Configuration personnalisée
- Premier jour : Lundi (1)
- Dernier jour : Dimanche (0)
- Jours de cours : Lundi, mardi, jeudi, vendredi
- Weekend : Mercredi, samedi, dimanche

**Résultat** :

- Résumés quotidiens : Envoyés mardi, mercredi, vendredi, samedi (pour lun, mar, jeu, ven)
- Récompenses hebdomadaires : Envoyées le lundi matin
- Heure d'envoi : Variable selon heure d'été/hiver (MST/MDT)

### Scénario 4 : École du Golfe

**Configuration** :

- Fuseau horaire : Asia/Dubai
- Preset : Semaine Moyen-Orient (Sun-Thu)
- Jours de cours : Dimanche à jeudi
- Weekend : Vendredi et samedi

**Résultat** :

- Résumés quotidiens : Envoyés du lundi au vendredi (pour dim-jeu)
- Récompenses hebdomadaires : Envoyées le dimanche matin
- Heure d'envoi : 05h00 heure de Dubai (UTC+04:00, pas de changement d'heure)

---

## Visualisation du système

### Diagramme de flux : Résumés quotidiens

```
01h00 UTC (quotidien)
    ↓
Récupérer toutes les classes actives
    ↓
Pour chaque classe :
    ↓
Déterminer "hier" selon fuseau horaire école
    ↓
Vérifier si cours prévu "hier" (emploi du temps)
    ↓
OUI → Générer résumé pour tous les élèves
NON → Passer à la classe suivante
    ↓
Créer notification pour élèves avec activité
```

### Diagramme de flux : Récompenses hebdomadaires

```
01h00 UTC (quotidien)
    ↓
Récupérer toutes les classes actives
    ↓
Pour chaque classe :
    ↓
Déterminer jour actuel selon fuseau horaire école
    ↓
Vérifier si aujourd'hui = dernier jour semaine scolaire
    ↓
OUI → Pour chaque élève actif :
        ↓
    Vérifier avertissements semaine écoulée
        ↓
    0 avertissements → +1 gidouille + notification
    ≥1 avertissement → Aucune récompense
NON → Passer à la classe suivante
```

---

## Impact des changements

### Changement de fuseau horaire

**Effet immédiat** :

- Le lendemain, "hier" sera calculé selon le nouveau fuseau horaire
- L'historique existant n'est pas modifié
- Les notifications futures utiliseront le nouveau fuseau horaire

**Recommandations** :

- Effectuez le changement un weekend ou pendant les vacances
- Informez les enseignants et élèves à l'avance
- Vérifiez le premier envoi après le changement

### Changement de structure de semaine

**Effet immédiat** :

- Le jour de distribution des récompenses change
- Les jours de résumés quotidiens changent
- L'historique existant n'est pas modifié

**Recommandations** :

- Effectuez le changement à la fin d'une semaine scolaire
- Informez les enseignants que les récompenses seront distribuées un autre jour
- Attendez une semaine complète pour évaluer le nouveau système

---

## Dépannage

### Les résumés ne sont pas envoyés

**Vérifications** :

1. Le fuseau horaire est-il correct ?
2. L'emploi du temps de la classe est-il configuré ?
3. Les élèves sont-ils membres actifs de la classe ?
4. Y a-t-il eu de l'activité hier ?

**Solutions** :

- Vérifiez la configuration de l'école
- Vérifiez l'emploi du temps de chaque classe
- Consultez les logs du cron job (voir [Documentation API](../api/cron-endpoints.md))

### Les récompenses ne sont pas distribuées

**Vérifications** :

1. Sommes-nous le dernier jour de la semaine scolaire ?
2. Les élèves ont-ils eu des avertissements cette semaine ?
3. Les élèves sont-ils actifs (pas is_test) ?

**Solutions** :

- Vérifiez la configuration week_config de l'école
- Vérifiez les avertissements actifs des élèves
- Consultez l'historique weekly_rewards dans la base de données

### Heure d'envoi incorrecte

**Problème** : Les notifications arrivent à une heure inattendue

**Cause** : Le cron Vercel tourne à 01h00 UTC, pas en heure locale

**Solution** :

- C'est normal ! Le système calcule automatiquement "hier" selon votre fuseau horaire
- L'heure d'envoi varie selon votre offset UTC
- Exemples :
  - Europe/Paris (UTC+1) : Envoi à 02h00 locale
  - Asia/Jerusalem (UTC+2) : Envoi à 03h00 locale
  - America/New_York (UTC-5) : Envoi à 20h00 locale la veille

### Les élèves ne reçoivent pas les notifications

**Vérifications** :

1. L'élève est-il actif dans la classe ?
2. L'élève est-il marqué comme is_test = false ?
3. L'élève a-t-il eu de l'activité ?
4. Les paramètres de notification sont-ils corrects ?

**Solutions** :

- Vérifiez le statut de l'élève dans class_members
- Vérifiez la table notifications pour voir si elle a été créée
- Consultez la table daily_summaries pour l'audit trail

---

## Bonnes pratiques

### Configuration initiale

1. **Choisir un preset** : Utilisez un preset si possible (plus simple, moins d'erreurs)
2. **Tester sur une période** : Attendez une semaine complète pour valider
3. **Documenter** : Notez les paramètres choisis pour référence future

### Maintenance

1. **Vérifier régulièrement** : Consultez les logs du cron job chaque semaine
2. **Surveiller les erreurs** : Utilisez le Error Monitoring pour détecter les problèmes
3. **Communiquer** : Informez les enseignants des changements planifiés

### Changements de configuration

1. **Planifier** : Effectuez les changements pendant les vacances ou weekends
2. **Tester** : Vérifiez les résultats après le premier envoi
3. **Rollback** : Si problème, rétablissez la configuration précédente rapidement

---

## Références

### Fuseaux horaires IANA

La liste complète des fuseaux horaires IANA est disponible sur :

- https://en.wikipedia.org/wiki/List_of_tz_database_time_zones

### Documentation technique

- [Architecture technique](../architecture/daily-summaries-system.md)
- [Documentation API](../api/cron-endpoints.md)
- [Guide de migration](./daily-summaries-migration.md)

### Support

En cas de problème :

1. Consultez la section Dépannage ci-dessus
2. Vérifiez les logs Vercel du cron job
3. Consultez l'Error Monitoring pour les erreurs système
4. Contactez l'équipe technique si le problème persiste

---

**Mise à jour** : 2025-11-13
**Version** : 1.0.0
