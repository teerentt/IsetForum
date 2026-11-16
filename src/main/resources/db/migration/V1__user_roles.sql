-- Adopt the existing Sprint 0 table without deleting accounts or changing passwords.
CREATE TABLE IF NOT EXISTS `user` (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(255),
    email VARCHAR(255) NOT NULL,
    password VARCHAR(255) NOT NULL,
    role ENUM('ADMIN', 'USER', 'STUDENT', 'PROFESSOR'),
    PRIMARY KEY (id),
    UNIQUE KEY uk_user_email (email)
);

-- Keep existing enum positions and legacy USER values intact.
ALTER TABLE `user` MODIFY COLUMN role ENUM('ADMIN', 'USER', 'STUDENT', 'PROFESSOR') NULL;
