# Chantier « questions-1spe-logique » — première spécialité, logique et listes Python

> Sous-chantier de [`questions-1spe`](questions-1spe-progress.md) (journal d'index : relevé § 1, existant § 2,
> classement § 3, décisions D1-D7 § 5, gabarits des lots § 18-23, répartition § 24). Démarche :
> [couvrir-un-niveau.md](../pratiques/couvrir-un-niveau.md) (skill `couvrir-niveau`). Bornes :
> `docs/systeme/programmes/bornes/lycee/1spe.json` → `["1_SPE"].points`. En base, le niveau est `1_SPE`.
> Réparti le 2026-11-02 (David : « accélérer le chantier en répartissant les lots sur plusieurs sessions ») en trois
> sessions parallèles : `questions-1spe-geometrie` (6b, formules), `questions-1spe-analyse` (restes, automatismes),
> `questions-1spe-logique` (logique et listes Python). Outils C (433, 271, 306) : chantiers à part (D5).

## Reprendre ici

_Mis à jour le 2026-11-02, avant le premier commit (fichiers écrits, PR pas encore ouverte)._

- **État** : phase 0 validée (D1) ; 7 modèles écrits (`docs/wip/questions/lot-1spe-logique.py` → `scripts/questions/1spe-logique/`), 64 specs vertes, 4 400 tirages, 280 aperçus relus ; simulation `create-questions` (prod) : 7 à créer ; essai en base **locale** : 7 créés, 05 joué (case par case juste), 02 pas encore regardé.
- **Prochaine action** : regarder 02 (choix en code) et 01 dans l'aperçu local (port 5176, `pnpm exec svelte-kit sync` déjà fait), puis PR des fichiers (revue : aucune, `Doc-inchangée: contenu`), merge ; ensuite David lance `create-questions --publier` depuis `main`.
- **En attente de David** : rien.
- **Pièges en cours** : `i` et `e` interdits comme noms de variables ; `{{if:}}` imbriqué refusé dans une variable ; `eval:` sans comparaisons (indicatrices `min`/`max`/`abs`) ; `create-questions` vise la PROD sans `set -a; . ./.env.local; set +a`.
- **Worktree / branche** : `../ubumaths-wt-questions-1spe-logique`, `content/questions-1spe-logique`.

---

## Lots

