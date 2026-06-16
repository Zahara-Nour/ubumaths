# Analyse d'Impact relative à la Protection des Données (AIPD / DPIA) — UbuMaths

> Document de conformité RGPD (**article 35**). Méthodologie : guides **PIA de la CNIL**
> (description → nécessité & proportionnalité → mesures protectrices des droits → appréciation des
> risques de sécurité → plan d'action → validation).
> Document interne (non publié). Complémentaire du
> [registre des traitements](./registre-traitements.md) et de la
> [politique de confidentialité](<../../src/routes/(public)/legal/confidentialite>).

|                               |                                                                                     |
| ----------------------------- | ----------------------------------------------------------------------------------- |
| **Responsable de traitement** | [À COMPLÉTER — voir registre]                                                       |
| **DPO / référent**            | [À COMPLÉTER — ou « Non désigné »]                                                  |
| **Périmètre de l'AIPD**       | Ensemble de la plateforme UbuMaths (comptes, suivi pédagogique, fonctions sociales) |
| **Date**                      | 15 juin 2026                                                                        |
| **Version**                   | 0.1 (brouillon)                                                                     |

---

## 1. Pourquoi une AIPD est-elle nécessaire ?

Une AIPD est **obligatoire** lorsqu'un traitement est susceptible d'engendrer un **risque élevé**
pour les droits et libertés (art. 35 RGPD). La CNIL/le CEPD retiennent qu'à partir de **2 critères**
parmi 9, l'AIPD est requise. Pour UbuMaths :

| Critère (liste CEPD / CNIL)                        | Applicable ?                                              |
| -------------------------------------------------- | --------------------------------------------------------- |
| Données de **personnes vulnérables** (mineurs)     | ✅ cœur du public (≈ 11–18 ans)                           |
| **Évaluation / scoring** incluant du **profilage** | ✅ niveau de maîtrise, progression, parcours personnalisé |
| Traitement de données **à grande échelle**         | ⚠️ [À CONFIRMER selon le volume d'utilisateurs]           |
| **Croisement** de données                          | ⚠️ pédagogique + social (messagerie, amis)                |

➡️ **Au moins 2 critères réunis (mineurs + profilage) → AIPD obligatoire.**

---

## 2. Description du traitement

### 2.1 Vue d'ensemble

UbuMaths est une plateforme éducative de mathématiques (collège/lycée) offrant : exercices
interactifs, suivi de progression, gamification, **messagerie**, **marketplace/échanges**, **amis**,
intégration **Google Classroom**. Les finalités détaillées figurent dans le
[registre des traitements](./registre-traitements.md) (T1 à T8).

### 2.2 Catégories de données

| Catégorie                  | Exemples                                                 | Sensibilité        |
| -------------------------- | -------------------------------------------------------- | ------------------ |
| Identité                   | prénom, nom, pseudonyme, avatar                          | Données de mineurs |
| Authentification           | email, mot de passe **haché**, identifiants Google OAuth | Élevée (secrets)   |
| Pédagogiques (profilage)   | réponses, scores, niveau de maîtrise, progression        | Données de mineurs |
| Contenus utilisateur (UGC) | messages, échanges marketplace, tableau blanc, notebooks | Modérables         |
| Social                     | liste d'amis, présence                                   | Données de mineurs |
| Gamification               | gidouilles, cartes VIP, achievements                     | Faible             |
| Techniques                 | logs, métriques de performance (sans cookie)             | Pseudonymisées     |

> **Données NON collectées** (minimisation, art. 5.1.c) : genre, date de naissance précise, adresse
> postale, téléphone, données biométriques ou de santé.

### 2.3 Cycle de vie et supports

```
Collecte (navigateur / import enseignant / Google OAuth)
   → Transit chiffré (TLS)
   → Traitement : fonctions Vercel (cdg1 / Paris, UE)
   → Stockage : Supabase PostgreSQL + Auth + Storage + Realtime (eu-west-3 / Paris, UE)
   → Restitution (RLS : chacun ne voit que son périmètre)
   → Conservation (cf. durées) → suppression / anonymisation
```

| Support    | Rôle                                            | Localisation                |
| ---------- | ----------------------------------------------- | --------------------------- |
| Supabase   | BDD, Auth, Storage, Realtime                    | **UE — France (eu-west-3)** |
| Vercel     | Application + fonctions                         | Fonctions **cdg1 / Paris**  |
| Google     | OAuth / Classroom                               | USA (CCT + DPF)             |
| Brevo      | Emails transactionnels                          | France (UE)                 |
| Navigateur | Cookies de session + stockage local fonctionnel | Appareil utilisateur        |

---

## 3. Nécessité et proportionnalité

| Principe                                     | Évaluation                                                      | Statut                          |
| -------------------------------------------- | --------------------------------------------------------------- | ------------------------------- |
| Finalités déterminées, explicites, légitimes | Service éducatif + suivi + social (cf. registre)                | ✅                              |
| Base légale (art. 6)                         | Par traitement — [À CONFIRMER dans le registre]                 | ⚠️                              |
| Minimisation (art. 5.1.c)                    | Données non nécessaires exclues                                 | ✅                              |
| Exactitude / qualité                         | Modification possible par l'utilisateur                         | ✅                              |
| Durées de conservation                       | Profil scolarité+5 ans, pédago 5 ans, messages 3 ans, logs 90 j | ✅ (cf. registre — [à valider]) |
| Information des personnes (art. 12-14)       | Politique de confidentialité                                    | ✅                              |

---

## 4. Mesures protectrices des droits des personnes

| Droit / mesure                       | Mise en œuvre                                                                                                                                              | Statut                                |
| ------------------------------------ | ---------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------- |
| Information                          | Politique de confidentialité accessible                                                                                                                    | ✅                                    |
| **Consentement parental (< 15 ans)** | Système Art. 8 **implémenté** : table `parental_consents`, détection auto (grades 6→2), mode lecture seule, dashboard enseignant, email Brevo, audit IP/UA | ✅ — ⏰ grâce jusqu'au **2026-06-30** |
| Accès, rectification, **effacement** | `/api/account/delete` (RPC `delete_user_account`, table d'audit, rate-limit 1/24h) **implémenté**                                                          | ✅                                    |
| **Portabilité**                      | Endpoint `/api/account/export` (JSON) **implémenté + corrigé** (2026-06-15, README §3)                                                                     | ✅                                    |
| Opposition / retrait                 | contact@ubumaths.fr                                                                                                                                        | ✅                                    |
| Sous-traitance (art. 28)             | DPA Supabase / Vercel / Google / Brevo                                                                                                                     | 🟠 **copies signées à archiver**      |
| Transferts hors UE                   | Google & Vercel via **CCT** (+ DPF Google)                                                                                                                 | ✅ documenté                          |

---

## 5. Mesures de sécurité (existantes / prévues)

- **Chiffrement** au repos et en transit (TLS).
- **Contrôle d'accès** : Row Level Security (RLS) sur toutes les tables ; séparation des rôles ;
  clés de service (`sb_secret_*`) côté serveur uniquement.
- **Authentification** : mots de passe hachés, OAuth, cookies de session `httpOnly`/`secure`/`sameSite`,
  protection CSRF par validation d'origine.
- **Validation des entrées** : schémas Zod côté serveur sur toutes les API.
- **UGC** : assainissement HTML (DOMPurify), filtre de langage (`bad-words`), modération
  enseignant sur la messagerie.
- **Secrets** : variables d'environnement Vercel ; **rotation effectuée le 15 juin 2026**.
- **Sauvegardes** : sauvegardes automatiques Supabase.
- **Journalisation** : logs d'accès / audit.
- 🟠 **Prévu** : mécanisme de **signalement de contenu illicite** (volet DSA) ; procédure de
  **notification de violation** (CNIL < 72 h).

---

## 6. Appréciation des risques de sécurité

Échelle CNIL — **gravité** et **vraisemblance** : _négligeable · limitée · importante · maximale_.
Les niveaux ci-dessous sont une **première estimation à valider**.

### Risque 1 — Accès illégitime aux données

|                        |                                                                                            |
| ---------------------- | ------------------------------------------------------------------------------------------ |
| **Impacts**            | Exposition de données de mineurs (identité, messages, progression) ; usurpation de compte. |
| **Sources de risques** | Attaquant externe, utilisateur malveillant, sous-traitant, fuite de secret.                |
| **Menaces**            | Vol de jeton/mot de passe, faille RLS, clé API exposée, injection.                         |
| **Mesures**            | Hachage, RLS, chiffrement, CSRF, Zod, rotation des clés, secrets serveur.                  |
| **Gravité**            | Importante [à valider]                                                                     |
| **Vraisemblance**      | Limitée [à valider]                                                                        |

### Risque 2 — Modification non désirée des données

|                        |                                                                                          |
| ---------------------- | ---------------------------------------------------------------------------------------- |
| **Impacts**            | Altération de résultats/progression, falsification de messages, élévation de privilèges. |
| **Sources de risques** | Utilisateur malveillant, bug applicatif, attaquant.                                      |
| **Menaces**            | Contournement de RLS, requête forgée, absence de validation.                             |
| **Mesures**            | RLS, validation Zod, contrôles serveur, journalisation, sauvegardes.                     |
| **Gravité**            | Limitée [à valider]                                                                      |
| **Vraisemblance**      | Limitée [à valider]                                                                      |

### Risque 3 — Disparition de données

|                        |                                                                             |
| ---------------------- | --------------------------------------------------------------------------- |
| **Impacts**            | Perte de progression, de comptes, de contenus ; indisponibilité du service. |
| **Sources de risques** | Panne d'un sous-traitant, suppression accidentelle, incident.               |
| **Menaces**            | Défaillance Supabase/Vercel, erreur de migration, ransomware.               |
| **Mesures**            | Sauvegardes automatiques, hébergement géré, migrations versionnées.         |
| **Gravité**            | Limitée [à valider]                                                         |
| **Vraisemblance**      | Limitée [à valider]                                                         |

---

## 7. Risque spécifique — Protection des mineurs

Les fonctions **sociales** (messagerie, marketplace, amis) entre mineurs créent un risque propre,
au-delà de la sécurité technique :

|                         |                                                                                                                                                                                                                                                      |
| ----------------------- | ---------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Impacts**             | Contact inapproprié, harcèlement, divulgation d'informations personnelles, exposition à un contenu illicite.                                                                                                                                         |
| **Mesures existantes**  | **Consentement parental Art. 8 implémenté** (mode lecture seule sans accord) ; filtre de langage (`bad-words`) ; accès enseignant aux messages de ses élèves ; pas de publicité ni de profilage commercial ; minimisation (champ `gender` supprimé). |
| **Mesures à renforcer** | 🔴 **Mécanisme de signalement** (DSA) ; cloisonnement des échanges (élève ↔ classe/amis validés ?) ; décider la suite après expiration de la **grâce 2026-06-30**.                                                                                  |
| **Gravité**             | Importante [à valider]                                                                                                                                                                                                                               |
| **Vraisemblance**       | [À ÉVALUER selon l'ouverture réelle des échanges]                                                                                                                                                                                                    |

---

## 8. Plan d'action

| #   | Mesure                                                                                                                                  | Priorité      | Responsable   | Échéance      | Statut              |
| --- | --------------------------------------------------------------------------------------------------------------------------------------- | ------------- | ------------- | ------------- | ------------------- |
| 1   | 🔴 **Rétention pédagogique** : réintégrer `exercise_completions`/`student_exercise_mastery` au cron (ou ajuster la politique « 5 ans ») | 🔴 Haute      | [À COMPLÉTER] | [À COMPLÉTER] | À faire (README §1) |
| 2   | ~~Export Art. 20 cassé~~ ✅ **Corrigé** : `/api/account/export` repointé + test de non-régression                                       | ✔️ Fait       | —             | 2026-06-15    | Fait (README §3)    |
| 3   | **Compléter le registre sous-traitants** : HuggingFace + Groq (CCT / zero-retention)                                                    | 🟠 Moyenne    |               |               | À faire (README §7) |
| 4   | Ajouter un **mécanisme de signalement** de contenu/message (DSA)                                                                        | 🟠 Moyenne    |               |               | À faire             |
| 5   | **Archiver les DPA signés** (Supabase/Vercel/Google/Brevo)                                                                              | 🟠 Moyenne    |               |               | À faire             |
| 6   | Rédiger la **procédure de violation de données** (notification 72 h)                                                                    | 🟠 Moyenne    |               |               | À faire             |
| 7   | Décider la suite de la **période de grâce consentement** (échéance 2026-06-30)                                                          | ⏰ Calendaire |               |               | À arbitrer          |
| 8   | Confirmer les **bases légales** par traitement + `[A COMPLÉTER]` mentions légales                                                       | 🟠 Moyenne    |               |               | À faire             |
| 9   | Trancher **conservation logs** (30 j vs identification 1 an LCEN)                                                                       | 🟡 Basse      |               |               | À arbitrer          |

---

## 9. Validation

|                                           |                                                                           |
| ----------------------------------------- | ------------------------------------------------------------------------- |
| **Avis du DPO**                           | [À COMPLÉTER — ou « Non désigné »]                                        |
| **Point de vue des personnes concernées** | [À COMPLÉTER — recueilli ? ou justification de non-recueil]               |
| **Décision du responsable de traitement** | ☐ Traitement validé · ☐ Validé sous réserve du plan d'action · ☐ À revoir |
| **Date / signature**                      | [À COMPLÉTER]                                                             |

> 🔁 **Réviser l'AIPD** à chaque évolution significative (nouvelle fonctionnalité, nouveau
> sous-traitant, incident, changement de finalité), et au minimum tous les 3 ans.

---

## 10. Historique des révisions

| Date         | Version | Modification                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                |
| ------------ | ------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 16 juin 2026 | 0.3     | Modèle **mono-professeur** (refactor _single-teacher_) : le compte enseignant unique a désormais accès en **lecture à toutes les données élèves** — y compris sensibles (`parental_consents`, `audit_logs`, emails de bienvenue) — **indépendamment de l'inscription en classe** (la classe n'est plus une frontière d'accès côté enseignant ; helper RLS `is_my_student`). **Justification** : éducateur unique = responsable opérationnel de **tous** les élèves de la plateforme, accès déjà détenu via le rôle admin ; aucun 2ᵉ enseignant à cloisonner (trigger `enforce_single_teacher`). La minimisation par périmètre demeure **entre élèves** (frontière = **école**, art. 5.1.c). |
| 15 juin 2026 | 0.2     | Confrontation au code : consentement parental confirmé **implémenté** (Art. 8) ; ajout des trous rétention pédago + export Art. 20 (cf. README §1/§3).                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                      |
| 15 juin 2026 | 0.1     | Création du brouillon. Hébergement UE/France (eu-west-3) intégré.                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                                           |
