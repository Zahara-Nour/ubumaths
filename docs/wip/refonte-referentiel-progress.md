# Refonte du référentiel — état du chantier

> **Branche** : `feat/refonte-referentiel` · **Rien n'est poussé, aucune PR, aucune migration appliquée en prod.** > **Dernière mise à jour** : 2026-08-29.
> Ce document est la trace écrite du chantier. Il remplace la spec Phase 0 initiale, dont les décisions sont reprises ci-dessous.

---

## 1. Pourquoi ce chantier

Les contenus à travailler/évaluer étaient décrits par **deux arbres parallèles sans aucune clé étrangère entre eux** :

|                      | Arbre « programme »                  | Arbre « évaluation » famille A             |
| -------------------- | ------------------------------------ | ------------------------------------------ |
| Tables               | `curriculum_themes / items / points` | `skill_themes / skill_objectives / skills` |
| Grain                | Thème → Item → **Point**             | Thème → Objectif → **Capacité**            |
| Cardinalité niveau 3 | libre                                | **exactement 4, ordonnées**                |
| Servait à            | couverture classe (prof)             | acquisition (élève)                        |
| Ressource taguable   | `exercises`                          | `question_templates`                       |

Plus un troisième jeu d'étiquettes libres (`question_templates.theme/domain/subdomain/level`).

**Cause racine** : la décision 57 du design doc imposait « exactement 4 capacités ordonnées par objectif ». Douze jours plus tard, le suivi du programme avait besoin d'un niveau 3 à cardinalité libre ; famille A ne pouvait pas l'absorber ; d'où un second arbre, avec un vocabulaire neuf parce que le dictionnaire des « termes bannis » interdisait de réutiliser objectif/capacité/observable. Le vocabulaire divergent était un **symptôme**, pas la cause.

**Coût de la fusion au moment où elle a été faite : nul.** Les trois arbres totalisaient ~300 lignes seedées et **zéro ligne d'usage**.

---

## 2. Décisions structurantes (actées par David)

1. **Un seul arbre de contenus par niveau.** `curriculum_*` absorbe famille A.
2. **`rang` facultatif** (NULL ou 1-4) — geste central : l'échelle descriptive style référentiel 2016 reste possible sans être imposée par le schéma.
3. **Famille B (6 compétences math) intacte** — transversale, pas de découpage par niveau. `skills` → `observables`.
4. **Taguer l'atomique, dériver les conteneurs** — exercice / template / exo Python / document tagués ; fiche, chapitre, évaluation = union **calculée**.
5. **Jonctions distinctes par type de ressource** (cohérent décision 71, pas de polymorphisme manuel).
6. **Pas de collège en 2026-27** → premier niveau rempli = **`1_SPE`**.
7. **Contenu 6ᵉ famille A non migré** — reste dans `docs/wip/referentiel/6e-savoirs.md`.
8. `curriculum_items` → `curriculum_objectives` (+ `item_id` → `objective_id`).
9. **`kind` à 3 valeurs** : `connaissance` · `savoir_faire` · `demonstration` — les trois rubriques du BO lycée.
10. **`exigence`** : `attendu` · `approfondissement`.
11. **Séparation `regime_acquisition` / listes d'automatismes** (cf. §5) — un champ confondait _comment on mesure_ et _d'où vient le point_.
12. **Pas de thème « Automatismes »** dans l'arbre de 1ʳᵉ : ses points sont des acquis des années antérieures. Ils vivront dans l'arbre du niveau où ils sont introduits, reliés par `curriculum_point_automatismes`.
13. **Le markdown amorce, l'application fait foi** (cf. §7) — le seed devient un `DO` gardé qui ne remplit qu'un niveau vide. Corriger le markdown d'un niveau déjà en base ne produit plus rien : la correction se fait dans la page Programme.
14. **Le code est attribué par la base** (cf. §7) — trigger, série continue par niveau, colonne `NOT NULL`. C'est le seul identifiant d'un point à la fois lisible et stable d'un environnement à l'autre, donc le seul citable dans une fiche.

