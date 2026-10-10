# Étude — Mapping LSU

> **Mode** : étude/audit. Aucune implémentation, migration ou commit produit par cette session.
> **Date** : 2026-06-10. **Sources primaires** : `extern/sacoche/` (XSD officielles + code PHP) ; codebase UbuMaths.
> **Méthode** : 4 agents `Explore` (Sacoche XSD / Sacoche mapping socle / Sacoche export+UI / UbuMaths cible) + vérification directe des faits les plus structurants (codes XSD, énums, seuils, schéma DB).

---

## 0. Synthèse Sacoche (apport principal)

### 0.1 Fichiers Sacoche consultés

| Fichier                                                               | Apport                                                                                                       |
| --------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------ |
| `extern/sacoche/_xsd/livret-scolaire_2d_schema_13.0.xsd`              | **XSD officielle LSU 2nd degré v13.0** — vérité du format. Racine, énums niveaux, codes socle, identifiants. |
| `extern/sacoche/_xsd/livret-scolaire_2d_schema_12.0.xsd` + `11.0.xsd` | Comparaison versions → stabilité du format.                                                                  |
| `extern/sacoche/_inc/noyau_livret_fin_cycle_socle.php`                | Logique de bilan fin de cycle socle (8 composantes), gestion dispensés.                                      |
| `extern/sacoche/_inc/fonction_livret.php`                             | Agrégation items → composantes (`:370-465`), formule de pourcentage.                                         |
| `extern/sacoche/_sql/structure/sacoche_livret_colonne.sql`            | **Légendes + seuils par défaut** des 4 niveaux de maîtrise (`:30-33`).                                       |
| `extern/sacoche/_sql/structure/sacoche_livret_seuil.sql`              | Seuils effectifs par cycle (cycle 2/3/4 → 0-34 / 35-59 / 60-80 / 81-100).                                    |
| `extern/sacoche/pages/livret_export.php` + `.js` + `.ajax.php`        | Flow UI prof export (récolter → générer), validation XSD via `DOMDocument::schemaValidate`.                  |
| `extern/sacoche/_inc/code_livret_recolter.php`                        | Phase « récolte » (sérialisation JSON), blocage si composante non positionnée (`:1830`).                     |
| `extern/sacoche/_inc/class.PDF_livret_scolaire.php`                   | Génération PDF via tFPDF (1766 lignes, positionnement mm manuel).                                            |

### 0.2 Architecture LSU dans Sacoche (1 schéma)

```
 SAISIE (prof)                 RÉCOLTE (admin)              GÉNÉRATION (admin)
 ────────────                  ──────────────                ─────────────────
 livret_edition.php       →    code_livret_recolter.php  →   livret_export.ajax.php
 livret_saisir.php             (calcule positionnements,     (lit blobs JSON,
 (notes/items par élève)        valide, JSON → table          concatène XML string,
                                sacoche_livret_export)        valide vs XSD, download)

 Deux types de bilan dans le MÊME fichier XML <lsun-bilans> :
   • <bilan-periodique>  → bulletin trimestre/semestre (disciplines, moyennes, appréciations)
   • <bilan-cycle>       → bilan fin de cycle SOCLE (8 <domaine>, 1 <synthese>)  ← CIBLE UbuMaths
```

### 0.3 Décisions de design Sacoche : à reprendre / à rejeter

**À reprendre :**

- **Pipeline score → pourcentage → niveau via seuils configurables** (pas de niveau hardcodé). Seuils stockés en DB, paramétrables par cycle.
- **Validation XSD systématique avant export** (`DOMDocument::schemaValidate` contre la XSD locale embarquée) — empêche un fichier invalide d'atteindre SIECLE.
- **Traçabilité de l'origine du positionnement** (`calcul` vs `saisie` manuelle) → permet l'override prof sans écraser au recalcul.
- **Blocage d'export si une composante du socle n'est pas positionnée** (`code_livret_recolter.php:1830`) — les 8 `<domaine>` sont obligatoires côté XSD.

