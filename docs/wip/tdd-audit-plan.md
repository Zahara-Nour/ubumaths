# Plan d'Audit TDD - UbuMaths

Audit complet des tests existants pour verifier leur conformite aux attentes metier.

## Objectif

Les tests actuels (2430+) ont ete ecrits **apres** le code. Ils testent ce que le code fait, mais pas necessairement ce qu'il **devrait** faire selon les regles metier.

Ce plan propose de revoir chaque domaine fonctionnel avec l'utilisateur pour :

1. **Verifier** que les comportements testes correspondent aux attentes
2. **Identifier** les comportements manquants
3. **Corriger** les tests qui ne refletent pas les vraies regles
4. **Etendre** la couverture avec des cas non testes

---

## Inventaire des Tests

| Domaine                  | Fichiers | Tests | Priorite |
| ------------------------ | -------- | ----- | -------- |
| **Logique metier**       |          |       |          |
| Gidouilles / Recompenses | ~10      | ~50   | HAUTE    |
| Marketplace (echanges)   | 5        | ~30   | HAUTE    |
| Cartes VIP               | 8        | ~40   | HAUTE    |
| Jeu Navadra (combat)     | 5        | ~30   | HAUTE    |
| Evaluations / Notes      | ~15      | ~80   | HAUTE    |
| **Exercices**            |          |       |          |
| Parametrisation          | 12       | ~60   | MOYENNE  |
| Generateur d'instances   | 5        | ~30   | MOYENNE  |
| Validation reponses      | 10       | ~50   | MOYENNE  |
| **Infrastructure**       |          |       |          |
| Triggers DB              | 11       | ~60   | MOYENNE  |
| API endpoints            | 15       | ~80   | MOYENNE  |
| Validation Zod           | 18       | ~100  | BASSE    |
| **UI/Stores**            |          |       |          |
| Stores Svelte            | 7        | ~40   | BASSE    |
| Composants               | 4        | ~20   | BASSE    |
| **Math/Technique**       |          |       |          |
| MathAST                  | 50+      | ~300  | BASSE\*  |
| Parsers                  | 20+      | ~150  | BASSE\*  |

\*Les tests mathematiques/techniques sont moins prioritaires car ils testent des comportements bien definis.

---

## Process d'Audit

### Pour chaque domaine

```
┌─────────────────────────────────────────────────────────────┐
│                    AUDIT D'UN DOMAINE                       │
├─────────────────────────────────────────────────────────────┤
│                                                             │
│  1. Claude presente les comportements actuellement testes   │
│     Format : liste en francais des "regles" testees         │
│                                                             │
│  2. Utilisateur valide / corrige / complete                 │
│     "Oui c'est correct" / "Non, ca devrait etre X"          │
│     "Il manque le cas Y"                                    │
│                                                             │
│  3. Claude identifie les tests a modifier/ajouter           │
│     Liste des changements necessaires                       │
│                                                             │
│  4. Implementation des corrections                          │
│     Modifier tests existants + ajouter nouveaux             │
│                                                             │
│  5. Validation finale                                       │
│     Tous les tests passent avec les bonnes regles           │
│                                                             │
└─────────────────────────────────────────────────────────────┘
```

### Format de presentation

Pour chaque fichier de test, Claude presente :

```markdown
## Fichier : src/lib/utils/gidouilles.test.ts

### Comportements actuellement testes :

1. Un eleve gagne 10 gidouilles pour une bonne reponse
2. Un eleve ne perd rien pour une mauvaise reponse
3. Le maximum est 1000 gidouilles
4. Le minimum est 0 gidouilles

### Questions :

- Est-ce que l'eleve devrait perdre des gidouilles pour une mauvaise reponse ?
- Y a-t-il un bonus de rapidite ?
- Les exercices difficiles donnent-ils plus ?

### Cas non testes detectes :

- Pas de test pour les exercices de difficulte differente
- Pas de test pour le temps de reponse
```

---

## Planning des Sessions d'Audit

### Phase 1 : Logique Metier Critique (Priorite HAUTE)

#### Session 1.1 : Systeme de Gidouilles

**Fichiers concernes** :

- `src/lib/utils/gidouilles.test.ts` (si existe)
- `src/lib/stores/rewards.test.ts`
- `src/routes/api/rewards/**/*.test.ts`

**Questions cles** :

- Comment les gidouilles sont-elles gagnees ?
- Comment sont-elles perdues ?
- Quelles sont les limites ?
- Y a-t-il des bonus/malus ?

---

#### Session 1.2 : Marketplace / Echanges

**Fichiers concernes** :

- `tests/unit/api/marketplace/listings.test.ts`
- `tests/unit/api/marketplace/proposals.test.ts`
- `src/lib/server/marketplace/security.test.ts`

**Questions cles** :

- Qui peut creer une annonce ?
- Qui peut faire une proposition ?
- Comment fonctionne l'acceptation ?
- Quelles sont les limites (par jour, par eleve) ?

---

#### Session 1.3 : Cartes VIP

**Fichiers concernes** :

- `tests/database/triggers/vip-card-filters.test.ts`
- `tests/unit/vip-card-filters.test.ts`
- `tests/integration/vip-card-*.test.ts`
- `src/lib/components/VipCard*.test.ts`

**Questions cles** :

