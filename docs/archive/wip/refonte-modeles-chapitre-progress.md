# Refonte des modèles de chapitre — journal (CLOS le 2026-10-15)

> **Chantier clos.** Ce qui reste vrai est versé dans [cours-et-chapitres.md](../../systeme/cours-et-chapitres.md)
> et [base-de-donnees.md](../../systeme/base-de-donnees.md) ; décision : [ADR 0029](../../adr/0029-le-modele-possede-son-contenu-le-chapitre-le-relie.md).
> Étape 5B faite le 2026-10-15 : migration `20261016103800` jouée, 4 PDF en doublon supprimés
> (sauvegardés dans `~/chiphre-sauvegardes/modeles-etape5b/`), types régénérés (#1408).

> Décision : [ADR 0029](../../adr/0029-le-modele-possede-son-contenu-le-chapitre-le-relie.md)
> (2026-10-14). Doc de la zone : [cours-et-chapitres.md](../../systeme/cours-et-chapitres.md) (écart 9).
> État : **phase 0 validée par David le 2026-10-14** (comportements 1-19, Q1-Q4 selon les recos).
> Prochaine étape : modèle de données et question d'accès, avant tout SQL.

## Point de départ (mesuré le 2026-10-14)

- Modèle « Le modèle quadratique – les fonctions polynômes du second degré » : brouillon, 4 documents
  (PDF téléversés), tiré du chapitre de 1SPE du 2026-09-13 (`1c997492…`), dont les 4 documents sont
  **publiés** — des élèves y ont accès et doivent le garder.
- Chapitre créé le 2026-10-14 en 1SPE 2 (`91d9d152…`) : 4 documents non publiés, en faux liens
  Google Drive `storage://…` — inutilisables.
- La règle de stockage élève du bucket `chapter-documents` n'existe qu'en production (aucune
  migration) et ne teste pas `published_at`.

## Phase 0 — comportements attendus (validés le 2026-10-14)

« Élément » = section, document, objectif, fiche, série ou exercice.

### Le modèle

1. **Nominal** — sur la page du modèle, le prof édite le plan avec l'éditeur du chapitre : créer,
   renommer, réordonner des sections ; téléverser un PDF ou ajouter un lien Drive ; ajouter un
   objectif ; rattacher une fiche, une série, un exercice. Aucun bouton de publication, aucun élève.
2. **Nominal** — un PDF téléversé dans le modèle est stocké chez le modèle, pas dans un chapitre.
3. **Limite** — un modèle en brouillon s'édite mais ne peut pas servir à créer un chapitre
   (comportement actuel, gardé).
4. **Erreur** — un fichier de plus de 25 Mo est refusé, comme pour un chapitre.

### Le chapitre lié

5. **Nominal** — créer un chapitre depuis un modèle publié : le chapitre affiche tout le contenu du
   modèle, **rien n'est publié**, aucun fichier n'est copié.
6. **Nominal** — le prof publie, range (section, ordre) et masque chaque élément du modèle **pour
   son chapitre seulement** ; l'autre classe liée au même modèle n'est pas touchée.
7. **Nominal** — le prof ajoute au chapitre ses propres éléments ; ils sont stockés dans le chapitre
   et n'apparaissent ni dans le modèle ni dans les autres classes.
8. **Nominal** — on corrige un document du modèle (nouveau PDF, nouveau titre) : chaque chapitre lié
   affiche la correction aussitôt, avec sa publication inchangée.
9. **Nominal** — on ajoute un élément au modèle : il apparaît dans chaque chapitre lié, non publié.
10. **Limite** — on retire du modèle un document publié dans la classe A et non publié dans la
    classe B : les élèves de A le gardent ; il disparaît de B.
11. **Limite** — un élève qui rejoint la classe après la publication voit les éléments publiés
    (accès hérité de la classe, ADR 0005).

### Accès

12. **Nominal** — un élève lit un fichier du modèle si, et seulement si, un chapitre visible de sa
    classe le relie et l'a publié (`published_at <= now()`). Même règle par le lien de consultation.
13. **Erreur** — élève d'une autre classe, élève hors classe, anonyme sans lien, date de publication
    future, élément masqué : refus. Un élève ne lit jamais le modèle lui-même.
14. **Erreur** — un élève qui devine l'identifiant d'un fichier de modèle relié par une autre classe
    seulement : refus.

### Rompre le lien

15. **Nominal** — détacher un chapitre : ses éléments reliés sont copiés chez lui (fichiers compris),
    avec leur publication, leur section et leur ordre ; ses élèves ne perdent rien.
16. **Erreur** — supprimer un modèle encore relié : refusé, avec le message « archivez-le » ;
    archivé, il ne crée plus de chapitre mais reste servi aux chapitres liés.
17. **Nominal** — supprimer un modèle relié à aucun chapitre : modèle et fichiers supprimés.

### Reprise de l'existant (sans maintenance)

18. Les 4 PDF du chapitre d'origine sont **copiés** chez le modèle ; le chapitre d'origine devient un
    chapitre lié dont les 4 documents restent publiés aux mêmes dates. Les anciens fichiers et lignes
    ne sont supprimés qu'après déploiement et vérification avec David.
19. Le chapitre de 1SPE 2 est relié aux 4 documents du modèle, non publiés ; ses faux liens
    `storage://` disparaissent.

## Questions du tour 2 — tranchées le 2026-10-14 (recos retenues)

❓ **Q1 — Le mot.** Le glossaire dit « instanciation » pour un chapitre créé depuis un modèle. Avec
le lien, faut-il l'appeler **chapitre lié** (et bannir « instanciation » dans l'interface) ?
➡️ Oui : « chapitre lié » dit ce que la chose est désormais ; « instanciation » reste le nom de table.

