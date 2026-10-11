---
couvre:
  - 'src/lib/competences/**'
  - 'src/lib/server/competences/**'
  - 'src/routes/(protected)/dashboard/teacher/competences/export/**'
  - 'src/routes/api/teacher/competences/export/**'
---

# Export des compétences vers l'ENT

> Vérifié contre le code le 2026-10-11 (sauf les marches à suivre côté Pronote / EcoleDirecte /
> Sacoche : elles décrivent des logiciels tiers, relevées en juin 2026, non vérifiables dans ce
> dépôt). Étude et journal : [export-competences-study.md](../archive/wip/export-competences-study.md),
> [export-competences-progress.md](../archive/wip/export-competences-progress.md) (archivés).

## À quoi ça sert

Le prof télécharge en **CSV** les niveaux des six **compétences mathématiques** (chercher, modéliser,
représenter, raisonner, calculer, communiquer — [CONTEXT.md](../../CONTEXT.md)) d'une classe, pour les
reporter dans son ENT. Aucun ENT n'accepte un import automatisé fiable depuis un outil tiers :
l'export **réduit la ressaisie**, il ne la supprime pas.

Page : `/dashboard/teacher/competences/export`, atteinte par l'entrée « Export des compétences » du
menu prof (`src/lib/config/dashboard-nav.ts`) ou par le bouton « Export compétences » de la page
analytique d'une classe ([analytique-prof.md](analytique-prof.md)).
La page montre un **aperçu** (le même tableau que le CSV) et des options ; le lien de téléchargement
appelle `GET /api/teacher/competences/export`.

## Ce que contient le fichier

Niveaux lus dans `student_competence_level` (élèves **actifs** de la classe, colonnes = lignes de
`math_competences`), échelle du socle commun (décret 2015-1929) :

| Interne (`niveau`) | `numeric` (LSU) | `label`                | `short` |
| ------------------ | --------------- | ---------------------- | ------- |
| `insuffisante`     | 1               | Maîtrise insuffisante  | MI      |
| `fragile`          | 2               | Maîtrise fragile       | MF      |
| `satisfaisante`    | 3               | Maîtrise satisfaisante | MS      |
| `tres_bonne`       | 4               | Très bonne maîtrise    | TBM     |

Cellule vide = pas encore évalué. L'export reflète l'**état actuel** : la **période** choisie ne sert
que d'étiquette dans le nom du fichier (`competences-<classe>[-<periode>]-<AAAA-MM-JJ>.csv`).

- **Disposition `large`** (défaut) : une ligne par élève — `nom ; prenom ; classe ; <compétences…>`.
  Format du collage dans Pronote.
- **Disposition `longue`** : une ligne par élève × compétence —
  `nom ; prenom ; classe ; competence_code ; competence_nom ; niveau`, plus en option `socle_code`,
  `task_count`, `derniere_observation` (ignorées en `large`).
- Élèves triés par « Nom Prénom » (collation française). UTF-8 **avec BOM**, séparateur `;`, fins de
  ligne CRLF, échappement RFC 4180.
- `socle_code` : domaines du socle par compétence, table figée `COMPETENCE_SOCLE_MAPPING` (BO 2015,
  cycle 4 ; domaine 1 rendu `D1.3`). Colonne de confort : aucun ENT ne l'exige.

## Carte du code

- `src/routes/api/teacher/competences/export/+server.ts` — Zod sur la query (`class_id` UUID,
  `disposition`, `niveau_format`, `socle` / `task_count` / `last_obs`, `period_label` ≤ 100), garde
  `requireTeacherOfClass`, réponse `text/csv` en pièce jointe, `Cache-Control: no-store`. Journal :
  `competences exported` (id du prof, de la classe, nombre d'élèves — pas de noms).
- `src/lib/server/competences/load-export-data.ts` — `loadClassCompetenceExport`, partagé par
  l'endpoint et la page : l'aperçu et le CSV ne peuvent pas diverger. Échoue bruyamment si une
  lecture échoue (un export tronqué ressemblerait à un export complet).
- `src/lib/server/competences/export-csv.ts` — `buildCompetencesCsv`, pur (aucun accès base).
- `src/lib/competences/niveau-format.ts` — `formatNiveau` (les trois formats).
- `src/lib/server/competences/socle-mapping.ts` — `COMPETENCE_SOCLE_MAPPING`, `formatSocleCell`.
- Page : `src/routes/(protected)/dashboard/teacher/competences/export/+page.server.ts` (classes et
  périodes viennent du layout prof ; `?class=<uuid>` choisit la classe) et `+page.svelte`
  (`MySelect`, `MyCheckbox`).

## Invariants

- Rien n'est stocké côté serveur : le fichier est produit à la volée.
- Données nominatives d'élèves mineurs (nom, prénom, classe, niveaux) : accès prof seulement (le compte
  admin est refusé, page comme endpoint, décision du 2026-10-11) ;
  la RLS de `student_competence_level` s'applique (client `locals.supabase` de l'appelant).

## Tests

`src/lib/server/competences/__tests__/export-csv.test.ts` (13) et `load-export-data.test.ts` (3),
unitaires avec base simulée. Pas de test de l'endpoint ni de la page.

## Marche à suivre côté ENT (guide prof)

- **Pronote** : pas d'API d'import. Disposition `large`, format 1-4 ; ouvrir le CSV dans un tableur,
  copier la grille élèves × compétences, puis dans l'évaluation Pronote « Récupérer les évaluations
  depuis le presse-papier ». Le nombre de colonnes doit égaler exactement celui des compétences de
  l'évaluation. Collage réputé peu fiable sur macOS (côté Pronote).
- **EcoleDirecte** : pas d'import de compétences par fichier ; l'export sert de feuille de saisie à
  recopier.
- **Sacoche** : l'import attend un fichier produit par Sacoche, l'API est en lecture seule. Créer une
  fois six items d'évaluation, exporter en `longue` / 1-4, saisir les niveaux à la main.

Rappeler au prof de supprimer le fichier de son poste une fois la saisie faite.

## Écarts connus

- Les commentaires du code citent encore « famille B » : le terme reste juste (seule famille vivante,
  [ADR 0008](../adr/0008-referentiel-famille-a-abandonne.md)), mais CONTEXT.md parle de
  « compétences mathématiques ».
