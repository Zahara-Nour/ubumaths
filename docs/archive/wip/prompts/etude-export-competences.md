# Étude — Export compétences vers Pronote / Sacoche / EcoleDirecte

> **Mode** : étude/audit uniquement. **Pas d'implémentation, pas de migration, pas de commit.**
> Livrable attendu : un document d'analyse markdown dans `docs/wip/export-competences-study.md`.

---

## Contexte

UbuMaths est une application éducative de maths pour élèves francophones (collège). Le système de **compétences** a été livré en MVP le 2026-06-09 :

- **Famille A (knowledge)** — 18 objectifs 6ᵉ × 4 capacités ordonnées. Tracking automatique via flashcards.
- **Famille B (competence)** — 6 compétences math du socle commun (**chercher, calculer, raisonner, communiquer, modéliser, représenter**), évaluées par le prof sur tâches d'observation. Niveaux : `insuffisante`, `fragile`, `satisfaisante`, `tres_bonne`. Table `student_competence_level (student_id, math_competence_id, niveau, task_count, validated_observables, missing_for_next)`.
- UI élève `/dashboard/student/competences` + UI prof `/dashboard/teacher/evaluation-tasks` opérationnelles.

### Décision PO du 2026-06-11 (à respecter strictement)

Le chantier **"export LSU XML officiel SIECLE"** a été **abandonné**. Raisons :

- UbuMaths n'est pas un ENT, le LSU est la source de vérité ailleurs (Pronote/Sacoche/EcoleDirecte/SIECLE).
- INE élève + UAI établissement absents d'UbuMaths → friction énorme pour les profs.
- Conformité réglementaire lourde, RGPD sensible, XSD mouvante.

Le **nouveau besoin** : permettre au prof d'**exporter les données de compétences UbuMaths** pour les **importer dans son ENT habituel** (Pronote / Sacoche / EcoleDirecte) en réduisant au max la ressaisie.

### Cibles d'export — réalisme

| ENT                           | API tiers ?                                                      | Voie réaliste                               |
| ----------------------------- | ---------------------------------------------------------------- | ------------------------------------------- |
| **Pronote** (Index Education) | Non, propriétaire + accord commercial                            | Import CSV manuel par le prof               |
| **EcoleDirecte** (Aplim)      | Non, propriétaire fermée                                         | Import CSV manuel par le prof               |
| **Sacoche** (Sésamath, libre) | Oui (`extern/sacoche/api/` + `webservices/`) ou format XML natif | Export XML/CSV natif, voire push webservice |

**Stratégie retenue** : un seul livrable bien conçu = **export CSV générique paramétrable** qui couvre Pronote/EcoleDirecte via import manuel + **bonus optionnel** = export Sacoche natif si demande utilisateur réelle.

### Ressource clé : Sacoche (extern/sacoche)

Le repo contient `extern/sacoche/` — clone du logiciel libre Sacoche. À utiliser comme **source primaire pour comprendre les formats d'import/export Sacoche** :

