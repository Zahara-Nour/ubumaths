---
couvre:
  - scripts/create-questions.ts
  - scripts/questions/page-a-cocher.ts
  - scripts/questions/page-a-cocher.html
  - scripts/questions/publier-lot.ts
  - scripts/questions/sonde-courbes.ts
  - scripts/lib/page-a-cocher.ts
  - scripts/lib/lot-questions.ts
---

# Couvrir un niveau en modèles de questions — démarche, choix et pièges

> Rédigé le 2026-10-26, après le chantier « questions » du CP (journal
> [questions-progress.md](../wip/questions-progress.md)) : 84 points, 9 lots (A1-A6, H, B1-B3,
> M, C), 72 modèles publiés. Skill : `couvrir-niveau` ([.claude/skills/couvrir-niveau/](../../.claude/skills/couvrir-niveau/SKILL.md)).

**But** : que chaque point du programme d'un niveau ait au moins un modèle de question juste,
dans ses bornes, rangé sur le nœud de son point et tagué de ce point. Vocabulaire :
[CONTEXT.md](../../CONTEXT.md) (branche → notion → sous-notion ; point ; modèle ; variation).

Un modèle se fabrique **hors de l'application** : fichier JSON écrit par un script Python de
lot, vérifié (`checkTemplate`), joué en base locale, créé en **brouillon** en prod par David,
rangé et tagué par **migration**, relu sur une **page à cocher**, puis publié par David.

---

## 1. Relevé (lecture seule, MCP Supabase prod)

Trois relevés, collés dans le journal du chantier (`docs/wip/<sujet>-progress.md`) :

```sql
-- Points du niveau et nombre de modèles tagués
select p.code, p.name, count(q.template_id) as modeles
  from public.curriculum_points p
  left join public.question_template_points q on q.point_id = p.id
 where p.grade = '<niveau>' and p.archived_at is null
 group by p.code, p.name, p.display_order
 order by p.display_order;

-- Modèles du niveau : statut, nœud, tags
select left(t.id::text, 8) as id, t.title, t.status, t.level, t.classification_node_id is not null as range,
       array_agg(p.code) filter (where p.code is not null) as points
  from public.question_templates t
  left join public.question_template_points q on q.template_id = t.id
  left join public.curriculum_points p on p.id = q.point_id
 where '<niveau>' = any(t.grades)
 group by t.id order by t.title;
```

Les **bornes** de chaque point (plages, formats, exemples de réussite du BO) :
`docs/systeme/programmes/bornes/` — `cycle2.json` (CP, CE1, CE2), `cycle3.json` (CM1, CM2, 6),
`cycle4.json` (5, 4, 3) sous `[niveau].points[code]` ; lycée sous `bornes/lycee/`. Elles font foi
pour les plages des variables **et** pour le corrigé.

## 2. Vérifier l'existant

**D'abord la passe déjà faite** : le chantier « arbre des notions » a jugé chaque modèle du primaire
et du collège contre les bornes de son niveau (2026-10-18 → 20) —
`docs/archive/wip/arbre-notions/analyse/<lot>.csv` (`cycle2`, `cm`, `sixieme`, `cycle4`) et leurs
`*-notes.md`, avec les décisions de David. Ses verdicts font foi ; on ne revérifie que ce qu'elle
n'a pas tranché. Ses `HORS_PROGRAMME` restent sans tag, et leur **changement de niveau** (« à part »)
n'a jamais été fait : il se règle dans le chantier du niveau.

Pour chaque modèle du niveau : chaque variation contre les bornes de son point (plages tirées,
notions du corrigé — un « × » dans un corrigé de CP est hors programme). `pnpm question:specs
--template <uuid> --apercu 5` montre des tirages réels.

Modèles non tagués : un point du niveau, d'un niveau **suivant** (permis), ou aucun (à dire à
David). Les corrections passent avant les lots neufs (§ 7).

## 3. Classer les points sans modèle

| Classe | Sens                                       | Suite                                           |
| ------ | ------------------------------------------ | ----------------------------------------------- |
| A      | Texte / formule seuls                      | lots de texte, sans outil                       |
| B      | Outil existant (`figure`, `line`, tableau) | lots, en vérifiant le rendu du bloc             |
| C      | Outil neuf (bloc à créer)                  | **chantier à part**, puis lot de modèles        |
| D      | Non évaluable dans l'appli                 | David tranche : hors appli, ou outil à inventer |

