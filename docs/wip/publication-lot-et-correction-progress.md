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

## Chantiers

- [~] `feat/publication-par-lot` — worktree `../ubumaths-wt-publication-lot`
  - Endpoint `POST /api/questions/templates/bulk-status` (`{ ids ≤ 700, status }`, admin) :
    `checkTemplate` par modèle, collisions (publiés + dans la sélection, les deux refusés),
    écriture vérifiée par `.update().select()`. Logique : `src/lib/server/questions-bulk-status.ts`.
  - Piège trouvé par le test (ligne de forme réelle) : `toQuestionTemplate` porte
    `created_at/updated_at/created_by`, que le schéma strict refuse → tous les modèles auraient
    été refusés. Retirés avant le contrôle.
  - UI : cases à cocher + filtres niveau/thème + « Publier la sélection (N) » ; publiés :
    « Repasser en brouillon (N) » avec confirmation. Appels par paquets de 50 (délai des fonctions).
  - Reste : essai manuel sur la page (5175), code-reviewer, security-auditor, PR.
- [ ] `fix/defauts-correction` — worktree `../ubumaths-wt-defauts-correction`