❓ **Q2 — Retoucher un élément du modèle depuis un chapitre** (corriger le texte d'un objectif pour
une seule classe) ?
➡️ Non : on le masque et on ajoute son propre élément. Sinon le lien n'est plus un lien, et l'écart
« objectif retouché, objectif doublé » revient.

❓ **Q3 — Sections.** Un chapitre lié peut-il ajouter ses propres sections, et réordonner celles du
modèle pour sa classe ?
➡️ Oui aux deux : l'ordre est propre à chaque chapitre (point 6) ; ses sections propres s'ajoutent
au plan du modèle.

❓ **Q4 — Masquer ≠ ne pas publier ?** Un élément non publié reste visible du prof dans le plan ; un
élément masqué disparaît aussi du plan du prof (« pas cette année »), et revient d'un clic.
➡️ Garder les deux : le plan du prof reste lisible quand un modèle est riche.

## Tour 3 — tranché le 2026-10-14 (recos retenues)

- **Q5 — rangement** : option 1, **mêmes tables** ; une « ligne de lien » par élément du modèle dans
  chaque chapitre lié.
- **Q6 — accès** : personne ne gagne d'accès. **Miroir** : la règle de stockage élève (prod seulement)
  laissait un élève lister et télécharger les fichiers **non publiés** des chapitres visibles de sa
  classe (constaté en prod le 2026-10-14 : `Students can read visible chapter documents` ne teste pas
  `published_at`). Elle est retirée ; le serveur sert le fichier après la garde de publication.
  Avant le retrait : vérifier sur les données réelles que chaque document publié reste lisible.

## Modèle de données (étape 2)

Six tables de contenu : `chapter_sections`, `chapter_documents`, `chapter_checklist_items`,
`chapter_exercises`, `chapter_worksheets`, `chapter_series` (`chapter_decks` hors périmètre de
l'ADR : le modèle n'en porte pas). Chacune reçoit :

- `template_id` — propriétaire quand l'élément appartient au modèle ; `chapter_id` devient
  facultatif ; **exactement un des deux** (`num_nonnulls = 1`).
