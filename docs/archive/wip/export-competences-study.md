# Étude — Export compétences vers Pronote / Sacoche / EcoleDirecte

> **Statut** : étude/audit. Aucune implémentation, aucune migration, aucun commit produit.
> **Date** : 2026-06-11.
> **Périmètre** : exporter les niveaux de compétences Famille B d'UbuMaths pour réinjection manuelle dans l'ENT du prof. **LSU SIECLE XML = hors scope** (décision PO actée).
> **Sources** : code Sacoche local (`extern/sacoche/`, read-only) + audit code UbuMaths + recherche web (forums Index Education, décrets Légifrance, docs Aplim/Sésamath).

---

## 0. Synthèse exécutive

**Faisabilité globale : élevée pour un export CSV générique, mais avec une vérité dérangeante à acter — aucun ENT cible n'offre une voie d'import propre et automatisable.**

Findings structurants :

1. **Pronote** importe bien des compétences, mais par deux canaux séparés et tous deux manuels : (a) la _structure_ du référentiel via un CSV 5 colonnes côté **admin** (pas le prof), (b) les _résultats_ élèves via **copier-coller tableur** dans la fenêtre d'évaluation — réputé cassé sur macOS et exigeant une correspondance stricte du nombre de colonnes. Pas d'API ouverte (projets communautaires arrêtés sur demande d'Index Education).
2. **EcoleDirecte** n'a **aucun import compétences documenté publiquement** ni API d'écriture. Voie réaliste : néant sans accord commercial Aplim. → **À sortir du scope V1.**
3. **Sacoche** : l'import CSV de livret (`code_livret_importer.php`) est un **round-trip de son propre fichier généré** (en-tête à 6 segments, `user_id` interne Sacoche), pas un format pivot ouvert. L'export Sacoche (`code_livret_recolter.php`) est du **XML LSU** (donc hors scope). L'API (`extern/sacoche/api/`) est **read-only** — impossible de pousser des saisies. Les items d'évaluation sont **personnalisés par établissement** → pré-mapping impossible.

**Conclusion** : la seule voie générique et robuste est un **export CSV/tableur UTF-8 BOM** que le prof télécharge depuis UbuMaths et réinjecte à la main (copier-coller Pronote, ou consultation/ressaisie pour ED). On ne vise PAS l'automatisation ENT (techniquement bloquée et juridiquement risquée).

**Format recommandé** : **1 format CSV unique, bien documenté**, en **disposition « large » par défaut** (1 ligne/élève × 6 colonnes-compétences, valeurs **1-4**) — c'est ce qu'attend le collage Pronote, seul canal d'import réaliste (cf. §8). Disposition « longue » et format de niveau (libellé long / 1-4 / sigle court) restent configurables. Les 3 « presets ENT » apportent peu de valeur réelle (cf. §6/§8) → **out-of-scope V1**. Le vrai cœur du MVP est une **vue écran consultable** (le CSV est un bonus du même écran, cf. §8).

**Mapping socle** : **pas nécessaire pour exporter** (aucun ENT ne l'exige à l'import des _résultats_). Utile uniquement comme **métadonnée de confort** (colonne `socle_code = D1.3` majoritaire). → **Option C (mapping TypeScript en lecture seule)** recommandée, pas de table DB.

**Effort estimé total (Chantier 1 MVP)** : **2,5 à 4 jours** (endpoint export + page prof + mapping niveaux configurable + mapping socle TS + tests + doc d'usage prof). Pré-requis identifiant externe élève (§5) : **+0,5 à 1 jour** si retenu.

---

## 1. Mapping vers le socle commun

### 1.1 État actuel — absent (confirmé)

Grep `socle` / `D1.1` / `socle_commun` sur l'ensemble des migrations et `src/lib/types/` : **aucune table, aucune colonne, aucune FK**. Seules mentions = commentaires documentaires :

- `supabase/migrations/20260609120000_competence_referentiel_schema.sql:543` (commentaire de table « 4 levels of the socle commun »).
- `src/lib/types/skills.ts:61` (JSDoc de `MathCompetenceLevel`).

Les codes `D1/D2/D3/D4` présents dans `20260609120001_competence_referentiel_functions.sql` et les seeds sont des **`observable_code` internes** (sous-dimensions A/B/C/D de chaque compétence), **sans rapport** avec les composantes du socle. Confirmé par le commentaire `math_competence_subdimensions` (`…schema.sql:112` : « Structural grouping only »). Le constat audit du prompt est exact.

### 1.2 Nécessité réelle selon ENT cible

| ENT              | Le code socle est-il exigé à l'import des **résultats** ?                                                                                                                                                                                                                                                  | Source                                                                                                                                                          |
| ---------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Pronote**      | **Non.** L'import des _résultats_ (niveaux 1-4) se fait par collage tableur sur une évaluation déjà rattachée à des compétences existantes dans Pronote. Le rattachement au socle (`Socle-2016`) se fait au moment de l'import du _référentiel_ (structure), côté admin, pas à chaque export de résultats. | [forum import niveaux Excel](https://forum.index-education.com/questions/1090/), [forum import éval tableur](https://forum.index-education.com/questions/2596/) |
| **EcoleDirecte** | **Non applicable** — pas d'import documenté.                                                                                                                                                                                                                                                               | [Aplim Charlemagne Compétences](https://www.aplim.fr/charlemagne/competences)                                                                                   |
| **Sacoche**      | **Non.** L'import livret CSV identifie les rubriques par `rubrique_type_rubrique_id` (ex `eval_12`, `socle_20`) _propres à la base Sacoche_, pas par code socle national saisi par l'utilisateur. Le mapping item→socle est interne à Sacoche (`sacoche_livret_jointure_referentiel`).                     | `extern/sacoche/_inc/code_livret_importer.php:248`, `extern/sacoche/_sql/structure/sacoche_livret_jointure_referentiel.sql`                                     |

**→ Aucun ENT cible n'exige le code socle à l'import des résultats compétences.** Le mapping socle n'est donc **pas un bloquant** pour l'export.

### 1.3 Le mapping socle reste utile comme métadonnée

Valeur résiduelle : afficher une colonne `socle_code` dans le CSV aide le prof qui, **côté admin Pronote**, doit créer/rattacher ses compétences au socle (CSV 5 colonnes dont `Socle-2016`). C'est un confort, pas une obligation.

Mapping retenu (**vérifié 2026-06-11**, table « Domaines du socle » du BO 2015 cycle 4 ; décision PO Option B = sous-composantes, domaine 1 → D1.3 pour les maths) :

| Compétence UbuMaths | Domaines BO (1-5) | `socle_code` exporté |
| ------------------- | ----------------- | -------------------- |
| Chercher            | 2, 4              | `D2 D4`              |
| Calculer            | 4                 | `D4`                 |
| Raisonner           | 2, 3, 4           | `D2 D3 D4`           |
| Communiquer         | 1, 3              | `D1.3 D3`            |
| Modéliser           | 1, 2, 4           | `D1.3 D2 D4`         |
| Représenter         | 1, 5              | `D1.3 D5`            |

> ⚠️ **Correction d'une 1ʳᵉ version erronée** : l'étude attribuait initialement `D1.3` à toutes les compétences. C'est faux — le BO 2015 cycle 4 rattache chaque compétence à des **domaines numérotés (1-5)**, et **ne met le domaine 1 que sur modéliser / représenter / communiquer**. « Chercher », « calculer » et « raisonner » n'ont **aucun domaine 1** (donc pas de D1.3). En maths, le domaine 1 est rendu `D1.3` (langages mathématiques) pour le LSU. Sources concordantes : programme officiel + copies académiques [Besançon/Champagnole 2016](https://champagnole.circo39.ac-besancon.fr/wp-content/uploads/sites/9/2016/08/comparaison-comp%C3%A9tences-attendus-math-c234-complet1.pdf), [ac-Poitiers](https://ww2.ac-poitiers.fr/math/sites/math/IMG/pdf/cycle4_lien_entre_programme_et_competences.pdf), [BO Strasbourg](https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/mathematiques/College/Programmes_Documents_officiels/Maths_cycle4_BO_SPE_11_26-11-2015.pdf). Le doc [IGESR 2023 « Les six compétences »](https://mathematiques.igesr.org/data/uploads/six_competences.pdf) décrit les compétences mais ne contient pas de mapping socle. Implémenté dans `src/lib/server/competences/socle-mapping.ts`.

> Note cohérence : la Famille A UbuMaths cible la **6ᵉ (cycle 3)**, alors que les 6 compétences (Famille B) sont structurées par le programme **cycle 4 (BO 2015)**. Le socle 2015 couvre les deux cycles (mêmes 8 composantes). Pas de contradiction, mais à garder en tête si un export 6ᵉ doit citer le cycle 3.

### 1.4 Si on l'ajoute : recommandation de schéma

| Option                                                                  | Description                               | Verdict                                                                                                                                                                               |
| ----------------------------------------------------------------------- | ----------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| A — table `socle_components` + junction `math_competence_socle(weight)` | Normalisée, pondération possible          | **Surdimensionné.** 6 compétences × 1-2 socles, jamais édité en prod. Inutile en DB.                                                                                                  |
| B — colonne `socle_codes TEXT[]` sur `math_competences`                 | Plus simple, pas de pondération           | Acceptable mais nécessite migration + reseed pour une donnée quasi-constante.                                                                                                         |
| **C — mapping TypeScript** `src/lib/server/socle/mapping.ts`            | Constante en lecture seule, jamais éditée | **✅ Recommandée.** La correspondance compétence→socle est figée par les programmes nationaux, jamais modifiée par un utilisateur. Zéro migration, testable, versionnée avec le code. |

**Recommandation : Option C.** Un simple `Record<MathCompetenceCode, { primary: string; secondary?: string[] }>`. Aligné avec la règle « pas de décision architecturale unilatérale » → **à confirmer par David**, mais l'argument lecture-seule est fort.

---

## 2. Export CSV générique

### 2.1 Colonnes proposées (B4)

Colonnes (ordre pivot proposé) :

| Colonne                | Source UbuMaths                                            | Obligatoire | Notes                                                     |
| ---------------------- | ---------------------------------------------------------- | ----------- | --------------------------------------------------------- |
| `identifiant_eleve`    | `profiles.id` (UUID) **ou** `identifiant_externe` (cf. §5) | ✅          | Inutile côté ENT si UUID ; voir §2.3                      |
| `nom`                  | `profiles.lastname`                                        | ✅          |                                                           |
| `prenom`               | `profiles.firstname`                                       | ✅          |                                                           |
| `classe`               | `classes.name` (via `class_members`)                       | ✅          |                                                           |
| `competence_code`      | mapping (`chercher`, `calculer`…)                          | ✅          | `math_competences.code`                                   |
| `competence_nom`       | `math_competences.name`                                    | ✅          | « Chercher », « Calculer »…                               |
| `niveau`               | `student_competence_level.niveau`                          | ✅          | **format configurable** (cf. 2.2)                         |
| `niveau_lsu`           | dérivé (1-4)                                               | ⬜          | colonne séparée toujours numérique, pratique pour Pronote |
| `socle_code`           | mapping TS §1                                              | ⬜          | `D1.3` etc.                                               |
| `task_count`           | `student_competence_level.task_count`                      | ⬜          | garde-fou fiabilité                                       |
| `derniere_observation` | `student_competence_level.last_recalc_at`                  | ⬜          |                                                           |
| `periode`              | `academic_periods.name`                                    | ⬜          | filtre, pas forcément colonne                             |

**Format des niveaux — configurable** (un seul sélecteur dans l'UI) :

| Interne UbuMaths | LSU (chiffre) | Libellé long officiel  | Sigle court |
| ---------------- | ------------- | ---------------------- | ----------- |
| `insuffisante`   | `1`           | Maîtrise insuffisante  | MI          |
| `fragile`        | `2`           | Maîtrise fragile       | MF          |
| `satisfaisante`  | `3`           | Maîtrise satisfaisante | MS          |
| `tres_bonne`     | `4`           | Très bonne maîtrise    | TBM         |

> Les libellés longs **1-4** sont les libellés **officiels** (décret 2015-1929, [Légifrance](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000031742252)) et correspondent à l'échelle Pronote ([Neoprofs](https://www.neoprofs.org/t103151-quelle-echelle-de-maitrise-des-competences)). ⚠️ Attention sémantique (cf. §6.14) : `tres_bonne` (interne) ≈ « Très bonne maîtrise » mais ce n'est pas un mappage mot-à-mot garanti — fournir un guide.

**Encodage** : **UTF-8 avec BOM** (`﻿`) pour qu'Excel français ouvre le fichier sans casser les accents. Délimiteur : `;` (point-virgule, convention Excel FR) par défaut, `,` en option selon l'outil cible.

> Nuance Sacoche : Sacoche est en **Windows-1252** (`sacoche_user.user_csv_encodage`, `extern/sacoche/_sql/structure/sacoche_user.sql:41`). Si jamais un export « compatible Sacoche » était visé, il faudrait un encodage distinct. Argument de plus pour ne PAS viser Sacoche en V1.

### 2.2 Format pivot vs presets + disposition large/longue (B5)

**Presets ENT vs format unique :**

- **Option 1 — 1 format unique.** Le prof réorganise/colle dans Excel avant import. ✅ **Recommandée V1.**
- **Option 2 — 3 presets `pronote`/`sacoche`/`ecoledirecte`.** Listes ordonnées de colonnes + libellés + format niveau.

**Verdict : Option 1.** Justification (cf. §6.15/§8) : aucun ENT cible n'a un format d'import _résultats_ tabulaire stable et standardisé qu'un preset pourrait cibler. Pronote = collage manuel avec contrainte de colonnes propre à _chaque_ évaluation ; ED = pas d'import ; Sacoche = round-trip de son propre fichier. Un preset n'éviterait pas la manipulation Excel. **Mettre l'effort sur 1 CSV propre + format niveau configurable + doc d'usage**, pas sur 3 presets. Si presets un jour : les stocker en **TypeScript** (`src/lib/server/competences/export-presets.ts`), pas en DB.

**Disposition « large » vs « longue » — la décision qui compte vraiment :**

| Disposition | Structure                                                           | Cas d'usage                                                                                                                  | Verdict          |
| ----------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------- | ---------------- |
| **Large**   | 1 ligne/élève, **6 colonnes** (une par compétence), valeurs **1-4** | **Collage Pronote** (la fenêtre d'évaluation attend exactement une grille élèves × compétences en 1-4) ; lecture rapide prof | **✅ défaut V1** |
| **Longue**  | 1 ligne/élève × compétence                                          | Archivage, filtrage/TCD Excel, branchement outil tiers                                                                       | Option (toggle)  |

**Choix : disposition « large » par défaut.** Le seul canal d'import réaliste (collage Pronote, cf. §1.2/§8) attend une grille large 1-4 ; partir en « longue » obligerait le prof à faire un tableau croisé dynamique avant de coller — friction inverse de l'objectif. La « longue » reste offerte en toggle pour l'archivage. _(Cette reco corrige une première version de l'étude qui partait en « longue » par défaut — l'analyse du modèle de collage Pronote a tranché en faveur du « large ».)_

### 2.3 Identifiant élève (B6)

**Problème** : `profiles.id` est un UUID Supabase, **inutile côté ENT**. Aucun INE dans UbuMaths (grep `ine`/`external_id` → vide ; `profiles` n'a que `id/email/firstname/lastname/full_name`, cf. `src/lib/types/database.ts:8248`).

| Solution                                                    | Évaluation                                                                                                                                     |
| ----------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------- |
| `nom + prenom + classe`                                     | Suffit pour un collage Pronote (Pronote matche par élève dans la fenêtre, pas par identifiant). Fragile en cas d'homonymes mais acceptable V1. |
| Champ libre `identifiant_externe` saisi/importé par le prof | Robuste, mais nécessite mini-feature (cf. §5). À faire **si** un usage par identifiant émerge.                                                 |
| Réutiliser un INE importé d'un CSV ENT                      | Hors scope (UbuMaths ne stocke pas d'INE).                                                                                                     |

**Recommandation V1** : exporter `nom/prenom/classe` comme identifiant humain + garder `profiles.id` en colonne technique optionnelle. Ajouter `identifiant_externe` **seulement si** David confirme un besoin (Chantier 2).

> Sacoche utilise son **`user_id` interne** (préfixe `eleve_`, `extern/sacoche/_inc/code_livret_importer.php:355`), distinct de l'INE — donc inexploitable depuis UbuMaths de toute façon.

### 2.4 UX prof — wireframe

Page `/dashboard/teacher/competences/export`. Pattern de load réutilisable de `evaluation-tasks/[id]/saisie/+page.server.ts` (`requireRole('teacher')` + `class_members` join `profiles` + RLS prof sur `student_competence_level`, policy `student_competence_level_select_teacher`, `…schema.sql:743`).

```
┌─────────────────────────────────────────────────────────────────┐
│  Exporter les compétences                          [? Aide]      │
├─────────────────────────────────────────────────────────────────┤
│  Classe      [ 6ᵉ B            ▼ ]   (MySelect)                   │
│  Période     [ Trimestre 2     ▼ ]   (academic_periods)          │
│                                                                   │
│  Élèves      [✓] Tous   ou sélection :                           │
│    [✓] Dupont Léa     [✓] Martin Hugo    [✓] Nguyen Lila  …      │
│                                                                   │
│  Disposition   (•) Large (élèves × compétences) — pour Pronote   │
│                ( ) Longue (1 ligne/compétence) — pour archivage  │
│  Format niveau ( ) Libellé (« Maîtrise satisfaisante »)         │
│                (•) Chiffre LSU (1-4)   ( ) Sigle (MI/MF/MS/TBM)  │
│                                                                   │
│  Colonnes optionnelles (disposition longue)                      │
│    [✓] code socle   [✓] nb tâches   [ ] dernière observation     │
├─────────────────────────────────────────────────────────────────┤
│  Aperçu — disposition LARGE (défaut, prêt à coller dans Pronote) │
│  ┌────────┬──────┬───────┬─────┬─────┬─────┬─────┬─────┬─────┐    │
│  │ nom    │ prén │ classe│ Cher│ Calc│ Rais│ Comm│ Modé│ Repr│    │
│  ├────────┼──────┼───────┼─────┼─────┼─────┼─────┼─────┼─────┤    │
│  │ Dupont │ Léa  │ 6e B  │  3  │  4  │  3  │  2  │  3  │  4  │    │
│  │ Martin │ Hugo │ 6e B  │  2  │  3  │  2  │  3  │  2  │  3  │    │
│  └────────┴──────┴───────┴─────┴─────┴─────┴─────┴─────┴─────┘    │
│                                                                   │
│  ℹ Ces niveaux suivent l'échelle officielle du socle commun     │
│    (1 insuffisante → 4 très bonne maîtrise).                     │
│                                                                   │
│                          [ Annuler ]   [ ⬇ Télécharger CSV ]     │
└─────────────────────────────────────────────────────────────────┘
```

Le même écran sert de **vue consultable** (le tableau large coloré est utile en soi, cf. §8 Phase 1) ; le CSV n'est qu'un export du contenu affiché. En disposition **longue**, l'aperçu repasse à 1 ligne/élève × compétence avec les colonnes `competence_code/competence_nom/niveau/socle_code/task_count` (cf. §2.1).

### 2.5 Réutilisable existant

- `src/lib/spreadsheet/csv.ts` : `generateCsv()` (ligne 100), `downloadCsv()` (359), support BOM (`utf-8-bom`, ligne 116), escaping correct (144-147) — **client-side, couplé au tableur**, pas réutilisable tel quel mais bon **modèle d'escaping**.
- Pattern download serveur (`Content-Disposition: attachment`) : `src/routes/api/account/export/+server.ts:231`, `…/admin/exercises/backup/+server.ts:87`.
- **Recommandation** : endpoint `src/routes/api/teacher/competences/export/+server.ts` renvoyant un `Response` `text/csv; charset=utf-8` + BOM, ou génération client via un nouveau helper `src/lib/competences/export-csv.ts` réutilisant l'escaping de `spreadsheet/csv.ts`. Préférer **serveur** (RLS + pas de fuite de données dans le bundle).

---

## 3. Export Sacoche natif (bonus)

### 3.1 Format d'import attendu (C8)

`extern/sacoche/_inc/code_livret_importer.php` : **CSV uniquement**, mais c'est un **round-trip du fichier que Sacoche génère lui-même** (`generer_csv_vierge`), pas un format pivot ouvert :

- En-tête ligne 1 = chaîne à 6 segments `livret_<PAGE_REF>_<JOINTURE_PERIODE>_<BILAN_ETAT>_<USER_ID>_<GROUPE_ID>` (`…importer.php:285-290`).
- Lignes par rubrique `rubrique_type_rubrique_id` (ex `eval_12`, `socle_20`) (`:248`) puis par élève `eleve_<user_id>` (`:137`, `:355`).
- Valeur = position 1-4 (`objectif`) ou note (`:358-363`), + appréciation texte ≤1000 car (`:336`).
- Identifiant élève = **`user_id` interne Sacoche** (ni INE ni nom), prof = utilisateur de session (`:304`).
- Distinction `eval_` (matière) vs `socle_` (fin de cycle) via `rubrique_type` (couvre `2rubrique`/`3mixte`/`4synthese`, `:80-83`).

**→ Générer ce CSV depuis UbuMaths exigerait de connaître les `user_id` Sacoche et `rubrique_id` propres à la base de l'établissement — données qu'UbuMaths n'a pas.** Non viable sans que le prof exporte d'abord un fichier vierge depuis Sacoche.

### 3.2 Webservices : faisable ou pas (C9)

`extern/sacoche/api/` = **4 endpoints, tous en lecture seule** :

| Endpoint                          | Sens                | Auth                                                  |
| --------------------------------- | ------------------- | ----------------------------------------------------- |
| `api_login.php`                   | auth                | **jeton** pré-partagé 65-75 car (POST `jeton`, `:36`) |
| `api_lister_evaluations.php`      | **lecture** (élève) | jeton de session                                      |
| `api_voir_saisies_evaluation.php` | **lecture**         | jeton                                                 |
| `api_logout.php`                  | déconnexion         | jeton                                                 |

Aucun endpoint `api_saisir_*`/`api_poster_*`. L'API sert l'app élève Papillon (`extern/sacoche/api.php:29`). Le dossier `webservices/` est **vide** ; `webservices.php` ne déclare que des SSO sortants (BordeauxStructure, Laclasse, AutoMaths) — pas d'entrée de données.

**→ Pousser des saisies vers Sacoche par API = impossible.** « Webservice push » : non réalisable. « Fichier à uploader » : seulement via le round-trip CSV ci-dessus.

### 3.3 Mapping items (C10)

Confirmé : Sacoche distingue **deux couches** —

- **Items d'évaluation** (`sacoche_referentiel_item/theme/domaine`) = **personnalisés par établissement**, aucun référentiel national → **pré-mapping impossible** (`extern/sacoche/_sql/requetes_structure_livret.php:606-633`).
- **Rubriques livret LSU** (`sacoche_livret_rubrique`) = nationales/figées, reliées aux items perso via `sacoche_livret_jointure_referentiel` (mapping choisi par l'établissement).

Le modèle « UbuMaths crée 6 items côté Sacoche, le prof mappe à l'import » du prompt est **cohérent** mais reste à la charge du prof, sans automatisation possible.

### 3.4 Recommandation Sacoche

**Ne PAS développer d'export Sacoche natif en V1.** Justification : (1) API read-only → pas de push ; (2) import CSV = round-trip propriétaire nécessitant des IDs internes Sacoche absents d'UbuMaths ; (3) export Sacoche officiel = XML LSU = hors scope. Le CSV générique (§2) couvre déjà l'usage Sacoche aussi bien que les autres (le prof saisit à la main ses 6 items). **À reconsidérer uniquement sur demande réelle d'un établissement Sacoche.**

---

## 4. PDF récap (fallback)

Pertinence vs CSV : **le PDF n'est PAS le bon premier livrable**, mais reste un bon **complément**.

- Le CSV résout le besoin « réduire la ressaisie » (collage/import). Le PDF ne réduit pas la ressaisie — il la documente seulement.
- Valeur réelle du PDF : **consultation / remise élève-parent / archivage**, ou pour le prof qui ressaisit « à l'œil » dans un ENT sans import (cas EcoleDirecte).
- Coût ~0,5-1 j. Lib : **`pdfmake`** (déclaratif, tableaux faciles) ou **`pdf-lib`** (1 page simple). `puppeteer` server-side = trop lourd pour le free-tier Vercel.

**Recommandation** : garder le PDF en **option Chantier 2**, surtout pertinent pour les profs **EcoleDirecte** (où aucun import n'existe → ressaisie inévitable, autant fournir une fiche A4 claire).

---

## 5. Pré-requis UbuMaths

### 5.1 Identifiant externe élève (F16)

- **Absent** : pas d'INE, pas d'`identifiant_externe` (`profiles` = `id/email/firstname/lastname/full_name/…`, `database.ts:8248`).
- **Pas bloquant pour V1** : `nom+prenom+classe` suffit pour un collage Pronote.
- **Si besoin confirmé** : migration `profiles.identifiant_externe TEXT NULL` + UI prof de saisie/import. Estimation +0,5-1 j. → **Chantier 2, conditionnel.**

### 5.2 Données disponibles (réutilisables tel quel)

- `academic_periods` **existe** (`database.ts:11-60` : `name/type/start_date/end_date/period_order/school_year_id`), déjà chargée dans le dashboard (`…/dashboard/teacher/+layout.server.ts:45`). → réutiliser pour le filtre période.
- `schools.uai` **existe** (`database.ts:9919`, migration `20260610120000_add_uai_to_schools.sql`, format `^[0-9]{7}[A-Z]$`). Pas indispensable au CSV mais disponible si un en-tête « établissement » est souhaité.
- `classes.name`, `class_members(student_id, class_id)` → lien élève↔classe (`database.ts:1584/1725`).
- `student_competence_level` (`student_id, math_competence_id, niveau, task_count, validated_observables, missing_for_next, last_recalc_at`, `…schema.sql:526-549`) → source des niveaux.
- Mapping socle → cf. §1 (Option C, TypeScript).

---

## 6. Risques et points d'attention

**E12 — Format ENT mouvant.** Pronote/ED changent leurs imports au gré des versions. Comme on ne vise **pas** un preset par ENT mais un **CSV pivot documenté**, le risque est faible : c'est le prof qui adapte. Stratégie : doc d'usage par ENT maintenue (markdown), pas de code à re-tester à chaque version ENT. EcoleDirecte a durci ses accès non officiels en mars 2025 (cookie GTK + QCM anti-bot) → confirme qu'aucune automatisation n'est tenable.

**E13 — RGPD léger.** L'export contient nom/prénom/classe + résultats scolaires.

- _Qui peut exporter ?_ RLS déjà en place : `student_competence_level_select_teacher` (`…schema.sql:743`) restreint au prof des classes de l'élève. L'endpoint export doit utiliser `locals.supabase` (JWT prof), **jamais** le service role côté prof.
- _Log des exports ?_ Recommandé : une ligne d'audit (qui, quelle classe, quand, combien d'élèves) — table légère ou log applicatif. À trancher avec David.
- _Rétention fichiers serveur ?_ **Ne pas stocker** le CSV côté serveur : streamer la `Response` directement (génération à la volée, zéro fichier persistant) → rétention nulle, risque minimal.

**E14 — Présentation des niveaux.** `tres_bonne` (interne) ≈ « Très bonne maîtrise » socle, mais pas un mappage officiel mot-à-mot garanti. Fournir dans la page un encart : « Ces niveaux suivent l'échelle officielle du socle commun (1 Maîtrise insuffisante → 4 Très bonne maîtrise) ». Toujours proposer la colonne `niveau_lsu` (1-4) qui est, elle, **officielle et univoque** ([décret 2015-1929](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000031742252)).

**E15 — Charge vs valeur.** Le CSV pivot + format niveau configurable couvre ~90% du besoin. Les 3 presets ENT ajoutent peu (cf. §2.2) car aucun ENT n'a de format d'import _résultats_ tabulaire standard. → **Ne pas développer les presets en V1.** Concentrer l'effort sur : 1 CSV propre + aperçu + doc d'usage prof par ENT (markdown court).

---

## 7. Recommandation finale

### Chantier 1 — MVP « Vue + Export compétences » (recommandé)

**Description** : page prof `/dashboard/teacher/competences/export` avec une **vue écran consultable** (tableau large élèves × 6 compétences, niveaux colorés) doublée d'un **export CSV** du même contenu (UTF-8 BOM, à la volée). Disposition **large 1-4 par défaut**, niveaux configurables (libellé / 1-4 / sigle), disposition longue + colonnes socle/task_count en option, RLS prof. Cœur de valeur = la vue écran (rien n'existe aujourd'hui pour consolider ces données) ; le CSV est un bonus du même écran.

**Livrables** :

1. `src/lib/server/competences/socle-mapping.ts` — mapping TS lecture seule (Option C §1.4).
2. `src/routes/(protected)/dashboard/teacher/competences/export/+page.{svelte,server.ts}` — vue tableau large coloré (réutilise le load `evaluation-tasks/[id]/saisie/+page.server.ts`), filtres classe/période/élèves (MySelect/MyCheckbox), toggles disposition + format niveau, bouton download.
3. `src/routes/api/teacher/competences/export/+server.ts` — génération CSV + `Content-Disposition`, Zod sur les query params (classe, période, disposition, format niveau, colonnes), RLS via `locals.supabase`.
4. Tests serveur : génération CSV (escaping, BOM, large/longue, mapping niveaux, RLS refus pour non-prof).
5. `docs/guides/export-competences-prof.md` — guide d'usage par ENT (collage Pronote large 1-4 / attention macOS, ressaisie ED, 6 items Sacoche).

**Effort** : **2,5-4 j** (dont vue écran, tests, doc). Pas de migration.

**Décisions PO à valider avant de coder** :

- [ ] Disposition **« large » 1-4 par défaut** (corrige « longue ») — OK ?
- [ ] **Vue écran** comme cœur de la Phase 1 (CSV = bonus du même écran) — OK ?
- [ ] Mapping socle en TypeScript (Option C), colonne de confort — OK ou on s'en passe ?
- [ ] Mapping compétence→socle secondaire (D2/D3/D4/D1.1) — confirmer ou simplifier en « tout D1.3 ».
- [ ] Log d'audit des exports — oui/non ?

### Chantier 2 — Optionnels (conditionnels)

| Sous-chantier                                    | Effort      | Condition de déclenchement                                                       |
| ------------------------------------------------ | ----------- | -------------------------------------------------------------------------------- |
| `profiles.identifiant_externe` + UI saisie       | +0,5-1 j    | Un prof demande un identifiant stable côté ENT (homonymes).                      |
| PDF récap A4 par élève (`pdfmake`)               | +0,5-1 j    | Profs EcoleDirecte (ressaisie inévitable) ou besoin remise parents.              |
| Presets ENT (`pronote`/`sacoche`/`ecoledirecte`) | +1-1,5 j    | **Seulement si** retour terrain montre que le pivot ne suffit pas. Peu probable. |
| Export Sacoche natif                             | non chiffré | Demande réelle d'un établissement Sacoche. Faible valeur (cf. §3.4).             |

### Out-of-scope (acté)

- **LSU SIECLE XML** — décision PO, définitivement hors scope.
- **Push API vers Pronote / EcoleDirecte / Sacoche** — techniquement bloqué (pas d'API ouverte ; Sacoche read-only) et juridiquement risqué.
- **Mapping items Sacoche automatique** — impossible (items personnalisés par établissement).
- **Stockage serveur des fichiers exportés** — volontairement écarté (RGPD, génération à la volée).

---

## 8. Bilan détaillé et recommandations

### 8.1 Le recadrage stratégique — ce qu'on livre réellement

Le besoin initial (« exporter pour réimporter dans l'ENT en réduisant la ressaisie ») repose sur un postulat que l'audit **invalide partiellement** : il n'existe nulle part de pipeline d'import propre et automatisable.

| Ce qu'on croyait livrer        | Ce qu'on livre réellement                                                           |
| ------------------------------ | ----------------------------------------------------------------------------------- |
| Export → import automatisé ENT | Un **tableau consolidé propre** des niveaux, exploité à la main                     |
| « Zéro ressaisie »             | « Ressaisie **assistée** » : collage semi-manuel (Pronote) ou recopie visuelle (ED) |
| Format ciblé par ENT           | Un **format pivot** + un guide « comment l'utiliser dans votre ENT »                |

**Deux conséquences :**

1. Le job-to-be-done réel est _« donner au prof une vue consolidée et exportable de ses évaluations compétences »_, pas _« connecter UbuMaths à Pronote »_. Plus petit, mais utile : aujourd'hui ces données **ne sortent pas du tout** d'UbuMaths.
2. Le risque dominant n'est **pas technique mais le sur-investissement**. Presets ENT, push API, mapping Sacoche = effort à perte.

### 8.2 Bilan par ENT — arbre de décision côté prof

Le bon angle est « que peut faire le prof selon son ENT », pas « quel format produire ». Trois mondes :

- **Prof Pronote (majoritaire)** → colle un tableau dans la fenêtre d'évaluation. Contrainte : grille **élèves × compétences en 1-4**, nombre de colonnes matchant _exactement_ l'évaluation Pronote, **collage cassé sur macOS**. → format servant = **grille large 1-4**.
- **Prof EcoleDirecte** → **aucun import**. Le CSV ne sert qu'à _lire en recopiant_. → un **PDF/écran lisible** vaut plus qu'un CSV.
- **Prof Sacoche** → API read-only, import = round-trip propriétaire. → CSV = simple aide à la saisie manuelle des 6 items.

**Aucun des trois n'a besoin d'un format différent.** Un prof Pronote veut une grille large 1-4 ; un prof ED veut une fiche lisible. Deux livrables (CSV large + vue/PDF), **pas trois presets**.

### 8.3 Correction technique : disposition « large » par défaut (pas « longue »)

La première version de l'étude recommandait la disposition **« longue »** par défaut. **Correction** : le cas d'usage réaliste n°1 = collage Pronote, qui attend une **grille « large » 1-4**. Partir en « longue » obligerait le prof à un tableau croisé dynamique avant de coller — friction inverse de l'objectif. → **« large » par défaut, « longue » en option** (archivage/Excel). Détail en §2.2.

Pour le bug presse-papier Pronote macOS : fournir aussi le fichier que le prof **ouvre puis copie-colle** depuis Excel/LibreOffice, ce qui contourne partiellement le bug du collage natif.

### 8.4 Bilan valeur / coût — le point d'inflexion

| Livrable                                           | Coût     | Valeur réelle                           | Verdict            |
| -------------------------------------------------- | -------- | --------------------------------------- | ------------------ |
| Vue écran consolidée (tableau niveaux/classe)      | ~0,5 j   | Élevée (rien n'existe)                  | **Socle, à faire** |
| Export CSV « large 1-4 » + BOM                     | ~1 j     | Moyenne-haute (Pronote, Excel)          | **À faire**        |
| Format niveau configurable (1-4 / libellé / sigle) | ~0,5 j   | Moyenne                                 | **À faire**        |
| Mapping socle TS (colonne confort)                 | ~0,25 j  | Faible-moyenne                          | À faire (cheap)    |
| Guide d'usage prof par ENT (markdown)              | ~0,25 j  | Haute (évite le SAV)                    | **À faire**        |
| PDF récap A4                                       | ~0,5-1 j | Haute **pour ED uniquement**            | Chantier 2 ciblé   |
| `identifiant_externe` + UI                         | ~0,5-1 j | Faible tant qu'aucun homonyme ne bloque | Conditionnel       |
| Presets ENT (×3)                                   | ~1-1,5 j | **Quasi nulle**                         | **Ne pas faire**   |
| Export Sacoche natif / push API                    | élevé    | **Nulle** (bloqué)                      | **Ne pas faire**   |

Point d'inflexion net : au-dessus de « guide d'usage » = bon ratio ; en-dessous = spéculatif.

### 8.5 Phasage recommandé

**Phase 1 — « Vue + Export » (≈ 2-2,5 j), le vrai MVP** (détail livrables en §7 Chantier 1)

- Page export + **tableau écran** large coloré (valeur immédiate, même sans télécharger).
- Endpoint CSV à la volée, **large 1-4 par défaut**, toggles disposition/format niveau.
- Mapping socle TS + tests + guide d'usage par ENT.

**Phase 2 — conditionnelle (déclenchée par retour terrain)**

- **PDF A4 par élève** (`pdfmake`) → **uniquement cible EcoleDirecte** (ressaisie inévitable). Pas « pour tout le monde ».
- `profiles.identifiant_externe` → seulement si un prof signale un blocage homonymes.

**Jamais (acté, cf. §7 Out-of-scope) :** presets ENT, push API, mapping Sacoche, LSU XML, stockage serveur des fichiers.

### 8.6 À NE PAS faire — explicitement

1. **Ne pas vendre ça comme « intégration ENT »** dans l'UI : c'est une aide à l'export/saisie. Sur-promettre = déception (« ça ne s'importe pas tout seul ! »).
2. **Ne pas développer 3 presets** : aucun format d'import _résultats_ standard à cibler.
3. **Ne pas toucher à l'API Sacoche** : read-only, cul-de-sac.
4. **Ne pas ajouter de table socle en DB** : donnée figée, un fichier TS suffit.
5. **Ne pas commencer par le PDF** : il documente la ressaisie, il ne la réduit pas — utile mais second.

---

## Annexe — Questions restées ouvertes / à flagger

1. **Mapping socle secondaire** (§1.3) : confiance moyenne, à confirmer par David sur source BO officielle (PDF non fetchable).
2. **Pronote import résultats sur macOS** (§0/§1.2) : réputé cassé depuis 2019 ; impact sur les profs Mac à documenter dans le guide.
3. **Log d'audit / rétention** (§6 E13) : décision PO requise.
4. **EcoleDirecte** : aucune voie d'import documentée — le CSV ne servira qu'à la ressaisie manuelle / au PDF. À assumer explicitement auprès des profs ED.

---

### Sources principales

**Code local (read-only)** : `extern/sacoche/_inc/code_livret_importer.php`, `…/code_livret_recolter.php`, `…/fonction_livret.php`, `extern/sacoche/_sql/requetes_structure_livret.php`, `…/structure/sacoche_livret_saisie.sql`, `…/sacoche_livret_rubrique.sql`, `…/sacoche_user.sql`, `extern/sacoche/api/*.php`, `extern/sacoche/webservices.php`.

**Code UbuMaths** : `src/lib/types/skills.ts`, `src/lib/types/database.ts`, `supabase/migrations/20260609120000_competence_referentiel_schema.sql`, `…120002_competence_referentiel_seeds.sql`, `src/lib/spreadsheet/csv.ts`, `src/routes/(protected)/dashboard/teacher/evaluation-tasks/[id]/saisie/+page.server.ts`.

**Web** :

- [Pronote — importer un référentiel depuis un tableur](https://docs.index-education.com/docs_fr/fr-pronote-support-fiche-583-5546-comment-importer-un-referentiel-de-competences-depuis-un-tableur.php)
- [Forum Index Education — import niveaux compétences Excel](https://forum.index-education.com/questions/1090/)
- [Forum Index Education — import évaluation depuis tableur](https://forum.index-education.com/questions/2596/)
- [Forum Index Education — API Pronote (non planifiée)](https://forum.index-education.com/questions/2836/api-pronote)
- [SACoche — transfert note vers Pronote](https://sacoche.sesamath.net/index.php?page=documentation__releves_bilans__transfert_note_sacoche_pronote)
- [Aplim — Charlemagne Compétences](https://www.aplim.fr/charlemagne/competences)
- [GitHub EduWireApps — ecoledirecte-api-docs (read-only, non officiel)](https://github.com/EduWireApps/ecoledirecte-api-docs)
- [Décret 2015-372 — socle commun (Légifrance)](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000030426718)
- [Décret 2015-1929 — 4 niveaux de maîtrise (Légifrance)](https://www.legifrance.gouv.fr/jorf/id/JORFTEXT000031742252)
- [BO 2015 — programme maths cycle 4](https://pedagogie.ac-strasbourg.fr/fileadmin/pedagogie/mathematiques/College/Programmes_Documents_officiels/Maths_cycle4_BO_SPE_11_26-11-2015.pdf)
- [Ac-Poitiers — correspondance programme/compétences cycle 4](https://ww2.ac-poitiers.fr/math/sites/math/IMG/pdf/cycle4_lien_entre_programme_et_competences.pdf)
