package com.example.demo.service.publication;

import com.example.demo.dto.publication.*;
import com.example.demo.model.publication.Comment;
import com.example.demo.repository.publication.CommentRepository;
import com.example.demo.service.community.CommunityAccessService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service @RequiredArgsConstructor @Transactional
public class CommentService {
    private final CommentRepository comments;
    private final PublicationService publications;
    private final CommunityAccessService access;
    @Transactional(readOnly = true)
    public List<CommentResponse> list(Long publicationId, String email) {
        publications.readable(publicationId, email);
        List<CommentResponse> result = new ArrayList<>();
        for (Comment comment : comments.findByPublicationIdOrderByCreatedAtAscIdAsc(publicationId)) result.add(CommentResponse.from(comment));
        return result;
    }
    public CommentResponse create(Long publicationId, CommentRequest request, String email) {
        var post = publications.readable(publicationId, email);
        var author = access.requireMember(post.getCommunity(), email);
        Comment comment = new Comment();
        comment.setPublication(post); comment.setAuthor(author); comment.setContent(request.getContent());
        comment.setCreatedAt(LocalDateTime.now()); comment.setUpdatedAt(comment.getCreatedAt());
        return CommentResponse.from(comments.save(comment));
    }
    public CommentResponse update(Long id, CommentRequest request, String email) {
        Comment comment = get(id);
        access.requireAuthor(comment.getPublication().getCommunity(), comment.getAuthor().getId(), email, false);
        comment.setContent(request.getContent()); comment.setUpdatedAt(LocalDateTime.now());
        return CommentResponse.from(comments.save(comment));
    }
    public void delete(Long id, String email) {
        Comment comment = get(id);
        access.requireAuthor(comment.getPublication().getCommunity(), comment.getAuthor().getId(), email, true);
        comments.delete(comment);
    }
    private Comment get(Long id) {
        return comments.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Commentaire introuvable."));
    }
}