- `source_id` — sur une ligne de chapitre : l'élément du modèle qu'elle relie (`ON DELETE RESTRICT` :
  la base refuse de perdre une ligne reliée ; pour les sections, `SET NULL`, la section reste au
  chapitre comme section propre).
- `retired_at` — élément **retiré** du modèle (point 10) ; `hidden` — élément **masqué** par un
  chapitre (Q4), forcément non publié.

**Choix d'implémentation** (même comportement que « lu sur la ligne du modèle », moins de code
touché) : le contenu d'un élément du modèle est **recopié par la base** sur ses lignes de lien —
titre, description, chemin du fichier (le fichier, lui, reste unique, chez le modèle). Ainsi les
pages élève, le lien de consultation et les règles d'accès actuelles lisent les lignes de lien sans
changer. Déclencheurs :

- **à l'insertion** d'une ligne de lien : contenu et section tirés de l'élément du modèle ; refus si
  la source n'est pas un élément de modèle, ou si le chapitre n'est pas lié (non détaché) à ce modèle ;
- **à la modification** d'un élément du modèle : contenu recopié sur toutes ses lignes de lien
  (point 8) ;
- **à l'ajout** d'un élément au modèle : une ligne de lien non publiée dans chaque chapitre lié
  (point 9) ;
- **au retrait** (`retired_at`) : les lignes de lien non publiées sont supprimées (point 10) ;
- **garde** : une ligne de lien ne change pas de contenu à la main (Q2) — sauf en se détachant
  (`source_id` remis à `null`, fichier copié par le serveur).

Fichiers d'un modèle : `chapter-documents/templates/<template_id>/…`, règles de stockage professeur
symétriques de celles de `chapters/…`. `orphan_chapter_documents` ignore les lignes de lien.

⚠️ **Ordre de livraison** : `deleteDocument` supprime le fichier d'un document téléversé, et
`/api/documents/[id]` lit le stockage avec les droits de l'élève. Aucune ligne de lien ne doit exister
en prod (reprise, étape 3) avant le déploiement du code qui en tient compte (étape 4).

## Avancement

- **Étape 2 (base)** — branche `feat/modeles-possedent-contenu` : migration
  `20261016103300_modele_possede_son_contenu.sql` + `tests/integration/modele-possede-son-contenu.test.ts`
  (22 tests). Rouges sans la migration (décor impossible : colonnes absentes) ; chaque déclencheur
  désactivé fait tomber son test (6 tests rouges, vérifié le 2026-10-14). 26 suites voisines vertes
  (896 tests). `security-auditor` : **aucun bloquant**. I1 (rollback dans le mauvais ordre) corrigé,
  et rollback marqué destructif. I2 clos : la règle élève de prod, lue le 2026-10-14, exige le
  préfixe `chapters/<id de chapitre>` — un chemin `templates/…` n'y passe jamais. M3 : 4 tests
  « l'élève n'écrit rien » ajoutés (26 tests). M4 → étape 3.
  ⚠️ `db:types` rendra `chapter_id` facultatif dans `database.ts` : le typecheck du code en dépendra
  (à traiter dans la PR qui régénère les types).

- **Étape 2 livrée** : #1380 mergée, `db:migrate` le 2026-10-14 (vérifié en prod : 6 tables, 29
  déclencheurs, règle élève intacte, 4 documents publiés de la 1SPE intacts). Types : #1381.

### Plan de l'étape 3 (2026-10-14)

