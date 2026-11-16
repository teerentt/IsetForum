package com.example.demo.service;

import com.example.demo.dto.MembershipResponse;
import com.example.demo.enums.CommunityVisibility;
import com.example.demo.enums.MembershipStatus;
import com.example.demo.enums.Role;
import com.example.demo.model.Community;
import com.example.demo.model.CommunityMembership;
import com.example.demo.model.User;
import com.example.demo.repository.CommunityRepository;
import com.example.demo.repository.CommunityMembershipRepository;
import com.example.demo.repository.UserRepository;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.List;

@Service
@RequiredArgsConstructor
@Transactional
public class CommunityMembershipService {
    private final CommunityMembershipRepository membershipRepository;
    private final CommunityRepository communityRepository;
    private final UserRepository userRepository;

    public MembershipResponse join(Long communityId, String email) {
        Community community = getCommunity(communityId);
        User user = getUser(email);
        if (membershipRepository.findByCommunityIdAndUserId(communityId, user.getId()).isPresent()) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Vous êtes déjà membre ou votre demande est en attente.");
        }

        MembershipStatus status = MembershipStatus.PENDING;
        if (community.getVisibility() == CommunityVisibility.PUBLIC) {
            status = MembershipStatus.ACTIVE;
        }
        CommunityMembership membership = CommunityMembership.builder()
                .community(community).user(user).status(status)
                .requestedAt(LocalDateTime.now()).build();
        membershipRepository.saveAndFlush(membership);
        return MembershipResponse.from(membership);
    }

    public void leave(Long communityId, String email) {
        Community community = getCommunity(communityId);
        User user = getUser(email);
        if (community.getCreator().getId().equals(user.getId())) {
            throw new ResponseStatusException(HttpStatus.CONFLICT,
                    "Le créateur conserve son adhésion à la communauté.");
        }
        CommunityMembership membership = getMembership(communityId, user.getId());
        // La même action permet de quitter ou d’annuler une demande en attente.
        membershipRepository.delete(membership);
    }

    @Transactional(readOnly = true)
    public MembershipResponse findMine(Long communityId, String email) {
        getCommunity(communityId);
        User user = getUser(email);
        return MembershipResponse.from(getMembership(communityId, user.getId()));
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> findAllMine(String email) {
        User user = getUser(email);
        return toResponses(membershipRepository.findByUserIdOrderByRequestedAtDescIdDesc(user.getId()));
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> findMembers(Long communityId, String email) {
        Community community = getCommunity(communityId);
        if (community.getVisibility() == CommunityVisibility.PRIVATE) {
            User user = getUser(email);
            boolean isMember = membershipRepository.existsByCommunityIdAndUserIdAndStatus(
                    communityId, user.getId(), MembershipStatus.ACTIVE);
            if (user.getRole() != Role.ADMIN && !isMember) {
                throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                        "Cette liste est réservée aux membres de la communauté privée.");
            }
        }
        return toResponses(membershipRepository.findByCommunityIdAndStatusOrderByRequestedAtAscIdAsc(
                communityId, MembershipStatus.ACTIVE));
    }

    @Transactional(readOnly = true)
    public List<MembershipResponse> findPendingRequests(String email) {
        requireAdmin(email);
        return toResponses(membershipRepository.findByStatusOrderByRequestedAtAscIdAsc(MembershipStatus.PENDING));
    }

    public MembershipResponse approve(Long id, String email) {
        requireAdmin(email);
        CommunityMembership membership = getPendingRequest(id);
        membership.setStatus(MembershipStatus.ACTIVE);
        membershipRepository.save(membership);
        return MembershipResponse.from(membership);
    }

    public void reject(Long id, String email) {
        requireAdmin(email);
        membershipRepository.delete(getPendingRequest(id));
    }

    private Community getCommunity(Long id) {
        return communityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Communauté introuvable."));
    }

    private User getUser(String email) {
        if (email == null) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous connecter.");
        }
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous reconnecter."));
    }

    private CommunityMembership getMembership(Long communityId, Long userId) {
        return membershipRepository.findByCommunityIdAndUserId(communityId, userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Aucune adhésion ni demande pour cette communauté."));
    }

    private CommunityMembership getPendingRequest(Long id) {
        CommunityMembership membership = membershipRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Demande introuvable."));
        if (membership.getStatus() != MembershipStatus.PENDING) {
            throw new ResponseStatusException(HttpStatus.CONFLICT, "Cette adhésion est déjà active.");
        }
        return membership;
    }

    private void requireAdmin(String email) {
        User user = getUser(email);
        if (user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seul un administrateur peut examiner les demandes d’adhésion.");
        }
    }

    private List<MembershipResponse> toResponses(List<CommunityMembership> memberships) {
        List<MembershipResponse> responses = new ArrayList<>();
        for (CommunityMembership membership : memberships) {
            responses.add(MembershipResponse.from(membership));
        }
        return responses;
    }
}
