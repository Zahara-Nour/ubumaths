# Guide Enseignant - Système d'Exercices de Géométrie

**Version:** 1.0.0
**Dernière mise à jour:** 16 janvier 2025
**Langue:** Français

---

## Table des matières

1. [Introduction](#introduction)
2. [Vue d'ensemble du système](#vue-densemble-du-système)
3. [Types d'exercices](#types-dexercices)
4. [Créer un exercice - Guide pas à pas](#créer-un-exercice---guide-pas-à-pas)
5. [Configuration de la validation](#configuration-de-la-validation)
6. [Système de notation et pénalités](#système-de-notation-et-pénalités)
7. [Système d'indices](#système-dindices)
8. [Génération aléatoire de figures](#génération-aléatoire-de-figures)
9. [Assigner des exercices](#assigner-des-exercices)
10. [Statistiques de classe](#statistiques-de-classe)
11. [Bonnes pratiques](#bonnes-pratiques)
12. [FAQ](#faq)

---

## Introduction

Bienvenue dans le système d'exercices de géométrie d'UbuMaths ! Ce système vous permet de créer des exercices interactifs de géométrie pour vos élèves, avec correction automatique et suivi des progrès.

### Qu'est-ce que MathGraph32 ?

MathGraph32 est un logiciel gratuit de géométrie dynamique créé par Yves Biton. Il permet de créer des figures géométriques interactives que les élèves peuvent manipuler.

### Fonctionnalités principales

✅ **4 types d'exercices** : Exploration, Mesure, Construction, Démonstration
✅ **Correction automatique** avec validation personnalisable
✅ **Génération aléatoire** pour créer des variantes d'exercices
✅ **Système d'indices** progressifs avec pénalités
✅ **Notation automatique** avec lettres (A-F) et pourcentages
✅ **Statistiques de classe** détaillées
✅ **Récompenses** (gidouilles et cartes VIP)

---

## Vue d'ensemble du système

### Architecture

```
Créer un exercice
    ↓
Configurer la validation
    ↓
Ajouter des indices (optionnel)
    ↓
Assigner à une classe/élève
    ↓
Les élèves travaillent
    ↓
Correction automatique
    ↓
Statistiques et récompenses
```

### Rôles et permissions

| Rôle | Permissions |
|------|-------------|
| **Enseignant** | Créer, modifier, supprimer ses exercices / Voir les résultats de ses élèves |
| **Élève** | Voir les exercices assignés / Soumettre des réponses / Voir son historique |
| **Admin** | Toutes les permissions + gérer les templates publics |

---

## Types d'exercices

### 1. Exercices d'Exploration (View/Explore)

**Objectif:** Les élèves explorent une construction géométrique en déplaçant des points.

**Cas d'usage:**
- Découvrir des propriétés géométriques
- Observer des relations entre objets
- Comprendre des théorèmes visuellement

**Exemple:** Triangle avec son cercle circonscrit - les élèves déplacent les sommets et observent que le cercle passe toujours par les trois points.

**Notation:** Marqué comme terminé (pas de note automatique)

**Avantages:**
- ✅ Facile à créer
- ✅ Idéal pour introduire un concept
- ✅ Pas de correction à faire

**Configuration minimale:**
```json
{
  "type": "view",
  "figure_de_base": "[figure MathGraph32]",
  "instructions": "Déplacez les sommets du triangle et observez le cercle circonscrit."
}
```

---

### 2. Exercices de Mesure (Measurement)

**Objectif:** Les élèves mesurent des éléments géométriques et saisissent leurs réponses.

**Cas d'usage:**
- Mesurer des angles
- Mesurer des distances
- Calculer des aires et périmètres

**Exemple:** Mesurer les trois angles d'un triangle et vérifier que leur somme fait 180°.

**Notation:** Automatique avec tolérance configurable

**Avantages:**
- ✅ Correction automatique
- ✅ Tolérance paramétrable
- ✅ Feedback immédiat
- ✅ Plusieurs questions par exercice

**Configuration:**
```json
{
  "type": "measure",
  "validation_config": {
    "expectedMeasurements": {
      "angle_ABC": 45,
      "distance_AB": 120,
      "aire_triangle": 3600
    },
    "tolerance": 2
  }
}
```

**Types de mesures supportées:**
- `angle_[points]` → Angles en degrés (ex: `angle_ABC`)
- `distance_[points]` → Distances en unités (ex: `distance_AB`)
- `radius_[centre]` → Rayons de cercles (ex: `radius_O`)
- `area_[forme]` → Aires (ex: `area_triangle`)
- `perimeter_[forme]` → Périmètres (ex: `perimeter_ABC`)

---

### 3. Exercices de Construction (Construction)

**Objectif:** Les élèves construisent une figure géométrique à partir de consignes.

**Cas d'usage:**
- Construire une médiatrice
- Construire une perpendiculaire
- Construire un triangle équilatéral
- Constructions complexes multi-étapes

**Exemple:** Construire la médiatrice du segment [AB].

**Notation:** Automatique avec validation géométrique

**Avantages:**
- ✅ Validation géométrique précise
- ✅ Indices progressifs disponibles
- ✅ Sauvegarde automatique
- ✅ Historique des tentatives

**Configuration:**
```json
{
  "type": "construct",
  "validation_mode": "automatic",
  "validation_config": {
    "requiredObjects": ["point_M", "line_mediatrice"],
    "checkMidpoint": {
      "midpointTag": "point_M",
      "point1Tag": "A",
      "point2Tag": "B",
      "tolerance": 2
    },
    "checkPerpendicular": ["line_AB", "line_mediatrice"]
  },
  "tools_allowed": ["point", "line", "perpendicular", "midpoint"]
}
```

**Outils disponibles:**
- `point` - Créer des points libres
- `line` - Créer des droites
- `segment` - Créer des segments
- `ray` - Créer des demi-droites
- `circle` - Créer des cercles
- `perpendicular` - Tracer une perpendiculaire
- `parallel` - Tracer une parallèle
- `midpoint` - Créer un milieu
- `bisector` - Tracer une bissectrice
- `angle` - Marquer un angle

---

### 4. Exercices de Démonstration (Proof)

**Objectif:** Les élèves rédigent une démonstration géométrique étape par étape.

**Cas d'usage:**
- Prouver qu'un triangle est isocèle
- Démontrer le théorème de Pythagore
- Prouver des propriétés de parallèles

**Exemple:** Démontrer que dans un triangle isocèle, les angles à la base sont égaux.

**Notation:** Automatique (si étapes attendues fournies) ou revue manuelle

**Avantages:**
- ✅ Structure la pensée mathématique
- ✅ Justifications prédéfinies disponibles
- ✅ Possibilité de validation automatique
- ✅ Revue manuelle si nécessaire

**Configuration:**
```json
{
  "type": "proof",
  "validation_mode": "automatic",
  "validation_config": {
    "expectedProofSteps": [
      {
        "statement": "AB = AC (hypothèse)",
        "justification": "Définition"
      },
      {
        "statement": "Les angles ABC et ACB sont égaux",
        "justification": "Propriété du triangle isocèle"
      },
      {
        "statement": "Donc le triangle ABC est isocèle en A",
        "justification": "Définition du triangle isocèle"
      }
    ]
  }
}
```

**Justifications disponibles:**
- Définition
- Propriété des angles opposés par le sommet
- Propriété des angles alternes-internes
- Propriété des angles correspondants
- Somme des angles d'un triangle
- Théorème de Pythagore
- Réciproque du théorème de Pythagore
- Propriété de la médiatrice
- Propriété de la bissectrice
- Propriété du cercle
- Propriété du parallélogramme
- Théorème de Thalès
- Réciproque du théorème de Thalès
- Autre (justification personnalisée)

---

## Exemples Complets d'Exercices

Cette section présente des exemples complets et prêts à l'emploi pour chaque type d'exercice. Pour plus d'exemples (12 au total), consultez **GEOMETRY_EXAMPLES.md**.

### Exemple 1 : Construction - Médiatrice d'un segment (Facile)

**Objectif pédagogique:** Construire la perpendiculaire au milieu d'un segment.

**Consignes pour l'élève:**
```
On donne un segment [AB]. Construisez sa médiatrice, c'est-à-dire la droite
perpendiculaire à [AB] passant par son milieu.

Étapes attendues:
1. Trouver le milieu M du segment [AB]
2. Tracer la perpendiculaire à (AB) passant par M
```

**Configuration SQL complète:**
```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    initial_figure,
    validation_mode,
    validation_config,
    time_limit_minutes,
    max_score,
    passing_score,
    tools_allowed,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(), -- L'enseignant connecté
    'Construction de la médiatrice',
    'Exercice de construction de base pour comprendre la médiatrice',
    'On donne un segment [AB]. Construisez sa médiatrice (droite perpendiculaire passant par le milieu).',
    'construct',
    1, -- Difficulté facile
    'middle',
    '[VOTRE_FIGURE_BASE64_ICI]', -- Figure avec segment AB déjà tracé
    'automatic',
    '{
        "requiredObjects": ["point_M", "line_mediatrice"],
        "checkMidpoint": {
            "midpointTag": "point_M",
            "point1Tag": "A",
            "point2Tag": "B",
            "tolerance": 2
        },
        "checkPerpendicular": {
            "line1Tag": "line_mediatrice",
            "line2Tag": "segment_AB",
            "tolerance": 2
        },
        "checkPointOnLine": {
            "pointTag": "point_M",
            "lineTag": "line_mediatrice",
            "tolerance": 2
        }
    }'::jsonb,
    15, -- 15 minutes
    100,
    60,
    ARRAY['point', 'line', 'segment', 'perpendicular', 'midpoint'],
    ARRAY['mediatrice', 'perpendiculaire', 'milieu', 'segment'],
    ARRAY[
        'Savoir construire une médiatrice',
        'Comprendre la propriété de perpendicularité',
        'Utiliser l''outil milieu et perpendiculaire'
    ],
    10, -- 10 gidouilles
    TRUE
);
```

**Indices suggérés:**
```sql
-- Indice général (gratuit)
INSERT INTO geometry_hints (exercise_id, hint_level, hint_text, score_penalty)
VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction de la médiatrice' ORDER BY created_at DESC LIMIT 1),
    'general',
    'Rappel : La médiatrice d''un segment est la droite perpendiculaire à ce segment passant par son milieu.',
    0
);

-- Indice spécifique (-5%)
INSERT INTO geometry_hints (exercise_id, hint_level, hint_text, score_penalty)
VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction de la médiatrice' ORDER BY created_at DESC LIMIT 1),
    'specific',
    'Commencez par trouver le point M, milieu du segment [AB], avec l''outil "Milieu".',
    5
);

-- Indice pas-à-pas (-10%)
INSERT INTO geometry_hints (exercise_id, hint_level, hint_text, score_penalty)
VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction de la médiatrice' ORDER BY created_at DESC LIMIT 1),
    'step_by_step',
    'Étape 1: Utilisez l''outil "Milieu" sur le segment [AB] pour créer le point M.
Étape 2: Utilisez l''outil "Perpendiculaire" en sélectionnant d''abord le segment [AB], puis le point M.
Étape 3: Nommez la droite obtenue "mediatrice".',
    10
);
```

**Validation automatique:** Le système vérifie que:
- Point M est bien le milieu de [AB] (tolérance ±2 pixels)
- La droite "mediatrice" est perpendiculaire à [AB] (tolérance ±2°)
- Le point M est sur la droite "mediatrice"

---

### Exemple 2 : Mesure - Triangle rectangle (Facile)

**Objectif pédagogique:** Mesurer les angles et vérifier la somme.

**Consignes pour l'élève:**
```
On donne un triangle ABC rectangle en A.
Mesurez les trois angles du triangle et vérifiez que leur somme fait bien 180°.
```

**Configuration SQL complète:**
```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    initial_figure,
    validation_mode,
    validation_config,
    time_limit_minutes,
    max_score,
    passing_score,
    tools_allowed,
    measurements_visible,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(),
    'Mesures dans un triangle rectangle',
    'Vérifier la somme des angles d''un triangle',
    'Mesurez les trois angles du triangle ABC rectangle en A et vérifiez que leur somme fait 180°.',
    'measure',
    1, -- Facile
    'middle',
    '[VOTRE_FIGURE_BASE64_ICI]', -- Triangle ABC avec angle droit en A
    'automatic',
    '{
        "measurements": [
            {
                "type": "angle",
                "tag": "angle_A",
                "expectedValue": 90,
                "tolerance": 2,
                "points": 33
            },
            {
                "type": "angle",
                "tag": "angle_B",
                "expectedValue": null,
                "tolerance": 2,
                "points": 33
            },
            {
                "type": "angle",
                "tag": "angle_C",
                "expectedValue": null,
                "tolerance": 2,
                "points": 34
            }
        ],
        "checkSum": {
            "tags": ["angle_A", "angle_B", "angle_C"],
            "expectedSum": 180,
            "tolerance": 3
        }
    }'::jsonb,
    10, -- 10 minutes
    100,
    60,
    ARRAY['angle', 'measure'], -- Seulement outils de mesure
    TRUE, -- Afficher les mesures
    ARRAY['angles', 'triangle', 'somme_angles'],
    ARRAY[
        'Savoir mesurer un angle',
        'Vérifier la somme des angles d''un triangle',
        'Reconnaître un angle droit'
    ],
    10,
    TRUE
);
```

**Critères de validation:**
- Angle A = 90° ± 2° (33 points)
- Angle B mesuré correctement ± 2° (33 points)
- Angle C mesuré correctement ± 2° (34 points)
- Somme des trois angles = 180° ± 3° (bonus vérifié automatiquement)

---

### Exemple 3 : Exploration - Cercle circonscrit (Facile)

**Objectif pédagogique:** Observer la position du centre selon le type de triangle.

**Consignes pour l'élève:**
```
On donne un triangle ABC avec son cercle circonscrit (passant par les trois sommets).

Questions à observer en déplaçant les points:
1. Où se trouve le centre O du cercle quand le triangle est acutangle ?
2. Où se trouve le centre O quand le triangle est rectangle ?
3. Où se trouve le centre O quand le triangle est obtusangle ?
```

**Configuration SQL complète:**
```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    initial_figure,
    validation_mode,
    time_limit_minutes,
    tools_allowed,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(),
    'Triangle et cercle circonscrit',
    'Explorer la position du centre du cercle circonscrit selon le type de triangle',
    'Déplacez les sommets A, B, C du triangle et observez où se trouve le centre O du cercle circonscrit selon que le triangle est acutangle, rectangle ou obtusangle.',
    'explore',
    1, -- Facile
    'middle',
    '[VOTRE_FIGURE_BASE64_ICI]', -- Triangle + cercle circonscrit + centre O
    'self_check', -- Auto-évaluation par l'élève
    NULL, -- Pas de limite de temps
    ARRAY[]::TEXT[], -- Aucun outil (juste observation)
    ARRAY['cercle_circonscrit', 'triangle', 'observation'],
    ARRAY[
        'Observer les propriétés du cercle circonscrit',
        'Distinguer les types de triangles',
        'Comprendre la position du centre'
    ],
    5, -- 5 gidouilles pour exercice d'exploration
    TRUE
);
```

**Pas de validation automatique** - L'élève marque l'exercice comme terminé après avoir fait ses observations.

---

### Exemple 4 : Démonstration - Angles opposés par le sommet (Moyen)

**Objectif pédagogique:** Démontrer que deux angles opposés par le sommet sont égaux.

**Consignes pour l'élève:**
```
On donne deux droites (d1) et (d2) qui se coupent en O.
Démontrez que les angles α et β opposés par le sommet sont égaux.

Complétez la démonstration en choisissant les bonnes justifications.
```

**Configuration SQL complète:**
```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    initial_figure,
    validation_mode,
    validation_config,
    time_limit_minutes,
    max_score,
    passing_score,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(),
    'Démonstration : angles opposés par le sommet',
    'Prouver l''égalité de deux angles opposés par le sommet',
    'Deux droites (d1) et (d2) se coupent en O. Démontrez que les angles α et β opposés par le sommet sont égaux.',
    'proof',
    2, -- Moyen
    'middle',
    '[VOTRE_FIGURE_BASE64_ICI]', -- Deux droites sécantes avec angles marqués
    'automatic',
    '{
        "expectedProofSteps": [
            {
                "statement": "Les angles α et γ sont supplémentaires",
                "justification": "Angles adjacents formant un angle plat",
                "order": 1
            },
            {
                "statement": "α + γ = 180°",
                "justification": "Définition d''angles supplémentaires",
                "order": 2
            },
            {
                "statement": "Les angles β et γ sont supplémentaires",
                "justification": "Angles adjacents formant un angle plat",
                "order": 3
            },
            {
                "statement": "β + γ = 180°",
                "justification": "Définition d''angles supplémentaires",
                "order": 4
            },
            {
                "statement": "α + γ = β + γ",
                "justification": "Égalité avec un même terme",
                "order": 5
            },
            {
                "statement": "α = β",
                "justification": "Simplification",
                "order": 6,
                "isConclusion": true
            }
        ],
        "allowedJustifications": [
            "Définition",
            "Angles adjacents formant un angle plat",
            "Définition d''angles supplémentaires",
            "Égalité avec un même terme",
            "Simplification",
            "Propriété des angles opposés par le sommet"
        ]
    }'::jsonb,
    20, -- 20 minutes
    100,
    60,
    ARRAY['demonstration', 'angles', 'angles_opposes'],
    ARRAY[
        'Rédiger une démonstration géométrique',
        'Utiliser la propriété des angles supplémentaires',
        'Justifier chaque étape logiquement'
    ],
    15, -- 15 gidouilles pour démonstration
    TRUE
);
```

**Validation automatique:** Le système vérifie que:
- Les 6 étapes sont présentes
- Chaque étape a la bonne justification
- Les étapes sont dans le bon ordre logique
- La conclusion est correcte

---

### Exemple 5 : Construction avec randomisation - Triangle isocèle (Moyen)

**Objectif pédagogique:** Construire un triangle isocèle à partir de conditions variables.

**Consignes pour l'élève:**
```
On donne un segment [AB] et une longueur r.
Construisez le point C tel que le triangle ABC soit isocèle en A avec AC = BC = r.
```

**Configuration SQL avec randomisation:**
```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    is_randomized,
    randomization_params,
    validation_mode,
    validation_config,
    time_limit_minutes,
    max_score,
    passing_score,
    tools_allowed,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(),
    'Construction d''un triangle isocèle',
    'Construire un triangle avec deux côtés égaux à une longueur donnée',
    'On donne un segment [AB] de longueur variable et une longueur r. Construisez le point C tel que AC = BC = r.',
    'construct',
    2, -- Moyen
    'middle',
    TRUE, -- Randomisation activée
    '{
        "pointA": {"x": 200, "y": 300},
        "pointB": {"x": {"min": 400, "max": 500}, "y": 300},
        "radius": {"min": 100, "max": 200}
    }'::jsonb,
    'automatic',
    '{
        "requiredObjects": ["point_C", "circle_1", "circle_2"],
        "checkDistance": [
            {
                "point1Tag": "A",
                "point2Tag": "C",
                "expectedValue": "{{radius}}",
                "tolerance": 5
            },
            {
                "point1Tag": "B",
                "point2Tag": "C",
                "expectedValue": "{{radius}}",
                "tolerance": 5
            }
        ],
        "checkIsosceles": {
            "trianglePoints": ["A", "B", "C"],
            "vertex": "A"
        }
    }'::jsonb,
    15, -- 15 minutes
    100,
    60,
    ARRAY['point', 'circle', 'segment', 'intersection'],
    ARRAY['triangle_isocele', 'cercles', 'construction'],
    ARRAY[
        'Construire un triangle isocèle',
        'Utiliser l''intersection de deux cercles',
        'Appliquer la propriété d''équidistance'
    ],
    12,
    TRUE
);
```

**Randomisation:** À chaque nouvelle tentative:
- La position de B varie entre x=400 et x=500
- Le rayon r varie entre 100 et 200 pixels
- Génération automatique de la figure de départ

**Validation:** Le système vérifie que:
- Point C existe
- AC = r (la longueur aléatoire générée) ± 5 pixels
- BC = r ± 5 pixels
- Le triangle ABC est bien isocèle en A

---

### Exemple 6 : Construction pas-à-pas - Cercle inscrit (Difficile)

**Objectif pédagogique:** Construire le cercle inscrit d'un triangle en plusieurs étapes validées.

**Consignes pour l'élève:**
```
On donne un triangle ABC.
Construisez son cercle inscrit (tangent aux trois côtés) en suivant les étapes.
```

**Configuration SQL avec étapes:**
```sql
-- Exercice principal
INSERT INTO geometry_exercises (
    created_by,
    title,
    description,
    instructions,
    exercise_type,
    difficulty_level,
    grade_level,
    initial_figure,
    validation_mode,
    time_limit_minutes,
    max_score,
    passing_score,
    tools_allowed,
    topics,
    learning_objectives,
    gidouilles_reward,
    is_published
) VALUES (
    auth.uid(),
    'Construction du cercle inscrit',
    'Construire le cercle inscrit d''un triangle étape par étape',
    'Construisez le cercle inscrit du triangle ABC (tangent aux trois côtés).',
    'construct',
    3, -- Difficile
    'middle',
    '[VOTRE_FIGURE_BASE64_ICI]', -- Triangle ABC
    'step_by_step', -- Validation pas-à-pas
    30, -- 30 minutes
    100,
    60,
    ARRAY['point', 'line', 'segment', 'circle', 'bisector', 'perpendicular', 'intersection'],
    ARRAY['cercle_inscrit', 'bissectrices', 'incentre'],
    ARRAY[
        'Construire les bissectrices d''un triangle',
        'Trouver le centre du cercle inscrit',
        'Tracer une perpendiculaire',
        'Construire un cercle tangent'
    ],
    20, -- 20 gidouilles pour exercice complexe
    TRUE
) RETURNING id;

-- Étape 1 : Bissectrice de l'angle A
INSERT INTO geometry_exercise_steps (
    exercise_id,
    step_number,
    title,
    description,
    validation_function,
    validation_params,
    hint_general,
    hint_specific,
    hint_step_by_step,
    points,
    display_order
) VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction du cercle inscrit' ORDER BY created_at DESC LIMIT 1),
    1,
    'Bissectrice de l''angle A',
    'Tracez la bissectrice de l''angle BAC',
    'validateAngleBisector',
    '{"bisectorTag": "bisector_A", "vertex": "A", "point1": "B", "point2": "C", "tolerance": 2}'::jsonb,
    'Rappel : Une bissectrice partage un angle en deux angles égaux.',
    'Utilisez l''outil "Bissectrice" en sélectionnant les points B, A, puis C.',
    'Étape 1: Cliquez sur l''outil "Bissectrice" dans la barre d''outils.
Étape 2: Cliquez sur le point B.
Étape 3: Cliquez sur le point A (sommet de l''angle).
Étape 4: Cliquez sur le point C.
Étape 5: Nommez la droite obtenue "bisector_A".',
    20,
    1
);

-- Étape 2 : Bissectrice de l'angle B
INSERT INTO geometry_exercise_steps (
    exercise_id,
    step_number,
    title,
    description,
    validation_function,
    validation_params,
    hint_general,
    hint_specific,
    hint_step_by_step,
    points,
    display_order
) VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction du cercle inscrit' ORDER BY created_at DESC LIMIT 1),
    2,
    'Bissectrice de l''angle B',
    'Tracez la bissectrice de l''angle ABC',
    'validateAngleBisector',
    '{"bisectorTag": "bisector_B", "vertex": "B", "point1": "A", "point2": "C", "tolerance": 2}'::jsonb,
    'Même méthode que pour la première bissectrice.',
    'Utilisez l''outil "Bissectrice" en sélectionnant les points A, B, puis C.',
    'Tracez la bissectrice de l''angle ABC en utilisant les points A, B, C dans cet ordre.',
    20,
    2
);

-- Étape 3 : Centre du cercle inscrit (incentre)
INSERT INTO geometry_exercise_steps (
    exercise_id,
    step_number,
    title,
    description,
    validation_function,
    validation_params,
    hint_general,
    hint_specific,
    hint_step_by_step,
    points,
    display_order
) VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction du cercle inscrit' ORDER BY created_at DESC LIMIT 1),
    3,
    'Point d''intersection I (incentre)',
    'Créez le point I à l''intersection des deux bissectrices',
    'validateIntersectionPoint',
    '{"pointTag": "I", "line1Tag": "bisector_A", "line2Tag": "bisector_B", "tolerance": 3}'::jsonb,
    'Les bissectrices se coupent en un point appelé incentre.',
    'Utilisez l''outil "Intersection" sur les deux bissectrices.',
    'Créez le point I à l''intersection de bisector_A et bisector_B avec l''outil "Point d''intersection".',
    20,
    3
);

-- Étape 4 : Distance du centre au côté (rayon)
INSERT INTO geometry_exercise_steps (
    exercise_id,
    step_number,
    title,
    description,
    validation_function,
    validation_params,
    hint_general,
    hint_specific,
    hint_step_by_step,
    points,
    display_order
) VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction du cercle inscrit' ORDER BY created_at DESC LIMIT 1),
    4,
    'Perpendiculaire au côté [AB]',
    'Tracez la perpendiculaire à (AB) passant par I, et marquez le point de contact H',
    'validatePerpendicularWithPoint',
    '{"perpendicularTag": "perp_I", "lineTag": "AB", "pointTag": "I", "footTag": "H", "tolerance": 2}'::jsonb,
    'Le rayon du cercle inscrit est la distance de I à un côté du triangle.',
    'Tracez la perpendiculaire à (AB) passant par I, puis marquez son intersection H avec (AB).',
    'Étape 1: Utilisez l''outil "Perpendiculaire" en sélectionnant (AB) puis I.
Étape 2: Créez le point H à l''intersection de cette perpendiculaire avec (AB).
Le segment [IH] est le rayon du cercle inscrit.',
    20,
    4
);

-- Étape 5 : Cercle inscrit
INSERT INTO geometry_exercise_steps (
    exercise_id,
    step_number,
    title,
    description,
    validation_function,
    validation_params,
    hint_general,
    hint_specific,
    hint_step_by_step,
    points,
    display_order
) VALUES (
    (SELECT id FROM geometry_exercises WHERE title = 'Construction du cercle inscrit' ORDER BY created_at DESC LIMIT 1),
    5,
    'Cercle inscrit',
    'Tracez le cercle de centre I passant par H',
    'validateInscribedCircle',
    '{"circleTag": "inscribed_circle", "centerTag": "I", "pointOnCircleTag": "H", "trianglePoints": ["A", "B", "C"], "tolerance": 3}'::jsonb,
    'Le cercle inscrit a pour centre I et pour rayon IH.',
    'Utilisez l''outil "Cercle" en sélectionnant le centre I et un point du cercle H.',
    'Tracez le cercle de centre I et de rayon IH. Ce cercle doit être tangent aux trois côtés du triangle.',
    20,
    5
);
```

**Validation pas-à-pas:** L'élève doit valider chaque étape avant de passer à la suivante. Il reçoit un feedback immédiat et peut utiliser les indices spécifiques à chaque étape.

**Points:** 20 points par étape × 5 étapes = 100 points total

---

### Récapitulatif des exemples

| Type | Titre | Difficulté | Temps | Points clés |
|------|-------|-----------|-------|-------------|
| Construction | Médiatrice | Facile | 15 min | 3 validations, 3 indices |
| Mesure | Triangle rectangle | Facile | 10 min | 3 mesures + vérification somme |
| Exploration | Cercle circonscrit | Facile | - | Auto-évaluation, observation |
| Démonstration | Angles opposés | Moyen | 20 min | 6 étapes de preuve |
| Construction | Triangle isocèle | Moyen | 15 min | Randomisation active |
| Construction | Cercle inscrit | Difficile | 30 min | 5 étapes validées |

---

## Créer un exercice - Guide pas à pas

### Méthode 1 : Interface enseignant (À venir)

L'interface de création d'exercices sera disponible prochainement dans le tableau de bord enseignant.

### Méthode 2 : Directement en base de données

Pour créer un exercice manuellement via Supabase:

#### Étape 1 : Préparer la figure de base

1. Allez sur https://www.mathgraph32.org/
2. Créez votre figure géométrique
3. Menu → Exporter → Copier le code base64
4. Conservez ce code pour l'étape 3

#### Étape 2 : Définir les objectifs

- **Titre** : Court et descriptif (ex: "Médiatrice d'un segment")
- **Instructions** : Consignes claires pour l'élève
- **Type** : view / measure / construct / proof
- **Difficulté** : easy / medium / hard
- **Objectifs pédagogiques** : Liste des compétences visées

#### Étape 3 : Insérer dans la base de données

```sql
INSERT INTO geometry_exercises (
    created_by,
    title,
    instructions,
    exercise_type,
    difficulty_level,
    base_figure,
    validation_mode,
    validation_config,
    display_grid,
    display_axes,
    max_score,
    learning_objectives
) VALUES (
    '[votre_user_id]',
    'Médiatrice d\'un segment',
    'Construisez la médiatrice du segment [AB].',
    'construct',
    'easy',
    '[code_base64_de_votre_figure]',
    'automatic',
    '{
        "requiredObjects": ["point_M", "line_mediatrice"],
        "checkMidpoint": {
            "midpointTag": "point_M",
            "point1Tag": "A",
            "point2Tag": "B"
        },
        "checkPerpendicular": ["line_AB", "line_mediatrice"],
        "tolerance": 2
    }',
    true,
    false,
    100,
    ARRAY['Savoir construire une médiatrice', 'Comprendre la propriété de la médiatrice']
);
```

#### Étape 4 : Ajouter des indices (optionnel)

```sql
INSERT INTO geometry_hints (exercise_id, hint_level, hint_text, score_penalty, display_order)
VALUES
    ('[exercise_id]', 'general', 'Pensez aux propriétés de la médiatrice.', 0, 1),
    ('[exercise_id]', 'specific', 'La médiatrice passe par le milieu du segment.', 5, 2),
    ('[exercise_id]', 'step_by_step', 'Créez d\'abord le point milieu M, puis tracez la perpendiculaire à (AB) passant par M.', 10, 3);
```

#### Étape 5 : Assigner l'exercice

```sql
INSERT INTO geometry_assignments (exercise_id, assigned_by, class_id, due_date)
VALUES (
    '[exercise_id]',
    '[votre_user_id]',
    '[class_id]',
    '2025-02-01'
);
```

---

## Configuration de la validation

### Validation automatique

#### Pour les exercices de Mesure

```json
{
  "expectedMeasurements": {
    "angle_ABC": 60,
    "distance_AB": 100,
    "radius_O": 50
  },
  "tolerance": 2
}
```

**Tolérance:**
- Pour les angles : ±2° par défaut
- Pour les distances : ±2% de la valeur attendue par défaut

#### Pour les exercices de Construction

**Objets requis:**
```json
{
  "requiredObjects": ["point_M", "line_perpendiculaire"]
}
```

**Validation de point milieu:**
```json
{
  "checkMidpoint": {
    "midpointTag": "point_M",
    "point1Tag": "A",
    "point2Tag": "B",
    "tolerance": 2
  }
}
```

**Validation de perpendicularité:**
```json
{
  "checkPerpendicular": ["line_AB", "line_CD"],
  "angleTolerance": 2
}
```

**Validation de parallélisme:**
```json
{
  "checkParallel": ["line_AB", "line_CD"],
  "angleTolerance": 2
}
```

**Validation de cercle:**
```json
{
  "checkCircle": {
    "circleTag": "circle_O",
    "centerTag": "O",
    "radiusTag": "A",
    "tolerance": 2
  }
}
```

**Validation d'angle:**
```json
{
  "checkAngle": {
    "point1Tag": "A",
    "vertexTag": "B",
    "point2Tag": "C",
    "expectedAngle": 90,
    "tolerance": 2
  }
}
```

**Validation de distance:**
```json
{
  "checkDistance": {
    "point1Tag": "A",
    "point2Tag": "B",
    "expectedDistance": 100,
    "tolerance": 2
  }
}
```

#### Pour les exercices de Démonstration

**Étapes attendues (optionnel):**
```json
{
  "expectedProofSteps": [
    {
      "statement": "AB = AC (hypothèse)",
      "justification": "Définition"
    },
    {
      "statement": "Les angles ABC et ACB sont égaux",
      "justification": "Propriété du triangle isocèle"
    }
  ]
}
```

Si vous ne fournissez pas `expectedProofSteps`, l'exercice nécessitera une **revue manuelle**.

---

### Validation par étapes

Pour les constructions complexes, utilisez `validation_mode: "step_by_step"` et créez des étapes:

```sql
INSERT INTO geometry_exercise_steps (exercise_id, step_number, title, description, validation_criteria, max_score)
VALUES
    ('[exercise_id]', 1, 'Créer le point milieu M', 'Placez le point M au milieu du segment [AB]', '{
        "requiredObjects": ["point_M"],
        "checkMidpoint": {
            "midpointTag": "point_M",
            "point1Tag": "A",
            "point2Tag": "B"
        }
    }', 10),
    ('[exercise_id]', 2, 'Tracer la perpendiculaire', 'Tracez la perpendiculaire à (AB) passant par M', '{
        "requiredObjects": ["line_mediatrice"],
        "checkPerpendicular": ["line_AB", "line_mediatrice"]
    }', 15);
```

---

## Système de notation et pénalités

### Notes automatiques

Le système calcule automatiquement une note basée sur:

1. **Score brut** - Points obtenus selon la validation
2. **Pénalités** - Déductions pour indices, temps, tentatives
3. **Score final** - Score après pénalités

### Lettres et pourcentages

| Note | Pourcentage | Signification |
|------|-------------|---------------|
| **A** | 90-100% | Excellent |
| **B** | 80-89% | Très bien |
| **C** | 70-79% | Bien |
| **D** | 60-69% | Satisfaisant |
| **F** | 0-59% | Insuffisant |

### Types de pénalités

#### 1. Pénalité pour indices

| Niveau d'indice | Pénalité |
|----------------|----------|
| Général | 0% (gratuit) |
| Spécifique | -5% |
| Étape par étape | -10% |

**Exemple:**
- Score brut: 85/100
- Indices utilisés: 1 spécifique + 1 étape par étape
- Pénalité: 15 points (5 + 10)
- Score final: 70/100

#### 2. Pénalité pour le temps

Si vous définissez un `time_limit_minutes`:

- **1% de pénalité par minute de dépassement**
- **Maximum 20% de pénalité**

**Exemple:**
- Limite: 10 minutes
- Temps réel: 15 minutes
- Dépassement: 5 minutes
- Pénalité: 5%

#### 3. Pénalité pour tentatives multiples

- **2% de pénalité par tentative supplémentaire**
- **Maximum 10% de pénalité**

**Exemple:**
- 1ère tentative: 0%
- 2ème tentative: -2%
- 3ème tentative: -4%
- 4ème tentative: -6%
- etc.

### Configuration de la notation

```json
{
  "max_score": 100,
  "passing_score": 50,
  "grading_rubric": {
    "correctness": 0.7,    // 70% - Réponses correctes
    "completeness": 0.2,   // 20% - Objets créés
    "efficiency": 0.1      // 10% - Nombre d'objets minimal
  }
}
```

**Rubrique par défaut:**
- Exactitude: 70%
- Complétude: 20%
- Efficacité: 10%

Vous pouvez personnaliser ces pourcentages selon vos priorités pédagogiques.

---

## Système d'indices

### 3 niveaux d'indices

#### Niveau 1 : Indice général (0% de pénalité)

**Objectif:** Orienter sans donner la solution

**Exemples:**
- "Pensez aux propriétés de la médiatrice."
- "Quelle est la définition d'une perpendiculaire ?"
- "Rappel : La somme des angles d'un triangle vaut 180°."

#### Niveau 2 : Indice spécifique (-5% de pénalité)

**Objectif:** Donner une indication plus précise

**Exemples:**
- "La médiatrice passe par le milieu du segment."
- "Utilisez l'outil 'perpendiculaire' sur la droite (AB)."
- "Mesurez d'abord l'angle ABC, puis calculez l'angle complémentaire."

#### Niveau 3 : Solution étape par étape (-10% de pénalité)

**Objectif:** Guider complètement

**Exemples:**
- "Étape 1: Créez le point milieu M du segment [AB]. Étape 2: Tracez la perpendiculaire à (AB) passant par M."
- "1. Utilisez l'outil 'point' pour placer M au milieu de [AB]. 2. Sélectionnez l'outil 'perpendiculaire'. 3. Cliquez sur (AB) puis sur M."

### Créer des indices efficaces

**Bonnes pratiques:**

✅ **DO:**
- Commencez par des indices généraux
- Augmentez progressivement la précision
- Utilisez un vocabulaire adapté au niveau
- Référencez le cours si nécessaire

❌ **DON'T:**
- Ne donnez pas directement la réponse dans un indice général
- N'utilisez pas de jargon trop technique
- Ne créez pas trop d'indices (3-5 suffisent)

**Exemple complet:**

```sql
INSERT INTO geometry_hints (exercise_id, hint_level, hint_text, score_penalty, display_order)
VALUES
    -- Indice général (gratuit)
    ('[exercise_id]', 'general',
     'Rappel : Une médiatrice est une droite perpendiculaire à un segment passant par son milieu.',
     0, 1),

    -- Indice spécifique (-5%)
    ('[exercise_id]', 'specific',
     'Commencez par trouver le milieu du segment [AB], puis tracez la perpendiculaire.',
     5, 2),

    -- Solution complète (-10%)
    ('[exercise_id]', 'step_by_step',
     'Étape 1: Utilisez l\'outil "milieu" sur les points A et B pour créer M. Étape 2: Utilisez l\'outil "perpendiculaire" : cliquez sur la droite (AB), puis sur le point M.',
     10, 3);
```

---

## Génération aléatoire de figures

### Pourquoi utiliser la génération aléatoire ?

✅ **Chaque élève a un exercice unique** - Évite la copie
✅ **Réutilisation d'exercices** - Pas besoin de créer 30 versions
✅ **Correction automatique** - Les réponses attendues sont calculées
✅ **Progression adaptative** - Difficulté ajustable

### Méthodes de génération

#### Méthode 1 : Randomisation de paramètres

Définissez des paramètres aléatoires dans `randomization_params`:

```json
{
  "randomization_params": {
    "point_A": {
      "x": "random(100, 300)",
      "y": "random(100, 300)"
    },
    "point_B": {
      "x": "random(400, 600)",
      "y": "random(100, 300)"
    },
    "rayon_cercle": "random(50, 150)"
  }
}
```

**Syntaxe:**
- `random(min, max)` - Nombre aléatoire entre min et max
- Les coordonnées sont en pixels

**Exemple:** Triangle aléatoire
```json
{
  "randomization_params": {
    "A": { "x": "random(100, 200)", "y": "random(100, 200)" },
    "B": { "x": "random(300, 400)", "y": "random(100, 200)" },
    "C": { "x": "random(200, 300)", "y": "random(300, 400)" }
  }
}
```

#### Méthode 2 : Génération programmatique

Utilisez les fonctions de génération (via l'API):

**Triangle aléatoire:**
```typescript
const figure = await generateRandomTriangle(app, {
    type: 'right',           // Type: scalene, isosceles, equilateral, right
    minSideLength: 50,
    maxSideLength: 150,
    pointLabels: ['A', 'B', 'C']
});

// Sauvegarder
await saveExercise({
    base_figure: figure.figureBase64,
    validation_config: {
        expectedMeasurements: figure.metadata.measurements
    }
});
```

**Configuration de cercles:**
```typescript
const figure = await generateCircleConfiguration(app, {
    type: 'inscribed-triangle',  // Type de configuration
    minRadius: 60,
    maxRadius: 120
});
```

**Types de configurations disponibles:**
- `single` - Un cercle simple
- `two-intersecting` - Deux cercles sécants
- `two-tangent-external` - Deux cercles tangents extérieurement
- `inscribed-triangle` - Triangle inscrit dans un cercle
- `circumscribed-triangle` - Cercle circonscrit à un triangle

### Templates réutilisables

Créez des templates dans la table `geometry_templates`:

```sql
INSERT INTO geometry_templates (
    created_by,
    name,
    description,
    category,
    figure_template,
    randomization_config,
    is_public
) VALUES (
    '[votre_user_id]',
    'Triangle rectangle aléatoire',
    'Template pour générer des triangles rectangles avec côtés aléatoires',
    'triangles',
    '[figure_base64_template]',
    '{
        "A": {"x": "random(100, 200)", "y": "300"},
        "B": {"x": "random(400, 500)", "y": "300"},
        "C": {"x": "random(100, 200)", "y": "random(100, 200)"}
    }',
    true
);
```

**Avantages des templates:**
- Réutilisables pour plusieurs exercices
- Partageables entre enseignants (`is_public: true`)
- Compteur d'utilisation automatique
- Catégorisation pour faciliter la recherche

---

## Assigner des exercices

### Assigner à une classe entière

```sql
INSERT INTO geometry_assignments (
    exercise_id,
    assigned_by,
    class_id,
    due_date,
    max_attempts,
    require_completion
) VALUES (
    '[exercise_id]',
    '[votre_user_id]',
    '[class_id]',
    '2025-02-15 23:59:59',  -- Date limite
    3,                       -- Maximum 3 tentatives
    true                     -- Complétion obligatoire
);
```

### Assigner à un élève spécifique

```sql
INSERT INTO geometry_assignments (
    exercise_id,
    assigned_by,
    student_id,
    due_date
) VALUES (
    '[exercise_id]',
    '[votre_user_id]',
    '[student_id]',
    '2025-02-15 23:59:59'
);
```

### Configuration des assignments

**Champs disponibles:**
- `due_date` - Date limite (optionnel)
- `max_attempts` - Nombre maximum de tentatives (optionnel, illimité si null)
- `require_completion` - Exercice obligatoire (true/false)

**Bonnes pratiques:**
- Assignez 1 semaine avant la date limite pour laisser le temps
- Limitez les tentatives pour les contrôles (3-5)
- Laissez illimité pour les exercices d'entraînement
- Marquez comme obligatoires les exercices du programme officiel

---

## Statistiques de classe

### Consulter les statistiques

Utilisez la fonction `get_class_geometry_stats`:

```sql
SELECT * FROM get_class_geometry_stats('[class_id]');
```

**Résultat:**
- `total_students` - Nombre d'élèves dans la classe
- `total_exercises` - Nombre d'exercices assignés
- `average_completion_rate` - Taux de complétion moyen (%)
- `average_score` - Score moyen de la classe

### Voir les tentatives d'un exercice

```sql
SELECT
    gea.*,
    p.firstname,
    p.lastname,
    p.avatar_url
FROM geometry_exercise_attempts gea
JOIN profiles p ON p.id = gea.student_id
WHERE gea.exercise_id = '[exercise_id]'
ORDER BY gea.score_earned DESC;
```

### Identifier les élèves en difficulté

```sql
SELECT
    p.firstname,
    p.lastname,
    AVG(gea.score_earned) as average_score,
    COUNT(gea.id) as attempts_count
FROM geometry_exercise_attempts gea
JOIN profiles p ON p.id = gea.student_id
JOIN geometry_assignments ga ON ga.exercise_id = gea.exercise_id
WHERE ga.class_id = '[class_id]'
GROUP BY p.id, p.firstname, p.lastname
HAVING AVG(gea.score_earned) < 50
ORDER BY average_score ASC;
```

### Exercices les plus difficiles

```sql
SELECT
    ge.title,
    COUNT(gea.id) as total_attempts,
    AVG(gea.score_earned) as average_score,
    AVG(gea.attempts_count) as average_attempts_per_student
FROM geometry_exercises ge
JOIN geometry_exercise_attempts gea ON gea.exercise_id = ge.id
WHERE ge.created_by = '[votre_user_id]'
GROUP BY ge.id, ge.title
ORDER BY average_score ASC
LIMIT 10;
```

---

## Bonnes pratiques

### Créer des exercices efficaces

#### 1. Instructions claires

✅ **Bon exemple:**
> "Construisez la médiatrice du segment [AB]. La médiatrice est la droite perpendiculaire à [AB] passant par son milieu M."

❌ **Mauvais exemple:**
> "Faites l'exercice."

#### 2. Progression pédagogique

**Commencez simple:**
1. Exploration (view) - Découvrir le concept
2. Mesure (measure) - Observer les propriétés
3. Construction (construct) - Appliquer
4. Démonstration (proof) - Prouver

**Exemple de séquence: La médiatrice**

1. **Exploration:** Figure avec une médiatrice - déplacer les points pour observer qu'elle est toujours perpendiculaire et passe par le milieu
2. **Mesure:** Mesurer les distances MA et MB, constater qu'elles sont égales
3. **Construction:** Construire la médiatrice d'un segment donné
4. **Démonstration:** Prouver que tout point de la médiatrice est équidistant des extrémités

#### 3. Tolérance raisonnable

**Pour les mesures:**
- Angles: ±2° (précision suffisante avec les outils de mesure)
- Distances: ±2-5% (selon la précision requise)

**Pour les constructions:**
- Points: ±2-5 pixels
- Angles de perpendicularité/parallélisme: ±2°

#### 4. Objectifs pédagogiques clairs

Définissez toujours les `learning_objectives`:

```json
{
  "learning_objectives": [
    "Savoir construire une médiatrice avec les outils de géométrie",
    "Comprendre la propriété d'équidistance de la médiatrice",
    "Appliquer la définition de perpendiculaire"
  ]
}
```

#### 5. Temps adapté

**Recommandations:**
- Exploration: Pas de limite (ou 10-15 min)
- Mesure: 5-10 minutes
- Construction simple: 10-15 minutes
- Construction complexe: 20-30 minutes
- Démonstration: 15-25 minutes

### Gérer les indices

#### Quand créer des indices ?

✅ **Créez des indices pour:**
- Exercices de construction complexes
- Nouveaux concepts
- Exercices d'entraînement

❌ **Pas d'indices pour:**
- Évaluations notées
- Exercices très simples
- Exercices de révision de concepts maîtrisés

#### Stratégie d'indices en 3 niveaux

**Niveau 1 (gratuit):**
- Rappel de définition
- Référence au cours
- Question guidante

**Niveau 2 (-5%):**
- Indication sur la méthode
- Premier pas de la solution
- Astuce technique

**Niveau 3 (-10%):**
- Solution complète étape par étape
- Utilisation exacte des outils
- Pas à pas détaillé

### Utiliser la randomisation

#### Quand randomiser ?

✅ **Randomisation recommandée:**
- Exercices d'entraînement répétés
- Contrôles en classe (éviter la copie)
- Exercices de révision
- Exercices à faire à la maison

❌ **Pas de randomisation:**
- Première découverte d'un concept (utiliser un exemple précis)
- Exercices avec une figure historique ou remarquable
- Démonstrations nécessitant des valeurs spécifiques

#### Randomisation progressive

**Niveau 1 - Facile:**
Randomiser seulement les positions, garder les propriétés:
```json
{
  "A": {"x": "random(100, 200)", "y": "200"},
  "B": {"x": "random(400, 500)", "y": "200"}
}
```

**Niveau 2 - Moyen:**
Randomiser les positions et certaines mesures:
```json
{
  "A": {"x": "random(100, 300)", "y": "random(100, 300)"},
  "B": {"x": "random(400, 600)", "y": "random(100, 300)"},
  "rayon": "random(50, 100)"
}
```

**Niveau 3 - Difficile:**
Randomisation complète avec différents types de figures:
```typescript
const types = ['scalene', 'isosceles', 'right'];
const randomType = types[Math.floor(Math.random() * types.length)];

const figure = await generateRandomTriangle(app, {
    type: randomType,
    minSideLength: 50,
    maxSideLength: 150
});
```

---

## FAQ

### Questions générales

**Q: Combien d'exercices puis-je créer ?**
R: Illimité ! Vous pouvez créer autant d'exercices que nécessaire pour vos classes.

**Q: Les exercices sont-ils partagés avec d'autres enseignants ?**
R: Non, par défaut vos exercices sont privés. Vous pouvez choisir de les rendre publics avec `is_public: true`.

**Q: Puis-je modifier un exercice après l'avoir assigné ?**
R: Oui, mais les tentatives déjà effectuées par les élèves ne seront pas re-validées automatiquement.

**Q: Comment supprimer un exercice ?**
R: Supprimez l'enregistrement dans la table `geometry_exercises`. Les tentatives des élèves seront également supprimées (CASCADE).

### Questions sur la validation

**Q: Comment tester la validation avant d'assigner l'exercice ?**
R: Créez une tentative vous-même en tant qu'élève de test, ou utilisez la page de démo `/demo/geometry`.

**Q: La validation est-elle stricte ?**
R: Vous pouvez ajuster la tolérance dans `validation_config`. Par défaut: ±2° pour les angles, ±2% pour les distances.

**Q: Comment valider plusieurs solutions possibles ?**
R: Utilisez `validation_mode: "teacher_review"` pour une revue manuelle, ou créez plusieurs validations alternatives.

**Q: Puis-je valider des constructions complexes ?**
R: Oui, utilisez `step_by_step` validation et créez des étapes dans `geometry_exercise_steps`.

### Questions sur la notation

**Q: Comment ajuster le barème ?**
R: Modifiez `max_score` et/ou `grading_rubric` dans la configuration de l'exercice.

**Q: Les pénalités sont-elles obligatoires ?**
R: Non. Si vous ne définissez pas de limite de temps ni d'indices, il n'y aura pas de pénalités.

**Q: Comment noter manuellement un exercice ?**
R: Mettez `validation_mode: "teacher_review"` et notez directement en modifiant `score_earned` dans `geometry_exercise_attempts`.

**Q: Un élève peut-il améliorer sa note ?**
R: Oui, s'il fait une nouvelle tentative avec un meilleur score. La meilleure note est conservée dans les statistiques.

### Questions sur les récompenses

**Q: Comment sont attribuées les gidouilles ?**
R: Automatiquement selon le score final (1 gidouille pour 10 points) + bonus pour les succès.

**Q: Quels sont les succès disponibles ?**
R:
- 🏆 Score parfait (100% sans indice)
- ⚡ Rapidité (moins de 50% du temps limite)
- 🎯 Premier essai (80%+ dès la 1ère tentative)
- 💪 Persévérance (80%+ après 5+ tentatives)
- 🌟 Autonomie (80%+ sans indice)

**Q: Comment désactiver les récompenses ?**
R: Les récompenses sont gérées automatiquement par le système. Contactez un administrateur pour désactiver.

### Questions techniques

**Q: Que faire si MathGraph32 ne charge pas ?**
R: Vérifiez votre connexion internet. Le CDN de MathGraph32 doit être accessible.

**Q: Comment exporter/importer des exercices ?**
R: Utilisez un export SQL de la base de données ou l'API d'export (à venir).

**Q: Puis-je créer mes propres types de validation ?**
R: Oui, contactez un développeur pour ajouter des validateurs personnalisés dans `geometry-validator.ts`.

**Q: Les figures sont-elles sauvegardées automatiquement ?**
R: Oui, les élèves bénéficient d'une sauvegarde automatique toutes les 30 secondes.

---

## Ressources complémentaires

### Documentation technique

- **GEOMETRY_API_DOCS.md** - Documentation complète de l'API (English)
- **MATHGRAPH32_API_GUIDE.md** - Guide détaillé de MathGraph32 (English)
- **GEOMETRY_EXAMPLES.md** - 12 exemples d'exercices complets
- **GEOMETRY_STUDENT_GUIDE.md** - Guide pour les élèves

### Page de démonstration

Visitez `/demo/geometry` pour:
- Voir des exemples interactifs
- Tester les différents types d'exercices
- Comprendre la validation
- Explorer la génération aléatoire

### Site officiel MathGraph32

- https://www.mathgraph32.org/ - Créateur de figures
- https://www.mathgraph32.org/spip.php?article9 - Documentation (Français)

### Support

- **Email:** support@ubumaths.com
- **GitHub:** https://github.com/ubumaths/geometry-system
- **Forum enseignants:** [lien à venir]

---

## Conclusion

Le système d'exercices de géométrie d'UbuMaths vous permet de créer des exercices interactifs riches et engageants pour vos élèves. Avec la correction automatique, les indices progressifs et les statistiques détaillées, vous pouvez vous concentrer sur l'essentiel : l'enseignement.

**Commencez simplement:**
1. Créez un premier exercice d'exploration
2. Ajoutez un exercice de mesure avec 2-3 questions
3. Créez une construction simple avec validation
4. Expérimentez avec la randomisation

**Besoin d'aide ?**
Consultez les exemples dans `GEOMETRY_EXAMPLES.md` ou la page de démo `/demo/geometry`.

Bonne création d'exercices ! 🎓✨

---

**Dernière mise à jour:** 16 janvier 2025
**Version:** 1.0.0
