---
couvre:
  - 'src/lib/calculatrices/**'
  - 'src/lib/components/calculatrices/**'
  - 'src/routes/(public)/calculatrices/**'
---

# Guides calculatrices

> Vérifié contre le code le 2026-10-12. Le chantier (décisions, sources, simulateur) est dans
> [guides-calculatrices-progress.md](../wip/guides-calculatrices-progress.md) — cette doc ne le
> recopie pas.

## À quoi ça sert

Pour chaque calculatrice courante et chaque niveau, un guide public dit où trouver chaque outil du
programme, touche par touche, et les pièges à éviter : `/calculatrices` (choix du modèle),
`/calculatrices/<modele>` (choix du niveau), `/calculatrices/<modele>/<niveau>` (le guide, avec un
bouton « Télécharger la fiche PDF »).

## Comment c'est rangé

| Fichier (`src/lib/calculatrices/`) | Rôle                                                                                                                          |
| ---------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `tasks.ts`                         | Les tâches, communes à tous les modèles : niveau d'apparition, statut, codes du programme. Un `id` ne change jamais.          |
| `models/<modele>.ts`               | Pour un modèle : ses touches (`keys`), une séquence par tâche, ses pièges, chacun sourcé.                                     |
| `levels.ts`                        | Niveaux à guide (6e → Tle), adresse lisible (`seconde`, `maths-complementaires`), filiation.                                  |
| `guide.ts`                         | `buildGuide` : les tâches du niveau, puis les « Rappels » des niveaux hérités ; `parseStep` : texte et touches.               |
| `routing.ts`                       | Ce que donne une adresse : guide, niveau sans guide (avec la raison), niveau hors du modèle, ou 404.                          |
| `page-data.ts`                     | Les données des trois pages, calculées sur le SERVEUR (`+page.server.ts`) : le contenu non relu ne part jamais au navigateur. |
| `typst.ts`                         | La fiche PDF, depuis le même guide que la page (mêmes tâches, même ordre), compilée dans le navigateur.                       |

## Les règles à connaître

- **Statut d'une tâche** : `programme` (le programme la demande), `verifier` (le programme attend
  une méthode à la main : la page affiche « Pour contrôler ton résultat, pas pour le remplacer »),
  `pratique` (usage de la machine, mode examen).
- **Filiation** : copie de la table `grade_predecessors`, arrêtée à la 6e (pas de guide avant) ;
  seul ajout, les maths expertes reprennent la Tle spécialité, suivie en même temps. Les maths
  complémentaires héritent de la 1re spécialité.
- **Une touche s'écrit `[[id]]`** dans une étape, `id` déclaré dans `keys` du modèle ; les crochets
  simples restent du texte (intervalles, listes Python).
- ⚠️ **Une séquence non relue sur la vraie machine (`verifiedOnDevice: false`) est invisible en
  production**, visible en local (`dev`). Un modèle sans séquence visible est « Bientôt ». Les
  `load` sont des `+page.server.ts` et aucun fichier client n'importe `models/` : le texte non
  relu n'est même pas dans le JavaScript du navigateur (mesuré sur un `pnpm build` le 2026-10-12 ;
  test `page-data.test.ts`).
  `checkedInSimulator` dit qu'elle a été rejouée au simulateur officiel : utile, mais ne remplace
  pas la relecture sur machine (libellés imprimés des touches).
- **Tâche sans fonction dédiée** : jamais omise, `noDedicatedFunction` + le contournement.
  **Fonction récente** : `sinceVersion` (« à partir de la version 26 »).
- **Niveaux sans guide** : CP-CE2 (le programme du cycle 2 exclut la calculatrice), CM (reporté),
  Tle générale (pas de maths) — l'adresse affiche la raison au lieu d'une page vide.

- **Fiche PDF** : tout texte y est écrit en chaîne Typst `#"…"`, affichée telle quelle (ni liste,
  ni titre, ni guillemets typographiques). Compilée avec typst.ts 0.6.1-rc5 pour les 12 guides
  NumWorks le 2026-10-12.

- ⚠️ **Sitemap** : `/calculatrices/**` est exclu (`src/lib/seo/sitemap-pages.ts`) tant que rien
  n'est relu, pour ne pas montrer à Google des pages « Bientôt ». La PR qui publie les premières
  séquences relues doit les y lister.

## Ajouter un modèle

Remplir `models/<modele>.ts` (il est déjà annoncé « Bientôt » dans `models/index.ts`). Le test
`integrite.test.ts` refuse une tâche inconnue, une étape vide, une séquence sans source https, une
touche non déclarée, et exige toutes les tâches non facultatives des niveaux du modèle.