- `extern/sacoche/_inc/code_livret_importer.php` — code d'import de livret (donne le format attendu côté Sacoche)
- `extern/sacoche/_inc/code_livret_exporter.php` ou équivalent — export
- `extern/sacoche/_inc/fonction_livret.php` — fonctions utilitaires partagées
- `extern/sacoche/api/` + `extern/sacoche/webservices/` — endpoints d'API
- `extern/sacoche/_sql/requetes_structure_livret.php` — schéma DB livret côté Sacoche
- `extern/sacoche/pages/` — UI prof (pour comprendre le workflow d'import)

**Lecture stricte uniquement** — c'est un clone read-only.

### Constat audit 2026-06-11 (état du repo UbuMaths)

**Pas de mapping vers le socle commun dans UbuMaths aujourd'hui.**

Vérifié par grep : les "D1/D2/D3" présents dans `supabase/migrations/20260609120001_competence_referentiel_functions.sql` sont des **codes d'observables internes** aux sous-dimensions A/B/C/D des 6 compétences math (ex: sous-dim D de "Calculer" a 3 observables D1/D2/D3). **Aucun rapport avec les 8 composantes du socle commun** (D1.1 langue française, D1.3 langages math/scientifiques, D2 méthodes, D3 personne/citoyen, D4 systèmes naturels/techniques, D5 représentations du monde).

Aucune table `socle_components`, aucune colonne `socle_mapping`, aucun seed socle.

→ **Question stratégique à trancher dans l'étude** : faut-il ajouter ce mapping ? Si oui, sous quelle forme ?

---

## Questions à investiguer

### A. Mapping vers le socle commun — décision préalable

1. **Le mapping socle est-il nécessaire pour l'export ?**

   - Pronote : son système "Compétences" attend-il un code socle ou peut-il importer des compétences "libres" (juste libellé + niveau) ?
   - EcoleDirecte : idem.
   - Sacoche : lire `extern/sacoche/_inc/code_livret_importer.php` et `_sql/requetes_structure_livret.php` — Sacoche range les items en compétences/socle/cycle. Format attendu à l'import ?
   - Si **aucun ENT cible n'exige le code socle**, on peut s'en passer et exporter directement {nom_compétence, niveau}.

2. **Si le mapping socle est nécessaire ou utile**

   - 6 compétences math UbuMaths → quelles composantes du socle ? (typiquement : tout vers D1.3, mais "Communiquer" touche aussi D1.1, "Modéliser/Représenter" peuvent toucher D4/D5)
   - Source : programmes officiels BO 2015 + référentiel BO référencé en memory `reference_bo-competences-mathematiques`.
   - Une compétence peut alimenter **plusieurs** composantes socle. Modèle : 1-N junction ? JSON array ? Pondération ?

3. **Si on l'ajoute, quel schéma minimal ?**
   - Option A : table `socle_components (code, name, cycle)` + junction `math_competence_socle (math_competence_id, socle_code, weight)`.
   - Option B : colonne `socle_codes TEXT[]` directement sur `math_competences` (plus simple, suffisant si pas de pondération).
   - Option C : pas de table, juste un mapping en TypeScript (`src/lib/server/socle/mapping.ts`) — pertinent si lecture seule, jamais édité.
   - Recommandation argumentée selon les besoins identifiés en A1.

### B. Export CSV générique — schéma et UX

4. **Colonnes du CSV**

   - Minimum vital : `identifiant_eleve, nom, prenom, classe, competence_code, competence_nom, niveau`
   - Compléments utiles : `niveau_lsu (1-4), task_count, periode_debut, periode_fin, derniere_observation, validated_observables`
   - Format des niveaux : `tres_bonne` (interne) ou `4` (LSU) ou `TBM` (libellé court Pronote/Sacoche) ? **Configurable**.
   - Encodage : UTF-8 BOM (compatibilité Excel français).

5. **Format pivot ou format cible ?**

   - Option 1 : 1 format CSV unique, le prof réorganise ses colonnes dans Excel avant import.
   - Option 2 : 3 presets de mapping (`pronote`, `sacoche`, `ecoledirecte`) que l'utilisateur choisit dans l'UI → CSV pré-formaté.
   - Préset = liste ordonnée des colonnes + libellés français + format des niveaux. Stockés en TypeScript ou en DB ?
   - Lire les **docs/forums Pronote/EcoleDirecte** (WebSearch) pour identifier le format d'import compétences attendu par chaque outil.

6. **Identifiant élève**

   - Sans INE, quel identifiant l'export utilise-t-il ? `profiles.id` (UUID UbuMaths) ne sert à rien côté ENT.
   - Solutions : `nom+prenom+classe` (fragile, doublons possibles) / champ libre `identifiant_externe` saisi par le prof / lecture LDAP/CSV imports précédents ?
   - Sacoche utilise quoi comme identifiant élève (lire schéma DB) ?

7. **UI prof**
   - Page `/dashboard/teacher/competences/export` : sélecteur classe + période + élèves + format cible (preset) + checkboxes colonnes.
   - Preview tableau avant download.
   - Bouton "Télécharger CSV".
   - Wireframe ASCII à inclure dans le livrable.

### C. Export Sacoche natif (bonus optionnel)

8. **Format d'import Sacoche**

   - Lire `extern/sacoche/_inc/code_livret_importer.php` : format CSV ou XML attendu ?
   - Identifier les champs requis (élève, item, niveau, date, prof).
   - Sacoche a-t-il un import "compétences cycle" ou "items d'évaluation" ? Différents pour notre cas ?

9. **Webservices Sacoche**

   - Inventaire de `extern/sacoche/api/` et `extern/sacoche/webservices/` : endpoints disponibles ?
   - Authentification : token, login mot de passe, API key ?
   - Faisable de pousser directement depuis UbuMaths (POST authentifié) ? Ou plus simple de générer un fichier à uploader manuellement ?
   - Estimer surcoût "webservice push" vs "fichier à uploader".

10. **Mapping items Sacoche ↔ compétences UbuMaths**
    - Sacoche fonctionne sur des **items personnalisés** créés par chaque établissement (pas un référentiel national figé).
    - Donc : impossible de pré-mapper. Solution : import Sacoche = juste 6 items à créer côté Sacoche (les 6 compétences math), le prof fait le mapping à l'import.
    - Confirmer ce modèle en lisant `extern/sacoche/_inc/code_livret_importer.php`.

### D. PDF récap "aide à la saisie" (alternative ultra-light)

11. **Si même l'export CSV semble trop ambitieux comme V1**
    - Option dégradée : juste un **PDF récap A4 par élève** que le prof imprime ou consulte sur écran, et ressaisit dans son ENT.
    - 1 page par élève : 6 compétences × niveau + nb tâches + dates clés.
    - Bibliothèque PDF Node : `pdf-lib` (basique, OK pour 1 page), `pdfmake` (déclaratif, plus puissant), `puppeteer` server-side (lourd mais full HTML/CSS).
    - Coût : ~0.5-1 jour. À garder en option si le chantier CSV s'avère plus complexe que prévu.

### E. Risques et points d'attention

12. **Format ENT mouvant**

    - Pronote/EcoleDirecte changent leurs formats d'import au gré des versions. Stratégie : tests d'import manuel avant chaque release UbuMaths ? Ou se contenter du CSV générique en disant "à adapter manuellement" ?

13. **RGPD léger (pas LSU mais quand même)**

    - Export contient nom/prénom/classe + résultats scolaires. Sensibilité moindre que LSU XML, mais : qui peut exporter (RLS) ? Log des exports ? Durée de rétention des fichiers générés côté serveur ?

14. **Présentation des niveaux**

    - `tres_bonne` (interne UbuMaths) ne correspond pas mot pour mot à "Très Bonne Maîtrise" du socle. Vérifier qu'on ne crée pas de confusion.
    - Pour le prof, fournir un **petit guide d'usage** dans la page d'export ("ces niveaux suivent l'échelle officielle du socle commun").

15. **Charge de travail réelle vs valeur**
    - Le CSV générique seul résout 90% du cas si les profs sont équipés Excel. Le préset Pronote/Sacoche ajoute peu si le prof sait copier-coller dans Excel.
    - Décider si on développe les **3 presets** ou si on se contente d'**1 format pivot bien documenté**.

### F. Pré-requis UbuMaths

16. **Données administratives manquantes**
    - L'identifiant externe élève (cf. B6) → mini-feature à ajouter avant l'export ? Migration `profiles.identifiant_externe TEXT NULL` + UI prof pour saisir/importer ?
    - Périodes scolaires → `academic_periods` existe (vu dans `+page.server.ts` du dashboard), réutiliser.

---

## Livrable

Document `docs/wip/export-competences-study.md` structuré comme suit :

```markdown
# Étude — Export compétences vers Pronote / Sacoche / EcoleDirecte

## 0. Synthèse exécutive (1/2 page)

- Faisabilité globale
- Format(s) recommandé(s)
- Mapping socle : nécessaire ? Sous quelle forme ?
- Effort estimé total

## 1. Mapping vers le socle commun

- État actuel (absent)
- Nécessité réelle selon ENT cible (A1)
- Si nécessaire : modèle de données proposé (A2-A3)

## 2. Export CSV générique

- Colonnes proposées (B4)
- Format pivot vs presets (B5)
- Identifiant élève (B6)
- UX prof avec wireframe (B7)

## 3. Export Sacoche natif (bonus)

- Format d'import attendu (C8)
- Webservices : faisable ou pas (C9)
- Mapping items (C10)
- Recommandation : développer ou non en V1 ?

## 4. PDF récap (fallback)

- Pertinence vs CSV (D11)

## 5. Pré-requis UbuMaths

- Identifiant externe élève (F16)
- Mapping socle (renvoi §1)

## 6. Risques et points d'attention

- E12-E15

## 7. Recommandation finale

- **Chantier 1 (MVP)** : description + effort + livrables
- **Chantier 2 (optionnel)** : description + effort + condition de déclenchement
- **Décisions ouvertes pour le PO** : liste oui/non
- **Out-of-scope** : ce qu'on remet à plus tard
```

---

## Contraintes de la session d'étude

- **Étude uniquement** : pas d'`Edit`, pas de `Write` sauf le document livrable, pas de migration, pas de commit.
- **Ne pas modifier `extern/sacoche/`** — clone read-only, lecture stricte.
- **Pas de `pnpm check` / `pnpm build` / `pnpm lint`** sur tout le projet (problèmes de mémoire — cf. `CLAUDE.md`).
- **Format LSU SIECLE XML = HORS SCOPE** — décision PO actée, ne pas y revenir.
- Sources : Sacoche (primaire, code local) + Web (Pronote/EcoleDirecte forums et docs pour formats d'import compétences).
- Utiliser l'agent `Explore` pour parcourir Sacoche si plus de 3-4 fichiers à consulter.
- Citer systématiquement les fichiers/lignes (`extern/sacoche/_inc/foo.php:120` ou `src/lib/types/skills.ts:45`) et les URLs sources.
- Si une question reste sans réponse claire après audit, la **flagger** dans le doc plutôt que d'inventer.

---

## Fichiers / répertoires à consulter en priorité

### Côté Sacoche (source primaire pour formats import/export)

- `extern/sacoche/_inc/code_livret_importer.php` — format d'import livret (priorité 1)
- `extern/sacoche/_inc/fonction_livret.php` — utilitaires partagés
- `extern/sacoche/_sql/requetes_structure_livret.php` — schéma DB livret
- `extern/sacoche/_sql/requetes_structure_siecle.php` — schéma DB côté SIECLE (référence)
- `extern/sacoche/api/` + `extern/sacoche/webservices/` — endpoints API
- `extern/sacoche/pages/livret_*.{php,js}` — UI prof Sacoche
- `extern/sacoche/_inc/code_livret_exporter.php` — si existe, export Sacoche

### Côté UbuMaths (cible)

- `src/lib/types/skills.ts` — types Famille B
- `src/lib/types/database-helpers.ts` — types dérivés
- `supabase/migrations/20260609120000_competence_referentiel_schema.sql` — schéma compétences
- `supabase/migrations/20260609120002_competence_referentiel_seeds.sql` — données 6 compétences math
- `src/lib/types/database.ts` — chercher `profiles`, `schools`, `academic_periods`, `class_members`
- `src/routes/(protected)/dashboard/teacher/evaluation-tasks/` — UI prof existante (pattern à réutiliser)
- `docs/architecture/database-schema.md` — section "Compétences"
- `docs/wip/skills-referentiel-design.md` — spec architecturale famille B

---

## Sources Web à consulter

- **Pronote — import compétences** : doc Index Education (probablement payante/réservée) + forums profs (`forum.index-education.com`). Chercher "import compétences CSV Pronote".
- **EcoleDirecte — import compétences** : doc Aplim + forums. Chercher "EcoleDirecte import CSV compétences".
- **Sacoche** : docs locales + `extern/sacoche/CONTRIBUTING.md` et `extern/sacoche/LICENCES.html`.
- **Socle commun** : décret 2015 (8 domaines). BO référencé en memory `reference_bo-competences-mathematiques`.

---

## Démarrage suggéré

1. **Lire `extern/sacoche/_inc/code_livret_importer.php`** (15 min) → comprendre les formats d'import Sacoche.
2. **Inventaire `extern/sacoche/api/` + `extern/sacoche/webservices/`** (5 min) → existence et nature de l'API.
3. **WebSearch "Pronote import compétences CSV format"** (10 min) → format attendu Pronote.
4. **WebSearch "EcoleDirecte import compétences"** (10 min) → format attendu EcoleDirecte.
5. **Audit UbuMaths** :
   - `grep -i "identifiant_externe\|external_id\|ine\b" src/lib/types/database.ts`
   - Lire `src/lib/types/skills.ts` (5 min).
   - Lire seeds compétences (2 min).
6. **Décider du mapping socle** (oui/non, sous quelle forme) en fonction des findings ENT.
7. Rédiger le doc section par section.

Temps estimé : **60-90 minutes** d'étude pour produire un livrable solide. Périmètre plus modeste que l'étude LSU précédente — pas de XSD complexe à digérer, focus sur le pragmatisme.
