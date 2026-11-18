CREATE TABLE pdf_attachment (
    id BIGINT NOT NULL AUTO_INCREMENT PRIMARY KEY,
    community_id BIGINT NULL,
    publication_id BIGINT NULL,
    filename VARCHAR(180) NOT NULL,
    size BIGINT NOT NULL,
    updated_at DATETIME(6) NOT NULL,
    content LONGBLOB NOT NULL,
    CONSTRAINT uk_pdf_community UNIQUE(community_id),
    CONSTRAINT uk_pdf_publication UNIQUE(publication_id),
    CONSTRAINT ck_pdf_parent CHECK ((community_id IS NOT NULL AND publication_id IS NULL) OR (community_id IS NULL AND publication_id IS NOT NULL)),
    CONSTRAINT fk_pdf_community FOREIGN KEY(community_id) REFERENCES community(id) ON DELETE CASCADE,
    CONSTRAINT fk_pdf_publication FOREIGN KEY(publication_id) REFERENCES publication(id) ON DELETE CASCADE
);
