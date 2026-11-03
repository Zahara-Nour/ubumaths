---
status: en cours
---

# Chantier `clavier-mathlive` — fermer le clavier MathLive sur téléphone

## Reprendre ici

_Mis à jour le 2026-11-03, avant la PR._

- **État** : bouton « Fermer le clavier » au-dessus du clavier MathLive + touches de 32 px sous 500 px
  de haut ; tests clients 3/3, `check:incremental` 0, lint rapide propre. PR à ouvrir.
- **Prochaine action** : PR, CI, merge ; puis David essaie sur l'iPhone en paysage (après `deploy:prod`).
- **En attente de David** : essai iPhone réel (Playwright n'émule pas Safari).
- **Pièges en cours** : `blur()` sur un champ MathLive le laisse se croire actif (garde
  `blurInProgress`) → il rouvre le clavier ; vitest tourne en iframe → `initVirtualKeyboardInCurrentBrowsingContext()`.
- **Worktree / branche** : `../ubumaths-wt-clavier-mathlive` · `fix/clavier-mathlive`.

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
