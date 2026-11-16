package com.example.demo.repository.community;

import com.example.demo.enums.MembershipStatus;
import com.example.demo.model.community.CommunityMembership;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;
import java.util.Optional;

public interface CommunityMembershipRepository extends JpaRepository<CommunityMembership, Long> {
    Optional<CommunityMembership> findByCommunityIdAndUserId(Long communityId, Long userId);
    boolean existsByCommunityIdAndUserIdAndStatus(Long communityId, Long userId, MembershipStatus status);
    long countByCommunityIdAndStatus(Long communityId, MembershipStatus status);
    List<CommunityMembership> findByCommunityIdAndStatusOrderByRequestedAtAscIdAsc(Long communityId, MembershipStatus status);
    List<CommunityMembership> findByUserIdOrderByRequestedAtDescIdDesc(Long userId);
    List<CommunityMembership> findByStatusOrderByRequestedAtAscIdAsc(MembershipStatus status);
}
