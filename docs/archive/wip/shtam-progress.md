# Le Shtam — progression

Gazette parodique du Royaume (Compendium §IX « Le Shtam »). Branche `feat/shtam`, worktree `ubumaths-wt-shtam`.

## Décisions de David (2026-10-05)

- Nom « Le Shtam » (exception assumée à la règle « Mathres ») ; 6ᵉ voix, la Rédaction ; vrai du faux obligatoire (voix Académie).
- Personnes vivantes et institutions réelles : jamais. Rien du Collège.
- Articles = fichiers du dépôt ; page publique en lecture seule, ni commentaires ni réactions.
- Formules en ubumark. Lien vers un article tiré au hasard sur l'accueil, le moins intrusif possible.
- Cinq premiers articles rédigés par Claude, relus par David dans la PR.

## Fait

- [x] `src/lib/server/shtam/` : lecture + validation Zod, publication (brouillon, date future), tirage, présentation.
- [x] 5 articles ; `pnpm check:ubumark src/lib/server/shtam/articles` = 39 formules, 0 problème.
- [x] `load` de `/shtam`, `/shtam/[slug]`, accueil (tirage serveur).
- [x] Pages Svelte (une, article) + lien discret de l’accueil + tests navigateur ; captures vérifiées (bureau, 390 px).
- [x] code-reviewer : 0 bloquant ; I1 (accueil robuste) et I2 (pas de formule dans le titre) corrigés, + « # » et « : » du YAML, CRLF, 404 indistinctes.
