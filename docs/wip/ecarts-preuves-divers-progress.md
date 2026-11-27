---
title: Tests de preuve des lots tuteur-documents, comptes-evaluations, utilitaires et modération — journal
date: 2026-11-27
status: en cours
---

## Reprendre ici

_Mis à jour le 2026-11-27, avant la PR._

- **État** : sept tests de preuve écrits (T26, L114, L122 dans `tests/ecarts/` ; L112, L113 en intégration ; L110, L123 au navigateur), tous rouges pour la bonne raison ; L38 et M25 passent par une commande (pas de code).
- **Prochaine action** : PR, merge, puis les neuf lignes du registre (commit de doc direct sur `main`) et `pnpm ecarts rejouer`.
- **En attente de David** : rien.
- **Pièges en cours** : aucun.
- **Worktree / branche** : `ubumaths-wt-ecarts-preuves-divers` / `test/ecarts-preuves-divers`.

---

Chantier fils de [ecarts-a-trier](ecarts-a-trier-progress.md). Lots décrits dans [ecarts-tri/tuteur-documents.md](ecarts-tri/tuteur-documents.md), [ecarts-tri/comptes-evaluations.md](ecarts-tri/comptes-evaluations.md), [ecarts-tri/utilitaires.md](ecarts-tri/utilitaires.md) ; L122 et L123 viennent de la revue de #3115.

## Sonde du 2026-11-27

- **L114** (`tests/ecarts/utilitaires.test.ts`) : camembert 23 / 57 → la légende dit « 28,7 % » (attendu 28,8) ; 41 / 39 → « 51,2 % » (attendu 51,3). Témoins : 1 / 7 → 12,5 ; 23 / 58 → 28,4.
- **T26** (même fichier) : les dictionnaires de macros de `node_modules/mathlive/mathlive.mjs` sont lus (plus de 100 macros) ; 13 se développent en commande interdite sans être ni refusées ni listées : `strut`, `phase`, `angl`, `angln`, `anglr`, `anglk`, `simcolon`, `Simcolon`, `simcoloncolon`, `approxcolon`, `Approxcolon`, `approxcoloncolon`, `tripledash`. Le test est fermé par l'une ou l'autre correction : refuser la macro (`hasUnsafeMathCommand('\nom{x}')`), ou la porter dans une liste exportée par `restricted-rendering.ts`, quel que soit son nom. Le tri n'en avait vu que 6 : les macros `…colon` (un `\mkern` à valeur fixe) s'y ajoutent. Non couvert : une macro qui se développe en une autre macro.
- **L122** (`tests/ecarts/rapports-de-bug.test.ts`) : remplacement d'une capture, le stockage rend zéro fichier sans erreur à l'effacement de l'ancienne → rien au journal du serveur. Le test demande au moins un avertissement ou une erreur, sans imposer le texte. Témoins : effacement réussi → aucune alerte ; effacement en erreur → une alerte.
- **L112** (`tests/integration/ecarts-base-de-donnees.test.ts`, `it.fails`) : supprimer un point du programme efface l'état de l'élève sur ce point (0 ligne après, attendu 1). Témoin : un point que personne n'a travaillé se supprime.
- **L113** (même fichier) : supprimer un exercice cité par une activité de séance est refusé (l'exercice est encore là). Témoin : un exercice non cité se supprime.
- **L123** (`src/lib/components/__tests__/ecarts-moderation.svelte.test.ts`, `it.fails`) : le menu de modération se lit pareil (texte, `aria-label`, `title`) avec un compteur illisible et avec zéro signalement. Témoins : deux rendus du même compteur se lisent pareil ; trois signalements ne se lisent pas comme zéro.
- **L110** (même fichier) : « Détection des freezes » coupée, une tâche longue d'une minute part quand même à la surveillance (1 envoi, attendu 0). L'observateur de tâches longues est remplacé par un faux, la configuration arrive par le `load()` du store. Témoin : détection active → 1 envoi.
- Les deux fichiers en `it.fails` ont été joués une fois sans `.fails` sur une copie : les quatre preuves échouent sur leur affirmation, pas sur le décor.

## Preuves par commande (aucun code)

- **L38** : le tri proposait « une fonction commune de l'année scolaire ». Quelle source fait foi (calcul ou table des années) n'est pas tranché, donc pas de test de comportement : la preuve dit seulement que la page Avancement ne calcule plus l'année elle-même.
  `f="src/routes/(protected)/dashboard/teacher/avancement/+page.server.ts"; test -f "$f" && ! grep -q "getMonth() >= 8" "$f"` (sortie 1 aujourd'hui).
- **M25** : revérifié par grep, les seuls appels passent par `apiBase` (`ChapterSectionsEditor.svelte`, `DocumentUpload.svelte`) vers `sections`, `sections/assign`, `sections/reorder`, `sections/[sectionId]`, `documents`, `document-upload-url`. Sans appelant : les 10 chemins de la commande, dont `documents/[docId]` que le tri n'avait pas listé. Non vérifié : un appel venu de l'extérieur.
  `cd src/routes/api && test -d "teacher/chapters/[id]/sections" && for p in student/chapters student/checklist teacher/chapters/+server.ts "teacher/chapters/[id]/+server.ts" "teacher/chapters/[id]/checklist" "teacher/chapters/[id]/documents/[docId]" "teacher/chapters/[id]/exercises" "teacher/chapters/[id]/progress" "teacher/chapters/[id]/reorder" "teacher/chapters/[id]/worksheets"; do test ! -e "$p" || exit 1; done` (sortie 1 aujourd'hui).