---

## 3. Schéma cible (atteint)

```
curriculum_themes          grade · name · code · display_order
  └─ curriculum_objectives   theme_id · name · description · display_order
       └─ curriculum_points    objective_id · name · display_order
            · kind               'connaissance' | 'savoir_faire' | 'demonstration'   NOT NULL
            · regime_acquisition 'fluence' | 'diversite'      NOT NULL DEFAULT 'diversite'
            · exigence           'attendu' | 'approfondissement'  NOT NULL DEFAULT 'attendu'
            · rang               smallint NULL  (1-4, UNIQUE par objectif)
            · archived_at        timestamptz NULL

curriculum_point_automatismes   point_id · grade      (liste d'automatismes d'un programme)
question_template_points        template_id · point_id  (ex-question_template_skills)
exercise_curriculum_points      exercise_id · point_id
journal_entry_points            entry_id · point_id · source

observables (ex-`skills`)     subdimension_id · observable_code · name · teacher_grid_text
skill_attempts                point via template_id (régime contenus) | observable_id (compétences)
student_point_state           (ex-student_skill_state_a)
```

**Supprimées** : `skill_themes`, `skill_objectives`, `curriculum_items`, `question_template_skills`, `student_skill_state_a`, `skills` (renommée).

**Lecture publique authentifiée** ajoutée sur l'arbre : il porte désormais l'acquisition élève, sans quoi « Mes objectifs » serait vide.

---

## 4. Ce qui est commité

| Commit      | Contenu                                                                                 |
| ----------- | --------------------------------------------------------------------------------------- |
| `6d5b79657` | **Phase 1** — fusion des deux arbres (45 fichiers)                                      |
| `bccb1f87a` | **Phase 2a** — rebranchement de 4 fils cassés (6 fichiers)                              |
| `fead34fd8` | **Phase 2b** — auto-évaluation visible au prof + complétion d'assignation (11 fichiers) |
| `21932c4ad` | **Phase 3** — seed 1ʳᵉ spé (7 fichiers)                                                 |
| `a2f27644e` | **Amendement** — régime d'acquisition / listes d'automatismes (18 fichiers)             |

### Phase 2 — les fils qui étaient débranchés

