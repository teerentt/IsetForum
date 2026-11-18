package com.example.demo.repository.publication;

import com.example.demo.model.publication.Comment;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommentRepository extends JpaRepository<Comment, Long> {
    List<Comment> findByPublicationIdOrderByCreatedAtAscIdAsc(Long publicationId);
    void deleteByPublicationId(Long publicationId);
    void deleteByPublicationCommunityId(Long communityId);
}
