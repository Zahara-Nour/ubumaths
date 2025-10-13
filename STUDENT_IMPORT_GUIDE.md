# Guide d'importation des élèves

Ce guide explique comment pré-remplir les données des élèves avant leur première connexion avec Google Authentication.

## Vue d'ensemble

Le système permet aux administrateurs d'importer des élèves via un fichier CSV ou par copier-coller depuis un tableur (Excel, Google Sheets). Lorsque ces élèves se connectent pour la première fois avec leur compte Google, leurs profils sont automatiquement créés avec les données pré-remplies (nom, prénom, école, niveau, classes, etc.).

## Comment ça fonctionne

### 1. Préparation des données

Vous pouvez importer des élèves de deux façons :

#### Option A : Fichier CSV

Créez un fichier CSV avec les colonnes suivantes :

```csv
email,firstname,lastname,grade,gender,class1,class2
jean.dupont@school.com,Jean,Dupont,6ème,boy,MATH6A,
marie.martin@school.com,Marie,Martin,5ème,girl,MATH5A,MATH5B
```

#### Option B : Copier-coller depuis un tableur (Excel, Google Sheets) ⭐ RECOMMANDÉ

1. Préparez vos données dans Excel ou Google Sheets :

   | Email | Prénom | Nom | Niveau | Genre | Classe 1 | Classe 2 | Classe 3 |
   |-------|--------|-----|--------|-------|----------|----------|----------|
   | jean.dupont@school.com | Jean | Dupont | 6ème | boy | MATH6A | | |
   | marie.martin@school.com | Marie | Martin | 5ème | girl | MATH5A | MATH5B | |

2. Sélectionnez les lignes (incluant ou non l'en-tête)
3. Copiez (Ctrl+C ou Cmd+C)
4. Allez dans l'interface d'importation, onglet "Coller depuis tableur"
5. Collez (Ctrl+V ou Cmd+V) directement dans la zone de texte

**Colonnes requises :**
- `email` : L'adresse email Google de l'élève (OBLIGATOIRE - doit correspondre exactement au compte Google)
- `firstname` : Prénom de l'élève (OBLIGATOIRE)
- `lastname` : Nom de famille de l'élève (OBLIGATOIRE)
- `grade` : Niveau (ex: "6ème", "5ème", "4ème", "3ème", "2nde") (OPTIONNEL)
- `gender` : "boy" ou "girl" pour l'avatar par défaut (OPTIONNEL)
- `class1, class2, ...` : Codes de classe (join codes) pour inscrire l'élève automatiquement (OPTIONNEL)

**Important - À propos des codes de classe :**

⚠️ **Vous NE POUVEZ PAS inventer des codes de classe**. Les codes doivent correspondre aux **codes d'accès (join codes)** de classes déjà créées dans le système.

**Comment obtenir les codes de classe valides :**
1. Les classes doivent d'abord être créées par un enseignant
2. Chaque classe se voit attribuer un code d'accès unique (ex: MATH6A, PHYS5B)
3. Consultez la section "Codes de classe disponibles" sur la page d'importation
4. Utilisez EXACTEMENT ces codes dans votre import

**Validation automatique :**
- Le système vérifie que chaque code existe
- Les codes invalides sont rejetés avec un message d'erreur AVANT l'import
- Exemple d'erreur : "Code(s) de classe invalide(s): INVALID1, INVALID2"

**Si aucune classe n'existe encore :**
1. Créez d'abord les classes (en tant qu'enseignant)
2. Notez les codes d'accès générés
3. Puis importez les élèves avec ces codes

**Autres points importants :**
- L'email doit correspondre EXACTEMENT au compte Google que l'élève utilisera pour se connecter
- Vous pouvez spécifier autant de classes que nécessaire (colonnes supplémentaires)
- La page d'importation affiche la liste complète des codes de classe disponibles

### 2. Importation des élèves

1. Connectez-vous en tant qu'administrateur
2. Allez à `/dashboard/admin/import-students`
3. Sélectionnez l'école dans la liste déroulante
4. Choisissez votre méthode d'import :
   - **Fichier CSV** : Téléchargez votre fichier .csv
   - **Coller depuis tableur** : Collez vos données copiées depuis Excel/Sheets
