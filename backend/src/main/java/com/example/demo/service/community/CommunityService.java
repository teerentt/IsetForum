package com.example.demo.service.community;

import com.example.demo.dto.community.CommunityRequest;
import com.example.demo.dto.community.CommunityResponse;
import com.example.demo.enums.CommunityVisibility;
import com.example.demo.enums.MembershipStatus;
import com.example.demo.enums.Role;
import com.example.demo.model.community.Community;
import com.example.demo.model.community.CommunityMembership;
import com.example.demo.model.user.User;
import com.example.demo.repository.community.CommunityRepository;
import com.example.demo.repository.community.CommunityMembershipRepository;
import com.example.demo.repository.user.UserRepository;
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
public class CommunityService {
    private final CommunityRepository communityRepository;
    private final CommunityMembershipRepository membershipRepository;
    private final UserRepository userRepository;

    @Transactional(readOnly = true)
    public List<CommunityResponse> findAll() {
        List<CommunityResponse> responses = new ArrayList<>();
        for (Community community : communityRepository.findAllByOrderByCreatedAtDescIdDesc()) {
            responses.add(toResponse(community));
        }
        return responses;
    }

    @Transactional(readOnly = true)
    public CommunityResponse findById(Long id) {
        return toResponse(getCommunity(id));
    }

    public CommunityResponse create(CommunityRequest request, String email) {
        User creator = getUser(email);
        Community community = Community.builder()
                .name(request.getName().trim())
                .description(request.getDescription().trim())
                .visibility(request.getVisibility())
                .creator(creator)
                .createdAt(LocalDateTime.now())
                .build();
        communityRepository.save(community);

        // Le créateur devient immédiatement membre, même si la communauté est privée.
        CommunityMembership membership = CommunityMembership.builder()
                .user(creator).community(community).status(MembershipStatus.ACTIVE)
                .requestedAt(LocalDateTime.now()).build();
        membershipRepository.save(membership);
        return toResponse(community);
    }

    public CommunityResponse update(Long id, CommunityRequest request, String email) {
        Community community = getCommunity(id);
        User user = getUser(email);
        if (!community.getCreator().getId().equals(user.getId()) && user.getRole() != Role.ADMIN) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN,
                    "Seuls le créateur et un administrateur peuvent modifier cette communauté.");
        }

        community.setName(request.getName().trim());
        community.setDescription(request.getDescription().trim());
        community.setVisibility(request.getVisibility());
        communityRepository.save(community);

        // Dans une communauté publique, les adhésions ne nécessitent plus de validation.
        if (community.getVisibility() == CommunityVisibility.PUBLIC) {
            List<CommunityMembership> requests = membershipRepository
                    .findByCommunityIdAndStatusOrderByRequestedAtAscIdAsc(id, MembershipStatus.PENDING);
            for (CommunityMembership membership : requests) {
                membership.setStatus(MembershipStatus.ACTIVE);
            }
            membershipRepository.saveAll(requests);
        }
        return toResponse(community);
    }

    private Community getCommunity(Long id) {
        return communityRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Communauté introuvable."));
    }

    private User getUser(String email) {
        return userRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Veuillez vous reconnecter."));
    }

    private CommunityResponse toResponse(Community community) {
        long memberCount = membershipRepository.countByCommunityIdAndStatus(community.getId(), MembershipStatus.ACTIVE);
        return CommunityResponse.from(community, memberCount);
    }
}
