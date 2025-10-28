# Guide de Démarrage Rapide - Périodes Académiques

> 🆕 2025-10-28

Configurez votre calendrier académique en 5 minutes ! Ce guide vous accompagne pas à pas dans la création de votre première année scolaire avec périodes et vacances.

---

## Objectif

À la fin de ce guide, vous aurez :

- ✅ Une année scolaire 2024-2025 créée et activée
- ✅ 3 trimestres configurés avec dates et couleurs
- ✅ 5 périodes de vacances enregistrées
- ✅ Une évaluation test liée automatiquement au bon trimestre

**Durée estimée** : 5-7 minutes

---

## Prérequis

- Rôle : **Administrateur** (admin)
- École : Au moins une école créée dans le système
- Navigateur : Chrome, Firefox, Safari ou Edge (version récente)

---

## Étape 1 : Accéder à l'Interface (30 secondes)

1. **Connexion**
   - Ouvrez UbuMaths dans votre navigateur
   - Connectez-vous avec votre compte administrateur

2. **Navigation**
   - Cliquez sur **Dashboard** dans la barre supérieure
   - Sélectionnez **Écoles** dans le menu
   - Cliquez sur l'école que vous souhaitez configurer

3. **Organisation**
   - Dans le menu de l'école, cliquez sur **Organisation**
   - Sélectionnez l'onglet **Périodes académiques**

Vous devriez voir une interface vide avec le message "Aucune année sélectionnée".

---

## Étape 2 : Créer l'Année Scolaire (1 minute)

1. **Ouvrir le Formulaire**
   - Cliquez sur le bouton **Créer** (à droite de "Année scolaire:")

2. **Remplir les Informations**

   ```
   Nom : 2024-2025
   Date de début : 02/09/2024
   Date de fin : 04/07/2025
   ☑ Année active (cochez la case)
   ```

3. **Enregistrer**
   - Cliquez sur le bouton **Enregistrer**
   - Confirmation : "Année scolaire créée avec succès"

4. **Vérifier**
   - L'année "2024-2025 (Active)" apparaît dans le sélecteur
   - L'interface affiche maintenant deux sections vides :
     - "Périodes d'enseignement"
     - "Vacances scolaires"

---

## Étape 3 : Créer les 3 Trimestres (2 minutes)

### Trimestre 1

1. **Ouvrir le Formulaire**
   - Section "Périodes d'enseignement"
   - Cliquez sur **Ajouter une période**

2. **Remplir les Informations**

   ```
   Type : Trimestre
   Nom : Trimestre 1
   Date de début : 02/09/2024
   Date de fin : 20/12/2024
   Ordre : 1
   Couleur : #3b82f6 (bleu - par défaut)
   ```

3. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Le Trimestre 1 apparaît dans le tableau avec une pastille bleue

### Trimestre 2

1. **Ajouter une Nouvelle Période**
   - Cliquez à nouveau sur **Ajouter une période**

2. **Remplir les Informations**

   ```
   Type : Trimestre
   Nom : Trimestre 2
   Date de début : 06/01/2025
   Date de fin : 04/04/2025
   Ordre : 2
   Couleur : #10b981 (vert)
   ```

3. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Le Trimestre 2 apparaît avec une pastille verte

### Trimestre 3

1. **Ajouter la Dernière Période**
   - Cliquez sur **Ajouter une période**

2. **Remplir les Informations**

   ```
   Type : Trimestre
   Nom : Trimestre 3
   Date de début : 22/04/2025
   Date de fin : 04/07/2025
   Ordre : 3
   Couleur : #8b5cf6 (violet)
   ```

3. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Le Trimestre 3 apparaît avec une pastille violette

**Résultat** : Vous devriez voir 3 trimestres dans le tableau, ordonnés de 1 à 3, avec des couleurs distinctes.

---

## Étape 4 : Créer les Vacances Scolaires (2 minutes)

### Vacances de la Toussaint

1. **Ouvrir le Formulaire**
   - Section "Vacances scolaires"
   - Cliquez sur **Ajouter des vacances**

2. **Remplir les Informations**

   ```
   Nom : Vacances de la Toussaint
   Date de début : 19/10/2024
   Date de fin : 03/11/2024
   ```

3. **Enregistrer**

### Vacances de Noël

1. **Ajouter une Nouvelle Période**

   ```
   Nom : Vacances de Noël
   Date de début : 21/12/2024
   Date de fin : 05/01/2025
   ```

2. **Enregistrer**

### Vacances d'Hiver

1. **Ajouter une Nouvelle Période**

   ```
   Nom : Vacances d'hiver
   Date de début : 15/02/2025
   Date de fin : 02/03/2025
   ```

2. **Enregistrer**

### Vacances de Printemps

1. **Ajouter une Nouvelle Période**

   ```
   Nom : Vacances de printemps
   Date de début : 12/04/2025
   Date de fin : 27/04/2025
   ```

2. **Enregistrer**

### Vacances d'Été

1. **Ajouter la Dernière Période**

   ```
   Nom : Vacances d'été
   Date de début : 05/07/2025
   Date de fin : 31/08/2025
   ```

2. **Enregistrer**

**Résultat** : Vous devriez voir 5 périodes de vacances dans le tableau, ordonnées par date de début.

---

## Étape 5 : Tester l'Assignation Automatique (1 minute)

