# Guide Utilisateur - Périodes Académiques

> 🆕 2025-10-28

Guide complet pour les administrateurs scolaires gérant les années scolaires, périodes d'enseignement et vacances.

---

## Table des Matières

- [Accéder à la Fonctionnalité](#accéder-à-la-fonctionnalité)
- [Gestion des Années Scolaires](#gestion-des-années-scolaires)
- [Gestion des Périodes d'Enseignement](#gestion-des-périodes-denseignement)
- [Gestion des Vacances Scolaires](#gestion-des-vacances-scolaires)
- [Duplication d'Année](#duplication-dannée)
- [Bonnes Pratiques](#bonnes-pratiques)
- [Scénarios Courants](#scénarios-courants)
- [FAQ](#faq)

---

## Accéder à la Fonctionnalité

### Prérequis

- Rôle : **Administrateur** (admin)
- Accès : Dashboard administrateur
- Permissions : Gestion complète de l'organisation scolaire

### Chemin d'Accès

1. Connectez-vous à UbuMaths avec votre compte administrateur
2. Naviguez vers **Dashboard** → **Écoles**
3. Sélectionnez l'école que vous souhaitez gérer
4. Cliquez sur **Organisation** dans le menu de l'école
5. Sélectionnez l'onglet **Périodes académiques**

URL directe : `/dashboard/admin/schools/[schoolId]/organisation`

---

## Gestion des Années Scolaires

### Créer une Année Scolaire

1. **Ouvrir le Formulaire**
   - Dans l'onglet "Périodes académiques"
   - Cliquez sur le bouton **Créer** (à droite de "Année scolaire:")

2. **Remplir les Informations**
   - **Nom** : Format YYYY-YYYY (ex: 2024-2025)
     - ⚠️ Les années doivent être consécutives (2024-2025, pas 2024-2026)
   - **Date de début** : Premier jour de l'année scolaire (ex: 01/09/2024)
   - **Date de fin** : Dernier jour de l'année scolaire (ex: 30/06/2025)
   - **Année active** : Cochez si cette année doit être active immédiatement
     - Note : Une seule année peut être active à la fois

3. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - L'année apparaît dans le sélecteur d'années
   - Les années actives sont marquées "(Active)"

### Modifier une Année Scolaire

1. **Sélectionner l'Année**
   - Choisissez l'année dans le sélecteur
   - Vérifiez que c'est bien l'année à modifier

2. **Ouvrir l'Éditeur**
   - Cliquez sur le bouton **Modifier** (icône crayon)
   - Le formulaire se remplit avec les données actuelles

3. **Effectuer les Modifications**
   - Changez le nom, les dates, ou l'état actif
   - ⚠️ Attention : Modifier les dates peut affecter l'assignation des évaluations

4. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Les changements sont appliqués immédiatement

### Activer une Année

**Méthode 1 : Lors de la Création/Modification**

- Cochez la case "Année active" dans le formulaire

**Méthode 2 : Activation Rapide**

1. Sélectionnez l'année non-active dans le sélecteur
2. Cliquez sur le bouton **Activer** (à côté de la date)
3. Confirmation : L'année devient active, les autres années sont désactivées

**Effet de l'Activation :**

- L'année devient la référence pour les nouvelles évaluations
- Les évaluations créées sont automatiquement liées aux périodes de cette année
- Une seule année peut être active par école (contrainte base de données)

### Supprimer une Année

⚠️ **ATTENTION** : La suppression est irréversible et supprime également toutes les périodes et vacances associées.

1. **Sélectionner l'Année**
   - Choisissez l'année dans le sélecteur
   - Cliquez sur **Modifier**

2. **Initier la Suppression**
   - Dans le formulaire d'édition, cliquez sur **Supprimer** (bouton rouge en bas à gauche)
   - Une boîte de confirmation s'affiche

3. **Confirmer**
   - Lisez l'avertissement : "Cette action supprimera également toutes les périodes et vacances associées"
   - Cliquez sur **Supprimer** pour confirmer
   - Ou **Annuler** pour abandonner

**Données Supprimées :**

- L'année scolaire elle-même
- Toutes les périodes d'enseignement (trimestres/semestres)
- Toutes les vacances scolaires
- **Non supprimées** : Les évaluations restent, mais leur `academic_period_id` est mis à NULL

---

## Gestion des Périodes d'Enseignement

### Créer une Période

1. **Sélectionner une Année**
   - Choisissez l'année dans le sélecteur
   - Vous ne pouvez créer des périodes que pour l'année sélectionnée

2. **Ouvrir le Formulaire**
   - Section "Périodes d'enseignement"
   - Cliquez sur **Ajouter une période**

3. **Remplir les Informations**
   - **Type** : Choisissez parmi :
     - **Trimestre** : Pour un système à 3 périodes
     - **Semestre** : Pour un système à 2 périodes
     - **Quadrimestre** : Pour un système à 4 périodes (rare)
     - **Personnalisé** : Pour tout autre découpage
   - **Nom** : Nom descriptif (ex: "Trimestre 1", "1er Semestre")
   - **Date de début** : Premier jour de la période
   - **Date de fin** : Dernier jour de la période
   - **Ordre** : Numéro séquentiel (1, 2, 3...)
     - ⚠️ Doit être unique pour cette année
     - Maximum 10 périodes par année
   - **Couleur** : Couleur d'identification (défaut: bleu #3b82f6)
     - Utilisée dans les interfaces pour différencier visuellement les périodes

4. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - La période apparaît dans le tableau

### Modifier une Période

1. **Localiser la Période**
   - Dans le tableau "Périodes d'enseignement"
   - Trouvez la période à modifier

2. **Ouvrir l'Éditeur**
   - Cliquez sur l'icône **crayon** dans la colonne Actions
   - Le formulaire se remplit avec les données actuelles

3. **Effectuer les Modifications**
   - Changez le type, le nom, les dates, l'ordre ou la couleur
   - ⚠️ Modifier les dates peut affecter l'assignation automatique des évaluations

4. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Ou **Supprimer** pour supprimer la période (voir ci-dessous)

### Supprimer une Période

⚠️ **ATTENTION** : Les évaluations liées à cette période verront leur `academic_period_id` mis à NULL.

**Méthode 1 : Depuis le Tableau**

1. Cliquez sur l'icône **poubelle** dans la colonne Actions
2. Confirmez la suppression dans la boîte de dialogue

**Méthode 2 : Depuis l'Éditeur**

1. Ouvrez la période en édition
2. Cliquez sur **Supprimer** (bouton rouge en bas à gauche)
3. Confirmez

### Organiser les Périodes

**Ordre Séquentiel**

- Les périodes sont affichées par ordre croissant (`period_order`)
- L'ordre détermine l'affichage dans les interfaces
- Exemple : Trimestre 1 (ordre 1) → Trimestre 2 (ordre 2) → Trimestre 3 (ordre 3)

**Codes Couleur**

- Chaque période a une couleur distincte
- La couleur apparaît dans les bulletins, statistiques, et calendriers
- Suggestions :
  - Trimestre 1 : Bleu (#3b82f6)
  - Trimestre 2 : Vert (#10b981)
  - Trimestre 3 : Violet (#8b5cf6)

---

## Gestion des Vacances Scolaires

### Créer des Vacances

1. **Sélectionner une Année**
   - Choisissez l'année dans le sélecteur

2. **Ouvrir le Formulaire**
   - Section "Vacances scolaires"
   - Cliquez sur **Ajouter des vacances**

3. **Remplir les Informations**
   - **Nom** : Nom des vacances (ex: "Vacances de Noël", "Vacances de printemps")
   - **Date de début** : Premier jour de vacances
   - **Date de fin** : Dernier jour de vacances (inclus)

4. **Enregistrer**
   - Cliquez sur **Enregistrer**
   - Les vacances apparaissent dans le tableau

### Modifier des Vacances

1. **Localiser les Vacances**
   - Dans le tableau "Vacances scolaires"
   - Trouvez la période de vacances à modifier

2. **Ouvrir l'Éditeur**
   - Cliquez sur l'icône **crayon** dans la colonne Actions

3. **Effectuer les Modifications**
   - Changez le nom ou les dates

4. **Enregistrer**
   - Cliquez sur **Enregistrer**

### Supprimer des Vacances

**Méthode 1 : Depuis le Tableau**

1. Cliquez sur l'icône **poubelle** dans la colonne Actions
2. Confirmez : "Êtes-vous sûr de vouloir supprimer ces vacances ?"

**Méthode 2 : Depuis l'Éditeur**

1. Ouvrez les vacances en édition
2. Cliquez sur **Supprimer** (bouton rouge)
3. Confirmez

### Vacances Courantes (France)

**Exemples de Périodes de Vacances (Zone A, 2024-2025) :**

- **Vacances de la Toussaint** : 19/10/2024 - 03/11/2024
- **Vacances de Noël** : 21/12/2024 - 05/01/2025
- **Vacances d'hiver** : 15/02/2025 - 02/03/2025
- **Vacances de printemps** : 12/04/2025 - 27/04/2025
- **Vacances d'été** : 05/07/2025 - 31/08/2025

⚠️ Ajustez selon votre zone géographique (A, B, C) et calendrier académique.

---

## Duplication d'Année

### Cas d'Usage

Utilisez la duplication pour :

- Créer rapidement l'année suivante (2025-2026) à partir de 2024-2025
- Conserver la structure des périodes (3 trimestres, 2 semestres, etc.)
- Réutiliser les vacances scolaires avec un décalage de dates

### Procédure

1. **Préparer l'Année Source**
   - Assurez-vous que l'année active contient toutes les périodes et vacances souhaitées
   - Cette année servira de modèle

2. **Ouvrir l'Assistant de Duplication**
   - Cliquez sur le bouton **Dupliquer** (icône copie)
   - Note : Ce bouton n'apparaît que si une année active existe

3. **Configurer la Duplication**
   - **Source** : Affichée automatiquement (année active)
   - **Nouvelle année** : Entrez le nom (ex: 2025-2026)
     - Format obligatoire : YYYY-YYYY
   - **Décalage en jours** : Nombre de jours à ajouter aux dates (défaut: 365)
     - 365 = +1 an
     - -365 = -1 an (rare)
   - **Éléments à dupliquer** : Cochez les cases :
     - ☑ **Périodes d'enseignement** : Duplique les trimestres/semestres
     - ☑ **Vacances scolaires** : Duplique les périodes de vacances

4. **Exécuter**
   - Cliquez sur **Dupliquer**
   - Une nouvelle année est créée avec :
     - Dates décalées de X jours
     - Périodes copiées (même type, nom, ordre, couleur)
     - Vacances copiées (même nom)
     - État : Non-active (vous devez l'activer manuellement)

5. **Vérifier et Ajuster**
   - Sélectionnez la nouvelle année dans le sélecteur
   - Vérifiez que les dates sont correctes
   - Ajustez les noms si nécessaire (ex: "Trimestre 1 2024" → "Trimestre 1 2025")
   - Modifiez les dates de vacances si les calendriers changent

### Exemple Concret

**Année Source (2024-2025) :**

- Début : 02/09/2024
- Fin : 04/07/2025
- 3 trimestres
- 5 périodes de vacances

**Duplication avec décalage +365 jours :**

- Nouvelle année : 2025-2026
- Début : 01/09/2025 (2024-09-02 + 365 jours)
- Fin : 03/07/2026 (2025-07-04 + 365 jours)
- 3 trimestres (dates décalées)
- 5 périodes de vacances (dates décalées)

---

## Bonnes Pratiques

### Planification Initiale

1. **Créer l'Année en Avance**
   - Configurez la prochaine année scolaire 2-3 mois avant le début
   - Permet aux enseignants de planifier leurs cours

2. **Structure Cohérente**
   - Choisissez un système (trimestre ou semestre) et maintenez-le
   - Évitez de mélanger les types de périodes dans une même année

3. **Nommage Clair**
   - Utilisez des noms descriptifs : "Trimestre 1", "1er Semestre"
   - Évitez les abréviations ambiguës : "T1" peut prêter à confusion

4. **Couleurs Distinctes**
   - Attribuez des couleurs visuellement différentes à chaque période
   - Facilite l'identification dans les interfaces

### Gestion des Dates

1. **Pas de Chevauchement**
   - Les périodes d'enseignement ne doivent pas se chevaucher
   - Exemple : Trimestre 1 se termine le 20/12, Trimestre 2 commence le 06/01

2. **Vacances Entre Périodes**
   - Planifiez les vacances entre les trimestres/semestres
   - Marque une séparation claire pour les évaluations

3. **Dates Réalistes**
   - Alignez les dates avec le calendrier académique officiel
   - Vérifiez les jours fériés et ponts

### Activation d'Année

1. **Moment Optimal**
   - Activez la nouvelle année quelques jours avant son début
   - Évitez d'activer trop tôt (confusion pour les évaluations en cours)

2. **Communication**
   - Informez les enseignants du changement d'année active
   - Les nouvelles évaluations seront liées aux périodes de la nouvelle année

3. **Vérification**
   - Après activation, créez une évaluation test
   - Vérifiez qu'elle est bien liée à la bonne période

### Maintenance

1. **Archivage**
   - Conservez les années passées pour l'historique
   - Ne supprimez que si vous êtes certain de ne plus en avoir besoin

2. **Documentation**
   - Notez les dates importantes (réunions parents-profs, bulletins)
   - Utilisez le champ `metadata` pour stocker des infos custom

3. **Audit Régulier**
   - Vérifiez périodiquement la cohérence des périodes
   - Assurez-vous que les évaluations sont bien liées

---

## Scénarios Courants

### Scénario 1 : Mise en Place Initiale

**Contexte** : Première utilisation du système pour l'année 2024-2025.

**Étapes :**

1. Créer l'année 2024-2025 (02/09/2024 - 04/07/2025)
2. Cocher "Année active"
3. Créer 3 trimestres :
   - T1 : 02/09/2024 - 20/12/2024 (ordre 1, bleu)
   - T2 : 06/01/2025 - 04/04/2025 (ordre 2, vert)
   - T3 : 22/04/2025 - 04/07/2025 (ordre 3, violet)
4. Créer 5 périodes de vacances (Toussaint, Noël, Hiver, Printemps, Été)
5. Vérifier : Créer une évaluation et confirmer qu'elle est liée au Trimestre 1

**Résultat** : Calendrier académique complet et opérationnel.

---

### Scénario 2 : Transition Vers Nouvelle Année

**Contexte** : Fin juin 2025, préparation de l'année 2025-2026.

**Étapes :**

1. Sélectionner l'année 2024-2025 (actuellement active)
2. Cliquer sur **Dupliquer**
3. Configurer :
   - Nom : 2025-2026
   - Décalage : 365 jours
   - Inclure périodes : ☑
   - Inclure vacances : ☑
4. Cliquer sur **Dupliquer**
5. Sélectionner la nouvelle année 2025-2026
6. Vérifier les dates (ajuster si nécessaire)
7. Début septembre 2025 : Activer l'année 2025-2026

**Résultat** : Nouvelle année créée en 2 minutes, prête à l'emploi.

---

### Scénario 3 : Correction d'Erreur de Dates

**Contexte** : Les vacances de Noël ont été saisies avec une mauvaise date de fin.

**Étapes :**

1. Sélectionner l'année concernée
2. Section "Vacances scolaires"
3. Trouver "Vacances de Noël"
4. Cliquer sur l'icône **crayon**
5. Corriger la date de fin : 06/01/2025 (au lieu de 05/01/2025)
6. Cliquer sur **Enregistrer**

**Résultat** : Vacances corrigées, calendrier mis à jour.

---

### Scénario 4 : Ajout d'un Jour Férié

**Contexte** : Ajout d'un pont prolongé (vendredi + lundi) en novembre.

**Étapes :**

1. Sélectionner l'année active
2. Section "Vacances scolaires"
3. Cliquer sur **Ajouter des vacances**
4. Nom : "Pont de novembre"
5. Dates : 10/11/2024 - 13/11/2024
6. Cliquer sur **Enregistrer**

**Résultat** : Pont ajouté au calendrier, visible par tous les enseignants.

---

### Scénario 5 : Changement de Système (Trimestre → Semestre)

**Contexte** : L'école décide de passer de 3 trimestres à 2 semestres pour 2025-2026.

**Étapes :**

1. Créer l'année 2025-2026 (ne pas dupliquer)
2. Créer 2 périodes de type "Semestre" :
   - 1er Semestre : 01/09/2025 - 31/01/2026 (ordre 1, bleu)
   - 2nd Semestre : 02/02/2026 - 03/07/2026 (ordre 2, vert)
3. Créer les vacances appropriées
4. Activer l'année au moment voulu

**Résultat** : Nouveau système en place, distinct de l'année précédente.

---

## FAQ

### Questions Générales

**Q : Puis-je avoir plusieurs années actives en même temps ?**
**R :** Non. Une seule année peut être active par école (contrainte base de données). Cela garantit que les nouvelles évaluations sont liées aux bonnes périodes.

**Q : Que se passe-t-il si je supprime une année ?**
**R :** Toutes les périodes d'enseignement et vacances associées sont supprimées. Les évaluations restent, mais leur lien vers les périodes (`academic_period_id`) est mis à NULL.

**Q : Les enseignants peuvent-ils modifier les périodes ?**
**R :** Non. Seuls les administrateurs ont accès en modification. Les enseignants peuvent consulter le calendrier académique en lecture seule.

**Q : Puis-je créer une année scolaire sur 3 ans civils (ex: 2024-2026) ?**
**R :** Non. Le format YYYY-YYYY impose deux années consécutives (validation Zod). Pour des cycles longs, créez plusieurs années distinctes.

---

### Périodes d'Enseignement

**Q : Puis-je avoir 4 trimestres ?**
**R :** Techniquement oui (utilisez type "Quadrimestre" ou "Personnalisé"), mais le terme "trimestre" implique 3 périodes. Mieux vaut utiliser "quadrimestre" pour 4 périodes.

**Q : Les périodes peuvent-elles se chevaucher ?**
**R :** Rien ne l'empêche techniquement, mais c'est fortement déconseillé. Les chevauchements créent des ambiguïtés pour l'assignation automatique des évaluations.

**Q : Comment réordonner les périodes ?**
**R :** Modifiez le champ `period_order` de chaque période. Assurez-vous que les ordres restent uniques (1, 2, 3...).

**Q : Puis-je avoir plus de 10 périodes ?**
**R :** Non. La limite est de 10 périodes par année (validation Zod). Si vous avez besoin de plus, contactez l'équipe technique.

**Q : Que signifie la couleur d'une période ?**
**R :** La couleur est purement visuelle. Elle permet d'identifier rapidement une période dans les bulletins, graphiques et tableaux de bord.

---

### Assignation Automatique

**Q : Comment fonctionne l'assignation automatique des évaluations ?**
**R :** Un trigger base de données (`auto_assign_assessment_to_period`) s'exécute lors de la création d'une évaluation. Il cherche la période active dont les dates englobent la date de création de l'évaluation.

**Q : Une évaluation créée en janvier 2025 sera-t-elle liée au Trimestre 2 ?**
**R :** Oui, si le Trimestre 2 couvre la date 06/01/2025 - 04/04/2025 et que l'année est active. L'assignation est automatique.

**Q : Puis-je changer manuellement le lien d'une évaluation vers une autre période ?**
**R :** Oui, via l'API ou directement en base de données (modifier `academic_period_id` dans la table `assessments`). L'interface UI pour cela pourra être ajoutée ultérieurement.

**Q : Que se passe-t-il si une évaluation est créée pendant les vacances ?**
**R :** Le trigger cherche une période dont les dates englobent la date de création. Si aucune période ne correspond (ex: vacances entre deux trimestres), l'évaluation n'est pas liée (`academic_period_id` reste NULL).

---

### Duplication

**Q : La duplication copie-t-elle les évaluations ?**
**R :** Non. Seules l'année, les périodes et les vacances sont dupliquées. Les évaluations restent attachées à l'année d'origine.

**Q : Puis-je dupliquer une année non-active ?**
**R :** Non. Le bouton **Dupliquer** n'apparaît que si une année active existe. Activez d'abord l'année source, puis dupliquez.

**Q : Le décalage de 365 jours est-il toujours exact ?**
**R :** Presque. Les années bissextiles introduisent un décalage d'un jour. Vérifiez toujours les dates après duplication et ajustez si nécessaire.

**Q : Puis-je dupliquer sans inclure les vacances ?**
**R :** Oui. Décochez "Vacances scolaires" dans l'assistant de duplication. Seules l'année et les périodes seront copiées.

---

### Dépannage

**Q : J'ai créé une période mais elle n'apparaît pas.**
**R :** Vérifiez que vous avez bien sélectionné l'année correspondante dans le sélecteur en haut de page. Les périodes sont filtrées par année.

**Q : Le bouton "Dupliquer" est grisé.**
**R :** Aucune année active n'existe. Créez ou activez une année d'abord.

**Q : Je ne peux pas créer une année "2024-2026".**
**R :** Format invalide. Le nom doit être YYYY-YYYY avec deux années consécutives (ex: 2024-2025, 2025-2026).

**Q : Mes évaluations ne sont pas liées automatiquement.**
**R :** Vérifiez que :

1.  L'année est active
2.  Une période couvre la date de création de l'évaluation
3.  Le trigger `auto_assign_assessment_to_period` est actif en base de données

---

## Support Technique

Pour toute question non couverte par ce guide :

- **Documentation API** : Consultez [api-reference.md](./api-reference.md)
- **Schéma Base de Données** : Consultez [database.md](./database.md)
- **Guide Rapide** : Consultez [../../guides/academic-periods-quick-start.md](../../guides/academic-periods-quick-start.md)
- **Équipe Technique** : Contactez l'équipe de développement UbuMaths

---

Dernière mise à jour : 2025-10-28
