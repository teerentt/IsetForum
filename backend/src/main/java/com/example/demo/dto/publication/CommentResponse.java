package com.example.demo.dto.publication;

import com.example.demo.model.publication.Comment;
import java.time.LocalDateTime;

public record CommentResponse(Long id, Long publicationId, Long authorId, String authorName,
        String content, LocalDateTime createdAt, LocalDateTime updatedAt) {
    public static CommentResponse from(Comment entity) {
        return new CommentResponse(entity.getId(), entity.getPublication().getId(), entity.getAuthor().getId(),
                entity.getAuthor().getName(), entity.getContent(), entity.getCreatedAt(), entity.getUpdatedAt());
    }
}
