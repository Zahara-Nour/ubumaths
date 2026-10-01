# Second degré (1re SPE) — point de reprise

> Démarche : [`docs/ref/fiches-exercices.md`](../ref/fiches-exercices.md) § 2 bis, comme le pilote
> « évolutions » ([automatismes-1spe-progress.md](automatismes-1spe-progress.md)).

## Commande de David (2026-10-01)

14 modèles neufs, en **brouillon**, thème « Fonctions », domaine « Polynôme du second degré »,
`grades: ['1_SPE']`, un corrigé par variation, `testSpecs` (juste / faux / mauvaise forme).
Specs : `scripts/questions/second-degre-1spe/*.json`.

## Fait (2026-10-01) — 13 modèles en brouillon, en base de production

| Sous-domaine › niveau    | Modèle                                                         | id         | Var. | Specs |
| ------------------------ | -------------------------------------------------------------- | ---------- | ---- | ----- |
| Discriminant › 1         | Calculer le discriminant                                       | `b09c430a` | 4    | 15    |
| Discriminant › 2         | Nombre de racines (QCM, Δ donné puis calculé)                  | `32993a13` | 6    | 12    |
| Discriminant › 3         | Racines par la formule, Δ carré parfait                        | `f69a6e9e` | 3    | 13    |
| Discriminant › 4         | Racines exactes, Δ non carré (radical simplifié)               | `c2e70ba1` | 2    | 17    |
| Discriminant › 5         | Racine double                                                  | `25a7549a` | 2    | 10    |
| Formes › 1               | Forme canonique par le calcul (forme exigée)                   | `a9aece33` | 3    | 13    |
| Formes › 2               | Forme développée réduite                                       | `45e47034` | 3    | 13    |
| Formes › 3               | Factoriser a(x − x₁)(x − x₂) (forme exigée)                    | `604f83b7` | 3    | 14    |
| Signe et inéquations › 1 | Lire le signe de a et de Δ sur une parabole (QCM, bloc courbe) | `80489c90` | 6    | 36    |
| Signe et inéquations › 2 | Signe sur un intervalle (QCM, tableau de signes au corrigé)    | `568c7bee` | 4    | 12    |
| Racines › 5              | Somme et produit des racines                                   | `0dee4515` | 2    | 10    |
| Racines › 6              | Autre racine par le produit                                    | `f6219e5a` | 3    | 11    |
| Variations › 1           | Variations et extremum (tableau de variations au corrigé)      | `0113c53d` | 4    | 15    |

Vérifié : `question:specs` vert pour les 12 (fichiers ET relus en base), réponses des specs
recalculées en Python (fractions exactes), 100-150 tirages par variation sans cas dégénéré
(a ≠ 0, signe de Δ, racines distinctes, racine fractionnaire non entière, b et c non nuls),
tableaux ```variation parsés et transpilés en Typst sans erreur.

Titre du modèle publié `64e53490` (Apprivoiser 3) : « Lire le coefficient du terme de degré 2 »,
par `scripts/set-template-title-coefficient-degre-2.ts` (rejouable, n'écrit que si le titre est vide).

## Non créés

- **11 (résoudre une inéquation → intervalle / réunion)** : la correction ne sait pas comparer des
  intervalles. Sonde : `]-\infty;-2[\cup]3;+\infty[` identique à l'attendu → `bad_form` ;
  `[-2;3]` contre `\left[-2;3\right]` → `incorrect`. Il faudrait un type de réponse « ensemble »
  (parse des intervalles, réunion, ordre indifférent, crochets ouverts/fermés). Niveau 3 réservé.

## Modèle 9 (2026-10-01, après #576)

QCM à 6 choix fixes (a>0/a<0 × Δ>0/=0/<0), une variation par case. Parabole tracée par un bloc

```courbe (x de −6 à 6, a ∈ {±½, ±1, ±2}, sommet entier, racines entières si Δ>0, |β| ≥ 1 si
Δ ≠ 0, axe des abscisses toujours visible, grille automatique) ; `description:` neutre. Corrigé :
ouverture → signe de a, points communs avec l'axe → signe de Δ, même courbe avec A, B, S marqués.
Vérifié sur 200 tirages (script hors dépôt) : 400 blocs sans erreur ni avertissement de scène
(aussi via `parseMarkdown`), sommet et racines dans la fenêtre, réponse recalculée depuis la
fonction TRACÉE (a, b, c par évaluation en −1, 0, 1) ; preuve rouge faite (mauvais indice, axe
hors fenêtre détectés). Typst du bloc généré pour 3 tirages (`cetz.canvas`, points, nom) ;
compilation non faite.

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
```