- Comment les cartes sont-elles obtenues ?
- Comment fonctionne la rarete ?
- Quelles sont les regles de trade ?
- Qui peut activer/desactiver les cartes ?

---

#### Session 1.4 : Jeu Navadra (Combat)

**Fichiers concernes** :

- `src/lib/utils/game/combat.test.ts`
- `src/lib/utils/game/challenge-variables.test.ts`
- `tests/database/triggers/game-triggers.test.ts`
- `e2e/navadra/*.spec.ts`

**Questions cles** :

- Comment fonctionne le combat ?
- Comment sont calcules les degats ?
- Comment gagne-t-on de l'XP ?
- Quelles sont les regles des defis mathematiques ?

---

#### Session 1.5 : Evaluations / Notes

**Fichiers concernes** :

- `src/lib/server/validation/*.test.ts`
- `src/routes/api/achievements/**/*.test.ts`
- `e2e/student/assessments/*.spec.ts`
- `e2e/teacher/assessments/*.spec.ts`

**Questions cles** :

- Comment sont calculees les notes ?
- Quels sont les criteres de reussite ?
- Comment fonctionne la correction automatique ?
- Y a-t-il des regles de ponderation ?

---

### Phase 2 : Exercices (Priorite MOYENNE)

#### Session 2.1 : Parametrisation des exercices

**Fichiers** : `src/lib/ubumark/__tests__/parameterization/**`

**Questions cles** :

- Comment les variables sont-elles definies ?
- Quels types de valeurs aleatoires ?
- Comment eviter les divisions par zero ?

---

#### Session 2.2 : Generation d'instances

**Fichiers** : `src/lib/exercises/generator/*.test.ts`

**Questions cles** :

- Comment une instance est-elle generee ?
- Comment la reponse correcte est-elle calculee ?

---

#### Session 2.3 : Validation des reponses

**Fichiers** : `src/lib/exercises/validation.test.ts` et associes

**Questions cles** :

- Quels types de reponses sont acceptes ?
- Quelle tolerance pour les reponses numeriques ?
- Comment gerer les equivalences mathematiques ?

---

### Phase 3 : Infrastructure (Priorite MOYENNE)

#### Session 3.1 : Triggers base de donnees

**Fichiers** : `tests/database/triggers/*.test.ts`

**Questions cles** :

- Que doit faire chaque trigger ?
- Quelles sont les contraintes d'integrite ?

---

#### Session 3.2 : API endpoints

**Fichiers** : `tests/unit/api/**/*.test.ts`, `src/routes/api/**/*.test.ts`

**Questions cles** :

- Qui a acces a quoi ?
- Quelles validations sont requises ?

---

### Phase 4 : UI/Stores (Priorite BASSE)

_A planifier apres les phases critiques_

---

## Suivi de Progression

### Checklist par domaine

| Domaine         | Presente | Valide | Corrige | Complete |
| --------------- | -------- | ------ | ------- | -------- |
| Gidouilles      | [ ]      | [ ]    | [ ]     | [ ]      |
| Marketplace     | [ ]      | [ ]    | [ ]     | [ ]      |
| Cartes VIP      | [ ]      | [ ]    | [ ]     | [ ]      |
| Navadra         | [ ]      | [ ]    | [ ]     | [ ]      |
| Evaluations     | [ ]      | [ ]    | [ ]     | [ ]      |
| Parametrisation | [ ]      | [ ]    | [ ]     | [ ]      |
| Generation      | [ ]      | [ ]    | [ ]     | [ ]      |
| Validation      | [ ]      | [ ]    | [ ]     | [ ]      |
| Triggers        | [ ]      | [ ]    | [ ]     | [ ]      |
| API             | [ ]      | [ ]    | [ ]     | [ ]      |

### Journal des decisions

_A remplir au fur et a mesure des sessions_

```markdown
## Session X.Y - [Date]

### Domaine : [Nom]

### Comportements valides :

- [Liste]

### Comportements corriges :

- Avant : [X]
- Apres : [Y]
- Raison : [Z]

### Comportements ajoutes :

- [Nouveau cas]

### Fichiers modifies :

- [Liste]
```

---

## Comment demarrer une session d'audit

Pour lancer une session, l'utilisateur dit :

```
"On commence l'audit TDD du domaine [X]"
```

Claude :

1. Lit les fichiers de test du domaine
2. Extrait les comportements testes
3. Presente la liste en francais
4. Pose des questions de clarification
5. Attend la validation/correction

---

## Estimation

| Phase               | Sessions | Duree estimee |
| ------------------- | -------- | ------------- |
| Phase 1 (Critique)  | 5        | 5-10h         |
| Phase 2 (Exercices) | 3        | 3-5h          |
| Phase 3 (Infra)     | 2        | 2-4h          |
| Phase 4 (UI)        | 2        | 1-2h          |
| **Total**           | **12**   | **11-21h**    |

_Les durees dependent de la complexite des corrections necessaires._

---

## Commandes utiles

```bash
# Lister les tests d'un domaine
find src/lib/stores -name "*.test.ts" | head -20

# Compter les tests dans un fichier
grep -c "it\|test(" src/lib/stores/rewards.test.ts

# Lancer les tests d'un domaine
pnpm test:server src/lib/stores/
```