| Lot               | Thème                                            | Points                            |
| ----------------- | ------------------------------------------------ | --------------------------------- |
| logique et listes | Logique et listes Python (§ 4 de l'index, lot 9) | 203, 206, 367, 207, 208, 209, 210 |

## Points (classement du § 3 de l'index)

- **A** : 203 (quantifications implicites) ; 206, 367, 207, 208, 209, 210 (listes : programme Python montré,
  « que contient `L` à la fin ? »).
- **Hors chantier** : 205 (contraposée, point-compétence, D4).
- **Voisins** : modèles du chantier `logique-1spe` (5 publiés le 2026-11-01, § 16 de l'index) et lot 3-suites
  (suites données par un algorithme Python, 369, 378, § 20) : reprendre leur façon d'écrire un programme dans
  l'énoncé.

## Décisions communes et pièges (repris du journal d'index)

- **Décisions** : D1 brouillons d'abord (fait) ; D2 points « = » ; D4 points P hors chantier ; D6 case choix (en
  prod). Lots neufs : niveau `1_SPE` seul, un point par modèle (ADR 0020).
- **Gabarits** : scripts `docs/wip/questions/lot-1spe-suites.py` (programmes Python dans l'énoncé) et
  `lot-1spe-savoir-a.py` ; migration `supabase/migrations/20261102090607_questions_1spe_savoir_a_rangement_tags.sql` +
  son test `tests/integration/questions-1spe-savoir-a-rangement-tags.test.ts` (rouge sans l'étape 4).
- **Rendu** : **pas de `cleanCoefficients` sur un modèle sans variable** ; `blankDefaults.acceptDecimal` obligatoire
  (réponses numériques) ; **variable `e` = Euler** ; choix mélangés → jamais « première phrase » dans un corrigé ;
  `col()` hors `$…$` (`colt`) ; relire les tirages (`question:specs --apercu 40`), pas seulement les specs.
- **Prod** : `create-questions --publier` et `publier-lot --publier` → David (`!`) ; `create-questions` depuis le
  dépôt principal APRÈS le merge des fichiers. `db:migrate` après `migration list --linked` : il passe **toutes** les
  migrations en attente, celles des autres sessions comprises → ne pas passer celle d'un autre sans le dire à David.
  Horodatage : `pnpm migration:horodatage`, puis `check:migrations --pr`. Worktree non lié à Supabase → copier
  `supabase/.temp/{project-ref,linked-project.json,pooler-url,postgres-version}` du dépôt principal ; `fetch` avant.
- **Sessions parallèles** : port de dev 5176+ (premier libre) ; base Supabase locale partagée (verrou : exit 2 =
  attendre) ; dépôt principal partagé : `git commit -m … -- <fichiers>`, push en course possible (refaire
  `pull --rebase`) ; ne pas toucher aux catégories d'une autre session.
- **Commits** : `Doc-inchangée:` dans un COMMIT (≤ 100 caractères) ; aucun trailer `Claude-Session:`.
- **Page à cocher** : collection `verdicts`, compter les verdicts avant `publier-lot` ; rendu vérifié à 390 px.

## Lot « logique et listes »

_Relevé prod du 2026-11-02 (MCP) : les 7 points sans modèle, chacun sur son nœud (203 → Logique › Quantificateurs et négation ›
pour tout, il existe ; 206, 367 → Algorithmique › Listes › créer une liste ; 207 → liste en compréhension ; 208 → éléments et
indices ; 209, 210 → parcourir une liste). Aucun modèle de liste en base, tous niveaux confondus. Nœud de 203 partagé avec
2-215, 2-412 (lot 10 de questions-2de, autre grain) ; nœuds des listes partagés avec 1TECHNO-008 à 011. Pas de case « liste »
dans le juge._

**Phase 0 (D1, David, 2026-11-02, « go » sur les recos)** : un modèle par point, `1_SPE` seul, brouillons.

| #   | Point | Modèle                              | Catégorie, niveau                                                  | Réponse             |
| --- | ----- | ----------------------------------- | ------------------------------------------------------------------ | ------------------- |
| 1   | 203   | Quantification implicite            | Logique › Logique et raisonnement › Quantificateurs et négation, 4 | choix               |
| 2   | 206   | Liste en extension                  | Algorithmique › Listes › Créer une liste (neuve), 1                | choix ; cases       |
| 3   | 367   | Liste par ajouts successifs         | Algorithmique › Listes › Créer une liste, 2                        | cases               |
| 4   | 207   | Liste en compréhension              | Algorithmique › Listes › Liste en compréhension (neuve), 1         | cases ; choix       |
| 5   | 208   | Éléments et indices d'une liste     | Algorithmique › Listes › Éléments et indices (neuve), 1            | case ; cases ; case |
| 6   | 209   | Parcourir une liste par ses indices | Algorithmique › Listes › Parcourir une liste (neuve), 1            | case                |
| 7   | 210   | Itérer sur les éléments d'une liste | Algorithmique › Listes › Parcourir une liste, 2                    | case ; cases        |

Q1 contenu d'une liste : une case par élément sur la ligne « L = [?, ?, ?] ». Q2 Python partout, une variation en langage
naturel (367). Q3 209 = parcours par indice (`range(len(L))`), 210 = itération sur les éléments (`for x in L`). Q4 `1_SPE`
seul (1TECHNO pour un chantier de 1re techno). Q5 question d'accès : personne (brouillons ; la migration ne pose que nœud et
tags).

**Écriture** : `docs/wip/questions/lot-1spe-logique.py` → `scripts/questions/1spe-logique/`. `question:specs` : 7 / 7
importables, 64 specs (justes et erreurs typiques : indices dès 1, borne de `range` incluse, décalage après `del`, ajout
après la multiplication), 4 400 tirages ; 280 aperçus relus (`{{`, NaN, `+-` : rien). Simulation `create-questions` (prod) :
7 à créer. Essai en base **locale** : 7 créés ; 05 v1 joué (3 cases justes, 1 fausse : « case 4 : faux », rendu du bloc
Python et de la ligne `L = [ , , , ]` propre).

**Pièges du lot** : `i` lu comme l'imaginaire (« Complex numbers not supported »), `e` = Euler → jamais en nom de variable ;
`{{if:}}` imbriqué dans l'expression d'une variable refusé (un seul niveau passe) ; `eval:` ne connaît pas `==` ni `>` →
indicatrices `min(max(x-s,0),1)` et `1-min(abs(r-k),1)` ; dans une variable, `eval:…` sans accolades ; worktree neuf :
`pnpm exec svelte-kit sync` avant `question:specs` (`$lib` introuvable).
