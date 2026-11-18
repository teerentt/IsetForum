ALTER TABLE `user` ADD COLUMN confirmed BOOLEAN NOT NULL DEFAULT TRUE;
CREATE TABLE registration_authorization (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    email VARCHAR(254) NOT NULL,
    role ENUM('STUDENT', 'PROFESSOR') NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_registration_email UNIQUE(email)
);
CREATE TABLE email_verification_token (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    user_id BIGINT NOT NULL,
    token_hash VARCHAR(64) NOT NULL,
    expires_at DATETIME(6) NOT NULL,
    sent_at DATETIME(6) NOT NULL,
    CONSTRAINT uk_verification_user UNIQUE(user_id),
    CONSTRAINT uk_verification_hash UNIQUE(token_hash),
    CONSTRAINT fk_verification_user FOREIGN KEY(user_id) REFERENCES `user`(id) ON DELETE CASCADE
);
