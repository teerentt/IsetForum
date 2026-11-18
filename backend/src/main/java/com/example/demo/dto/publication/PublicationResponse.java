package com.example.demo.dto.publication;

import com.example.demo.model.publication.Publication;
import java.time.LocalDateTime;

public record PublicationResponse(Long id, Long communityId, Long authorId, String authorName,
        String title, String content, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static PublicationResponse from(Publication entity) {
        return new PublicationResponse(entity.getId(), entity.getCommunity().getId(), entity.getAuthor().getId(),
                entity.getAuthor().getName(), entity.getTitle(), entity.getContent(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