- **3b en branche** `feat/modeles-serveur` : serveur écrit par un agent, puis `code-reviewer`
  (2 bugs : section des liens à l'ajout, élément masqué figé au détachement ; 4 risques) et
  `security-auditor` (aucun bloquant ; 2 importants sur l'intégrité des fichiers) — 12 corrections,
  chacune avec un test rouge d'abord. Le bug « ajouter un objectif » trouvé en route est parti à
  part (#1387).

- **3c en branche** `feat/modeles-interface` (bâtie sur `feat/modeles-serveur`) : éditeur partagé
  (`ChapterSectionsEditor`, `DocumentUpload`, `ChapterAddDialogs` par propriétaire) ; page du
  modèle (plan édité, « Retirer du modèle », « Modifier » titre/description ; plus de versions ni
  de « Mettre à jour depuis un chapitre ») ; chapitre lié (marque « Modèle », Masquer/Réafficher,
  interrupteur des masqués, « Chapitre lié au modèle », détachement confirmé) ; compteurs lus
  dans les tables (`countTemplateContent`). Vu à l'écran le 2026-10-14 sur la base locale (modèle
  rempli depuis sa page, publié, chapitre lié créé, document masqué, clair et sombre).
  ⚠️ Avant la reprise (étape 4), le modèle de 1SPE s'affiche à 0 élément : son contenu n'est que
  dans le snapshot.

- **3a livrée en branche** `feat/modeles-adoption` : migration `20261016103400_modele_adoption.sql`
  - `tests/integration/modele-adoption.test.ts` (9 tests ; 3 rouges sans la migration, puis 2 de
    plus après la revue). `security-auditor` : aucun bloquant ; mineurs 1 (adopter un élément retiré)
    et 2 (une ligne du modèle qui se relierait elle-même) corrigés et testés.

- **3a — adoption (migration)** : un élément PROPRE au chapitre devient une ligne de lien sans
  changer d'identifiant (cases cochées des objectifs, `published_at` gardés). Nécessaire à « Faire
  un modèle » et à la reprise. La garde `modele_lien_garde` l'interdit aujourd'hui : elle
  l'autorisera vers un élément d'un modèle auquel le chapitre est lié, contenu repris du modèle.
- **3b — serveur** : module du contenu de modèle (lister, ajouter, modifier, retirer ou
  supprimer, réordonner ; téléversement sous `templates/<id>/`) ; instancier = `link_chapter_to_template` ;
  détacher = copier les fichiers chez le chapitre puis délier ; supprimer un modèle relié =
  refus ; « Faire un modèle » = copier le contenu chez le modèle, puis adopter ;
  `/api/documents/[id]` sert le fichier par le service après la garde RLS ; `deleteDocument` ne
  supprime jamais le fichier d'une ligne de lien.
- **3c — interface** : éditeur partagé (`ChapterSectionsEditor`, `DocumentUpload` par
  propriétaire) ; page d'édition du modèle ; dans le chapitre, éléments du modèle marqués, non
  modifiables, masquables ; plus de « Mettre à jour depuis un chapitre » ni de versions affichées.

- **4 — reprise, en branche** `feat/modeles-reprise` (bâtie sur `feat/modeles-serveur`) :
  `migrateSnapshotTemplate` (`src/lib/server/chapter-template-reprise.ts`) + script
  `scripts/reprise-modeles-adr0029.ts` (`--essai` par défaut, `--appliquer`, `--cible=prod`,
  `--rattacher`). Rejouable après un échec partiel ; garde « déployé d'abord » en prod (revue du
  2026-10-14 : risques 1 à 3, voir § Déploiement). Aides de
  copie/adoption sorties de `chapter-templates.ts` vers `chapter-template-copy.ts` (importables par
  `tsx`). Test `tests/integration/reprise-modeles.test.ts` (9 tests, décor de la prod du
  2026-10-14) : rouge sur une fonction vide, puis vert ; sans le détachement temporaire, l'adoption
  échoue (doublons de liens) — mutation vérifiée. Essai, application et relance passés en local sur
  un décor aux identifiants de la prod. **Jamais lancé contre la prod.** À faire en prod, après le
  déploiement de l'étape 3 : essai `--cible=prod`, lecture du compte rendu avec David, puis
  `--appliquer`.
  ⚠️ Base locale partagée (2026-10-14) : une démo laissée par l'étape 3c faisait échouer le
  `global-setup` de la suite d'intégration (FK `RESTRICT` d'une ligne de lien quand il purge les
  profs) ; supprimée le même soir. Fragilité à traiter à l'étape 5 : la purge des tests doit
  supprimer les chapitres liés avant les modèles.

