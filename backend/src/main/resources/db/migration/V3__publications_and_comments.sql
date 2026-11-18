CREATE TABLE publication (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    community_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    title VARCHAR(160) NOT NULL,
    content VARCHAR(10000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_publication_community FOREIGN KEY (community_id) REFERENCES community(id),
    CONSTRAINT fk_publication_author FOREIGN KEY (author_id) REFERENCES `user`(id),
    INDEX idx_publication_community_date (community_id, created_at, id)
);
CREATE TABLE publication_comment (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    publication_id BIGINT NOT NULL,
    author_id BIGINT NOT NULL,
    content VARCHAR(2000) NOT NULL,
    created_at DATETIME(6) NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    CONSTRAINT fk_comment_publication FOREIGN KEY (publication_id) REFERENCES publication(id),
    CONSTRAINT fk_comment_author FOREIGN KEY (author_id) REFERENCES `user`(id),
    INDEX idx_comment_publication_date (publication_id, created_at, id)
);
