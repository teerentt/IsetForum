package com.example.demo.dto.community;

import com.example.demo.enums.CommunityVisibility;
import com.example.demo.model.community.Community;
import java.time.LocalDateTime;

public record CommunityResponse(Long id, String name, String description, CommunityVisibility visibility,
        Long creatorId, String creatorName, LocalDateTime createdAt, long memberCount) {
    public static CommunityResponse from(Community community, long memberCount) {
        return new CommunityResponse(community.getId(), community.getName(), community.getDescription(),
                community.getVisibility(), community.getCreator().getId(), community.getCreator().getName(),
                community.getCreatedAt(), memberCount);
    }
}
