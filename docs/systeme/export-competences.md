# Exporter les compétences vers votre ENT

> Guide enseignant — page **Tableau de bord → Compétences → Export**
> (`/dashboard/teacher/competences/export`).

UbuMaths vous permet d'**exporter en CSV** les niveaux de compétences (famille B :
_chercher, calculer, raisonner, communiquer, modéliser, représenter_) de vos
classes, pour les **reporter dans votre ENT** (Pronote, EcoleDirecte, Sacoche).

> ⚠️ **Important** : aucun ENT n'autorise un import automatisé fiable depuis un
> outil tiers. L'export UbuMaths **réduit la ressaisie** mais ne la supprime pas :
> selon votre ENT, vous **collez** un tableau ou vous **recopiez** les niveaux.

## Échelle des niveaux

Les niveaux suivent l'échelle officielle du socle commun (décret 2015-1929) :

| Interne UbuMaths | Chiffre LSU | Libellé officiel       | Sigle |
| ---------------- | ----------- | ---------------------- | ----- |
| `insuffisante`   | 1           | Maîtrise insuffisante  | MI    |
| `fragile`        | 2           | Maîtrise fragile       | MF    |
| `satisfaisante`  | 3           | Maîtrise satisfaisante | MS    |
| `tres_bonne`     | 4           | Très bonne maîtrise    | TBM   |

Une cellule **vide** signifie que l'élève n'a pas encore été évalué sur cette
compétence.

> L'export reflète l'**état actuel** des compétences. La **période** que vous
> choisissez sert uniquement d'étiquette (nom du fichier) pour votre classement —
> elle ne filtre pas les niveaux affichés.

## Choisir les options

- **Disposition « Large »** (par défaut) : 1 ligne par élève, 1 colonne par
  compétence. C'est le format adapté au **collage dans Pronote**.
- **Disposition « Longue »** : 1 ligne par (élève × compétence), avec colonnes
  optionnelles (code socle, nombre de tâches, dernière observation). Adaptée à
  l'**archivage** ou au tri dans un tableur.
- **Format des niveaux** : `1-4` (recommandé pour Pronote), libellé long, ou
  sigle court.

Le fichier est encodé en **UTF-8 (avec BOM)** : ouvrez-le directement dans Excel
ou LibreOffice, les accents s'affichent correctement. Le séparateur est le
point-virgule (`;`).

---

## Pronote (Index Education)

Pronote ne propose pas d'API d'import. La saisie des résultats se fait par
**copier-coller** depuis un tableur.

1. Téléchargez l'export en **disposition Large**, format **Chiffre LSU (1-4)**.
2. Ouvrez le CSV dans Excel / LibreOffice.
3. Dans Pronote : `Compétences → Évaluations`, ouvrez l'évaluation dont les
   compétences correspondent (les colonnes doivent correspondre **exactement**
   aux compétences de l'évaluation Pronote).
4. Sélectionnez la grille élèves × compétences (valeurs 1-4) dans votre tableur,
   copiez (`Ctrl+C`), puis dans Pronote utilisez
   **« Récupérer les évaluations depuis le presse-papier »**.

> 🍎 **Utilisateurs macOS** : le collage de compétences depuis le presse-papier
> est connu pour mal fonctionner sur Mac. Si le collage échoue, effectuez
> l'opération depuis un poste **Windows** (problème côté Pronote, pas UbuMaths).

> Le nombre de colonnes collées doit correspondre **au nombre exact** de
> compétences associées à l'évaluation Pronote, sans quoi le collage est refusé.

## EcoleDirecte (Aplim)

EcoleDirecte ne propose **pas d'import de compétences par fichier**. L'export
sert ici de **feuille de saisie** : gardez le CSV ouvert à l'écran (ou
imprimez-le) et **recopiez** les niveaux dans Charlemagne / EcoleDirecte.

- Disposition **Large**, format **Libellé** ou **1-4** selon votre préférence.

## Sacoche (Sésamath)

L'import de livret Sacoche attend un fichier généré par Sacoche lui-même
(identifiants internes), et son API est en lecture seule : un import direct
depuis UbuMaths n'est pas possible.

Marche à suivre côté Sacoche :

1. Créez (une fois) **6 items d'évaluation** correspondant aux 6 compétences
   mathématiques.
2. Téléchargez l'export UbuMaths (disposition **Longue**, niveaux **1-4**) pour
   disposer d'une liste élève / compétence / niveau lisible.
3. Saisissez les niveaux sur les items Sacoche correspondants.

---

## Confidentialité

L'export contient des données scolaires nominatives (nom, prénom, classe,
résultats). Seul un professeur ou un administrateur peut générer l'export
(contrôle d'accès role-based — la classe n'est plus rattachée à un prof). Le fichier est produit à la volée et **n'est pas stocké** sur le
serveur — pensez à le supprimer de votre poste une fois la saisie terminée.