1. **Créer une Évaluation Test**
   - Quittez la page Organisation (vous pouvez revenir ensuite)
   - Naviguez vers **Évaluations** dans le menu enseignant/admin
   - Créez une nouvelle évaluation :
     ```
     Titre : Test Math - Trimestre 1
     Classe : (sélectionnez une classe de votre école)
     Date : Assurez-vous que la date actuelle est entre le 02/09/2024 et le 20/12/2024
     ```
   - Enregistrez l'évaluation

2. **Vérifier le Lien Automatique**
   - L'évaluation devrait être automatiquement liée au **Trimestre 1**
   - Note : Le lien n'est visible que dans la base de données pour le moment
   - Vérification technique (optionnelle) :
     ```sql
     SELECT title, academic_period_id FROM assessments WHERE title LIKE 'Test Math%';
     ```
   - Le champ `academic_period_id` ne devrait PAS être NULL

**Important** : Si la date actuelle est en dehors des dates du Trimestre 1 (ex: nous sommes en mars 2025), l'évaluation sera liée au Trimestre 2 ou 3 selon la date.

---

## Étape 6 : Vue d'Ensemble et Vérification (30 secondes)

1. **Retourner à Organisation**
   - Dashboard → Écoles → [Votre école] → Organisation
   - Onglet "Périodes académiques"

2. **Vérifier la Configuration**
   - ✅ Année 2024-2025 marquée comme "Active"
   - ✅ 3 trimestres visibles avec couleurs distinctes
   - ✅ 5 périodes de vacances enregistrées
   - ✅ Dates cohérentes (pas de chevauchements entre trimestres)

3. **Tester les Fonctionnalités**
   - Cliquez sur **Modifier** pour un trimestre → Vérifiez que les données sont correctes
   - Cliquez sur **Annuler** pour ne pas modifier
   - Testez le sélecteur d'années (devrait afficher "2024-2025 (Active)")

---

## Étape 7 : Prochaines Étapes (Bonus)

Maintenant que votre calendrier académique est configuré, explorez ces fonctionnalités :

### Duplication d'Année (Pour l'Année Prochaine)

1. **Préparer 2025-2026**
   - Fin juin 2025, cliquez sur **Dupliquer**
   - Nouvelle année : 2025-2026
   - Décalage : 365 jours
   - ☑ Inclure périodes et vacances
   - Enregistrer

2. **Résultat**
   - L'année 2025-2026 est créée avec 3 trimestres et 5 vacances
   - Les dates sont automatiquement décalées de 365 jours
   - Vous devrez activer l'année manuellement en septembre 2025

### Personnalisation

1. **Ajuster les Couleurs**
   - Modifiez les couleurs des trimestres selon vos préférences
   - Utilisez des couleurs contrastées pour faciliter l'identification

2. **Ajouter des Jours Fériés**
   - Créez des périodes de vacances courtes (1-2 jours)
   - Exemple : Pont du 11 novembre, Ascension, etc.

3. **Ajuster les Dates**
   - Si votre calendrier académique change, modifiez les dates des périodes
   - Attention : Les évaluations déjà créées ne seront pas re-liées automatiquement

---

## Dépannage

### Problème : "Je ne vois pas le bouton Créer"

**Solution** : Vérifiez que vous êtes bien sur l'onglet "Périodes académiques" et non "Emploi du temps".

---

### Problème : "Erreur : duplicate key value violates unique constraint"

**Cause** : Vous avez tenté de créer deux périodes avec le même ordre (ex: deux "ordre 1").

**Solution** : Changez l'ordre pour qu'il soit unique (1, 2, 3, etc.).

---

### Problème : "Les vacances ne s'affichent pas"

**Solution** : Assurez-vous que l'année est bien sélectionnée dans le sélecteur en haut de page.

---

### Problème : "L'évaluation n'est pas liée automatiquement"

**Causes possibles** :

1. L'année n'est pas active → Activez-la via le bouton "Activer"
2. La date de l'évaluation est en dehors des périodes → Vérifiez les dates
3. Le trigger base de données est désactivé → Contactez l'équipe technique

---

## Récapitulatif : Ce Que Vous Avez Appris

Dans ce guide rapide, vous avez :

1. ✅ **Créé une année scolaire** avec dates et statut actif
2. ✅ **Organisé 3 trimestres** avec ordre et couleurs
3. ✅ **Défini 5 périodes de vacances** pour le calendrier
4. ✅ **Testé l'assignation automatique** des évaluations aux trimestres
5. ✅ **Exploré les fonctionnalités avancées** (duplication, personnalisation)

---

## Aller Plus Loin

Pour maîtriser toutes les fonctionnalités, consultez :

- **[Guide Utilisateur Complet](../features/academic-periods/user-guide.md)** - Tous les workflows détaillés
- **[Documentation API](../features/academic-periods/api-reference.md)** - Intégration programmatique
- **[Schéma Base de Données](../features/academic-periods/database.md)** - Détails techniques
- **[Vue d'Ensemble](../features/academic-periods/README.md)** - Architecture et cas d'usage

---

## Besoin d'Aide ?

- **Questions courantes** : Consultez la [FAQ du guide utilisateur](../features/academic-periods/user-guide.md#faq)
- **Support technique** : Contactez l'équipe UbuMaths
- **Suggestions** : Partagez vos retours pour améliorer la fonctionnalité

---

**Félicitations !** Votre calendrier académique est maintenant opérationnel. Les nouvelles évaluations seront automatiquement liées aux bons trimestres. 🎉

---

Dernière mise à jour : 2025-10-28
