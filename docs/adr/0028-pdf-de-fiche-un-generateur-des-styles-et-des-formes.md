# 0028 — PDF de fiche : un seul générateur, des styles, une forme = un gabarit

- **Statut** : acceptée — mise en œuvre terminée le 2026-10-14 (#1344 → #1389), sauf le retrait de
  `worksheets.template_id` ; journal archivé : `docs/archive/wip/generateur-pdf-fiches-progress.md`
- **Date** : 2026-10-13 · **Décidée par** : David

## Contexte

Deux générateurs Typst produisaient les PDF de fiches : celui du prof
(`src/lib/typst/generators/worksheet-generator.ts`, avec gabarits) et celui de l'élève
(`src/lib/worksheets/student-worksheet-typst.ts`, mise en page figée en 2 colonnes, sans gabarit).
Sept fonctionnalités du rendu d'un exercice ont été écrites deux fois, et cinq comportements
divergeaient (formules des titres, langue, ordre et numérotation, « point(s) », opérateurs à
limites). Les gabarits n'étaient pas utilisés partout : ni par le PDF élève, ni par le corrigé du
serveur ; et la RLS de `worksheet_templates` empêche un élève de lire un gabarit créé par le prof.
Le corrigé du prof réutilisait le gabarit de la fiche en y injectant un bandeau.

## Décision

| Sujet         | Décision                                                                                                                                                                                                                                  |
| ------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Principe      | La différence entre deux PDF vient du **type de document**, jamais de qui le télécharge (prof ou élève) : **un seul générateur**, piloté par le gabarit.                                                                                  |
| Forme         | Ce que contient le PDF : **fiche**, **réponses**, **corrigé**, **fiche + corrections**. **Une forme = un gabarit.**                                                                                                                       |
| Style         | Famille de gabarits qui se ressemblent, un par forme. **Table `worksheet_styles`** : nom, description, propriétaire (vide = fourni par Chiphre), **code Typst commun** (couleurs, en-tête, rendu d'un exercice) importé par ses gabarits. |
| Gabarit       | `worksheet_templates` porte son style et sa forme ; un seul gabarit par (style, forme).                                                                                                                                                   |
| Fiche         | La fiche choisit **un style** ; les formes suivent. Remplacer le gabarit d'une forme pour une fiche : table dédiée (fiche, forme, gabarit), clés étrangères ; forme absente du style → celle du style par défaut.                         |
| Accès élève   | L'élève lit le style et les gabarits **de la fiche qui lui est affectée**, **via le serveur** (l'API de sa fiche, après la vérification d'affectation existante) ; **aucune policy RLS ouverte aux élèves**.                              |
| Données       | Un modèle de document unique, rempli par deux adaptateurs (copie recalculée côté prof, vue élève déjà filtrée côté élève) ; un rendu d'exercice unique.                                                                                   |
| Comportements | Exercice hors section après des sections → sous « Autres exercices » ; correction non écrite → « Exercice N : correction non écrite » ; « afficher les points » s'applique à tous les PDF.                                                |

## Écarté

- **Deux générateurs, prof et élève, avec un rendu d'exercice commun** : garde deux mises en page
  pour un même document, alors que les PDF sont tous destinés à l'élève.
- **Un gabarit pour les quatre formes** (bandeau ou « mode » injecté) : un corrigé n'a besoin ni du
  cartouche ni des cadres de réponse ; c'est le bricolage qu'on retire.
- **Style = simple étiquette sur les gabarits** (deux colonnes `style`, `forme`) : le code commun
  d'un style n'aurait pas de place, et un prof ne pourrait pas nommer ni décrire son propre style.
- **Policy RLS « un élève lit un gabarit si une fiche qui l'utilise lui est affectée »** : ouvre la
  base elle-même ; les policies échouent en silence et se combinent en OU.

## Conséquences

- Migration additive : tables des styles et des remplacements, colonnes de style et de forme ;
  chaque gabarit système devient un style, chaque gabarit du prof son propre style, chaque fiche
  reçoit le style de son gabarit. Le retrait de `worksheets.template_id` est **destructif** : après
  le `deploy:prod` qui livre le code qui ne le lit plus, avec l'accord de David.
- `student-worksheet-typst.ts`, le bandeau injecté et le paramètre `mode` disparaissent.
- Toute évolution du rendu d'un exercice ne se fait plus qu'une fois.

## Mise en œuvre : ce qui a été fait autrement (décisions de David pendant le chantier)

- **Code Typst des styles de Chiphre : dans le code**, pas en base (D9). `worksheet_styles` a une
  ligne par style de Chiphre (même identifiant que son gabarit) pour qu'une fiche le désigne ;
  `common_typst` ne sert qu'aux styles d'un prof (vide aujourd'hui).
- **Remplacer le gabarit d'une forme pour une fiche : reporté** (D9) — aucune table de
  remplacement, aucun gabarit du prof en prod.
- **Points** : le style décide d'abord ; « Fiche élève » n'en imprime aucun (D8), les autres suivent
  la case de la fiche.
- **Style par défaut : « Fiche élève »** (D7) ; plus de mise en page écrite dans le code.
- **Page « Gabarits » inchangée à l'écran** : chaque gabarit qu'elle crée est la fiche d'un style
  du même nom et du même identifiant (D10).
- **Accès élève** (D11) : la mise en page d'un style de l'**auteur** de la fiche est lue par le
  serveur en service-role, après la vérification d'affectation (`loadAuthorStyleTemplate`) ;
  étendu au **visiteur d'un cahier de texte ou d'un cours partagé**, pour une fiche atteignable par
  ce lien (fonctions `security definer` de partage). Jamais la mise en page d'un autre compte.
- **Fiche + corrections d'un style qui n'a que sa fiche** : sa fiche, puis la partie de fin
  commune (`CORRECTIONS_PART`), et non toute la fiche en « Fiche élève ».
- `student-worksheet-typst.ts` **reste**, réduit à l'adaptateur de la vue élève vers
  `WorksheetGenerator` ; l'ancienne mise en page élève est retirée (lot 5).
- **Reste à faire** : remplir `worksheets.style_id` depuis `template_id`, puis retirer
  `template_id` (destructif, avec l'accord de David).
