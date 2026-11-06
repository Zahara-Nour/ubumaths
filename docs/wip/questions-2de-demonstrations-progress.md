# Chantier « questions-2de-demonstrations » — les démonstrations de la seconde en modèles de questions

> Suite du chantier `questions-2de` (seconde couverte, § 93 de son journal) : ses points P (Q2) restés sans modèle.
> Modèle suivi : chantier `questions-1spe-demonstrations` (D1, D2, D8 de son journal).
> Bornes : `docs/systeme/programmes/bornes/lycee/2de.json` ; BO : `src/lib/server/programmes/transcriptions/2.md`.

## Reprendre ici

_Mis à jour le 2026-11-06, phase 0 validée (D1)._

- **État** : phase 0 validée ; lot 1 (arithmétique, nombres réels, racines : 239, 240, 255, 256, 282) en écriture.
- **Prochaine action** : écrire le lot 1 (script `docs/wip/questions/lot-2de-demonstrations-1.py`), vérifier, PR.
- **En attente de David** : rien.
- **Pièges en cours** (repris de la 1re spé) : écritures en prod → commande `!` donnée à David ; `create-questions`
  écrit l'`id` dans les JSON du dépôt d'où il tourne → les commiter (PR) puis `git restore` dans le dépôt principal ;
  brouillons locaux : copie hors dépôt + `set -a; . ./.env.local` ; positions « ranger » par
  `docs/wip/questions/positions-ranger.ts` ; couleur jamais sur du texte hors `$`.
- **Worktree / branche** : `../ubumaths-wt-questions-2de-demonstrations` · `content/questions-2de-demonstrations-1`.

---

## 1. Relevé : les démonstrations du BO de seconde (2026-11-06)

Rubriques « Démonstration(s) » de `2.md` (l. 280, 312, 348, 419, 451, 536) : **12 points**. Relevé prod (MCP,
2026-11-06) : tous sur une sous-notion active, aucun modèle tagué.

| Lot | Point | Démonstration                              | Nœud du point (prod)                                        |
| --- | ----- | ------------------------------------------ | ----------------------------------------------------------- |
| 1   | 239   | Somme de deux multiples de a               | Arithmétique › Divisibilité › multiples et diviseurs        |
| 1   | 240   | Le carré d'un nombre impair est impair     | Arithmétique › Divisibilité › pair ou impair                |
| 1   | 255   | 1/3 n'est pas décimal                      | Ensembles › Ensembles de nombres › nombres irrationnels     |
| 1   | 256   | √2 est irrationnel                         | Ensembles › Ensembles de nombres › nombres irrationnels     |
| 1   | 282   | √(ab) = √a √b                              | Nombres et calculs › Racines carrées : calculs › propriétés |
| 2   | 304   | Colinéarité : déterminant nul              | Géométrie › Vecteurs › colinéarité                          |
| 2   | 438   | Colinéarité : coordonnées proportionnelles | Géométrie › Vecteurs › colinéarité                          |
| 2   | 320   | Forme générale d'une équation de droite    | Géométrie › Géométrie repérée › équations de droites        |
| 3   | 357   | Variations des fonctions affines           | Fonctions › Fonctions affines › variations et signe         |
| 3   | 358   | Position de y = x et y = x² pour x ≥ 0     | Fonctions › Fonction carré › définition et courbe           |
| 3   | 359   | Variations de la fonction carré            | Fonctions › Fonction carré › variations                     |
| 3   | 360   | Variations de la fonction inverse          | Fonctions › Fonction inverse › variations                   |

**Hors chantier pour l'instant** (restent P) : approfondissements (258, 259, 284-286, 305-310, 321-324, 361-363,
387, 388), exemples d'algorithmes (241, 242, 257, 283), compétences (216, 217, 353, 493-495). Suites possibles,
dans l'ordre de la 1re spé : approfondissements, puis algorithmes.

## 2. Phase 0 (posée et validée le 2026-11-06)

**D1 (David, 2026-11-06, « je valide »)** :

- **Q1** : les 12 démonstrations seulement.
- **Q2** : 2-3 variations « démonstration à trous » (étape clé en case, ou justification en case choix à
  4 propositions, erreurs typiques en distracteurs) + une dernière variation « Remets les étapes de la démonstration
  dans l'ordre » (` ```ranger `, `signe: aucun`, 4 à 6 étapes), d'emblée (outil de #2341).
- **Q3** : valeurs tirées là où la preuve s'y prête (239 : a ; 357 : m, p ; 304/438 : coordonnées), lettres ailleurs.
- **Q4** : un modèle par point, tagué sur son point P (304 et 438 : deux modèles). Rangement : comme en 1re spé, la
  « catégorie Démonstrations » n'est qu'une étiquette du journal ; en base, chaque modèle va sur la **sous-notion
  existante de son point** (aucun nœud neuf), niveau après ceux déjà présents.
- **Q5** — accès : personne de plus (brouillons ; migration de nœud et de tags seulement).
- **Q6** : chantier à part `questions-2de-demonstrations` ; le journal `questions-2de` sera versé une fois les P
  traités.