**À rejeter / adapter :**

- **Construction XML par concaténation de strings** (`$tab_xml[] = '<...>'` + `implode`). Fonctionne mais fragile. Côté Node, préférer `xmlbuilder2` (escaping + indentation gérés).
- **PDF tFPDF positionnement mm manuel** (113 Ko de code). Côté Node, préférer HTML→PDF si PDF requis.
- **Restriction export aux profils directeur/admin** : à reconsidérer selon le rôle visé côté UbuMaths (cf. §5).

---

## 1. Format LSU officiel et exigences (XSD 13.0)

### A1. Balises racines et arbre `bilan-cycle`

**Élément racine unique** : `<lsun-bilans>` (`livret-scolaire_2d_schema_13.0.xsd:6`). Il n'existe **pas** plusieurs racines (`<bilanPeriodique>`, `<bilanFinCycle>`) ; ce sont des sections imbriquées sous `<donnees>`.

```xml
<lsun-bilans xmlns="urn:fr:edu:scolarite:lsun:bilans:import"
             xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance"
             schemaVersion="13.0">          <!-- enum stricte : seul "13.0" accepté -->
  <entete>                                   <!-- editeur, application, etablissement(UAI) -->
  <donnees>
    <responsables-etab/>  <eleves/>          <!-- requis -->
    <periodes/> <disciplines/> …             <!-- optionnels pour un fichier bilan-cycle pur -->
    <bilans-cycle>
      <bilan-cycle eleve-ref="…" cycle="3|4" millesime="2024"
                   date-creation="YYYY-MM-DD" responsable-etab-ref="…">
        <socle>                              <!-- EXACTEMENT 8 <domaine> (minOccurs=8 maxOccurs=8) -->
          <domaine code="CPD_SCI" positionnement="3"/>
          … (8 fois)
        </socle>
        <synthese>…</synthese>               <!-- requis, ≤ 1500 chars, ≥1 char non-espace -->
      </bilan-cycle>
    </bilans-cycle>
  </donnees>
</lsun-bilans>
```

Cible UbuMaths = `<bilan-cycle>`. **Requis** : `eleve-ref`, `cycle`, `millesime`, `date-creation`, `responsable-etab-ref`, les 8 `<domaine>`, la `<synthese>`. **Optionnels** : `prof-princ-refs`, `<responsables>` (coordonnées familles), `<langue-culture-regionale>`.

### A2. Énumération des niveaux

Le positionnement est un **entier `[0-4]`**, pas une chaîne (`PositionnementSocle`, `:1067-1076`, vérifié directement) :

```xml
<xs:simpleType name="PositionnementSocle">
  <xs:annotation><xs:documentation>… (entre 0 et 4 : 0 pour dispensé)</xs:documentation></xs:annotation>
  <xs:restriction base="xs:nonNegativeInteger"><xs:pattern value="[0-4]"/></xs:restriction>
</xs:simpleType>
```

| Code XML | Sens (convention MEN, non labellisé dans la XSD) |
| -------- | ------------------------------------------------ |
| `1`      | Maîtrise insuffisante                            |
| `2`      | Maîtrise fragile                                 |
| `3`      | Maîtrise satisfaisante                           |
| `4`      | Très bonne maîtrise                              |
| `0`      | **Dispensé**                                     |

⚠️ **Pas de code « non évalué » distinct.** Dans `<bilan-cycle>` les 8 `<domaine>` sont **tous obligatoires** (`minOccurs=8 maxOccurs=8`, `:723`). On ne peut pas omettre un domaine : soit on met `0` (dispensé), soit on bloque l'export. (Dans `<bilan-periodique>`, à l'inverse, `<socle>` est optionnel et les domaines vont de 1 à 8 → l'absence = non évalué. Mais ce n'est pas la cible UbuMaths.)

**Les 8 composantes** (`CodeDomaineSocle`, `:1050-1063`, vérifié) :