5. Vérifiez l'aperçu des élèves à importer (avec les classes assignées)
6. Cliquez sur "Importer les élèves"

**Validation automatique :**
- Les emails invalides sont rejetés
- Les codes de classe inexistants sont signalés
- Les erreurs sont affichées clairement avant l'importation

### 3. Première connexion des élèves

Lorsqu'un élève se connecte pour la première fois avec Google :

1. Supabase Auth vérifie le compte Google
2. Le trigger `handle_new_user()` s'exécute automatiquement
3. Le système cherche l'email dans la table `pending_students`
4. Si trouvé :
   - Crée un profil avec les données pré-remplies (nom, école, niveau)
   - **Inscrit automatiquement l'élève dans les classes** spécifiées
   - Marque l'élève comme "activé"
5. Sinon : crée un profil par défaut (avec le rôle "student")
6. ✅ L'élève a immédiatement accès à toutes ses classes sans code d'accès

### 4. Suivi des élèves

Sur la page d'importation, vous pouvez voir :

- **Codes de classe disponibles** : Liste de tous les codes pour référence
- **Élèves en attente** : Pré-remplis mais pas encore connectés (avec leurs classes assignées)
- **Élèves activés** : Déjà connectés au moins une fois (avec date d'activation et classes)

## Détails techniques

### Sécurité avec Google Auth

**Question :** Les tokens Google Auth fonctionneront-ils avec des utilisateurs pré-remplis ?

**Réponse :** Oui, absolument ! Voici pourquoi :

- Les tokens Google sont gérés par Supabase Auth dans la table `auth.users`
- La table `profiles` (et `pending_students`) ne contient que des **données applicatives**
- Les deux systèmes sont **indépendants** mais liés par l'ID utilisateur
- Pré-remplir les données n'interfère pas avec l'authentification Google

**Workflow complet :**

```
1. Admin importe élèves → pending_students (avec emails + classes)
2. Élève clique "Se connecter avec Google"
3. Google vérifie identité → Supabase crée auth.users + token valide
4. Trigger handle_new_user() s'exécute
5. Trouve email dans pending_students
6. Crée profiles avec données pré-remplies
7. Inscrit automatiquement dans class_members pour chaque classe
8. ✅ Élève authentifié avec token Google + profil complet + classes assignées
```

### Migrations à appliquer

Après avoir récupéré ce code, exécutez les migrations :

```bash
pnpm db:migrate
```

Cela appliquera :
- `026_create_pending_students_table.sql` : Création de la table
- `027_update_handle_new_user_trigger.sql` : Mise à jour du trigger (version 1)
- `028_add_class_ids_to_pending_students.sql` : Ajout du champ class_ids
- `029_update_handle_new_user_with_classes.sql` : Mise à jour du trigger (version 2 - avec inscription automatique)

### Structure de la base de données

**Table `pending_students` :**
- Stocke les données des élèves avant leur première connexion
- `email` doit être UNIQUE
- `class_ids` : Array de UUIDs des classes auxquelles l'élève sera inscrit
- `is_activated` indique si l'élève s'est déjà connecté
- Policies RLS : admin uniquement

**Trigger `handle_new_user()` :**
- S'exécute automatiquement après création d'un utilisateur dans `auth.users`
- Cherche l'email dans `pending_students`
- Crée le profil avec les bonnes données
- **Inscrit l'élève dans les classes** (via `class_members`)
- Marque l'élève comme activé

## Gestion des erreurs

### Email en doublon
Si vous essayez d'importer un email déjà présent, vous recevrez une erreur. Supprimez d'abord l'ancien avant de réimporter.

### Email invalide
Le système vérifie que chaque email contient un "@". Les emails invalides sont rejetés avant l'importation.

### École manquante
Vous devez sélectionner une école avant de pouvoir importer.

### Code de classe invalide

**Erreur typique :** "Code(s) de classe invalide(s): MATH7A, INVALID"

**Cause :** Vous avez utilisé un code de classe qui n'existe pas dans le système.

**Solution :**
1. Consultez la section "Codes de classe disponibles" sur la page d'importation
2. Vérifiez que vous utilisez EXACTEMENT les codes affichés (sensible à la casse)
3. Si la classe n'existe pas, créez-la d'abord (en tant qu'enseignant)
4. Vous ne pouvez PAS inventer vos propres codes - ils sont générés automatiquement par le système

### Email ne correspond pas
Si un élève se connecte avec un email différent de celui pré-rempli, il obtiendra un profil par défaut (sans les données pré-remplies ni les classes). Assurez-vous que les emails correspondent exactement.

## Exemple complet

### Préparation dans Google Sheets

| Email | Prénom | Nom | Niveau | Genre | MATH6A | MATH6B |
|-------|--------|-----|--------|-------|--------|--------|
| alice.bernard@voltaire.com | Alice | Bernard | 6ème | girl | MATH6A | |
| bob.charles@voltaire.com | Bob | Charles | 6ème | boy | MATH6A | |
| claire.dubois@voltaire.com | Claire | Dubois | 5ème | girl | MATH5A | MATH5B |

### Importation

1. Sélectionnez toutes les lignes (avec ou sans en-tête)
2. Copiez (Ctrl+C)
3. Allez sur `/dashboard/admin/import-students`
4. Sélectionnez l'école "Lycée Franco-Qatari Voltaire"
5. Cliquez sur l'onglet "Coller depuis tableur"
6. Collez (Ctrl+V) dans la zone de texte
7. Cliquez sur "Analyser les données"
8. Vérifiez l'aperçu :
   - Alice Bernard → MATH6A
   - Bob Charles → MATH6A
   - Claire Dubois → MATH5A, MATH5B
9. Cliquez sur "Importer les élèves"

### Résultat après première connexion

**Alice se connecte avec alice.bernard@voltaire.com :**
- ✅ Profil créé avec prénom "Alice" et nom "Bernard"
- ✅ École "Lycée Franco-Qatari Voltaire" assignée
- ✅ Niveau "6ème" assigné
- ✅ Genre "girl" pour avatar
- ✅ **Automatiquement inscrite dans la classe MATH6A**
- ✅ Rôle "student"
- ✅ Prête à utiliser l'application immédiatement

**Claire se connecte avec claire.dubois@voltaire.com :**
- ✅ **Automatiquement inscrite dans MATH5A ET MATH5B**
- ✅ Peut voir les deux classes dans son tableau de bord

## Avantages de cette approche

1. **Gain de temps massif** : Plus besoin de codes d'accès pour chaque classe
2. **Expérience élève optimale** : Connexion → tout est prêt
3. **Flexible** : Tableur ou CSV selon votre préférence
4. **Sécurisé** : Google Auth gère l'authentification
5. **Traçable** : Vous voyez qui s'est connecté et quand
6. **Évolutif** : Supporte des dizaines/centaines d'élèves

## Notes importantes

1. **L'email est la clé** : Il doit correspondre EXACTEMENT au compte Google
2. **Sensibilité à la casse** : Les emails sont convertis en minuscules automatiquement
3. **Google Workspace** : Fonctionne avec les comptes Google Workspace (G Suite) des écoles
4. **Comptes personnels** : Fonctionne aussi avec gmail.com personnel
5. **Pas de mot de passe** : Inutile de créer des mots de passe, tout passe par Google
6. **Sécurité** : Les élèves ne peuvent voir que leurs propres données (RLS activé)
7. **Codes de classe** : Doivent être les codes d'accès (join_code) affichés dans l'interface
8. **Copier-coller recommandé** : Plus rapide et moins d'erreurs que CSV

## Support

Pour toute question ou problème :
1. Vérifiez les logs dans la console Supabase
2. Assurez-vous que les migrations sont appliquées (`pnpm db:migrate`)
3. Vérifiez que l'utilisateur admin a bien le rôle "admin" dans la table `profiles`
4. Consultez la liste des codes de classe disponibles sur la page d'importation