### Étape 5A — code mort de l'ancien système, en branche `refactor/modeles-nettoyage-code` (2026-10-14)

Sans migration ni écriture de données. Supprimés (grep `src`, `tests`, `scripts`, chaînes et
jointures comprises) : fonctions snapshot/versions de `chapter-templates.ts` (`createTemplateVersion`,
`getTemplateVersion(s)`, `computeDiff`, `checkForTemplateUpdates`, `getMigrationPreview`,
`migrateChapterToVersion`, `extract/merge/applyContentSnapshot…`, `refuseLegacyVersioning`,
`TemplateLinkedContentError`), actions `updateFromChapter` (page du modèle) et `migrateToVersion`
(page du chapitre), types et schémas Zod orphelins, 10 routes d'API sans appelant, 6 composants
morts. Le code ne lit plus aucune colonne de version (`INSTANTIATION_COLUMNS`) ; seule écriture
restante : `template_version: 1` (NOT NULL sans défaut) à l'adoption. Purge des tests : lignes de
lien puis modèles supprimés avant les profils (`tests/helpers/database/purge-modeles.ts`, test
`purge-tests-lignes-de-lien`), documents de chapitre avant les classes. Reste l'étape 5B :
migration destructive (colonnes, `chapter_template_versions`), anciens fichiers `chapters/…`
adoptés, règle de stockage élève de prod.

### Mise en prod faite le 2026-10-14 (v0.33.0, ~23 h)

`deploy:prod` → v0.33.0 (Vercel prêt à 22:59) → reprise `--essai` relue avec David → `--appliquer` :
modèle f74e72c8 = 6 sections + 4 documents (copies sous `templates/f74e72c8…/`), chapitre de 1SPE
adopté (mêmes identifiants, mêmes dates de publication), chapitre de 1SPE 2 réparé (4 liens non
publiés), originaux `chapters/1c997492…/` gardés. Vérifié en base (lecture seule) ; aucune erreur
Vercel. Sauvegarde : `~/chiphre-sauvegardes/reprise-modeles-adr0029/`. ⛔ Plus de retour arrière
Vercel en deçà de v0.33.0. Vérifications manuelles : `verifications-manuelles.md`. Reste : étape 5.

### État au 2026-10-14, fin de soirée : PRÊT pour la séance de mise en prod

Sur `main` : #1390 (serveur + interface), #1392 (reprise), #1393 (base : section masquée, en prod),
#1394 (interface : section masquée, badge « Invisible des élèves »), #1387 (ajout d'objectif).
Base en prod : migrations 103300, 103400, 103600. Reste après la mise en prod : étape 5
(nettoyage destructif : snapshot, versions, migration/fusion, API sans appelant, composants morts,
anciens fichiers `chapters/…` adoptés, règle de stockage élève de prod ; purge des tests à rendre
sûre face aux lignes de lien).

### ⛔ Déploiement : 3b + 3c (#1390) ET reprise (étape 4) ENSEMBLE

