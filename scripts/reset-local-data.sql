-- Réinitialisation explicite des données de développement IsetForum.
-- À exécuter uniquement après arrêt du backend, sur demande de l’utilisateur.
-- La structure et flyway_schema_history sont conservées.
USE isetforum;
START TRANSACTION;
DELETE FROM pdf_attachment;
DELETE FROM publication_comment;
DELETE FROM publication;
DELETE FROM community_membership;
DELETE FROM community;
DELETE FROM email_verification_token;
DELETE FROM registration_authorization;
DELETE FROM `user`;
COMMIT;
