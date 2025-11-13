# Résumés quotidiens et récompenses hebdomadaires

**Status** : Production (2025-11-13)
**Type** : Feature automatisée
**Cible** : Élèves et enseignants

---

## Vue d'ensemble

Le système de résumés quotidiens et récompenses hebdomadaires envoie automatiquement des notifications aux élèves pour les tenir informés de leur activité quotidienne et récompenser leur bon comportement hebdomadaire.

### Objectifs

- **Engagement** : Maintenir les élèves informés de leur progression quotidienne
- **Motivation** : Récompenser le bon comportement avec 1 gidouille par semaine
- **Transparence** : Offrir une visibilité complète sur l'activité (gains, pertes, avertissements, cartes VIP)
- **Automatisation** : Éliminer le travail manuel des enseignants

### Fonctionnement

Le système fonctionne en deux parties complémentaires :

1. **Résumés quotidiens** : Envoyés chaque jour de cours pour résumer l'activité de la veille
2. **Récompenses hebdomadaires** : Attribuées automatiquement le dernier jour de la semaine scolaire

---

## Résumés quotidiens

### Qu'est-ce qu'un résumé quotidien ?

Un résumé quotidien est une notification envoyée à chaque élève le matin pour lui présenter son activité de la journée précédente.

### Quand sont envoyés les résumés ?

