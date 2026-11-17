---
status: en cours
---

# Chantier `clavier-mathlive` — fermer le clavier MathLive sur téléphone

## Reprendre ici

_Mis à jour le 2026-11-03, après #2353._

- **État** : #2353 mergée (CI verte) : bouton « Fermer le clavier » au-dessus du clavier MathLive,
  touches de 32 px sous 500 px de haut ; 5 tests (faux clavier), preuves rouges des deux correctifs.
- **Prochaine action** : essai iPhone en paysage après le prochain `deploy:prod` (noté dans
  `verifications-manuelles.md`) ; puis archiver ce journal (le durable est dans `docs/systeme/questions.md`).
- **En attente de David** : `deploy:prod`, puis l'essai iPhone.
- **Pièges en cours** : `blur()` sur un champ MathLive le laisse se croire actif → il rouvre le clavier ;
  ne jamais monter le vrai clavier dans un test client (`initVirtualKeyboardInCurrentBrowsingContext`
  s'accroche à `window.top` et a fait tomber le navigateur de la CI).
- **Worktree / branche** : aucun (retiré après #2353).

---

## Origine (2026-11-03)

Essais iPhone du chantier `tableau-signes` : David ne trouvait pas comment fermer le clavier après
avoir tapé une valeur de x ; en paysage, le clavier prenait tout l'écran. Vérifié dans MathLive
0.111 : la touche `[hide-keyboard]` n'existe que dans les claviers « compact » et « minimalist »,
pas dans le clavier par défaut qu'utilise le site. David valide les deux correctifs.

## Correctifs

- **Bouton au-dessus du clavier** plutôt qu'une touche dans le clavier : la dernière rangée diffère
  d'un onglet à l'autre (123, symboles, abc azerty, grec) ; une touche de plus l'élargirait et la
  ferait déborder à 390 px. `MathKeyboardClose.svelte`, monté dans `src/routes/+layout.svelte`,
  suit `virtual-keyboard-toggle` et `geometrychange`.
- **Fermeture** : `blur()` sur le champ échouait (mesuré, Playwright, émulation tactile 844×340) :
  la garde `blurInProgress` de MathLive saute `onBlur`, le champ garde `blurred = false`, et à la
  fermeture (`virtual-keyboard-toggle`) il reprend le focus → le clavier se rouvre 300 ms plus tard.
  `hide()` seul : même boucle. Le bouton se donne le focus (`focus()` explicite : sur iOS un
  toucher ne le fait pas) → vrai déplacement du focus → MathLive ferme le clavier.
  Mesuré : fermé, focus sur `BODY`, bouton disparu ; un toucher sur le champ le rouvre.
- **Hauteur** : `@media (max-height: 500px)` → `--keycap-height: 32px`, `--keyboard-padding-top: 2px`.
  Paysage 844×340 : 242 → 202 px. Portrait 390×664 : inchangé (218 px).
- **Tests** : `MathKeyboardClose.svelte.test.ts` (3, vrai MathLive). Preuve rouge **non obtenue**
  dans vitest : sans émulation tactile, `blur()` ne reproduit pas la boucle (essayé : `field.focus()`,
  `userEvent.click`, clic programmatique). La preuve est la reproduction Playwright ci-dessus.
- Vu en passant (pas traité) : en paysage, le champ tapé peut rester caché sous le clavier
  (MathLive ne le fait pas remonter) ; à juger à l'essai iPhone.
- Revue `code-reviewer` (Sonnet) : rien de bloquant. Intégré : drapeau `closing` (le bouton pouvait
  réapparaître pendant les 300 ms de fermeture, sur un `geometrychange`) ; remis à zéro quand un
  champ MathLive reprend le focus. Mesuré : bouton masqué pendant toute la fermeture, de retour à
  la réouverture. Fichier ajouté au `couvre:` de `docs/systeme/questions.md` (garde du pre-push).
- **CI de #2353 rouge** : Lint (garde doc : `coquille-et-caches.md`, `css-color-tokens.md`) et Client
  Tests shard 2 (« Browser connection was closed » sur `aide-ecriture/cercle-trigo`, 14 s après mon
  test). Cause probable : `initVirtualKeyboardInCurrentBrowsingContext()` accroche un écouteur
  `message` à `window.top`, partagé par tout le shard, qui survit à l'iframe du test. Test réécrit avec
  un **faux clavier** (5 tests) ; preuves rouges : sans `closing` → « reste caché pendant la fermeture »
  rouge ; avec l'ancien `blur()` → « prend le focus au clic » rouge.
- **#2353 mergée** (CI verte, 14 checks), le 2026-11-03. Worktree et branche retirés.
