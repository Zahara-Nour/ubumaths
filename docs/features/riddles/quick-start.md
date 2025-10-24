# 🧩 Guide de Démarrage Rapide - Système d'Énigmes

Guide complet pour utiliser le système d'énigmes mathématiques d'UbuMaths.

---

## 📋 Table des matières

- [Pour les Professeurs](#pour-les-professeurs)
  - [Créer une énigme](#1-créer-une-énigme)
  - [Définir l'énigme du jour](#2-définir-lénigme-du-jour)
  - [Valider les réponses](#3-valider-les-réponses-manuelles)
  - [Consulter les statistiques](#4-consulter-les-statistiques)
- [Pour les Élèves](#pour-les-élèves)
  - [Tenter l'énigme du jour](#1-tenter-lénigme-du-jour)
  - [Voir son historique](#2-voir-son-historique)
  - [Consulter le classement](#3-consulter-le-classement)
- [Concepts Clés](#concepts-clés)

---

## Pour les Professeurs

### 1. Créer une énigme

**Route** : `/dashboard/teacher/riddles/new`

#### Étapes :

1. **Informations de base**
   - Titre de l'énigme
   - Genre (tag libre : Algèbre, Géométrie, Logique, etc.)
   - Difficulté (1 = Facile, 2 = Moyen, 3 = Difficile)

2. **Énoncé**
   - Utilisez l'éditeur rich text
   - Ajoutez des formules LaTeX avec le bouton 🧮
   - Ajoutez une image (optionnel)

3. **Correction**
   - Rédigez la solution complète
   - Sera visible uniquement par vous lors de la validation manuelle

4. **Type de validation**
   - **Automatique** : Configurez la réponse attendue
     - Numérique (avec tolérance)
     - Texte (case sensitive ou non)
     - QCM (choix uniques ou multiples)
     - Expression mathématique
   - **Manuelle** : Les élèves envoient un texte libre, vous validez

5. **Publication**
   - **Draft** : Invisible pour les élèves
   - **Publié** : Accessible aux élèves

#### Récompenses dégressives automatiques :

- **Difficulté 1** : 3 → 2 → 1 gidouilles (tentatives 1, 2, 3+)
- **Difficulté 2** : 6 → 4 → 2 gidouilles
- **Difficulté 3** : 9 → 6 → 3 gidouilles

---

### 2. Définir l'énigme du jour

**Route** : `/dashboard/teacher/riddles/of-the-day`

#### Option A : Sélection manuelle

1. Choisissez une date (aujourd'hui ou future)
2. Sélectionnez une énigme publiée dans le menu déroulant
3. Cliquez "Définir comme énigme du jour"

#### Option B : Sélection automatique

- **API Endpoint** : `POST /api/riddles/auto-select-daily`
- **Algorithme** :
  - Exclut les énigmes des 30 derniers jours
  - Rotation des difficultés (1 → 2 → 3 → 1)
  - Sélection aléatoire parmi les éligibles

#### Configuration Cron (optionnel) :

```json
// vercel.json
{
	"crons": [
		{
			"path": "/api/riddles/auto-select-daily",
			"schedule": "0 0 * * *"
		}
	]
}
```

---

### 3. Valider les réponses manuelles

**Route** : `/dashboard/teacher/riddles/validations`

#### Workflow :

1. **Liste des validations en attente**
   - Vous recevez un message automatique quand un élève soumet
   - Badge compteur sur la page

2. **Page de validation** (clic sur "Voir et valider")
   - **Énoncé** de l'énigme
   - **Correction** (visible uniquement par vous)
   - **Réponse de l'élève** (mise en évidence)
   - **Champ commentaire** (optionnel)

3. **Décision**
   - ✅ **Valider** : Attribution des gidouilles + notification élève
   - ❌ **Refuser** : L'élève peut réessayer

4. **Notification automatique**
   - L'élève reçoit un message avec le résultat
   - Affichage du nombre de gidouilles (si validé)
   - Votre commentaire (si fourni)

---

### 4. Consulter les statistiques

**Route** : `/dashboard/teacher/riddles/stats`

#### Vue d'ensemble :

- Nombre total d'énigmes créées
- Validations en attente (avec lien direct)
- Gidouilles distribuées
- Élèves actifs

#### Par énigme :

- Taux de réussite avec barre visuelle
- Tentatives moyennes
- Gidouilles distribuées
- Tri par activité

#### Top 10 élèves :

- Podium 🥇🥈🥉
- Nombre d'énigmes résolues
- Réussites du premier coup
- Score total gidouilles

---

## Pour les Élèves

### 1. Tenter l'énigme du jour

**Route** : `/dashboard/student/riddles`

#### Énigme du jour :

1. **Card premium** avec l'énigme actuelle
   - Date formatée
   - Badges difficulté et genre
   - Gidouilles potentielles affichées

2. **États visuels** :
   - 🎯 Non faite : Bouton "Tenter l'énigme"
   - 🔄 En cours : Bouton "Réessayer" + numéro tentative
   - ⏳ En attente : Badge "En attente de validation"
   - ✅ Réussie : Badge vert + gidouilles gagnées

3. **Tenter l'énigme** (clic sur le bouton) :
   - Page dédiée avec énoncé complet
   - Input adapté au type (nombre, texte, QCM, math, libre)
   - Soumission avec feedback immédiat
   - Rechargement auto après soumission

#### Validation automatique :

- ✅ Correct : Toast vert + gidouilles gagnées
- ❌ Incorrect : Toast rouge + possibilité réessayer
- Calcul instantané

#### Validation manuelle :

- ⏳ Message : "Ta réponse a été envoyée au professeur"
- Notification reçue quand le prof valide

---

### 2. Voir son historique

**Route** : `/dashboard/student/riddles/history`

#### Statistiques personnelles :

- Total énigmes réussies
- Total gidouilles gagnées
- Réussites du premier coup

#### Filtres :

- Par difficulté (Toutes / 1 / 2 / 3)
- Par genre (Tous / genres disponibles)
- Application instantanée

#### Liste historique :

- Date de première réussite
- Nombre de tentatives
- Gidouilles obtenues
- Bouton "Revoir l'énigme"

#### Badges achievements 🏅 :

- **Badges débloqués** : Avec couleurs tier (Bronze/Argent/Or/Platine)
- **En cours** : Avec barres de progression

**4 types de badges** :

- 🎯 **Perfectionniste** : Réussites du 1er coup (5/15/30/50)
- 💪 **Persévérant** : Après plusieurs tentatives (5/15/30/50)
- 🔥 **Assidu** : Jours consécutifs (3/7/14/30)
- 🎓 **Expert [Genre]** : Maîtrise par genre (5/10/20/50)

---

### 3. Consulter le classement

**Route** : `/dashboard/student/riddles/leaderboard`

#### Podium visuel :

- Top 3 avec médailles géantes 🥇🥈🥉
- Avatars bordés (or/argent/bronze)
- Scores et nombre d'énigmes

#### Ta position :

- Banner spécial si tu es dans le classement
- Highlight de ta ligne avec badge "Toi"
- Affichage de ton rang

#### Classement complet :

- Top 50 élèves
- Gidouilles totales
- Nombre d'énigmes résolues

---

## Concepts Clés

### Gidouilles dégressives

Le nombre de gidouilles diminue avec les tentatives :

| Difficulté    | 1ère tentative | 2ème tentative | 3ème+ tentatives |
| ------------- | -------------- | -------------- | ---------------- |
| 1 (Facile)    | 3              | 2              | 1                |
| 2 (Moyen)     | 6              | 4              | 2                |
| 3 (Difficile) | 9              | 6              | 3                |

**Formule** : `gidouilles = difficulté × multiplicateur`

**Multiplicateurs** : 1ère = ×3, 2ème = ×2, 3ème+ = ×1

### Types de validation

#### Automatique

✅ Feedback instantané
✅ Tentatives illimitées
✅ Attribution automatique des gidouilles
🎯 Idéal pour : calculs, QCM, réponses courtes

#### Manuelle

✅ Réponses libres complexes
✅ Validation par le professeur
✅ Feedback personnalisé
🎯 Idéal pour : démonstrations, rédaction, raisonnement

### Énigme du jour

- **Une énigme par jour** pour toute l'école
- **Accessible à tous** les élèves
- **Sélection automatique** (optionnel) avec rotation difficultés
- **Archive** : Anciennes énigmes consultables

### Navigation rapide

**Professeurs** :

- `/dashboard/teacher/riddles` - Liste énigmes
- `/dashboard/teacher/riddles/new` - Créer
- `/dashboard/teacher/riddles/of-the-day` - Énigme du jour
- `/dashboard/teacher/riddles/validations` - Validations
- `/dashboard/teacher/riddles/stats` - Statistiques

**Élèves** :

- `/dashboard/student/riddles` - Énigme du jour
- `/dashboard/student/riddles/archive` - Archives
- `/dashboard/student/riddles/leaderboard` - Classement
- `/dashboard/student/riddles/history` - Historique

---

## 🎯 Tips & Best Practices

### Pour les Professeurs

✅ **Variez les difficultés** : Équilibrez facile/moyen/difficile
✅ **Utilisez les genres** : Facilitez le filtrage et les recherches
✅ **Testez vos énigmes** : Vérifiez la validation automatique
✅ **Rédigez des corrections claires** : Aidez-vous lors de la validation manuelle
✅ **Commentez les refus** : Guidez les élèves vers la bonne approche
✅ **Consultez les stats** : Ajustez la difficulté selon les taux de réussite

### Pour les Élèves

✅ **Tentez l'énigme du jour** : Nouvelle énigme chaque jour
✅ **Lisez bien l'énoncé** : Prenez le temps de comprendre
✅ **Réessayez si échec** : Vous gagnez toujours des gidouilles
✅ **Consultez votre historique** : Revoyez les énigmes résolues
✅ **Débloquez des badges** : Défiez-vous sur différents genres
✅ **Participez au classement** : Comparez-vous avec les autres

---

## 🆘 Questions Fréquentes

**Q : Puis-je modifier une énigme publiée ?**
R : Oui, via `/dashboard/teacher/riddles` → Clic sur l'énigme → Éditer. Les tentatives existantes ne sont pas affectées.

**Q : Que se passe-t-il si je ne définis pas d'énigme du jour ?**
R : Les élèves verront "Pas d'énigme du jour aujourd'hui". Vous pouvez activer la sélection automatique.

**Q : Un élève peut-il tenter plusieurs fois la même énigme ?**
R : Oui, tentatives illimitées. Les gidouilles diminuent après la 2ème tentative.

**Q : Comment fonctionne le classement ?**
R : Basé sur les gidouilles totales gagnées via les énigmes (toutes sources confondues).

**Q : Les badges sont-ils sauvegardés en base ?**
R : Non, ils sont calculés en temps réel à partir de votre progression. Pas de stockage DB.

**Q : Puis-je supprimer une énigme ?**
R : Oui, mais cela supprimera toutes les tentatives associées. Préférez passer en "draft" si nécessaire.

---

## 🚀 Améliorations Futures

Le système est **100% fonctionnel** tel quel, mais des améliorations optionnelles sont prévues :

### 🎯 Version Actuelle (v1.0.0)

- ✅ Toutes fonctionnalités core opérationnelles
- ⏳ 14 items optionnels (animations, tests automatisés, cache Redis, etc.)

### 📅 Prochaines Versions

**v1.1 - Court terme** :

- Export CSV historique pour analyse
- Graphiques statistiques interactifs
- Filtres avancés leaderboard

**v1.2 - Moyen terme** :

- Mode hors-ligne (PWA)
- Import/Export énigmes entre professeurs
- Templates énigmes prédéfinis

**v2.0 - Vision** :

- Énigmes collaboratives multi-joueurs
- Duels 1v1 entre élèves
- Mode tournoi avec événements
- IA génération énigmes

**Pour les détails** : Voir `RIDDLES_SYSTEM_SUMMARY.md` → Roadmap Future

---

## 📞 Support Technique

Pour toute question ou problème :

- Consultez la documentation technique : `RIDDLES_SYSTEM_IMPLEMENTATION.md`
- Vérifiez les logs serveur pour les erreurs de validation
- Testez les permissions RLS en cas de problème d'accès

---

**Version** : 1.0.0
**Dernière mise à jour** : Documentation complète avec items optionnels détaillés
**Système** : 100% fonctionnel (core) - 14 items optionnels disponibles
**Progression** : ~97% complété ✨