Puis **questions à David** (ordre des outils, points à trancher, corrections) et découpage en
lots de 3 à 10 modèles, un thème par lot.

## 3 bis. Les outils qui existent déjà

À relire **avant** de classer un point en C ou de proposer un outil : un point classé C à tort
coûte un chantier. Détail de chaque bloc : [ubumark.md § Blocs spéciaux](../systeme/ubumark.md#blocs-spéciaux)
(syntaxe, rendu écran, PDF), qui fait foi si la liste ci-dessous a vieilli.

**Afficher** (blocs ubumark, dans l'énoncé, le corrigé ou un choix de QCM) :

| Bloc                                                                                                                           | Ce qu'il montre                                                                         |
| ------------------------------------------------------------------------------------------------------------------------------ | --------------------------------------------------------------------------------------- |
| ` ```variation `                                                                                                               | tableau de variations (et de signes)                                                    |
| ` ```trig `                                                                                                                    | cercle trigonométrique                                                                  |
| ` ```courbe `                                                                                                                  | courbe de fonction, moteur du grapheur ([grapheur.md](../systeme/grapheur.md))          |
| ` ```line `                                                                                                                    | droite graduée                                                                          |
| ` ```probtree `                                                                                                                | arbre de probabilités                                                                   |
| ` ```barres `, `circulaire`, `histogramme`, `frequences-cumulees`, `tableau-croise`, `loi`, `simulation`, `effectifs`, `nuage` | statistiques (`stat-chart`) ; `tableau-croise` à trous pour compléter                   |
| ` ```figure `                                                                                                                  | figure de géométrie (DSL `geometry-core`, [geometrie/](../systeme/geometrie/README.md)) |
| ` ```horloge `                                                                                                                 | cadran                                                                                  |
| ` ```operation `                                                                                                               | opération posée (addition, soustraction, multiplication, division)                      |
| ` ```collection `                                                                                                              | jetons, cubes, barres de dix, paquets                                                   |
| ` ```monnaie `                                                                                                                 | pièces et billets en euros                                                              |
| tableau markdown, image, ` ```qr `                                                                                             | tableaux, images fixes, QR code                                                         |

**Répondre** (ce que l'élève saisit ou fait) :

- **case** (MathLive, jugée par le juge ordinaire), plusieurs cases, case dans un tableau (`$?$`) ;
- **QCM** : aujourd'hui `choices[{content, isCorrect}]` (question « QCM », jamais mêlée de cases),
  choix en texte ou en dessins. ⚠️ **En cours de réécriture en case spéciale** : la case « choix »
  (bloc ` ```choix `, [ADR 0033](../adr/0033-le-qcm-est-une-case.md))
  remplace le QCM ; tous les QCM de la prod seront migrés et le type `multiple_choice` retiré. La
  case choix n'est pas encore en prod : au premier lot qui a besoin d'un QCM, lire le « Reprendre ici » de
  `figure-et-choix` et **demander à David** la forme à écrire (ancien QCM, migré avec les
  autres, ou case choix, en brouillon jusqu'au `deploy:prod`). Une fois la migration faite : case
  choix seulement, et « QCM ou cases » (§ 9) ne vaut plus.
- **opération posée à compléter** (saisie chiffre par chiffre du bloc `operation`) ;
- **construire** : `construire:` dans ` ```collection ` ou ` ```monnaie ` (la valeur posée est la réponse) ;
- **figure à compléter** (` ```figure-a-completer `, case « figure » : objets de l'élève retrouvés
  sur les nœuds) et **figure de travail** (` ```figure-de-travail `, jamais notée), `deplacable:`.

**Hors questions, réutilisables comme briques** : le grapheur (`/grapheur`), l'Atelier,
les constructions animées (`constructions-v2` : règle, compas, équerre, rapporteur), le champ
glisser-déposer `StructureField` (en prod, mais pas encore branché aux questions), Blockly (à
venir comme vraie fonctionnalité).

⚠️ **Géométrie en refonte** (2026-10) : case « figure », figure de travail, QCM en cases et
`deplacable:` bougent dans le chantier `figure-et-choix`. Lire son
« Reprendre ici » (`docs/wip/`) avant de proposer un modèle ou un outil de géométrie.

**Manquent encore** (connus au CP) : réponses à placer (point sur une droite graduée, étiquettes
à ranger, hauteur de barres), aiguilles à placer sur l'horloge.

## 3 ter. Créer l'outil qui manque (classe C)

Couvrir un niveau, c'est aussi **inventer les outils** que ses points demandent : au CP, les
blocs ` ```horloge `, ` ```collection `, ` ```monnaie `, ` ```operation ` (opérations posées), le
geste « construire » (l'élève pose barres, cubes, pièces), la case « figure » sont nés ainsi.
Un point de classe C n'est pas laissé sans modèle : je propose l'outil.

1. **Proposer à David** l'outil, ce qu'il couvre (liste des points, de ce niveau et des
   suivants : les minutes de l'horloge au CE1), sa forme (affichage seul, QCM de dessins, geste
   de réponse) et sa place dans l'ordre des lots. Jamais d'architecture décidée seul : une
   décision durable → ADR (skill `domain-modeling`).
2. **Chantier à part** : son worktree, son journal (`docs/wip/<outil>-progress.md`), sa
   phase 0 (syntaxe du bloc écrite en exemples, comportements nominal / limite / erreur, tirés des
   « exemples de réussite » du BO dans les bornes), validée avant tout code.
3. **Recette technique** : [ubumark.md § Comment étendre — nouveau bloc spécial](../systeme/ubumark.md#comment-étendre--nouveau-bloc-spécial)
   (type, parseur, branchements, scène pure partagée écran / PDF, composant, Typst, éditeur
   riche, batterie de tests). Patrons récents : `monnaie` (scène, QCM de dessins), `collection`
   (barres de dix), `MonnaieConstruire` / `CollectionConstruire` (geste de réponse : la case
   porte la valeur posée, jugée par le juge ordinaire ; la correction montre une construction
   juste).
4. **Par paliers** : d'abord l'affichage (le bloc se lit, les modèles « lire / comparer »
   peuvent partir), puis le geste (« construire », « placer »). Chaque palier = une PR, une page
   de démo pour David.
5. **En prod** : les modèles qui utilisent le bloc restent en **brouillon** jusqu'au
   `deploy:prod` qui livre le bloc ; le lot de modèles suit la démarche normale (§ 4 à 8).

Restent ouverts (CP) : les **réponses à placer** (CP-008, CP-072) et la **case « figure »**
(CP-034, 059, 060 ; chantier `figure-et-choix`).

## 4. Phase 0 d'un lot

Pour chaque modèle, proposer à David, en français et sans écrire de fichier :

- son **point** (un seul : [ADR 0020](../adr/0020-arbre-central-programmes-pointeurs.md)) et sa **sous-notion** (le nœud du point) ;
- ses **variations** (une par difficulté ou par forme), leurs **plages**, leurs **niveaux**
  (numérotés dès l'écriture) ;
- la forme de réponse : case, QCM **ou** cases (pas les deux ; QCM en réécriture, § 3 bis), bloc à construire ;
- la **question d'accès** de la migration, posée AVANT le SQL : « qui pourra lire quoi, qu'il ne
  pouvait pas lire avant ? » (pour un lot de modèles neufs en brouillon : personne).

Les décisions vont dans le journal, section « Lot X : décisions (David, date) ».

## 5. Écrire le lot

Dans un worktree (`git worktree add -b feat/questions-<lot> ../ubumaths-wt-questions origin/main`) :

1. `docs/wip/questions/lot-<x>.py <dossier>` écrit les JSON de
   `scripts/questions/<niveau>-<lot>/` (gabarit : `lot-c.py`, fonctions `modele`, `var`, `spec`,
   `bloc`). Le script porte en commentaire les décisions et les pièges du lot.
2. Chaque modèle a des `testSpecs` : un juste par variation, et les **erreurs typiques** de
   l'élève en `incorrect`.
3. `pnpm tsx scripts/create-questions.ts --dir scripts/questions/<niveau>-<lot>` (simulation :
   `checkTemplate` sur chaque fichier, specs comprises) → tout vert.
   Lot qui dessine des courbes : `pnpm tsx scripts/questions/sonde-courbes.ts --dir …` tire
   chaque modèle 300 fois et passe chaque bloc ```courbe (énoncé et corrigé) au parseur →
   **0 problème** avant la page à cocher ; `--montre <fichier.json> <graine>` affiche la variation
   fautive.
4. Base **locale** : `set -a; . ./.env.local; set +a` puis `create-questions … --publier`
   (sans cela, le script vise `.env` = la PROD). Jouer chaque modèle dans l'aperçu admin
   (`/dashboard/admin/questions/<id>/preview`, `admin@local.test`), une réponse juste, une fausse,
   la correction.
5. PR des fichiers seuls (« revue : aucune, contenu » ; `Doc-inchangée: contenu`), CI verte,
   merge.

## 6. En prod : brouillons, rangement, tags

1. Si le lot utilise un bloc pas encore en prod : attendre le `deploy:prod` (David seul).
2. **David** lance `create-questions --dir … --publier` (l'écriture en prod est refusée au mode
   auto) : les modèles arrivent en **brouillon**, sans nœud ni tag. Relever leurs `id`.
3. Migration nœud + tag : gabarit `supabase/migrations/20261026210000_questions_cp_c_rangement_tags.sql`
   (garde « encore sans nœud ni tag », nœud résolu par son chemin et égal à celui du point,
   tout ou rien, `updated_at` préservé, rollback en commentaire) et son test
   `tests/integration/questions-cp-c-rangement-tags.test.ts` (copies des vrais identifiants, la
   migration rejouée depuis son fichier). Test **rouge sans la migration**, puis vert.
4. `security-auditor` (sans finding bloquant), CI verte, merge, `pnpm db:migrate` depuis le dépôt
   principal (les 4 conditions de `CLAUDE.md`), puis vérifier en prod : nœud, un tag, brouillon.

## 7. Corriger un modèle déjà en prod

Relevé MCP (contenu complet, md5, nœuds, points, tags, **0 donnée d'élève**) ; instantané dans
`docs/wip/<chantier>/etat-prod-<date>/` (ses md5 = prod) ; nouveau contenu écrit par le script
de lot, `checkTemplate` vert ; **David** lance `create-questions --publier --mettre-a-jour`
(remplace contenu et description). Retrait de tag ou niveaux seuls → migration à la main.

Modèle **publié** (`--mettre-a-jour` ne le touche pas) → deux migrations, gabarits du lot 0 du
CE1 : contenu générée par un script de lot (`docs/wip/questions/lot-corrections-ce1.py` →
`20261027000000_questions_ce1_contenu.sql`, test `decrireLotModifier`), puis rangement, tags,
niveaux et statut à la main (`20261027000100_questions_ce1_rangement_tags.sql` et son test). Le
rollback écrit **garde l'état laissé par la migration** (nœud, niveaux, statut, tags) : sans
cette garde, une saisie faite depuis serait écrasée en silence. Copies de test publiées : un
niveau chacune (`idx_question_templates_unique_category`).

## 8. Page à cocher, puis publication

1. **Page à cocher** :
   ```bash
   pnpm tsx scripts/questions/page-a-cocher.ts --dir scripts/questions/<niveau>-<lot> \
     --titre "Relecture CP — lot C" --intro "<une phrase : ce que le lot apporte>" \
     --sortie <scratchpad>/relecture-<niveau>-<lot>.html
   ```
   Une fiche par fichier du lot, **un exemple par variation tiré par le vrai générateur**
   (`generateInstance`, graine fixe : page reproductible). Les blocs `figure`, `monnaie`,
   `collection`, `horloge` et `courbe` sont dessinés par les scènes de l'appli (à construire :
   réserve, plan vide, et la construction juste à part) ; un bloc `python` est montré tel quel ;
   un autre bloc (`operation`…) est montré par sa source et signalé. Les formules restent en texte quand elles n'ont que des nombres et des signes (CP) ; au-delà
   (fractions, `\left`, exposants), KaTeX les rend en MathML (cdnjs, sans feuille de style), y compris
   la réponse attendue, le libellé du point, ses bornes et les réponses des specs ; un bloc `$$…$$` est
   rendu en mode bloc (`align`), ℝ, ℕ, ℤ, ℚ, ℂ en caractères Unicode (le MathML de Chrome ignore
   `double-struck`) ; une formule que KaTeX refuse revient au rendu texte. L'id, le statut, le nœud et
   les points sont **lus en base** (lecture seule, `.env` = prod), avec les bornes de chaque
   point (`docs/systeme/programmes/bornes/`). Alertes en tête de fiche : sans point, deux points
   d'un même programme (1SPE-224 avec 1TECHNO-037 est permis, ADR 0020), sans nœud, niveau en base
   différent du fichier, point absent des bornes, bloc non dessiné. Le niveau n'entre pas dans la clé de la page : les anciens
   lots ont été renumérotés en base après coup (CP B1, B3, H) ; un sous-domaine changé après coup
   (CP B2) fait refuser le lot, et le message dit ce qui diffère. Deux modèles de même clé (un
   homonyme d'un autre niveau, « Comparer deux nombres décimaux » en CM1 et en 6e) sont départagés
   par le niveau du fichier, s'il en désigne exactement un ; la fiche le signale (« homonyme …
   écarté »), car un ancien lot renuméroté prendrait ainsi l'homonyme au lieu de son modèle.
   **Brouillons déjà en base** (lots d'avant ce chantier, dont les fichiers ne concordent plus) :
   partir d'un instantané, `pnpm tsx scripts/export-question-templates.ts --dir
scripts/questions/<niveau>-0-<thème> --ids <id8>,…` ; chaque fichier porte son `id`, qui
   l'apparie à sa ligne sans homonyme (la clé doit encore concorder). Le même dossier sert aux
   corrections (§ 7, `--mettre-a-jour`) et à la publication.
   Gabarit : `scripts/questions/page-a-cocher.html` (collection `verdicts`, « OK / À revoir » +
   commentaire, filtre « Ce qui reste » par défaut, file d'écriture unique, nouvel essai
   automatique, bandeau tant qu'une réponse attend). Publier la page en artefact avec la capacité
   `db` ; vérifier le rendu à 390 px.
2. David relit ; lire la base (`ArtifactData list verdicts`) et **compter** les réponses avant
   de dire « tout est relu ». Un « À revoir » → corriger (§ 7), remettre le verdict à zéro.
3. **Publication** :
   ```bash
   pnpm tsx scripts/questions/publier-lot.ts --dir scripts/questions/<niveau>-<lot>   # simulation
   ```
   Retrouve chaque fichier en base par la clé de `create-questions` (titre, thème, domaine,
   sous-domaine, niveau), un modèle par fichier, et joue les **contrôles de la publication**
   (`publishTemplates` en simulation : contrôle de l'admin, collisions de catégorie). Un seul
   refus, et rien n'est écrit. **David** le lance avec `--publier`, puis le statut `published`
   est relu en base. Un modèle déjà publié est laissé tel quel : relancer reprend une
   publication interrompue.

## 9. Pièges

- **Un point par modèle** (ADR 0020) ; deux points → deux modèles.
- **QCM ou cases**, jamais les deux (tant que la case choix n'a pas remplacé le QCM, § 3 bis) ;
  une case dans un tableau s'écrit `$?$`.
- **`{{if:…}}` imbriqué non résolu dans `correctChoiceIndex`** : passer par une variable.
- Jamais de variable `e` (Euler) ; lettres parlantes, jamais P / E / V.
- Prénoms écrits dans le texte ; montants en `$n~\unit{€}$`, jamais « : » juste après un montant
  ([notation-unites.md](notation-unites.md)).
- **Niveaux numérotés dès l'écriture** (pas de migration de niveaux après coup), **après relevé
  des niveaux publiés de la catégorie** (`theme`, `domain`, `subdomain`) : un niveau pris bloque
  la publication, et `create-questions` cherche un modèle par son niveau (`--mettre-a-jour` ne le
  change pas) ; corriger après coup = migration + fichiers (CE1 lot 1, 2026-10-27).
- Migration qui change l'arbre ou les points : `LATER` + copies figées dans le test.
- `gh pr checks --watch` peut rendre la main avant le job d'intégration : suivre le **run**.
- Écriture en prod (`create-questions --publier`, publication) : **David** la lance (`!`), je
  vérifie ensuite en base.
- Cas réels des élèves d'abord : pas de chasse aux cas exotiques.
