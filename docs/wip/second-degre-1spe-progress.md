# Second degré (1re SPE) — point de reprise

> Démarche : [`docs/ref/fiches-exercices.md`](../ref/fiches-exercices.md) § 2 bis, comme le pilote
> « évolutions » ([automatismes-1spe-progress.md](automatismes-1spe-progress.md)).

## Commande de David (2026-10-01)

14 modèles neufs, en **brouillon**, thème « Fonctions », domaine « Polynôme du second degré »,
`grades: ['1_SPE']`, un corrigé par variation, `testSpecs` (juste / faux / mauvaise forme).
Specs : `scripts/questions/second-degre-1spe/*.json`.

## Fait (2026-10-01) — 12 modèles en brouillon, en base de production

| Sous-domaine › niveau    | Modèle                                                      | id         | Var. | Specs |
| ------------------------ | ----------------------------------------------------------- | ---------- | ---- | ----- |
| Discriminant › 1         | Calculer le discriminant                                    | `b09c430a` | 4    | 15    |
| Discriminant › 2         | Nombre de racines (QCM, Δ donné puis calculé)               | `32993a13` | 6    | 12    |
| Discriminant › 3         | Racines par la formule, Δ carré parfait                     | `f69a6e9e` | 3    | 13    |
| Discriminant › 4         | Racines exactes, Δ non carré (radical simplifié)            | `c2e70ba1` | 2    | 17    |
| Discriminant › 5         | Racine double                                               | `25a7549a` | 2    | 10    |
| Formes › 1               | Forme canonique par le calcul (forme exigée)                | `a9aece33` | 3    | 13    |
| Formes › 2               | Forme développée réduite                                    | `45e47034` | 3    | 13    |
| Formes › 3               | Factoriser a(x − x₁)(x − x₂) (forme exigée)                 | `604f83b7` | 3    | 14    |
| Signe et inéquations › 2 | Signe sur un intervalle (QCM, tableau de signes au corrigé) | `568c7bee` | 4    | 12    |
| Racines › 5              | Somme et produit des racines                                | `0dee4515` | 2    | 10    |
| Racines › 6              | Autre racine par le produit                                 | `f6219e5a` | 3    | 11    |
| Variations › 1           | Variations et extremum (tableau de variations au corrigé)   | `0113c53d` | 4    | 15    |

Vérifié : `question:specs` vert pour les 12 (fichiers ET relus en base), réponses des specs
recalculées en Python (fractions exactes), 100-150 tirages par variation sans cas dégénéré
(a ≠ 0, signe de Δ, racines distinctes, racine fractionnaire non entière, b et c non nuls),
tableaux ```variation parsés et transpilés en Typst sans erreur.

Titre du modèle publié `64e53490` (Apprivoiser 3) : « Lire le coefficient du terme de degré 2 »,
par `scripts/set-template-title-coefficient-degre-2.ts` (rejouable, n'écrit que si le titre est vide).

## Non créés

- **9 (signe de a et Δ lus sur une parabole)** : le grapheur (`geometry-core`, `courbe()`) n'est
  branché ni sur les questions ni sur ubumark (rendu markdown : seulement `variation`, `probtree`,
  `trig`, droite graduée). Consigne de David : pas d'images. Il faudrait un nœud ubumark « courbe »
  (écran + Typst). Le niveau 1 de « Signe et inéquations » lui est réservé.
- **11 (résoudre une inéquation → intervalle / réunion)** : la correction ne sait pas comparer des
  intervalles. Sonde : `]-\infty;-2[\cup]3;+\infty[` identique à l'attendu → `bad_form` ;
  `[-2;3]` contre `\left[-2;3\right]` → `incorrect`. Il faudrait un type de réponse « ensemble »
  (parse des intervalles, réunion, ordre indifférent, crochets ouverts/fermés). Niveau 3 réservé.

## Limites connues (dites aux specs)

- Forme `strict` par défaut (ADR 0013) : radical non simplifié, fraction scindée
  (`\frac32-\frac{\sqrt5}{2}`), calcul non effectué → `bad_form` ; fraction non réduite →
  `unoptimal_form` (`reducedFractions`). Une écriture juste mais autre que l'attendue, comme
  `-\frac{1+\sqrt5}{2}` pour `\frac{-1-\sqrt5}{2}`, serait aussi `bad_form` : le modèle 4 tire
  `b < 0` pour ne pas la provoquer.
- `{{if:…|…|…}}` ne marche ni dans `expectedAnswer` ni dans une variable (le `|` y est lu comme une
  liste de choix) : le modèle 14 a une variation par signe de `a`.
- `pnpm question:specs --template <id>` signale une « erreur de schéma » (`created_at`,
  `updated_at`, `created_by`) sur TOUT modèle relu en base, publié compris : défaut de l'outil, specs
  et tirages verts.
