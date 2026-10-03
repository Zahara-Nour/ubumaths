# Chat — rendu restreint (S1) — progression

Branche `fix/chat-rendu-restreint`, worktree `ubumaths-wt-chat-restreint`.

Origine : audit `security-auditor` du 2026-10-03 (H2, H3) — un élève faisait
charger à chaque lecteur du chat une URL de son choix (image, vidéo, formule
`\htmlStyle`, bloc ubumark recopié depuis un bloc de code).

Décision S1 de David : le chat est rendu en mode restreint (prop `restricted`
de `MarkdownRenderer`, contexte `restricted-rendering.ts`, hérité et jamais
relâché par un rendu imbriqué). Mode normal inchangé.

## Fait

- [x] Tests d'abord, vus rouges (14/19) : `markdown/__tests__/chat-restreint.svelte.test.ts`
- [x] `restricted-rendering.ts` : contexte, formules, images, langues de bloc, filet AST
- [x] Gardes : `ImageDisplay`, `VideoDisplay`, `MathInline`, `MathBlock`, `MathPrompt`
- [x] `ChatMessageList` passe `restricted`

## Reste ouvert (hors de ce lot)

- `RichTextDisplay` (pages `/messages`) rend le JSON TipTap avec l'éditeur
  complet : même famille de risques, autre chemin (non traité).
- `TutorChat` / `ChatBot` : non restreints (contenu de l'élève pour lui-même et
  réponses de l'IA) — à trancher.

## Audit du 2026-10-03 (2e passage) et extension

- **Contournement prouvé puis corrigé** : `\color`, `\textcolor`, `\colorbox`, `\fcolorbox` (MathLive
  recopie une couleur non reconnue telle quelle dans `style=`). Toutes les commandes MathLive à argument
  libre (`:value` / `:string`, 39) sont désormais classées : bloquées (couleurs, polices, dimensions,
  `\the`…) ou examinées sûres (accents, `\char`, `\unicode`, `\cfrac`, `\smash`). Garde :
  `mathlive-commandes-a-valeur.test.ts` échoue si MathLive en ajoute une non classée.
- **Extension validée par David** (même fuite, prouvée) : `RestrictedRichText` (JSON TipTap → markdown
  restreint ; HTML ancien → texte inerte) remplace `RichTextDisplay` pour le contenu ÉCRIT PAR UN ÉLÈVE :
  messagerie (`messages/[id]`, `messages/thread/[id]`), descriptions des signalements de fiches (5
  composants/pages). Cartes kanban : `MarkdownRenderer restricted`. Les RÉPONSES du prof restent en
  affichage complet.
- Preuve rouge : les mêmes tests contre `RichTextDisplay` → 4 échecs (image, vidéo, `\htmlStyle`,
  `textStyle`).
- Décisions David : titres, tableaux, séparateurs restent affichés ; `TutorChat` non restreint.

## Reste à vérifier (hors PR)

- Tableau blanc partagé (`whiteboard/components/TextBlock.svelte:328`), cartes SRS perso
  (`srs/CustomFlashCard.svelte`), carnets lus par le prof (`notebook/MarkdownCell.svelte`) : lus par un
  autre que leur auteur ?
- S3 : canal Realtime du chat public, expéditeur diffusé non vérifié.
