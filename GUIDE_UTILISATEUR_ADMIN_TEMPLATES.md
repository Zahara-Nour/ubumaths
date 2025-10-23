# 📚 Guide Utilisateur - Templates de Messages (Admin)

**Version** : 2.0.0
**Pour** : Administrateurs
**Dernière mise à jour** : 22 octobre 2025

---

## 📖 Table des Matières

1. [Introduction](#introduction)
2. [Accéder aux Templates](#accéder-aux-templates)
3. [Créer un Template](#créer-un-template)
4. [Variables et Filtres](#variables-et-filtres)
5. [Gérer les Templates](#gérer-les-templates)
6. [Statistiques](#statistiques)
7. [Bonnes Pratiques](#bonnes-pratiques)
8. [FAQ](#faq)

---

## 🎯 Introduction

### Qu'est-ce qu'un Template de Message ?

Un **template de message** est un modèle de message pré-rempli qui permet d'automatiser la communication avec les étudiants et les professeurs. Au lieu d'écrire le même type de message à chaque fois, vous créez un template une fois et le système le remplit automatiquement avec les bonnes informations.

### Exemple Concret

**Sans template** :
```
Sujet : Question sur l'évaluation "Devoir Maison #3"
Corps :
Bonjour Marie Dupont,

J'ai une question concernant l'évaluation "Devoir Maison #3"
qui est à rendre pour le 15/11/2025...
```

**Avec template** :
```
Sujet : Question sur {{assessment_title}}
Corps :
Bonjour {{student_name}},

J'ai une question concernant l'évaluation "{{assessment_title}}"
qui est à rendre pour le {{assessment_due_date | date:short}}...
```

Le système remplace automatiquement :
- `{{assessment_title}}` → "Devoir Maison #3"
- `{{student_name}}` → "Marie Dupont"
- `{{assessment_due_date | date:short}}` → "15/11/2025"

### Avantages

✅ **Gain de temps** : Créez une fois, utilisez plusieurs fois
✅ **Cohérence** : Tous les messages suivent le même format
✅ **Personnalisation** : Chaque message est personnalisé automatiquement
✅ **Moins d'erreurs** : Les informations sont remplies automatiquement
✅ **Suivi** : Statistiques sur l'utilisation des templates

---

## 🚀 Accéder aux Templates

### Navigation

1. Connectez-vous en tant qu'administrateur
2. Allez dans **Dashboard** → **Templates de Messages**
3. URL : `https://votresite.com/dashboard/admin/message-templates`

### Interface Principale

L'interface est divisée en 3 sections :

```
┌─────────────────────────────────────────────────────┐
│ [Rechercher...] [Filtres] [⭐ Favoris] [Statistiques] [+ Nouveau] │
├─────────────────────────────────────────────────────┤
│ Tags: [urgent] [rappel] [info] [évaluation]        │
├─────────────────────────────────────────────────────┤
│ 📋 Template 1                           [⭐] [⋮]   │
│ 📋 Template 2                           [☆] [⋮]   │
│ 📋 Template 3                           [⭐] [⋮]   │
└─────────────────────────────────────────────────────┘
```

---

## ✏️ Créer un Template

### Étape 1 : Ouvrir le Formulaire

1. Cliquez sur le bouton **"+ Nouveau template"** en haut à droite
2. Une fenêtre s'ouvre avec deux onglets : **Édition** et **Prévisualisation**

### Étape 2 : Remplir les Informations de Base

#### **Titre** (obligatoire)
Le nom interne du template. Visible uniquement par vous.

**Exemples** :
- ✅ "Question sur évaluation - Standard"
- ✅ "Rappel rendu devoir - Urgent"
- ❌ "Template 1" (trop vague)

#### **Description** (optionnel)
Décrit l'objectif du template.

**Exemple** :
```
Template utilisé quand un étudiant a une question
sur une évaluation en cours.
```

#### **Classe** (pour templates de classe uniquement)
Sélectionnez "Aucune (Système)" pour un template utilisable par tous, ou choisissez une classe spécifique.

**💡 Conseil** : Les templates système sont visibles par tous les professeurs.

#### **Type de Déclencheur**
Choisissez le contexte d'utilisation :

| Type | Quand l'utiliser |
|------|------------------|
| **Message général** | Communication générale, pas de contexte spécifique |
| **Question sur évaluation** | Étudiant pose une question sur un devoir/test |
| **Aide SRS** | Demande d'aide sur les cartes de révision |
| **Notification système** | Alertes automatiques du système |
| **Réponse énigme** | Soumission de réponse à une énigme (futur) |

#### **Tags**
Ajoutez des mots-clés pour organiser vos templates.

**Exemples** :
- `urgent`, `rappel`, `info`, `évaluation`, `aide`, `feedback`

**💡 Astuce** : Utilisez des tags cohérents pour faciliter la recherche.

### Étape 3 : Rédiger le Sujet

Le sujet du message avec variables.

**Exemples** :

```
Question sur {{assessment_title}}
```

```
Rappel : {{assessment_title}} - Échéance {{assessment_due_date | date:short}}
```

```
Réponse à votre question sur {{topic}}
```

### Étape 4 : Rédiger le Corps

Utilisez l'éditeur de texte enrichi pour le contenu du message.

#### 🔧 Outils disponibles :
- **Formatage** : Gras, italique, souligné
- **Titres** : H1, H2, H3
- **Listes** : Numérotées ou à puces
- **Couleurs** : Texte et surlignage
- **Formules mathématiques** : LaTeX
- **Émojis** : 😊
- **Code** : Blocs de code

#### 📝 Exemple de Corps

```html
<p>Bonjour {{student_name | capitalize}},</p>

<p>Merci pour votre question concernant <strong>{{assessment_title}}</strong>.</p>

{{#if assessment_due_date}}
  <p>⏰ <strong>Rappel</strong> : Cette évaluation est à rendre
  pour le {{assessment_due_date | date:long}}.</p>
{{/if}}

<p>Je vous répondrai dans les plus brefs délais.</p>

<p>Cordialement,<br>
{{teacher_name}}</p>
```

### Étape 5 : Insérer des Variables

#### Méthode 1 : Bouton "Insérer variable/filtre"

1. Cliquez sur le bouton **"# Insérer variable/filtre"**
2. Une popup s'ouvre avec deux onglets : **Variables** et **Filtres**
3. Recherchez la variable souhaitée
4. Cliquez dessus pour l'insérer

#### Méthode 2 : Saisie Manuelle

Tapez directement `{{nom_variable}}` dans le texte.

**Syntaxe** :
```
{{nom_variable}}
```

#### Variables Disponibles

Les variables disponibles dépendent du **Type de déclencheur** choisi.

##### 🌍 Variables Globales (disponibles partout)

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{student_name}}` | Nom complet de l'étudiant | "Marie Dupont" |
| `{{student_first_name}}` | Prénom de l'étudiant | "Marie" |
| `{{teacher_name}}` | Nom du professeur | "M. Martin" |
| `{{class_name}}` | Nom de la classe | "2nde A" |
| `{{today_date}}` | Date d'aujourd'hui | "22/10/2025" |
| `{{today_time}}` | Heure actuelle | "14:30" |

##### 📊 Variables pour "Question sur évaluation"

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{assessment_title}}` | Titre de l'évaluation | "Devoir Maison #3" |
| `{{assessment_due_date}}` | Date d'échéance | "2025-11-15" |
| `{{question_number}}` | Numéro de question | "5" |
| `{{student_question}}` | Question de l'étudiant | "Je ne comprends pas..." |

##### 🎴 Variables pour "Aide SRS"

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{deck_title}}` | Titre du deck | "Trigonométrie" |
| `{{card_question}}` | Question de la carte | "Quelle est la formule..." |
| `{{help_message}}` | Message d'aide | "J'ai besoin d'aide..." |

##### 🔔 Variables pour "Notification système"

| Variable | Description | Exemple |
|----------|-------------|---------|
| `{{notification_type}}` | Type de notification | "Nouveau devoir" |
| `{{notification_message}}` | Message | "Un nouveau devoir..." |
| `{{action_url}}` | Lien d'action | "/dashboard/..." |

### Étape 6 : Utiliser les Filtres

Les **filtres** permettent de modifier l'affichage des variables.

#### 📖 Syntaxe

```
{{variable | filtre}}
{{variable | filtre:argument}}
{{variable | filtre1 | filtre2}}  ← Chaînage
```

#### ✨ Filtres de Texte

```
{{student_name | uppercase}}
→ "MARIE DUPONT"

{{student_name | lowercase}}
→ "marie dupont"

{{student_name | capitalize}}
→ "Marie Dupont"

{{description | truncate:50}}
→ "Voici une longue description qui sera tronqu..."

{{html_content | striptags}}
→ Supprime toutes les balises HTML

{{user_input | escape}}
→ Échappe les caractères HTML dangereux
```

#### 🔢 Filtres de Nombres

```
{{student_count | number}}
→ "1 234" (avec séparateur de milliers)

{{price | currency:EUR}}
→ "24,99 €"

{{score | percent}}
→ "85,5%"
```

#### 📅 Filtres de Dates

```
{{assessment_due_date | date:short}}
→ "15/11/2025"

{{assessment_due_date | date:long}}
→ "15 novembre 2025"

{{created_at | time}}
→ "14:30"
```

#### 📋 Filtres de Tableaux

```
{{tags | join:', '}}
→ "urgent, important, rappel"

{{students | first}}
→ Premier élément du tableau

{{students | last}}
→ Dernier élément du tableau
```

#### 🔧 Filtres Utilitaires

```
{{optional_field | default:'Non spécifié'}}
→ "Non spécifié" si vide

{{count | pluralize:'élève,élèves'}}
→ "1 élève" ou "2 élèves"
```

#### 💡 Aide sur les Filtres

Cliquez sur le bouton **"❓ Aide sur les filtres"** pour voir tous les filtres disponibles avec des exemples.

### Étape 7 : Utiliser les Conditions

Les **conditions** permettent d'afficher du contenu uniquement si une variable existe.

#### 📖 Syntaxe

```
{{#if variable}}
  Contenu affiché si la variable existe et n'est pas vide
{{else}}
  Contenu affiché sinon (optionnel)
{{/if}}
```

#### 📝 Exemples

##### Afficher la date d'échéance seulement si elle existe

```html
{{#if assessment_due_date}}
  <p>⏰ <strong>Date limite :</strong> {{assessment_due_date | date:long}}</p>
{{else}}
  <p>✨ Pas de date limite (prenez votre temps !)</p>
{{/if}}
```

##### Afficher un message urgent

```html
{{#if urgent}}
  <p class="text-red-600">⚠️ <strong>URGENT - Action requise</strong></p>
{{/if}}
```

##### Message différent selon le contexte

```html
{{#if is_first_time}}
  <p>Bienvenue ! C'est votre première question.</p>
{{else}}
  <p>Content de vous revoir !</p>
{{/if}}
```

### Étape 8 : Prévisualiser

1. Cliquez sur l'onglet **"Prévisualisation"**
2. Le système affiche le rendu du template avec des données d'exemple
3. La prévisualisation se met à jour automatiquement (500ms de délai)

**💡 Vérifiez** :
- Les variables sont bien remplacées
- Les filtres fonctionnent correctement
- Les conditions s'affichent comme prévu
- Le formatage est correct

### Étape 9 : Enregistrer

1. Cochez **"Template actif"** si vous voulez qu'il soit utilisable immédiatement
2. Cliquez sur **"Créer"**
3. ✅ Le template est créé et apparaît dans la liste !

---

## 🔧 Gérer les Templates

### Recherche et Filtres

#### 🔍 Recherche Textuelle

Tapez dans la barre de recherche en haut à gauche. La recherche porte sur :
- Le titre du template
- La description
- Le sujet
- Le corps du message

**Exemple** : Tapez "évaluation" pour trouver tous les templates liés aux évaluations.

#### 🎯 Filtres Avancés

##### Filtre par Scope
- **Système** : Templates utilisables par tous les professeurs
- **Classe** : Templates spécifiques à une classe

##### Filtre par Type de Déclencheur
Sélectionnez le type : Message général, Question sur évaluation, etc.

##### Filtre par Tags
Cliquez sur un tag pour filtrer. Cliquez à nouveau pour désactiver.

**💡 Astuce** : Vous pouvez combiner plusieurs tags.

##### ⭐ Favoris Uniquement
Cliquez sur le bouton "Favoris uniquement" pour voir seulement vos templates favoris.

### Actions sur les Templates

#### ⭐ Ajouter aux Favoris

1. Cliquez sur l'icône étoile (☆) à côté du titre
2. L'étoile devient jaune (⭐)
3. Le template est ajouté à vos favoris

**Utilité** : Accès rapide à vos templates les plus utilisés.

#### 📋 Dupliquer un Template

1. Cliquez sur l'icône **copier** (📋)
2. Entrez le titre du nouveau template
3. Le template est copié avec toutes ses propriétés

**💡 Cas d'usage** :
- Créer des variantes d'un template existant
- Adapter un template système pour une classe spécifique

#### 📜 Voir l'Historique des Versions

1. Cliquez sur l'icône **historique** (⏱️)
2. Une fenêtre s'ouvre avec toutes les versions précédentes
3. Chaque version affiche :
   - Date et heure de modification
   - Titre et sujet du template à ce moment-là

##### Restaurer une Version

1. Dans l'historique, cliquez sur **"Restaurer"** pour la version souhaitée
2. Confirmez la restauration
3. ⚠️ Attention : Les modifications actuelles seront perdues

**💡 Utilité** : Annuler des modifications non souhaitées.

#### ✏️ Modifier un Template

1. Cliquez sur l'icône **éditer** (✏️)
2. Modifiez les champs souhaités
3. Cliquez sur **"Mettre à jour"**

**💡 Note** : Chaque modification crée automatiquement une version dans l'historique.

#### 🗑️ Supprimer un Template

1. Cliquez sur l'icône **corbeille** (🗑️)
2. Confirmez la suppression
3. ⚠️ Attention : La suppression est définitive (sauf si vous avez une sauvegarde)

#### 📤 Expand/Collapse

Cliquez sur le chevron (⌄) pour voir le corps complet du template dans la carte.

---

## 📊 Statistiques

### Accéder aux Statistiques

1. Cliquez sur le bouton **"📊 Statistiques"** en haut de la page
2. Vous accédez au dashboard des statistiques

### Métriques Disponibles

#### 🎯 Vue d'Ensemble (4 cartes)

##### 1. Utilisations Totales
- Nombre total de fois que des templates ont été utilisés
- Nombre de templates actifs

##### 2. Taux de Complétion
- Pourcentage de templates utilisés et complétés (message envoyé)
- Ratio complétés/totaux

##### 3. Utilisateurs Actifs
- Nombre d'utilisateurs uniques ayant utilisé au moins un template

##### 4. Temps Moyen
- Temps moyen pour remplir un template et l'envoyer

#### 🏆 Top Templates

Liste des 10 templates les plus utilisés avec :
- Titre et type du template
- Nombre d'utilisations
- Taux de complétion

**💡 Utilité** : Identifiez les templates les plus populaires.

#### 📊 Utilisation par Type de Déclencheur

Graphique en barres montrant la répartition des utilisations par type :
- Message général
- Question sur évaluation
- Aide SRS
- etc.

#### ⏰ Activité Récente

Liste des dernières utilisations avec :
- Template utilisé
- Utilisateur
- Classe
- Date et heure
- Statut (Complété/En cours)

#### 👥 Adoption par les Utilisateurs

Répartition des utilisateurs en 3 catégories :
- **Utilisateurs avancés** (10+ utilisations) 🟢
- **Utilisateurs réguliers** (3-9 utilisations) 🔵
- **Utilisateurs occasionnels** (1-2 utilisations) ⚪

**💡 Utilité** : Comprendre l'engagement avec le système de templates.

### Filtre par Période

En haut à droite, sélectionnez la période :
- **7 derniers jours**
- **30 derniers jours** (par défaut)
- **90 derniers jours**
- **Tout**

### Export CSV

Cliquez sur **"Exporter en CSV"** en bas de page pour télécharger toutes les statistiques dans un fichier Excel/CSV.

**Contenu du CSV** :
- Métriques générales
- Liste des top templates avec leurs statistiques

---

## 💡 Bonnes Pratiques

### 1. Nommage des Templates

✅ **Bon** :
- "Question évaluation - Standard"
- "Rappel rendu devoir - J-3"
- "Feedback positif - Bonne note"

❌ **Mauvais** :
- "Template 1"
- "Test"
- "Mon template"

**💡 Conseil** : Utilisez un nom descriptif qui explique quand utiliser ce template.

### 2. Organisation avec les Tags

Créez un système de tags cohérent :

**Par urgence** :
- `urgent`, `normal`, `info`

**Par type** :
- `question`, `rappel`, `feedback`, `notification`

**Par cible** :
- `étudiant`, `professeur`, `parent`

**Par matière** :
- `maths`, `physique`, `français`

### 3. Utilisation des Variables

#### ✅ Toujours valider les données

Utilisez `{{#if}}` pour les champs optionnels :

```html
{{#if assessment_due_date}}
  Date limite : {{assessment_due_date | date:long}}
{{/if}}
```

#### ✅ Appliquer le bon filtre

- **Noms propres** : `capitalize`
- **Dates** : `date:short` ou `date:long`
- **Montants** : `currency:EUR`
- **Nombres** : `number`

#### ❌ Ne pas supposer qu'une variable existe toujours

Mauvais :
```html
Votre note : {{score}}%
```

Bon :
```html
{{#if score}}
  Votre note : {{score}}%
{{else}}
  Note pas encore disponible
{{/if}}
```

### 4. Rédaction du Contenu

#### Soyez clair et concis
- Allez droit au but
- Utilisez des phrases courtes
- Structurez avec des paragraphes

#### Utilisez le formatage
- **Gras** pour les points importants
- _Italique_ pour les nuances
- Listes pour les énumérations
- Emojis pour humaniser (avec modération)

#### Restez professionnel
- Ton respectueux et bienveillant
- Grammaire et orthographe impeccables
- Formules de politesse appropriées

### 5. Tests et Validation

Avant de déployer un template :

1. ✅ **Prévisualisez** avec l'onglet Prévisualisation
2. ✅ **Testez** avec des données réelles dans un environnement de test
3. ✅ **Vérifiez** que toutes les variables sont remplacées
4. ✅ **Relisez** pour fautes et clarté
5. ✅ **Demandez** un avis à un collègue

### 6. Maintenance

#### Revoyez régulièrement vos templates
- Consultez les statistiques d'utilisation
- Archivez les templates inutilisés
- Mettez à jour le contenu obsolète

#### Créez des versions
Avant une modification importante :
1. Dupliquez le template
2. Modifiez la copie
3. Testez avant de remplacer l'original

#### Documentez
Utilisez le champ **Description** pour noter :
- L'objectif du template
- Les cas d'usage
- Les particularités

---

## ❓ FAQ

### Questions Générales

#### Q : Quelle est la différence entre un template système et un template de classe ?

**R** :
- **Template système** : Créé par les admins, utilisable par tous les professeurs de toutes les classes
- **Template de classe** : Créé par un professeur ou admin pour une classe spécifique, visible uniquement pour cette classe

#### Q : Les professeurs peuvent-ils modifier les templates système ?

**R** : Non, seuls les administrateurs peuvent modifier les templates système. Les professeurs peuvent les **dupliquer** pour créer leur propre version de classe.

#### Q : Que se passe-t-il si je supprime un template utilisé ?

**R** : Le template disparaît mais les messages déjà envoyés avec ce template restent intacts. Les utilisateurs ne pourront plus l'utiliser.

### Variables et Filtres

#### Q : Puis-je créer mes propres variables ?

**R** : Non, les variables disponibles sont définies par le système en fonction du contexte. Si vous avez besoin d'une nouvelle variable, contactez l'équipe technique.

#### Q : Comment savoir quelles variables sont disponibles ?

**R** : Cliquez sur **"# Insérer variable/filtre"** et consultez l'onglet **Variables**. Les variables disponibles dépendent du **Type de déclencheur** sélectionné.

#### Q : Puis-je utiliser plusieurs filtres sur une même variable ?

**R** : Oui ! Vous pouvez les chaîner :

```
{{student_name | lowercase | capitalize}}
```

Cela met d'abord en minuscule puis capitalise la première lettre.

#### Q : Que se passe-t-il si une variable n'existe pas ?

**R** :
- Sans condition : Affiche une chaîne vide
- Avec `{{#if}}` : Le bloc n'est pas affiché
- Avec filtre `default` : Affiche la valeur par défaut

```
{{optional_field | default:'Non spécifié'}}
```

### Gestion et Organisation

#### Q : Combien de templates puis-je créer ?

**R** : Il n'y a pas de limite technique. Cependant, pour rester organisé, nous recommandons :
- Max 50 templates système
- Archives pour les templates inutilisés

#### Q : Puis-je partager un template avec un autre professeur ?

**R** :
- Templates **système** : Automatiquement visibles par tous
- Templates **de classe** : Demandez à l'admin de le transformer en template système, ou le professeur peut le dupliquer

#### Q : Comment retrouver rapidement un template ?

**R** : Utilisez :
1. Les **favoris** (⭐) pour vos templates les plus utilisés
2. La **recherche** textuelle
3. Les **filtres** par type et tags
4. Les **tags** cohérents et descriptifs

### Statistiques

#### Q : À quelle fréquence les statistiques sont-elles mises à jour ?

**R** : En temps réel. Chaque utilisation de template est enregistrée immédiatement.

#### Q : Puis-je voir qui a utilisé quel template ?

**R** : Oui, dans la section **"Activité récente"** du dashboard des statistiques. Pour des raisons de confidentialité, seuls les admins y ont accès.

#### Q : Comment améliorer le taux de complétion ?

**R** : Un faible taux de complétion peut indiquer :
- Template trop complexe à remplir
- Template pas adapté au cas d'usage
- Trop de variables à saisir manuellement

**Solutions** :
- Simplifiez le template
- Utilisez plus de variables automatiques
- Ajoutez des valeurs par défaut avec le filtre `default`

### Technique

#### Q : Les templates supportent-ils le HTML ?

**R** : Oui, l'éditeur de texte enrichi génère du HTML. Vous pouvez utiliser :
- Formatage de texte
- Listes
- Liens
- Images (via upload)
- Formules mathématiques (LaTeX)

#### Q : Puis-je utiliser du CSS dans mes templates ?

**R** : Oui, vous pouvez ajouter des classes CSS inline :

```html
<p class="text-red-600">Message urgent</p>
```

**⚠️ Attention** : Utilisez uniquement les classes Tailwind disponibles dans le système.

#### Q : Les templates fonctionnent-ils avec les emails ?

**R** : Oui, les templates peuvent être utilisés pour :
- Messages internes de la plateforme
- Emails envoyés aux utilisateurs
- Notifications

#### Q : Que se passe-t-il si j'utilise une syntaxe incorrecte ?

**R** :
- L'onglet **Prévisualisation** affichera "Erreur de prévisualisation"
- Le template ne pourra pas être sauvegardé
- Vérifiez la syntaxe des variables, filtres et conditions

**Syntaxes valides** :
```
{{variable}}              ✅
{{variable | filtre}}     ✅
{{#if variable}}...{{/if}} ✅

{ variable }              ❌ (espaces)
{{variable|filtre}}       ❌ (pas d'espace avant |)
{{#if variable}           ❌ (pas de fermeture)
```

---

## 📞 Support

### Besoin d'Aide ?

- **Documentation technique** : Consultez `MESSAGE_TEMPLATES_GUIDE.md`
- **Guide des filtres** : Cliquez sur "❓ Aide sur les filtres" dans l'interface
- **Support technique** : Contactez l'équipe IT
- **Suggestions** : Envoyez vos idées d'amélioration via le formulaire de feedback

### Ressources Supplémentaires

- Guide Professeur : `GUIDE_UTILISATEUR_PROF_TEMPLATES.md`
- Guide de Démarrage Rapide : `GUIDE_DEMARRAGE_RAPIDE_TEMPLATES.md`
- Documentation API : `TEMPLATE_ENHANCEMENTS_COMPLETE.md`

---

**Version du document** : 2.0.0
**Dernière mise à jour** : 22 octobre 2025
**Auteur** : Équipe Technique UbuMaths
