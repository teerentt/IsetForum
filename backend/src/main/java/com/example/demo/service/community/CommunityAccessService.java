package com.example.demo.service.community;

import com.example.demo.enums.*;
import com.example.demo.model.community.Community;
import com.example.demo.model.user.User;
import com.example.demo.repository.community.*;
import com.example.demo.repository.user.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

@Service @RequiredArgsConstructor
public class CommunityAccessService {
    private final CommunityRepository communities;
    private final CommunityMembershipRepository memberships;
    private final UserRepository users;
    public Community community(Long id) {
        return communities.findById(id).orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Communauté introuvable."));
    }
    public User user(String email) {
        if (email == null) throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous connecter.");
        return users.findByEmailIgnoreCase(email).orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous reconnecter."));
    }
    public void requireAdmin(String email) {
        if (user(email).getRole() != Role.ADMIN) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette action est réservée aux administrateurs.");
    }
    public void requireRead(Community community, String email) {
        if (community.getVisibility() == CommunityVisibility.PUBLIC) return;
        User user = user(email);
        if (user.getRole() == Role.ADMIN) return;
        requireMember(community, user);
    }
    public boolean canRead(Community community, String email) {
        if (community.getVisibility() == CommunityVisibility.PUBLIC) return true;
        if (email == null) return false;
        User user = user(email);
        return user.getRole() == Role.ADMIN || memberships.existsByCommunityIdAndUserIdAndStatus(
                community.getId(), user.getId(), MembershipStatus.ACTIVE);
    }
    public User requireMember(Community community, String email) {
        User user = user(email);
        requireMember(community, user);
        return user;
    }
    private void requireMember(Community community, User user) {
        if (!memberships.existsByCommunityIdAndUserIdAndStatus(community.getId(), user.getId(), MembershipStatus.ACTIVE)) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Cette action est réservée aux membres actifs de la communauté.");
        }
    }
    public void requireAuthor(Community community, Long authorId, String email, boolean deleting) {
        User user = user(email);
        if (deleting && user.getRole() == Role.ADMIN) return;
        requireMember(community, user);
        if (!user.getId().equals(authorId)) throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Seul l’auteur peut modifier ou supprimer ce contenu.");
    }
}