- **Timing** : Chaque matin à 01h00 UTC (heure locale selon le fuseau horaire de l'école)
- **Condition** : Uniquement les jours où la classe a eu cours la veille
- **Filtrage** : Seuls les élèves ayant eu de l'activité reçoivent une notification

### Que contient un résumé quotidien ?

Le résumé inclut toutes les modifications de la journée précédente :

#### Gidouilles (monnaie virtuelle)

- **Gagnées** : Nombre de gidouilles reçues (récompenses, bonus)
- **Perdues** : Nombre de gidouilles retirées (sanctions)
- **Net** : Différence entre gains et pertes

#### Bonus

- **Gagnés** : Points bonus attribués
- **Utilisés** : Points bonus dépensés

#### Avertissements

- **Émis** : Nouveaux avertissements reçus (types C, M, R, T)
- **Retirés** : Avertissements supprimés par l'enseignant

#### Cartes VIP

- **Gagnées** : Nouvelles cartes VIP acquises (Joker Homework, Extra Time, etc.)
- **Utilisées** : Cartes VIP consommées

### Exemple de notification

```
📊 Résumé du 12 novembre 2025

Gidouilles: +5 | -2 (net: +3)
Bonus: +2 | -1 (net: +1)
Avertissements: 1 émis, 0 retirés
Cartes VIP: 2 gagnées, 1 utilisée

Bon travail ! Continue comme ça.
```

---

## Récompenses hebdomadaires

### Qu'est-ce qu'une récompense hebdomadaire ?

Une récompense hebdomadaire est **1 gidouille** automatiquement attribuée aux élèves qui n'ont reçu **aucun avertissement** durant la semaine scolaire précédente.

### Critères d'éligibilité

Pour recevoir la récompense hebdomadaire, un élève doit :

1. Être membre actif d'une classe
2. Ne pas être un compte de test
3. N'avoir **aucun avertissement actif** durant la semaine écoulée

Un seul avertissement suffit à disqualifier l'élève pour cette semaine.

### Quand sont attribuées les récompenses ?

- **Timing** : Chaque matin à 01h00 UTC (heure locale selon le fuseau horaire de l'école)
- **Jour** : Uniquement le dernier jour de la semaine scolaire (configuré par l'école)
- **Période** : Évalue la semaine écoulée (du premier au dernier jour de la semaine)

### Exemples de calendriers scolaires

#### Système israélien (par défaut)

- **Jours de cours** : Dimanche à jeudi
- **Weekend** : Vendredi et samedi
- **Récompenses** : Distribuées le **dimanche matin** (évalue la semaine dim-sam précédente)

#### Système occidental

- **Jours de cours** : Lundi à vendredi
- **Weekend** : Samedi et dimanche
- **Récompenses** : Distribuées le **lundi matin** (évalue la semaine lun-dim précédente)

#### Système Moyen-Orient

- **Jours de cours** : Dimanche à jeudi
- **Weekend** : Vendredi et samedi
- **Récompenses** : Distribuées le **dimanche matin**

### Exemple de notification

```
🎉 Récompense hebdomadaire !

Bravo ! Tu n'as reçu aucun avertissement cette semaine.
Tu gagnes 1 gidouille.

Continue comme ça !
```

---

## Comment consulter vos notifications

### Pour les élèves

1. **Icône de cloche** : Cliquez sur l'icône de notification dans la barre de navigation
2. **Badge rouge** : Indique le nombre de nouvelles notifications non lues
3. **Dropdown** : Affiche les 5 dernières notifications
4. **Page complète** : Cliquez sur "Voir toutes les notifications" pour l'historique complet

### Types d'affichage

Les notifications peuvent apparaître de trois façons :

- **Banner** : Affichage en haut de la page (notifications urgentes)
- **Dropdown** : Menu déroulant dans la barre de navigation (notifications importantes)
- **Page** : Visible uniquement dans la page des notifications (notifications normales)

Les résumés quotidiens et récompenses hebdomadaires utilisent le mode **dropdown** avec priorité **normale**.

---

## Historique et audit

### Historique des résumés quotidiens

Chaque résumé quotidien est enregistré dans la base de données avec :

- Date du résumé
- Détails complets de l'activité
- Horodatage d'envoi de la notification
- Classe et élève concernés

### Historique des récompenses hebdomadaires

Chaque récompense hebdomadaire est enregistrée avec :

- Dates de début et fin de semaine
- Nombre de gidouilles attribuées (toujours 1)
- Raison de la récompense ("no_warnings")
- Date d'attribution

### Accès à l'historique

- **Élèves** : Peuvent consulter uniquement leurs propres résumés et récompenses
- **Enseignants** : Peuvent consulter les résumés et récompenses de leurs élèves
- **Admins** : Ont accès à tous les résumés et récompenses de l'école

---

## Configuration

### Configuration de l'école

Pour que le système fonctionne correctement, votre école doit être configurée avec :

1. **Fuseau horaire** : Fuseau horaire IANA (ex : Europe/Paris, Asia/Jerusalem)
2. **Structure de la semaine** : Configuration des jours de cours et de weekend

Ces paramètres sont configurés par les administrateurs. Voir le [Guide de configuration de l'école](../guides/school-configuration.md).

### Configuration des classes

Chaque classe doit avoir :

- **Emploi du temps** : Horaires des cours (pour déterminer les jours de cours)
- **Membres actifs** : Liste des élèves actifs dans la classe

---

## Questions fréquentes

### Pourquoi n'ai-je pas reçu de résumé quotidien ?

Plusieurs raisons possibles :

1. **Pas de cours hier** : Le résumé n'est envoyé que les jours où la classe a eu cours la veille
2. **Aucune activité** : Si vous n'avez eu aucune activité (0 partout), aucune notification n'est envoyée
3. **Compte de test** : Les comptes de test ne reçoivent pas de notifications
4. **Problème technique** : Vérifiez vos paramètres de notification ou contactez votre enseignant

### Pourquoi n'ai-je pas reçu la récompense hebdomadaire ?

Plusieurs raisons possibles :

1. **Avertissements** : Vous avez reçu au moins un avertissement durant la semaine
2. **Pas le bon jour** : Les récompenses sont distribuées uniquement le dernier jour de la semaine scolaire
3. **Compte inactif** : Votre compte est marqué comme inactif dans la classe
4. **Compte de test** : Les comptes de test ne reçoivent pas de récompenses

### Comment savoir si j'ai des avertissements actifs ?

1. Consultez la page "Avertissements" dans votre dashboard étudiant
2. Les avertissements actifs (non supprimés) sont affichés avec leur date et type
3. Votre score comportemental (note/20) est calculé automatiquement

### Puis-je recevoir plusieurs récompenses dans une semaine ?

Non. La récompense hebdomadaire est unique :

- 1 gidouille par semaine maximum
- Uniquement si aucun avertissement durant toute la semaine
- Distribuée le dernier jour de la semaine scolaire

### Les avertissements supprimés comptent-ils ?

Non. Seuls les avertissements **actifs** (non supprimés) sont comptabilisés :

- Pour les récompenses hebdomadaires : Seuls les avertissements avec `deleted_at IS NULL` bloquent la récompense
- Pour les résumés quotidiens : Les deux sont affichés séparément ("émis" vs "retirés")

### Que se passe-t-il si je change de classe ?

- Les résumés quotidiens sont liés à votre appartenance à une classe
- Si vous changez de classe, vous recevrez des résumés pour votre nouvelle classe
- L'historique de vos anciennes classes reste accessible

### Les résumés tiennent-ils compte des fuseaux horaires ?

Oui ! Le système est multi-timezone :

- Chaque école a son propre fuseau horaire
- "Hier" est calculé selon le fuseau horaire de l'école
- Les récompenses hebdomadaires respectent la configuration de semaine de l'école

---

## Support

### Pour les élèves

En cas de problème :

1. Vérifiez vos paramètres de notification
2. Consultez la page "Notifications" pour voir l'historique
3. Contactez votre enseignant si des informations semblent incorrectes

### Pour les enseignants

En cas de problème :

1. Vérifiez la configuration de votre école (fuseau horaire, semaine)
2. Vérifiez l'emploi du temps de votre classe
3. Consultez les logs d'exécution du cron job (demander à l'admin)
4. Contactez l'administrateur système si le problème persiste

### Pour les administrateurs

Voir :

- [Guide de configuration de l'école](../guides/school-configuration.md)
- [Architecture technique](../architecture/daily-summaries-system.md)
- [Documentation API](../api/cron-endpoints.md)

---

**Mise à jour** : 2025-11-13
**Version** : 1.0.0
