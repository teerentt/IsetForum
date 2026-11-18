package com.example.demo.service.publication;

import com.example.demo.dto.publication.*;
import com.example.demo.model.publication.Publication;
import com.example.demo.repository.publication.*;
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
public class PublicationService {
    private final PublicationRepository publications;
    private final CommentRepository comments;
    private final CommunityAccessService access;
    @Transactional(readOnly = true)
    public List<PublicationResponse> feed(String email) {
        List<PublicationResponse> result = new ArrayList<>();
        for (Publication post : publications.findAllByOrderByCreatedAtDescIdDesc()) {
            if (access.canRead(post.getCommunity(), email)) result.add(PublicationResponse.from(post));
        }
        return result;
    }
    @Transactional(readOnly = true)
    public List<PublicationResponse> list(Long communityId, String email) {
        access.requireRead(access.community(communityId), email);
        List<PublicationResponse> result = new ArrayList<>();
        for (Publication post : publications.findByCommunityIdOrderByCreatedAtDescIdDesc(communityId)) result.add(PublicationResponse.from(post));
        return result;
    }
    @Transactional(readOnly = true)
    public PublicationResponse find(Long id, String email) {
        return PublicationResponse.from(readable(id, email));
    }
    public PublicationResponse create(Long communityId, PublicationRequest request, String email) {
        var community = access.community(communityId);
        var author = access.requireMember(community, email);
        Publication post = new Publication();
        post.setCommunity(community); post.setAuthor(author);
        post.setTitle(request.getTitle()); post.setContent(request.getContent());
        post.setCreatedAt(LocalDateTime.now()); post.setUpdatedAt(post.getCreatedAt());
        return PublicationResponse.from(publications.save(post));
    }
    public PublicationResponse update(Long id, PublicationRequest request, String email) {
        Publication post = get(id);
        access.requireAuthor(post.getCommunity(), post.getAuthor().getId(), email, false);
        post.setTitle(request.getTitle()); post.setContent(request.getContent()); post.setUpdatedAt(LocalDateTime.now());
        return PublicationResponse.from(publications.save(post));
    }
    public void delete(Long id, String email) {
        Publication post = get(id);
        access.requireAuthor(post.getCommunity(), post.getAuthor().getId(), email, true);
        comments.deleteByPublicationId(id); comments.flush();
        publications.delete(post);
    }
    public Publication readable(Long id, String email) {
        Publication post = get(id);
        access.requireRead(post.getCommunity(), email);
        return post;
    }
    private Publication get(Long id) {
        return publications.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Publication introuvable."));
    }
}
