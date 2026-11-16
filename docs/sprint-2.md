# Sprint 2 — Communautés et adhésions

## Démarrage dans IntelliJ

Gardez MySQL démarré dans Laragon, puis redémarrez `DemoApplication` dans IntelliJ. Le profil `dev` ajoute les comptes et les communautés d’exemple. Il s’active avec l’argument de programme `--spring.profiles.active=dev`.

La migration V2 crée les tables `community` et `community_membership`. Elles sont visibles dans phpMyAdmin, dans la base `isetForum`. Les comptes existants sont conservés.

Le frontend Angular n’a pas été modifié : il faudra le raccorder à ces API pour afficher les communautés MySQL.

## Structure conservée

| Couche | Rôle |
| --- | --- |
| `model` | Entités `Community` et `CommunityMembership` |
| `repository` | Lecture et enregistrement avec Spring Data JPA |
| `service` | Règles de création, d’adhésion et de validation |
| `controller` | Routes HTTP des communautés, adhésions et demandes administrateur |
| `dto` | Champs reçus et réponses sans données sensibles des utilisateurs |
| `enums` | Visibilité et statut d’adhésion |

Les services utilisent des méthodes courtes, des boucles et des conditions `if`. Les opérations qui modifient plusieurs lignes utilisent une transaction : la création de la communauté et de l’adhésion de son créateur réussissent ensemble.

## Règles

- Étudiants, enseignants et administrateurs connectés peuvent créer une communauté.
- Le créateur est automatiquement membre actif, même pour une communauté privée.
- Tout le monde peut consulter les noms et descriptions des communautés.
- Une adhésion publique devient immédiatement `ACTIVE`.
- Une adhésion privée commence en `PENDING`. Seul un administrateur peut l’approuver ou la refuser.
- Une demande refusée est supprimée. L’utilisateur peut faire une nouvelle demande.
- Un membre peut quitter une communauté ; un demandeur peut annuler sa demande avec la même route.
- Le créateur conserve son adhésion. Le transfert de propriété et la suppression des communautés ne sont pas inclus.
- Un utilisateur ne peut avoir qu’une adhésion ou demande par communauté, grâce à une contrainte unique en base.
- Le créateur et les administrateurs peuvent modifier le nom, la description et la visibilité.
- En passant une communauté en public, les demandes en attente deviennent actives : la validation n’est plus nécessaire. En passant en privé, les membres actifs restent membres.
- La liste des membres actifs est publique pour une communauté publique. Pour une communauté privée, elle est réservée aux membres actifs et aux administrateurs. Une demande en attente ne donne aucun accès.

Les publications et ressources privées n’existent pas encore dans le backend. Leur accès devra respecter les adhésions lors de leur ajout.

## Routes

Adresse habituelle : `http://localhost:8080`.

| Méthode | Route | Fonctionnement |
| --- | --- | --- |
| GET | `/api/communities` | Liste publique des présentations, publiques et privées |
| GET | `/api/communities/{id}` | Présentation et nombre de membres actifs |
| POST | `/api/communities` | Créer une communauté en étant connecté |
| PUT | `/api/communities/{id}` | Modifier en tant que créateur ou administrateur |
| POST | `/api/communities/{id}/membership` | Rejoindre ou demander une adhésion |
| GET | `/api/communities/{id}/membership` | Consulter sa propre adhésion ou demande |
| DELETE | `/api/communities/{id}/membership` | Quitter ou annuler sa propre demande |
| GET | `/api/memberships/mine` | Retrouver toutes ses adhésions et demandes |
| GET | `/api/communities/{id}/members` | Membres actifs, avec contrôle d’accès privé |
| GET | `/api/admin/membership-requests` | Demandes en attente, administrateur uniquement |
| POST | `/api/admin/membership-requests/{id}/approve` | Accepter une demande |
| POST | `/api/admin/membership-requests/{id}/reject` | Refuser une demande |

`{id}` dans les routes administrateur est l’identifiant de l’adhésion, pas celui de la communauté.

Les écritures nécessitent une session et la protection CSRF déjà utilisée pour l’authentification. Faites `GET /api/auth/csrf`, conservez les cookies, puis envoyez le cookie `XSRF-TOKEN` dans l’en-tête `X-XSRF-TOKEN` pour les requêtes POST, PUT et DELETE. Récupérez un nouveau jeton après connexion. Les identifiants de l’utilisateur et du créateur sont récupérés depuis la session : il ne faut pas les envoyer dans le corps de la demande.

## Exemples JSON

Création ou modification :

```json
{
  "name": "Révision Java",
  "description": "Un espace pour préparer les TP et partager nos questions.",
  "visibility": "PRIVATE"
}
```

`visibility` accepte `PUBLIC` ou `PRIVATE`. Le nom est obligatoire, avec au plus 100 caractères ; la description est obligatoire, avec au plus 1 000 caractères.

Réponse d’une communauté :

```json
{
  "id": 12,
  "name": "Révision Java",
  "description": "Un espace pour préparer les TP et partager nos questions.",
  "visibility": "PRIVATE",
  "creatorId": 2,
  "creatorName": "Pr. Sami Mansour",
  "createdAt": "2026-11-16T15:00:00",
  "memberCount": 1
}
```

Réponse d’une demande :

```json
{
  "id": 25,
  "userId": 3,
  "userName": "Lina Ben Ali",
  "communityId": 12,
  "communityName": "Révision Java",
  "status": "PENDING",
  "requestedAt": "2026-11-16T15:05:00"
}
```

Les identifiants ci-dessus sont illustratifs. Les réponses ne contiennent aucun e-mail ni mot de passe. Les noms techniques restent cohérents avec le backend existant ; tous les messages destinés aux utilisateurs sont en français.

Une absence d’adhésion renvoie `404` ; un doublon ou une tentative de quitter sa propre communauté renvoie `409` ; un accès interdit renvoie `403` ; une connexion manquante renvoie `401`. Les créations renvoient `201`, les modifications et approbations `200`, les départs et refus `204`.

## Vérifications

Tests automatiques, sur une base H2 isolée :

```cmd
mvnw.cmd test
```

Le fichier `CommunityTest` vérifie notamment les permissions, le parcours public et privé, les doublons, les validations françaises, les changements de visibilité et la conservation de l’adhésion du créateur.

Pour vérifier réellement les API et MySQL, démarrez le backend avec le profil `dev`, puis, depuis la racine du projet :

```cmd
node scripts/verify-sprint2.mjs
```

Ce script utilise les trois comptes de développement et crée deux communautés de vérification en français. Il ne supprime ni ne modifie les communautés déjà présentes. Les deux nouvelles communautés restent dans MySQL pour pouvoir les consulter dans phpMyAdmin. Leurs identifiants sont enregistrés dans `target/sprint2-verification.json`.

Après redémarrage de Spring Boot, vérifiez leur persistance sans rien modifier :

```cmd
node scripts/verify-sprint2.mjs --read-only
```

Si le backend utilise un autre port, définissez `ISETFORUM_API_URL`. Le mot de passe des comptes de test peut être fourni avec `DEV_SEED_PASSWORD`.