1. **`/api/tests/save` n'écrivait aucune tentative** : répondre à une évaluation ou à un entraînement ne validait **aucun** point ; seule la révision SRS alimentait le référentiel. Correctif à plus fort levier de tout le chantier.
2. **Lien « Mon travail » → évaluation en 404** : route inexistante _et_ mauvais identifiant (évaluation au lieu d'assignation).
3. **Une fiche ne quittait jamais « à faire »** : la détection prévue (`worksheet_instances.submitted_at`) n'avait jamais été implémentée, la colonne n'existe pas. Désormais : une fiche est « faite » quand l'élève a auto-évalué **tous** ses exercices (`student_exercise_mastery`). Choix sémantique assumé — les fiches sont view-only, c'est le seul signal disponible.
4. **Trois routes livrées sans lien entrant** : « Évaluations en ligne » au menu prof, bouton « Acquisition » sur chaque carte de classe, « Exporter les compétences » dans l'en-tête de la page analytics.
5. **Page d'avancement d'une fiche** (nouvelle) : `worksheets/[id]/assignments/[assignmentId]/progress`. Rend visible au prof l'auto-évaluation des élèves — 117 marquages réels que **aucune page enseignante ne lisait**. Périmètre = classe ciblée ∪ élèves assignés individuellement.
6. **`get_assignment_completion_stats`** existait en base sans aucun appelant : wrapper ajouté + affichage terminés/ouverts par assignation.

### Bugs pré-existants corrigés en chemin

- `class-knowledge.ts` filtrait `skills.niveau_scolaire = classes.grade`, soit `'6e'` comparé à `'6'` : **le filtre ne matchait jamais**.
- `class-knowledge.ts`, `class-competence.ts` et le loader analytics lisaient `profiles.first_name` / `last_name` — colonnes inexistantes (`firstname` / `lastname` / `full_name`). **Tous les élèves s'affichaient « Élève sans nom »** dans les grilles.
- Les tests curriculum purgeaient **tous** les thèmes (`.not('id','is',null)`), seed compris → fixtures déplacées sur `TEST_GRADE='5'` / `TEST_GRADE_ALT='4'`.

---

## 5. Amendement `a2f27644e` — régime d'acquisition et automatismes

Vérifié : typecheck 1721 fichiers 0 erreur · 31 865 tests unitaires serveur ·
intégration **387/389** (les 2 `admin-elevation` pré-existants).

### 5a. `knowledge_type` → `regime_acquisition`

Migration `20260830080000_regime_acquisition_et_listes_automatismes.sql`.

Un seul champ confondait deux choses : **comment on mesure** la maîtrise, et **d'où vient** le point. Les valeurs `automatisme` / `capacite_attendue` sont des mots du BO qui désignent une provenance, alors que le champ pilotait une mesure — d'où une frontière qui paraissait arbitraire.

| `regime_acquisition` | Règle (seuils inchangés, design doc §6.1)                                                                     |
| -------------------- | ------------------------------------------------------------------------------------------------------------- |
| `fluence`            | ≥ 5 réussites **et** ≥ 3 sur les 5 dernières → le geste doit être rapide, fiable, et le **rester**            |
| `diversite`          | ≥ 2 templates distincts **et** aucun échec sur les 3 dernières → la maîtrise se prouve sur des cas **variés** |

Le critère est : _qu'est-ce qui prouve la maîtrise de CE point ?_ Il ne recoupe pas la partie « Automatismes » du BO — il la traverse. « Déterminer l'équation de la tangente en un point » n'y figure pas et gagne pourtant à être mesuré en `fluence`.

### 5b. Table `curriculum_point_automatismes`

« Automatisme » n'est pas une propriété du point : c'est **une liste publiée par un programme donné**. Un point de seconde peut être dans la liste de 1ʳᵉ _et_ dans celle de terminale. Un booléen ne saurait ni l'exprimer, ni dire pour quel examen. D'où une liaison `(point_id, grade)`.

« Les automatismes attendus à l'examen de 1ʳᵉ » = une requête sur `grade = '1_SPE'`.

### 5c. Suppression du thème « Automatismes »

Ses 17 points ne sont pas des contenus de 1ʳᵉ : ce sont des acquis des années antérieures (seconde pour l'essentiel) que le programme demande d'entretenir. Les créer dans l'arbre de 1ʳᵉ en dupliquerait la définition — l'erreur même que ce chantier corrige.

**Vérifié** avant de supprimer : ces 17 points n'existaient nulle part ailleurs dans l'arbre de 1ʳᵉ (similarité maximale 0,44 avec un point existant — voisins, pas doublons).

Le seed passe donc de **7 thèmes / 19 objectifs / 170 points** à **6 / 14 / 153**.

⏳ **Conséquence à traiter plus tard** : la couverture du cahier de texte est filtrée sur le niveau de la classe (`getCurriculumTree(grade)`). Une fois l'arbre de seconde créé, cocher un automatisme de seconde depuis une classe de 1ʳᵉ demandera d'étendre cette vue aux points tagués des niveaux antérieurs.

---

## 6. Référentiel 1ʳᵉ spé

**Source** : PDF fourni par David le 2026-08-29. ⚠️ **Ce n'est PAS l'arrêté du 17 janvier 2019** — c'est le programme en vigueur, avec une partie transversale « Automatismes ».

**Source de vérité** : `docs/wip/referentiel/1re-spe-programme.md` (170 points à l'origine, 153 après retrait des automatismes).
**Générateur** : `scripts/generate-curriculum-1re-spe-seed.ts` → `supabase/migrations/20260830090000_seed_curriculum_1re_spe.sql`.
Corriger le markdown, relancer `pnpm tsx scripts/generate-curriculum-1re-spe-seed.ts`, le seed est régénéré. Le script refuse d'écrire s'il détecte un doublon violant l'une des trois contraintes UNIQUE.

| Thème                              | Obj.   | Points  |
| ---------------------------------- | ------ | ------- |
| Vocabulaire ensembliste et logique | 2      | 17      |
| Algorithmique et programmation     | 1      | 5       |
| Algèbre                            | 2      | 32      |
| Analyse                            | 4      | 48      |
| Géométrie                          | 2      | 22      |
| Probabilités et statistiques       | 3      | 29      |
| **Total**                          | **14** | **153** |

49 connaissances · 65 savoir-faire attendus · 11 démonstrations · 28 approfondissements. `rang` NULL partout (le programme ne propose aucune échelle).

**Trois écarts assumés avec le texte**, documentés dans le markdown : les 11 « Exemples d'algorithmes » comptés comme approfondissements · trois puces du BO coupées en deux là où un élève peut réussir un geste sans l'autre · typage interprétatif du thème « Vocabulaire ensembliste et logique » (rédigé en prose continue, sans rubriques).

---

## 7. Le markdown amorce, l'application fait foi

**Décidé le 2026-08-29.** Le référentiel ne se modifie plus en éditant un
fichier et en relançant une commande : tout se fait dans la page Programme.

### Ce que le markdown fait encore

Amorcer un niveau **qui n'existe pas encore** — 2de, terminale, une 6ᵉ refaite.
Saisir 153 points à la main dans un formulaire serait une punition ; l'import en
masse reste son bon usage. Passé l'amorçage il n'a plus voix au chapitre.

### Ce qui a changé dans le seed

Il **synchronisait** : `ON CONFLICT (code) DO UPDATE`, plus archivage de ce qui
avait disparu du markdown. Sur une base où le prof avait travaillé dans l'app,
le rejeu défaisait son travail. Il **amorce** désormais — tout le corps est dans
un `DO` gardé par `IF EXISTS (… WHERE grade = '1_SPE') THEN RETURN`. Rejouer ne
fait plus rien du tout.

Vérifié de bout en bout : libellé de `1SPE-047` modifié en base, seed rejoué →
la modification tient, 153 points, 0 archivé. Sous l'ancien seed elle était
écrasée par le texte du BO.

### Le code, désormais attribué par la base

Le `code` avait été introduit pour que le rejeu du seed retrouve un point après
renommage. Ce rôle disparaît avec la synchronisation ; il en garde un autre, qui
devient le principal : **le seul identifiant d'un point à la fois lisible et
stable d'un environnement à l'autre**. Les UUID diffèrent entre le local et la
prod, `1SPE-047` non — c'est donc lui qu'on écrit dans une fiche, dans une URL,
ou qu'on donne à un élève.

- Attribué par **trigger** (`curriculum_points_assign_code`) : aucun chemin
  d'insertion ne peut l'oublier — ni l'API, ni un seed, ni un `INSERT` à la main.
- **Une série continue par niveau** : les points créés dans l'app prennent la
  suite (`1SPE-154`…), sans marqueur distinctif — leur provenance n'a plus
  d'effet sur rien maintenant que le seed ne rejoue plus.
- Les 95 points de 6ᵉ, seedés avant l'existence de la colonne, ont été
  **rattrapés** (`6-001`…`6-095`) ; la colonne est ensuite passée `NOT NULL`.
- Un point archivé **garde son numéro** : archiver ne libère rien. Seule une
  suppression définitive le rend disponible — et l'API la refuse dès qu'il y a
  la moindre référence.

`curriculum_points.code` est `NOT NULL` sans défaut, ce que Postgres ne sait pas
distinguer de « fourni par l'appelant » : le type généré exige donc `code` à
l'insertion. Le cast vit à un seul endroit, `pointInsert()` dans
`src/lib/server/curriculum.ts`.

### La suppression, enfin gardée

Cinq des six clés étrangères vers `curriculum_points` sont en `CASCADE`. Un clic
sur « Supprimer » effaçait donc sans un mot la couverture du cahier de texte et
l'acquisition des élèves attachées au point.

`DELETE` renvoie maintenant **409** dès qu'une référence existe, avec la phrase
qui dit laquelle (« Ce point est utilisé par 3 exercices et 12 élèves… archivez-le
plutôt »). Comptage côté base en `SECURITY DEFINER` : compter à travers les RLS
de l'appelant renverrait zéro là où un élève a de l'historique que le prof ne
voit pas, et laisserait passer la suppression.

### Position d'affichage — indépendante du code

Question de David : peut-on réordonner sans que les codes se suivent ? C'était
**déjà le cas** — `display_order` est local à l'objectif (1..N, pas 1..153) et
rien ne trie par `code`. Vérifié en base : `1SPE-027` déplacé en tête donne
l'ordre 027, 023, 024, 025, codes inchangés. Si les deux séries coïncidaient,
c'est seulement que le seed a créé les points dans l'ordre du BO.

Trois manques comblés (`20260901090000_curriculum_point_ordering.sql`) :

- **Un point créé dans l'app arrivait en premier.** L'API posait
  `display_order = 0` faute de valeur, alors que les points seedés commencent à
  1 ; et deux créations successives se retrouvaient toutes deux à 0, départagées
  par ordre alphabétique. Un trigger le place désormais en dernier.
- **Réordonner coûtait deux `PATCH` et un rechargement complet par cran** —
  vingt requêtes pour remonter de dix places. `POST /points/reorder` renumérote
  l'objectif entier en une transaction ; l'UI gagne le glisser-déposer par
  poignée, les flèches ↑↓ restant le pendant clavier et tactile (HTML5 drag ne
  fonctionne pas au doigt).
- **Rien ne garantissait des positions 1..N** : une passe de remise à plat
  rattrape zéros, égalités et trous.

La fonction refuse une liste qui ne couvre pas exactement l'objectif, archivés
compris. Un sous-ensemble renumèroterait une moitié en laissant l'autre sur ses
anciennes valeurs — doublons et ordre final imprévisible. C'est pourquoi l'UI
calcule le déplacement sur la liste complète et non sur ce qu'elle affiche.

### Effet de bord réparé

`getCurriculumTree()` renvoyait les points archivés à ses quatre appelants —
l'archivage n'avait donc **aucun effet** sur le tagging d'exercices, la
couverture du cahier de texte ni la heatmap Avancement. Ils sont désormais
exclus par défaut ; seule la page Programme les demande, pour pouvoir les
restaurer.

### Ce que la page Programme sait faire

|                                          | avant                            | après                              |
| ---------------------------------------- | -------------------------------- | ---------------------------------- |
| Nom, ordre, `kind`                       | ✅                               | ✅                                 |
| `exigence`, `rang`, `regime_acquisition` | ❌                               | ✅                                 |
| Code                                     | invisible                        | affiché, non modifiable            |
| Déplacer un point sous un autre objectif | ❌                               | ✅ (garde code et historique)      |
| Archiver / restaurer                     | ❌                               | ✅                                 |
| Supprimer                                | toujours, en cascade silencieuse | seulement si rien n'y est accroché |

Trois bugs trouvés en chemin : le sélecteur de `kind` proposait encore
`— non précisé` et ignorait `demonstration`, alors que la colonne est `NOT NULL`
à trois valeurs depuis la fusion ; l'API ignorait `exigence`,
`regime_acquisition` et `rang` à la création (le schéma Zod les acceptait,
l'`INSERT` ne les passait pas) ; et `POINT_COLS` ne projetait ni `code`, ni
`exigence`, ni `regime_acquisition`, ni `rang` — des champs `undefined` sur un
objet que TypeScript croyait complet.

---

## 8. Point de reprise

**Tout est commité, arbre de travail propre.** Neuf commits sur
`feat/refonte-referentiel`. Rien n'est poussé, aucune PR, aucune migration
appliquée en prod — les trois choses qui demandent l'accord explicite de David.

Dernier état vérifié : `pnpm check:incremental` 1721 fichiers / 0 erreur ·
`pnpm test:server` 825 fichiers / 31 865 tests · `pnpm test:integration`
398 passés, **2 échecs pré-existants** (`admin-elevation`, `bad_jwt` — reproduits
sur le schéma de `main`, dérive de version gotrue v2.190.0 / v2.195.0).

L'isolation des tests est réparée et vérifiée : après une suite complète, le
grade 6 reste à 6 thèmes / 20 objectifs / 95 points (il montait à 11 thèmes
avant le correctif).

Question ouverte, sans urgence : que faire de l'arbre 6ᵉ. Ses 95 points ont un
`kind` hérité du seed d'origine, et les 72 capacités famille A n'ont pas été
réintégrées — leur contenu reste dans `docs/wip/referentiel/6e-savoirs.md`.

---

## 9. Reste du chantier

**Phase 4 — banque de questions.** ⚠️ **Le stock legacy ne résout pas la 1ʳᵉ spé** : sur les 633 questions converties, **31 seulement sont de niveau 1ʳᵉ spé** (27 seconde, 1 terminale, 574 primaire/collège). Le pipeline d'import (`scripts/import-questions-to-db.ts` + UI de revue admin) existe et n'a jamais tourné en prod (2 templates en base).

Dimensionnement : la convention « 1 template = 1 variation canonique, 2-3 par point » donne 150 à 270 templates pour les ~70-90 points réellement « drillables ». Les autres (« résoudre un problème d'optimisation », « utiliser le produit scalaire pour résoudre un problème géométrique ») ne sont pas du matériau à question — ils se suivent par le cahier de texte et le jugement du prof.

**Phase 5 — devoirs typés** du cahier de texte vers « Mon travail » (aujourd'hui `homework_content` est du texte libre, invisible de l'inbox).

**Hors phases** : les classes 2026-27 ne sont pas créées. Les 7 classes en base sont celles de l'an dernier, toutes désactivées sauf une classe de test.

---

## 10. Pièges de vérification (appris à la dure)

- **`pnpm db:types` vise la PROD** (`--project-id`), pas le local. En dev local-first, utiliser `npx supabase gen types typescript --local`, sinon on écrase les bons types par les anciens.
- **`check:incremental` exclut les tests** (`tsconfig.check.json`) et **`test:integration` ne couvre pas les unitaires**. Des tests unitaires serveur sont restés cassés une phase entière sans être vus. **Toujours lancer `pnpm test:server`** (825 fichiers, ~31 900 tests, ~2 min, pas d'OOM).
- **`FRESH=1 pnpm check:incremental` obligatoire après un `git mv`** — le cache incrémental périmé produit des erreurs fantômes (24 erreurs inexistantes observées).
- **Un `db:reset` interrompu** (502 transitoire) laisse la base incohérente et produit des dizaines d'échecs trompeurs dans des tests sans rapport. **Toujours vérifier `Finished supabase db reset`** avant de conclure quoi que ce soit d'une suite de tests.
- **2 échecs d'intégration sont pré-existants** : `admin-elevation.test.ts` (`invalid JWT`), vérifiés en remisant les modifications et en testant sur le schéma de `main`. Probablement la dérive de version gotrue signalée par le CLI au démarrage.
- `skills.family` était une colonne GENERATED depuis `objective_id` → la droper **avant** sa source.
- `supabase/seed.sql` est un dump prod restreint aux tables de référence : tout renommage de table s'y répercute.
