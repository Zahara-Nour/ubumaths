# Publication par lot + défauts de correction — progression

Suite de l'analyse du système de questions (2026-09-29). Déjà livré : aperçu admin réparé (#513),
corpus relu rejoué en CI (#514), 2 modèles d'essai « Mon thème » supprimés en prod (640 modèles, tous
brouillons).

## Décisions de David (2026-09-29)

1. **Publication par lot — contrôle complet** : avant de publier, le serveur repasse chaque modèle
   dans `checkTemplate` (structure, schéma strict, specs vertes, une spec « correct » par variation,
   50 tirages par variation). Un modèle qui échoue reste en brouillon, raison affichée.
   Proposition validée : onglet Brouillons avec cases à cocher + filtres (niveau scolaire, thème) +
   « Publier la sélection » ; « Repasser en brouillon » en lot côté publiés ; collision de catégorie =
   refus (pas de décalage automatique du niveau).
2. **Arrondi** (`precision` decimal / significant) : plus de décimales que demandé = faux, message
   « Arrondis au … » ; moins de décimales accepté si la valeur est exacte (3,1 pour 3,10).
3. **Réponses texte** : casse et accents ignorés ; 1 lettre d'écart tolérée seulement pour les mots
   d'au moins 5 lettres.
4. **QCM faux** : on garde « Le choix correct est : B ».

Corrigés sans décision (bugs) : messages de règles en anglais → français ; `2{,}5` / `12\,000` /
`\frac{12}{2}` refusés par les règles (NaN) ; appariement glouton de `orderIndependent` ; précision
ignorée sur les grandeurs ; tolérance numérique absolue 1e-10 ; `e` contre `\exponentialE` (à prouver
d'abord par un test).

## Chantiers — TERMINÉS (2026-09-29)

- [x] **#518 publication par lot** — `POST /api/questions/templates/bulk-status` (admin, Zod 1-100 ids),
      `checkTemplate` par modèle, collisions refusées (publiés + dans la sélection, rivaux jamais séparés
      entre paquets de 50), écriture vérifiée par `.select()`. UI : onglets Brouillons / Publiés de
      `/dashboard/admin/questions`. Essai à blanc sur les 640 lignes de prod : 640 publiables, 5,7 s.
      Piège : `toQuestionTemplate` porte `created_at/updated_at/created_by`, refusés par le schéma strict.
      Non fait : essai manuel de la page, `svelte-autofixer` (MCP absent).
- [x] **#517 défauts de correction** — les 8 défauts, plus 3 points de relecture : bruit de saisie
      toléré en case texte (`3cm`, `oui.`, `1.5`), message d'arrondi pour une autre unité trop précise,
      tolérance `numbersAreClose` relative 1e-12 / plancher 1e-14 (écriture scientifique distinguée).
      Restent ouverts : virgule nue `3,14` refusée par `isSimpleNumberLatex` (antérieur) ; conversion avec
      décalage (°C → K) ne garde pas l'arrondi ; `docs/ref/convention-equivalence.md` ne parle ni de `e`
      ni de la tolérance.
