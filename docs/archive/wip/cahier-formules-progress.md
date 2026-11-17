# Chantier cahier-formules

## Reprendre ici

_Mis à jour le 2026-11-09, après #2505._

- **État** : clos. Question des images externes tranchée (« oui ») et livrée par #2505
  ([journal](cahier-images-externes-progress.md)) · pas encore en prod (`deploy:prod` sur
  demande de David) · **Worktree / branche** : supprimés

## Décision (David, 2026-11-08)

« Oui, même traitement pour le lien public » : comme les vidéos (2026-11-06), les formules du
cahier qui feraient charger une adresse choisie chez un lecteur anonyme ne passent pas par MathLive.

## Fait

- Contexte `projectMediaOnly` (posé par `JournalContent` : page élève ET lien public, comme pour
  les vidéos) :
  - `MathInline` / `MathBlock` : formule avec une commande de `UNSAFE_MATH_COMMANDS`
    (`hasUnsafeMathCommand`) → texte `code.restricted-math`. Sans les bornes de longueur du chat :
    l'auteur est de confiance, seul le chargement d'adresse compte.
  - `MarkdownRenderer` → `neutralizeUnsafeBlocks` : bloc spécial dont une chaîne porte une telle
    commande → bloc de code « [bloc non affiché : mise en forme non autorisée] ».
- Conséquence : `\color`, `\hspace`, `\kern`… (dans la liste, car leur valeur finit dans `style=`)
  sont aussi refusés au cahier. Prod au 2026-11-09 : aucune formule ni image au cahier (4 lignes).
- Revues : `code-reviewer` et `security-auditor` ont trouvé `MathPrompt` (formule à case
  `\placeholder[0]{}`) sans garde au cahier → garde ajoutée, test rouge puis vert. Faux positif
  assumé : un bloc spécial dont un libellé CITE `\color` est aussi remplacé.
- Tests : `JournalContent` (en ligne, centrée : rouges sans le correctif ; ordinaire rendue),
  `restricted-rendering.test.ts` (`neutralizeUnsafeBlocks`).
- Docs : `ubumark.md`, `cours-et-chapitres.md`, `editeur-riche.md`.

## Cas voisin, non traité (question à David)

Les images du cahier ne sont pas limitées au stockage du projet : une image externe fait aussi
charger une adresse chez le lecteur anonyme. Le chat les limite déjà (`isProjectStorageImage`).