#1390 (serveur + interface) est mergée le 2026-10-14 mais **ne doit pas partir en prod sans la
reprise** : le modèle publié f74e72c8 n'a son contenu que dans `content_snapshot` ; avec le
nouveau code, sa page l'afficherait vide et l'instancier donnerait un chapitre vide. Séance de
mise en prod : `deploy:prod` → reprise (`scripts/reprise-modeles-adr0029.ts`, d'abord `--essai`)
→ vérification avec David (ses élèves de 1SPE lisent leurs 4 documents).

- **Ordre verrouillé** : `--cible=prod --appliquer` refuse d'écrire tant que `origin/production`
  (après `git fetch`) ne contient pas `5f5e787e9` (merge de #1390), et le revérifie juste avant
  l'adoption. Essai : `--cible=prod --essai` (par défaut si ni `--essai` ni `--appliquer`).
- ⛔ **Aucun retour arrière Vercel après la reprise** : l'ancien code ne sait pas lire les lignes
  de lien (il supprimerait le fichier d'une ligne de lien, et servirait le stockage avec les droits
  de l'élève, qui n'en a aucun sous `templates/…`). Un problème après la reprise se corrige en
  avant.
- **Sauvegarde** : `~/chiphre-sauvegardes/reprise-modeles-adr0029/<modèle>-<horodatage>.json`
  (modèle, instanciations, lignes des chapitres liés et du modèle), écrite avant toute écriture.
- **Secours si le processus meurt pendant la fenêtre « détaché »** : le script imprime, AVANT de
  détacher, la ligne `→ détachement temporaire des instanciations <id>, <id>`. Relancer le script
  avec `--rattacher <id>,<id>` (il reprend là où il s'est arrêté), ou, à la main (SQL, prod) :

  ```sql
  update public.chapter_template_instantiations
  set is_detached = false
  where id in ('<id 1>', '<id 2>')  -- les ids imprimés (aussi dans la sauvegarde JSON)
  returning id, chapter_id, is_detached;
  ```

  Pendant la fenêtre, rien ne change pour les élèves (le chapitre source n'a encore aucune ligne
  de lien) ; seul le suivi du modèle est suspendu.

### Décisions du 2026-10-14 au soir (recos retenues)

- **Badge d'un chapitre invisible** : « Invisible des élèves » (plus « Masqué », réservé aux
  éléments écartés par une classe).
- **Section du modèle dans un chapitre** : elle se masque comme un élément ; masquer la section
  masque — donc dépublie — tout ce qu'elle contient ; la réafficher fait revenir son contenu non
  publié ; un élément ajouté au modèle dans une section masquée arrive masqué. Migration
  `20261016103600_section_masquee.sql` (test `modele-section-masquee`).
- **Interface de ces deux décisions** en branche `feat/modeles-section-interface` : badge
  « Invisible des élèves » ; action `setSectionHidden` ; « Masquer la section » (confirmation)
  et « Réafficher la section » dans le plan du chapitre, section masquée soumise à
  l'interrupteur des masqués, rien ne s'y range.

### Étape 5 — accord de David du 2026-10-14 (après explication de ce qui est perdu)

- **5A — code mort** (sans perte de données) : branche `refactor/modeles-nettoyage-code`.
- **5B — destructif**, APRÈS le `deploy:prod` de 5A, inventaire des usages collé dans la PR :
  1. les 4 PDF d'origine `chapters/1c997492…/` (doublons, plus aucune ligne ne les désigne) ;
  2. la règle de stockage élève de prod « Students can read visible chapter documents » (mesuré :
     0 document publié sous `chapters/`, 8 sous `templates/`, servis par le serveur) ;
  3. l'ancien système de versions : table `chapter_template_versions` (1 ligne), colonnes
     `chapter_templates.content_snapshot`/`current_version`, `chapter_template_instantiations`
     `template_version`/`current_template_version`/`last_migrated_at` (0 chapitre migré) ;
     `link_chapter_to_template` réécrite sans elles. Aucune donnée d'élève.

## Découpage prévu

1. Phase 0 (ce document) — validation de David.
2. Base : tables du lien, propriété du contenu par le modèle, règle de stockage versionnée.
   Question d'accès (point 12) posée, tests d'intégration rouges sans la migration, `security-auditor`.
3. Éditeur partagé (`ChapterSectionsEditor`, `DocumentUpload` paramétrés par leur propriétaire) ;
   page d'édition du modèle ; chapitre lié ; service des fichiers par le serveur.
4. Reprise des données (points 18-19), copie seulement — **après** le déploiement de l'étape 3.
5. Nettoyage (destructif, arrêt et inventaire des usages) : versions, snapshots, migration/fusion,
   API sans appelant, composants morts, anciens fichiers.
