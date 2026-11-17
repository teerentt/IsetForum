-- Communautés : la présentation reste visible même pour une communauté privée.
CREATE TABLE community (
    id BIGINT NOT NULL AUTO_INCREMENT,
    name VARCHAR(100) NOT NULL,
    description VARCHAR(1000) NOT NULL,
    visibility ENUM('PUBLIC', 'PRIVATE') NOT NULL,
    creator_id BIGINT NOT NULL,
    created_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT fk_community_creator FOREIGN KEY (creator_id) REFERENCES `user` (id)
);

-- Une seule adhésion ou demande par utilisateur et par communauté.
CREATE TABLE community_membership (
    id BIGINT NOT NULL AUTO_INCREMENT,
    user_id BIGINT NOT NULL,
    community_id BIGINT NOT NULL,
    status ENUM('PENDING', 'ACTIVE') NOT NULL,
    requested_at DATETIME(6) NOT NULL,
    PRIMARY KEY (id),
    CONSTRAINT uk_membership_user_community UNIQUE (user_id, community_id),
    CONSTRAINT fk_membership_user FOREIGN KEY (user_id) REFERENCES `user` (id),
    CONSTRAINT fk_membership_community FOREIGN KEY (community_id) REFERENCES community (id),
    INDEX idx_membership_status (status),
    INDEX idx_membership_community_status (community_id, status)
);
