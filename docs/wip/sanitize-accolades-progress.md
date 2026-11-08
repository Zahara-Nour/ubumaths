# Chantier sanitize-accolades

## Reprendre ici

_Mis à jour le 2026-11-08, avant la PR._

- **État** : code et tests verts, PR à ouvrir · **Prochaine action** : PR, revues `code-reviewer` + `security-auditor`, CI, merge · **En attente de David** : rien · **Pièges en cours** : aucun · **Worktree / branche** : `../ubumaths-wt-sanitize-accolades`, `fix/sanitize-accolades`

## Origine et décisions (David, 2026-11-08)

Suite de `demo-cahier-ubumark` (#2481). Recommandations suivies par David (« je te suis ») :

1. Retirer le code sans appelant : `transformMathHtml`, `sanitizeHtmlWithMath` (+ `CONFIG_AVEC_MATH`),
   `linkifyResourceReferences` (`src/lib/resources/linkify.ts`) et leurs tests.
2. Retirer `SAFE_FOR_TEMPLATES` de `sanitizeHtml` et de `NOTIFICATION_SANITIZE_CONFIG` : il efface
   tout de `{{` au dernier `}}` et ne protège que d'un moteur de gabarits relisant le HTML dans le
   navigateur (Angular, Vue). Une seule PR, `security-auditor`.

## Vérifié avant de coder

- Notifications : assainies au serveur (`notifications.ts`, écriture et lecture), affichées par
  `{@html sanitizeNotificationHtml(…)}` dans `/dashboard/notifications` (Svelte). Aucun envoi
  de mail. Aucun moteur de gabarits client dans `package.json`.
- Aucun test n'exigeait l'effacement des accolades.
- Prod : 0 modèle de message, 0 notification sur 5 avec `{{`, `}}` ou `${`.

## Fait

- Tests rouges d'abord : `describeTextesAccolades` (`sanitize-attack-vectors.ts`), branché dans
  `sanitize-attaques.test.ts` (sanitizeHtml, notifications client et serveur) et `.svelte.test.ts`
  (9 et 6 rouges avant, verts après). Suite d'attaque inchangée et verte.
- `math-field` reste dans `ALLOWED_TAGS` de `sanitizeHtml` : l'écart « deux points faibles » de
  `editeur-riche.md` vaut toujours.
- Docs : `editeur-riche.md` (tableau, écarts), `ubumark.md` (linkify).
