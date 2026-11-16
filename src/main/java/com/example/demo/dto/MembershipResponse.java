package com.example.demo.dto;

import com.example.demo.enums.MembershipStatus;
import com.example.demo.model.CommunityMembership;
import java.time.LocalDateTime;

public record MembershipResponse(Long id, Long userId, String userName, Long communityId,
        String communityName, MembershipStatus status, LocalDateTime requestedAt) {
    public static MembershipResponse from(CommunityMembership membership) {
        return new MembershipResponse(membership.getId(), membership.getUser().getId(),
                membership.getUser().getName(), membership.getCommunity().getId(),
                membership.getCommunity().getName(), membership.getStatus(), membership.getRequestedAt());
    }
}
