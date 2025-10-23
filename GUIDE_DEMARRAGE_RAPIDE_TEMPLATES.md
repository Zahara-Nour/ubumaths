# ⚡ Guide de Démarrage Rapide - Templates de Messages

**Temps de lecture** : 5 minutes
**Pour** : Admins & Professeurs
**Version** : 2.0.0

---

## 🎯 C'est Quoi ?

Un **template** = un modèle de message pré-rempli qui s'adapte automatiquement.

**Exemple** :
```
Vous écrivez une fois :
"Bonjour {{student_name}}, votre devoir {{assessment_title}} est à rendre le {{due_date | date:short}}"

Le système envoie :
"Bonjour Marie Dupont, votre devoir Devoir Maison #3 est à rendre le 15/11/2025"
```

**Gain de temps** : ⏰ 2-3 minutes → ⚡ 10 secondes par message !

---

## 🚀 Accès Rapide

### Admin
```
Dashboard → Templates de Messages
URL: /dashboard/admin/message-templates
```

### Professeur
```
Dashboard → Mes Templates de Messages
URL: /dashboard/teacher/message-templates
```

---

## 📘 Utiliser un Template Existant

### 1. Trouvez le Template

**Méthode rapide** :
- 🔍 Tapez dans la barre de recherche
- ⭐ Cliquez sur "Favoris uniquement"
- 🏷️ Cliquez sur un tag

### 2. Utilisez-le

1. Cliquez sur le template
2. Le système remplit automatiquement les infos
3. Envoyez !

---

## ✏️ Créer un Template

### Version Ultra-Rapide (3 étapes)

```
1. Clic sur [+ Nouveau template]

2. Remplissez :
   ✅ Titre : "Mon super template"
   ✅ Sujet : "Question sur {{assessment_title}}"
   ✅ Corps : "Bonjour {{student_name}}, ..."

3. Clic sur [Créer]

✅ Terminé !
```

### Version Complète (avec options)

#### **Champs obligatoires**

| Champ | Exemple |
|-------|---------|
| **Titre** | "Rappel rendu devoir" |
| **Classe** (prof) | "2nde A" |
| **Type** | "Question sur évaluation" |
| **Sujet** | "Question sur {{assessment_title}}" |
| **Corps** | Votre message avec variables |

#### **Champs optionnels**

| Champ | Utilité |
|-------|---------|
| **Description** | Note pour vous |
| **Tags** | Organisation (`urgent`, `rappel`, etc.) |
| **Actif** | ☑️ = utilisable immédiatement |

---

## 🎨 Variables : Les 10 Plus Utiles

### 👤 Étudiant
```
{{student_name}}             → "Marie Dupont"
{{student_first_name}}       → "Marie"
```

### 👨‍🏫 Professeur
```
{{teacher_name}}             → "M. Martin"
{{class_name}}               → "2nde A"
```

### 📅 Date & Heure
```
{{today_date}}               → "22/10/2025"
{{today_time}}               → "14:30"
```

### 📊 Évaluation (si type = "Question sur évaluation")
```
{{assessment_title}}         → "Devoir Maison #3"
{{assessment_due_date}}      → "2025-11-15"
{{student_question}}         → La question de l'étudiant
```

### 💡 Comment Insérer ?

