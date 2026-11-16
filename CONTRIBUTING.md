# Contribuer à IsetForum

## Préparer son environnement

Suivez les étapes du [README](README.md). Gardez les paramètres de connexion locaux hors du dépôt et utilisez le profil `dev` pour les données de démonstration.

## Règles du projet

- Écrire les textes visibles et les messages d’erreur en français.
- Garder les couches `controller`, `service`, `repository`, `model` et `dto`.
- Préférer des méthodes courtes et des conditions explicites.
- Créer un DTO pour les entrées/sorties API ; ne pas exposer un mot de passe ou son hachage.
- Déduire l’identité depuis la session, jamais depuis un rôle envoyé par le navigateur.
- Ajouter une nouvelle migration Flyway pour faire évoluer la base.
- Conserver un fichier HTML, un fichier TypeScript et un fichier CSS par composant Angular.
- Utiliser les variables du thème pour les couleurs et vérifier les deux thèmes.

## Vérifier une modification

```cmd
mvnw.cmd test
cd frontend
npm test
npm run build
```

Les tests navigateur sont utiles pour les changements d’interface. Ils nécessitent le backend avec le profil `dev` et Microsoft Edge installé. Les tests sur MySQL créent des données de vérification ; voir [Sprint 2](docs/sprint-2.md).

## Commits

Regrouper les modifications par objectif. Exemples :

```text
feat(backend): add publication creation
feat(frontend): display community memberships
fix(auth): handle expired sessions
refactor(backend): simplify membership validation
docs: update installation instructions
```

Ne pas ajouter `node_modules`, `target`, `dist`, les fichiers `.env`, les identifiants personnels ou les configurations privées d’IntelliJ.
