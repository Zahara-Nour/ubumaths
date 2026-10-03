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