**Méthode 1** : Cliquez sur [# Insérer variable/filtre]
**Méthode 2** : Tapez `{{nom_variable}}`

---

## ✨ Filtres : Les 5 Essentiels

```
{{student_name | capitalize}}              → "Marie Dupont"
{{assessment_due_date | date:short}}      → "15/11/2025"
{{assessment_due_date | date:long}}       → "15 novembre 2025"
{{description | truncate:50}}             → "Description tronquée..."
{{optional_field | default:'Non spécifié'}} → Valeur par défaut
```

**Syntaxe** : `{{variable | filtre}}`

**Aide complète** : Cliquez sur [❓ Aide sur les filtres]

---

## 🔀 Conditions : Le Minimum

### Afficher Seulement Si Existe

```html
{{#if assessment_due_date}}
  <p>Date limite : {{assessment_due_date | date:long}}</p>
{{/if}}
```

### Si... Sinon...

```html
{{#if is_first_time}}
  <p>Bienvenue ! Première question 😊</p>
{{else}}
  <p>Content de vous revoir !</p>
{{/if}}
```

**Syntaxe** :
```
{{#if variable}}
  Contenu si vrai
{{else}}
  Contenu sinon (optionnel)
{{/if}}
```

---

## 🔧 Actions Essentielles

### ⭐ Favoris
- Cliquez sur ☆ → Devient ⭐
- Accès rapide via bouton "Favoris uniquement"

### 📋 Dupliquer
- Cliquez sur icône copier
- Entrez nouveau titre
- Template copié dans votre classe

**💡 Prof** : Seul moyen de modifier un template système !

### 📜 Historique (Vos templates uniquement)
- Cliquez sur icône horloge
- Voir toutes les versions
- Restaurer une version ancienne

### ✏️ Modifier / 🗑️ Supprimer
- **Admin** : Tous les templates
- **Prof** : Uniquement vos templates de classe

---

## 🔍 Recherche & Filtres

### Barre de Recherche
Cherche dans : titre, description, sujet, corps

### Filtres Disponibles

| Filtre | Admin | Prof |
|--------|-------|------|
| **Scope** | Système / Classe | Système / Mes classes |
| **Type** | Tous les types | Tous les types |
| **Tags** | Clic sur tag | Clic sur tag |
| **Favoris** | Bouton étoile | Bouton étoile |

### Combiner les Filtres
✅ Recherche + Tags + Favoris = Super ciblé !

---

## 📊 Statistiques (Admin uniquement)

### Accès
Cliquez sur [📊 Statistiques] en haut de page

### Métriques Clés

```
┌─────────────────────────────────────┐
│ 📈 Utilisations totales             │
│ ✅ Taux de complétion                │
│ 👥 Utilisateurs actifs               │
│ ⏱️ Temps moyen                       │
└─────────────────────────────────────┘

🏆 Top 10 templates
📊 Utilisation par type
⏰ Activité récente
👥 Adoption utilisateurs
```

### Export CSV
Bouton en bas de page → Télécharge toutes les stats

---

## 💡 Astuces Pro

### 🎯 Organisation

#### Tags Cohérents
```
Par urgence :    urgent, normal, info
Par type :       rappel, feedback, question
Par matière :    maths, physique, français
```

#### Nommage Clair
- ✅ "Rappel rendu devoir - Urgent"
- ❌ "Template 1"

#### 5-10 Favoris Max
Gardez seulement les plus utilisés en favoris.

### ✍️ Rédaction

#### Utilisez les Prénoms
```
✅ "Bonjour {{student_first_name}},"     (Marie,)
❌ "Bonjour {{student_name}},"           (Marie Dupont,)
```

#### Conditionnez les Infos Optionnelles
```
✅ {{#if due_date}}Date : {{due_date}}{{/if}}
❌ Date : {{due_date}}    (vide si pas de date)
```

#### Ajoutez des Emojis (Modération)
```
✅ Bravo !
📅 Rappel
⚠️ Urgent
```

### 🧪 Testez Avant d'Envoyer

1. ✅ Onglet **Prévisualisation**
2. ✅ Vérifiez les variables
3. ✅ Relisez
4. ✅ Testez en vrai (à vous d'abord)

---

## 🚨 Erreurs Courantes

### ❌ Variable ne s'affiche pas
```
❌ { variable }              (espaces)
❌ {{variable}               (pas de fermeture)
❌ {{variable|filtre}}       (manque espace avant |)

✅ {{variable}}
✅ {{variable | filtre}}
```

### ❌ Condition mal fermée
```
❌ {{#if var}}...{{/end}}
❌ {{#if var}}...

✅ {{#if var}}...{{/if}}
```

### ❌ Filtre inconnu
→ Cliquez sur [❓ Aide sur les filtres] pour voir la liste

---

## 📚 Exemples Prêts à l'Emploi

### 1. 📧 Rappel Générique

```
Titre : Rappel - Générique
Type : Message général

Sujet : Rappel pour {{class_name}}

Corps :
Bonjour {{student_first_name}},

Je vous rappelle [VOTRE MESSAGE ICI].

{{#if deadline}}
📅 Date limite : {{deadline | date:long}}
{{/if}}

Cordialement,
{{teacher_name}}
```

### 2. ✅ Réponse Question Évaluation

```
Titre : Réponse question évaluation
Type : Question sur évaluation

Sujet : Re: {{assessment_title}}

Corps :
Bonjour {{student_first_name}},

Merci pour votre question concernant **{{assessment_title}}**.

_Votre question :_
"{{student_question}}"

Je vous répondrai rapidement.

Cordialement,
{{teacher_name}}
```

### 3. 🎉 Félicitations

```
Titre : Félicitations - Bon travail
Type : Message général

Sujet : Bravo {{student_first_name}} ! ✨

Corps :
Bonjour {{student_first_name}},

Bravo pour votre excellent travail ! 🎉

Continuez comme ça ! 💪

{{teacher_name}}
```

### 4. ⚠️ Rappel Urgent

```
Titre : Rappel Urgent
Type : Question sur évaluation

Sujet : ⚠️ URGENT - {{assessment_title}}

Corps :
Bonjour {{student_first_name}},

⚠️ **RAPPEL URGENT**

L'évaluation **{{assessment_title}}** est à rendre
**AUJOURD'HUI** avant {{assessment_due_date | time}}.

Merci de votre attention.

{{teacher_name}}
```

---

## 🆘 Besoin d'Aide ?

### Dans l'Interface
- [❓ Aide sur les filtres] → Tous les filtres avec exemples
- [# Insérer variable/filtre] → Liste des variables
- Onglet Prévisualisation → Voir le rendu

### Documentation Complète
- **Admin** : `GUIDE_UTILISATEUR_ADMIN_TEMPLATES.md`
- **Professeur** : `GUIDE_UTILISATEUR_PROF_TEMPLATES.md`
- **Technique** : `MESSAGE_TEMPLATES_GUIDE.md`

### Support
Contactez votre administrateur ou le support technique.

---

## 📖 Aller Plus Loin

### Pour Admins
- Créez 5-10 templates système de base
- Consultez les stats régulièrement
- Adaptez selon l'utilisation

### Pour Profs
- Dupliquez les templates système que vous aimez
- Personnalisez à votre style
- Créez vos propres templates pour vos cas spécifiques

---

## ✅ Checklist Premier Template

```
□ Accéder à la page templates
□ Cliquer sur [+ Nouveau template]
□ Remplir le titre
□ Choisir le type de déclencheur
□ (Prof) Choisir la classe
□ Écrire le sujet avec {{variables}}
□ Écrire le corps avec {{variables}}
□ Ajouter 2-3 tags
□ Onglet Prévisualisation → Vérifier
□ Cliquer sur [Créer]
□ ⭐ Ajouter aux favoris
□ Tester en situation réelle
```

---

## 🎓 En Résumé

### Pour Gagner du Temps

1. **Utilisez** les templates existants
2. **Favoritez** vos 5-10 préférés
3. **Dupliquez** pour adapter
4. **Créez** pour vos besoins spécifiques
5. **Organisez** avec tags
6. **Testez** avant d'envoyer

### Formule Magique

```
Variables + Filtres + Conditions = Template Parfait
```

### Règle d'Or

> Si vous écrivez le même message 3 fois,
> créez un template ! ⚡

---

**🎉 Vous êtes prêt !**

**Temps de lecture** : 5 min ✅
**Temps pour créer votre 1er template** : 2 min ⚡
**Temps gagné à chaque utilisation** : 2-3 min 💰

**ROI** = Rentabilisé dès la 2ème utilisation ! 📈

---

**Version** : 2.0.0
**Date** : 22 octobre 2025
**Auteur** : Équipe UbuMaths