| Code XSD  | Domaine socle | Intitulé                                                   |
| --------- | ------------- | ---------------------------------------------------------- |
| `CPD_FRA` | D1.1          | Langages — comprendre/s'exprimer en français               |
| `CPD_ETR` | D1.2          | Langages — langues étrangères/régionales                   |
| `CPD_SCI` | **D1.3**      | **Langages mathématiques, scientifiques et informatiques** |
| `CPD_ART` | D1.4          | Langages des arts et du corps                              |
| `MET_APP` | D2            | Méthodes et outils pour apprendre                          |
| `FRM_CIT` | D3            | Formation de la personne et du citoyen                     |
| `SYS_NAT` | D4            | Systèmes naturels et systèmes techniques                   |
| `REP_MND` | D5            | Représentations du monde et activité humaine               |

> Correction par rapport à l'audit initial : l'attribut `code` du `<domaine>` utilise les codes `CPD_*/MET_APP/…`, **pas** `"D1.1"`. (L'agent export avait paraphrasé `code="D1.1"`, ce qui est faux pour le XML produit.)

### A3. Identifiants requis (côté XSD)

Type `Eleve` (`:309-319`, **vérifié directement**) :

```xml
<xs:complexType name="Eleve">
  <xs:attribute name="id"            type="xs:ID"               use="required"/>  <!-- clé interne XML -->
  <xs:attribute name="id-be"         type="xs:string"           use="required"/>  <!-- INE / Base Élèves -->
  <xs:attribute name="nom"           type="lsun:NomPrenom"      />                 <!-- optionnel, "débogage" -->
  <xs:attribute name="prenom"        type="lsun:NomPrenom"      />                 <!-- optionnel, "débogage" -->
  <xs:attribute name="code-division" type="lsun:CodeStructure"  use="required"/>  <!-- code classe -->
</xs:complexType>
```

**Constat fort** : la XSD ne demande **ni date de naissance, ni sexe, ni nom/prénom obligatoires**. L'identifiant fonctionnel de l'élève est `id-be` (= INE dans les établissements synchronisés Base Élèves). Cela **réduit la liste des pré-requis bloquants** par rapport à l'hypothèse de départ.

Établissement : `<entete><etablissement>` de type `CodeUai` = **chaîne de 8 caractères exactement** (`:803-811`), requis. Pas de pattern regex `\d{7}[A-Z]` dans la XSD (seule la longueur=8 est contrainte ; le format MEN est conventionnel).

### A4. Périodes

Pas d'énumération `TRIMESTRE`/`SEMESTRE` : le type `Periode` (`:340-350`) est **numérique** (`indice`, `nb-periodes`, `millesime`). Pour un `<bilan-cycle>`, **aucune période n'est référencée** — seul un `millesime` (année, 4 chars) est requis. Les dates sont `xs:date` (format ISO `YYYY-MM-DD`).

### A5. Stabilité du format (11.0 → 12.0 → 13.0)

| Évolution   | Changement                                                              | Impact bilan-cycle |
| ----------- | ----------------------------------------------------------------------- | ------------------ |
| 11.0 → 12.0 | Suppression des `<acc-persos>` (accompagnement personnalisé)            | Aucun              |
| 12.0 → 13.0 | Ajout `<moyennes-annuelles>` + `MoyenneAnnuelleNumerique` (9 décimales) | Aucun              |

**La structure `<bilan-cycle>` (socle, 8 domaines, positionnement 0-4, synthèse) est invariante sur les 3 versions.** Le format est très stable pour notre cible. Seul `schemaVersion` est une énum stricte : un fichier estampillé `13.0` doit suivre la 13.0.

**v14+ ?** WebSearch n'a pas trouvé de XSD plus récente publiée (résultats généralistes uniquement — FAQ Eduscol 2026, Légifrance arrêté 2017). À défaut d'accès à une nomenclature officielle plus récente, **la v13.0 embarquée par Sacoche est considérée comme la référence courante**. À reconfirmer sur Eduscol/SIECLE avant tout passage en prod.

---

## 2. Pré-requis UbuMaths (données administratives)

| Champ                         | Requis LSU `<bilan-cycle>` ? | Stocké UbuMaths ?                                 | Action si manquant                                                    |
| ----------------------------- | ---------------------------- | ------------------------------------------------- | --------------------------------------------------------------------- |
| **INE** (`id-be`)             | **OUI** (required)           | **NON** (`profiles`, vérifié grep)                | Migration : `profiles.ine TEXT` + UI saisie prof/admin. **Bloquant.** |
| **UAI** établissement         | **OUI** (8 chars, en-tête)   | **NON** (`schools`, vérifié)                      | Migration : `schools.uai TEXT` (8 chars) + UI admin. **Bloquant.**    |
| Nom élève                     | Non (optionnel "debug")      | OUI `profiles.lastname` (nullable)                | Recommandé NOT NULL à terme. Non bloquant.                            |
| Prénom élève                  | Non (optionnel "debug")      | OUI `profiles.firstname` (nullable)               | idem. Non bloquant.                                                   |
| Date de naissance             | **Non** (absent XSD)         | NON                                               | **Aucune action requise** (contrairement à l'hypothèse initiale).     |
| Sexe                          | **Non** (absent XSD)         | NON                                               | Aucune action requise.                                                |
| `code-division` (classe)      | OUI                          | OUI (via `classes` / `class_members`)             | Mapper `classes.name` → code division. À vérifier.                    |
| Période / millesime           | `millesime` (année)          | OUI `academic_periods` + `school_years`           | Dériver millesime de `school_years.start_date`. OK.                   |
| Niveau socle (0-4)            | OUI                          | OUI `student_competence_level.niveau` (4 niveaux) | Conversion directe (cf. §3). OK.                                      |
| Rattachement compétence→socle | OUI (logique)                | NON (pas de colonne)                              | Module de mapping pur (cf. §3-4), pas forcément en DB.                |

**Bilan pré-requis** : 2 vrais bloquants administratifs — **INE** et **UAI**. La date de naissance/sexe ne sont **pas** nécessaires (le périmètre « mini-V0 données administratives » se réduit à 2 champs).

Références vérifiées : `schools` (`database.ts:9925-9966`) = `id, name, address, city, country, timezone, logo_url, timetable, is_active, …` — pas d'UAI. `profiles` (`database.ts:8254-8281`) = `firstname, lastname, email, grade, school_id, role, status, …` — pas d'INE ni de date de naissance. `academic_periods` (`database.ts:17-65`) = `id, school_year_id, name, type, period_order, start_date, end_date, color, metadata` — complet.

---

## 3. Mapping compétences → socle commun

### B5. Logique Sacoche (référence)

Sacoche agrège **items → composante** par moyenne pondérée par la « valeur » de l'état d'acquisition, puis convertit le pourcentage (0-100) en niveau 1-4 via seuils (`fonction_livret.php:425-465`, `class.OutilBilan.php:200-209`) :

```
pourcentage_composante = round( Σ(nb_items_par_état × valeur_état) / nb_items_évalués )
niveau = premier maitrise_id tel que pourcentage ≤ SEUIL_MAX
```

Items non évalués : **exclus** du calcul (ni 0, ni comptés). Composante sans aucun item → `NULL` → export bloqué (`code_livret_recolter.php:1830`). Pas de seuil minimum d'items pour « valider » une composante.

### B6. Conversion niveaux — table Sacoche (vérifiée `sacoche_livret_colonne.sql:30-33`)

| `maitrise_id` | SEUIL_MIN | SEUIL_MAX | Légende                | Code archivage |
| ------------- | --------- | --------- | ---------------------- | -------------- |
| 1             | 0         | 34        | Maîtrise insuffisante  | `I`            |
| 2             | 35        | 59        | Maîtrise fragile       | `F`            |
| 3             | 60        | 80        | Maîtrise satisfaisante | `S`            |
| 4             | 81        | 100       | Très bonne maîtrise    | `T`            |

→ L'attribut XML `positionnement` est l'entier `maitrise_id` (1-4), ou `0` si dispensé.

### Mapping proposé UbuMaths : 6 compétences math → socle

**Constat structurant.** UbuMaths est une appli **de mathématiques**. Un export honnête ne peut renseigner que les composantes du socle auxquelles les maths contribuent réellement — **pas** les 8. Or `<bilan-cycle>` exige les **8 `<domaine>`**. Conséquence directe sur le périmètre (cf. §7 : on ne produit pas un bilan-cycle complet, mais une **contribution maths** pré-remplie).

Esquisse de correspondance (BO 2015 cycle 4 + mémoire `reference_bo-competences-mathematiques`) :

| Compétence math UbuMaths | Composante(s) socle alimentée(s) | Principale |
| ------------------------ | -------------------------------- | ---------- |
| `calculer`               | CPD_SCI (D1.3)                   | **D1.3**   |
| `representer`            | CPD_SCI (D1.3), REP_MND (D5)     | **D1.3**   |
| `raisonner`              | CPD_SCI (D1.3), MET_APP (D2)     | **D1.3**   |
| `communiquer`            | CPD_SCI (D1.3), CPD_FRA (D1.1)   | **D1.3**   |
| `chercher`               | MET_APP (D2), SYS_NAT (D4)       | **D2**     |
| `modeliser`              | SYS_NAT (D4), REP_MND (D5)       | **D4**     |

**Stratégie d'agrégation recommandée (à trancher PO)** : par composante socle, **moyenne des niveaux (1-4) des compétences qui l'alimentent**, arrondie. Variante minimaliste défendable : **CPD_SCI (D1.3) = moyenne des 6 compétences math**, et laisser D2/D4/D5 au professeur principal. C'est la posture la plus prudente : UbuMaths renseigne **uniquement D1.3** et marque les 7 autres comme « à compléter par l'établissement ».

> **Décision PO ouverte (majeure)** : UbuMaths renseigne-t-il (a) **uniquement CPD_SCI/D1.3**, (b) D1.3 + contributions secondaires D2/D4/D5, ou (c) les 8 composantes (impossible honnêtement) ? La réponse conditionne tout le §4.

### Conversion niveau UbuMaths → positionnement LSU

Bijection naturelle (cohérente avec la sémantique Sacoche) :

```ts
insuffisante → 1 | fragile → 2 | satisfaisante → 3 | tres_bonne → 4 | NULL → ? (cf. ci-dessous)
```

Cas `niveau = NULL` / `task_count` faible : pour un `<bilan-cycle>`, **on ne peut pas omettre le domaine**. Options : (i) ne pas exporter cet élève ; (ii) exporter `0` (dispensé) — sémantiquement faux ; (iii) bloquer + warning. **Recommandé** : bloquer l'export par élève si une composante ciblée est `NULL` (aligné Sacoche), avec opt-in explicite. Seuil `task_count` minimum (ex. ≥ 3) à confirmer PO.

### B7. Famille A (knowledge) dans le LSU ?

Le LSU n'attend que des niveaux de socle, pas le détail des capacités. La famille A (18 objectifs 6ᵉ × 4 capacités) **n'a pas de place directe** dans `<bilan-cycle>`. Deux options : (a) **ignorée** (recommandé V2) ; (b) intégrée comme signal secondaire à CPD_SCI (ex. % capacités acquises → ajustement). **Décision PO ouverte** — recommandation : ignorer en V2.

---

## 4. Architecture technique proposée

### C8. Module de mapping pur

`src/lib/server/lsu/mapping.ts` — fonctions pures, testables sans DB :

```ts
type SocleCode =
	| 'CPD_FRA'
	| 'CPD_ETR'
	| 'CPD_SCI'
	| 'CPD_ART'
	| 'MET_APP'
	| 'FRM_CIT'
	| 'SYS_NAT'
	| 'REP_MND';
type Positionnement = 0 | 1 | 2 | 3 | 4;

// niveau UbuMaths → positionnement LSU
export function niveauToPositionnement(n: MathCompetenceLevel | null): Positionnement | null;

// compétences math → composantes socle (table de correspondance §3)
export function competencesToSocle(
	levels: Record<MathCompetenceCode, MathCompetenceLevel | null>
): { code: SocleCode; positionnement: Positionnement | null }[];
```

Seuils/mapping en **constantes versionnées** dans le module (cf. risque §6.14), pas en DB pour la V2.

### C9. Génération XML

- **Lib** : `xmlbuilder2` (escaping + UTF-8 + indentation gérés ; API fluide). Éviter la concaténation de strings façon Sacoche.
- **XSD** : copier `livret-scolaire_2d_schema_13.0.xsd` dans `src/lib/server/lsu/schemas/` (Sacoche est read-only, on n'y dépend pas au runtime).
- **Validation runtime** : `libxmljs2` (`xsd.validate(doc)`) avant de servir le flux — reproduit `DOMDocument::schemaValidate` de Sacoche. Bloquer si invalide.
- Encodage UTF-8, escaping des noms via la lib (jamais à la main).

### C10. Endpoint + UI

```
GET /api/lsu/preview?class_id=X&period_id=Y           → JSON (tableau élèves × composantes, pour preview)
GET /api/lsu/export?class_id=X&period_id=Y&format=xml  → flux XML <lsun-bilans> (download)
```

Page prof `/dashboard/teacher/lsu/[period_id]` : sélecteur classe + période → preview tabulaire → bouton download. Réutiliser les patterns de `dashboard/teacher/evaluation-tasks/`.

**XML vs PDF** : prioriser **XML** (objectif = injection SIECLE, valeur réelle). Le PDF maison est superflu (l'établissement génère déjà ses bulletins). Recommandation : **XML seul en V2**, PDF reporté (cf. §7).

### C11. RLS et permissions

- Lien prof↔classe = `classes.teacher_id` (pas de table jointure), via `is_class_teacher(class_id)` `SECURITY DEFINER` (`019_fix_class_members_rls.sql:34-55`). Réutiliser ce garde-fou : un prof n'exporte que ses classes.
- Admin établissement (`is_admin()`) : devrait aussi pouvoir exporter (à confirmer PO).
- **Traçabilité RGPD** : logguer chaque export (qui, quand, quels élèves) — INE = donnée sensible. Table `lsu_export_log` à prévoir (hors périmètre étude).

---

## 5. UX prof esquissée

Flow inspiré de Sacoche (récolter → générer) mais **simplifié** (UbuMaths calcule en direct, pas de phase de récolte JSON séparée) :

```
┌─ /dashboard/teacher/lsu ──────────────────────────────────────────────┐
│ Classe : [ 4e B ▼ ]      Période/Année : [ 2025-2026 ▼ ]   [Aperçu]    │
├────────────────────────────────────────────────────────────────────────┤
│ Élève            │ D1.3 (CPD_SCI) │ D2 │ D4 │ D5 │ Statut               │
│ Dupont Marie     │      3 ✓       │ 3  │ 2  │ 3  │ ✅ complet            │
│ Martin Léo       │      2 ✓       │ –  │ 2  │ –  │ ⚠️ 2 comp. manquantes │
│ Nour Zahara      │      –         │ –  │ –  │ –  │ ⛔ aucune donnée       │
├────────────────────────────────────────────────────────────────────────┤
│ ☑ Inclure les élèves incomplets (positionnement forcé / exclusion)      │
│ [ Export XML SIECLE ]   ( PDF — non prévu V2 )                          │
└────────────────────────────────────────────────────────────────────────┘
```

- Colonnes = **uniquement les composantes que les maths alimentent** (selon décision §3), pas les 8. Si export `<bilan-cycle>` complet exigé → bandeau « les composantes non-maths doivent être complétées dans l'outil de l'établissement ».
- Élèves sans données : warning visuel + opt-in pour les inclure (ou les exclure).
- **Édition manuelle avant export** : Sacoche le fait dans une page séparée (saisie), pas dans l'export. Recommandation V2 : **lecture seule** (les niveaux viennent de l'éval prof déjà saisie). Override manuel = V3.

### D13. Périmètre cycle/niveau

Le référentiel UbuMaths V1 ne couvre que la **6ᵉ** (cycle 3). Or le `<bilan-cycle>` de fin de cycle 3 se fait en 6ᵉ, et celui de cycle 4 en 3ᵉ. **La V2 LSU est cohérente avec un bilan fin de cycle 3 (6ᵉ)** ; le cycle 4 (compétences socle déjà modélisées : 6 compétences math) viendra quand le référentiel famille B sera évalué en 3ᵉ. À cadrer PO.

---

## 6. Risques identifiés

| #       | Risque                                | Détail / mitigation                                                                                                                                                   |
| ------- | ------------------------------------- | --------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **E14** | Format XML mouvant                    | Faible : bilan-cycle invariant 11.0→13.0. Mitigation : `schemaVersion` + seuils en constantes versionnées dans `mapping.ts`. Reconfirmer v14+ sur Eduscol avant prod. |
| **E15** | RGPD (INE, identité)                  | INE = donnée scolaire sensible. Logger les exports, durée de conservation des XML limitée (Sacoche supprime le fichier après 1h), droit à l'oubli.                    |
| **E16** | Acceptation SIECLE                    | Pas d'environnement de test SIECLE accessible. Mitigation : validation XSD locale stricte (comme Sacoche). Plan B : itérer sur les rejets réels lors d'un pilote.     |
| **E17** | Mapping incomplet (8 domaines requis) | **Risque #1.** Maths ≠ 8 composantes. Un `<bilan-cycle>` complet est impossible depuis UbuMaths seul → repositionner le livrable en « contribution maths » (cf. §7).  |
| **E18** | Pré-requis administratifs             | INE + UAI absents → migration + UI saisie. Date de naissance/sexe **non requis** (allègement).                                                                        |

---

## 7. Recommandation finale

### Faisabilité : 🟠 **ORANGE**

Le format est connu et stable (Sacoche élimine l'inconnue « format officiel »), la conversion de niveaux est triviale, les périodes/niveaux compétences sont déjà en base. **Mais** deux obstacles structurels :

1. **2 pré-requis administratifs bloquants** (INE, UAI) → mini-migration + UI de saisie.
2. **Incompatibilité de périmètre** : un `<bilan-cycle>` exige les 8 composantes ; UbuMaths ne peut honnêtement renseigner que D1.3 (+ éventuellement D2/D4/D5). **Produire un fichier `<bilan-cycle>` complet et injectable tel quel dans SIECLE n'est pas réaliste sans les autres disciplines.**

### Reformulation recommandée du livrable V2

Plutôt qu'un fichier LSU injectable, viser une **« fiche de contribution socle maths »** :

- **Option A (recommandée)** : export d'un **récap maths → D1.3** (preview + XML partiel ou CSV), que le professeur principal recopie dans l'outil officiel de l'établissement (Sacoche/Pronote). Réaliste, utile, sans dépendre des autres disciplines.
- **Option B** : générer un `<bilan-cycle>` complet où **seul D1.3 est calculé** et les 7 autres sont `0`/à compléter — risque de fichier trompeur, **déconseillé**.

### Effort estimé (Option A, XML/CSV récap D1.3)

| Sous-tâche                                                 | Effort     | Note                         |
| ---------------------------------------------------------- | ---------- | ---------------------------- |
| Migration `profiles.ine` + `schools.uai` + UI saisie       | ~1 j       | Bloquant, simple             |
| Module `mapping.ts` (pur) + tests                          | ~0.5 j     | Trivial grâce à Sacoche      |
| Endpoint preview + export + génération XML (`xmlbuilder2`) | ~1.5 j     |                              |
| Validation XSD runtime (`libxmljs2`)                       | ~0.5 j     | Copier XSD 13.0              |
| Page prof + preview tabulaire                              | ~1.5 j     | Réutilise patterns existants |
| RLS + log export RGPD                                      | ~0.5 j     |                              |
| **Total Option A**                                         | **~5-6 j** | Réduit grâce à Sacoche       |

Bilan-cycle complet 8 composantes (Option B/C) : **non chiffré** — dépend d'une modélisation socle multi-disciplines hors périmètre maths.

### Pré-requis bloquants

- `profiles.ine` (INE élève) — **migration + UI**.
- `schools.uai` (UAI établissement, 8 chars) — **migration + UI**.
- (Date de naissance / sexe : **non requis**, contrairement à l'hypothèse initiale.)

### Format(s) à supporter

- **XML** (priorité) — récap D1.3 / contribution socle maths.
- **PDF** : reporté (l'établissement génère déjà ses bulletins).

### Décisions ouvertes pour le PO

1. UbuMaths renseigne **D1.3 seul** / D1.3+D2/D4/D5 / les 8 (impossible) ? → recommandé : **D1.3 seul** (Option A).
2. Livrable = **récap/contribution maths** (Option A) ou **fichier `<bilan-cycle>` complet** (Option B, déconseillé) ?
3. Famille A (knowledge) contribue-t-elle au calcul socle ? → recommandé : **non** en V2.
4. Stratégie d'agrégation quand une compétence alimente plusieurs composantes : **moyenne** ? max ? → recommandé : moyenne arrondie.
5. Seuil `task_count` minimum pour exporter un niveau (ex. ≥ 3) ?
6. Élèves incomplets : exclure / forcer / opt-in ?
7. Admin établissement peut-il exporter en plus du prof de la classe ?
8. Override manuel des niveaux avant export : V2 ou V3 ? → recommandé : **V3** (lecture seule en V2).
9. Périmètre : 6ᵉ (cycle 3) uniquement en V2, cycle 4 (3ᵉ) plus tard ?

### Out-of-scope V2

- Édition manuelle des niveaux avant export (override prof).
- Génération PDF maison.
- Bilan périodique (`<bilan-periodique>`) — seul le bilan fin de cycle est visé.
- Les 7 composantes socle non-maths.
- Intégration directe SIECLE (pas d'environnement de test).

### Quoi copier de Sacoche dans UbuMaths

- **XSD `livret-scolaire_2d_schema_13.0.xsd`** → `src/lib/server/lsu/schemas/` (validation runtime).
- **Table de seuils niveau→code** (0-34/35-59/60-80/81-100 → 1/2/3/4) — constante dans `mapping.ts`.
- **Liste des 8 codes `CodeDomaineSocle`** (`CPD_FRA…REP_MND`) — constante.
- **Principe de blocage d'export** si une composante ciblée n'est pas positionnée.
- **Principe de validation XSD avant download** (équivalent Node de `DOMDocument::schemaValidate`).

---

## Annexe — citations clés vérifiées directement (hors agents)

- `extern/sacoche/_xsd/livret-scolaire_2d_schema_13.0.xsd:1050-1063` — 8 codes `CodeDomaineSocle`.
- `…13.0.xsd:1067-1076` — `PositionnementSocle` = `[0-4]`, 0 = dispensé.
- `…13.0.xsd:309-319` — `Eleve` : `id`, `id-be` requis ; `nom`/`prenom` optionnels ; **pas** de date de naissance.
- `extern/sacoche/_sql/structure/sacoche_livret_colonne.sql:30-33` — légendes + seuils 0-34/35-59/60-80/81-100.
- `src/lib/types/database.ts` — `grep -i "ine\b"` et `grep -iE "uai|rne"` → **0 résultat** (INE/UAI absents).
- `database.ts:9925-9966` (`schools`), `database.ts:8254-8281` (`profiles`), `database.ts:17-65` (`academic_periods`).
