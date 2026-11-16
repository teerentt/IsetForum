package com.example.demo.controller.community;

import com.example.demo.dto.membership.MembershipResponse;
import com.example.demo.service.community.CommunityMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api")
@RequiredArgsConstructor
public class CommunityMembershipController {
    private final CommunityMembershipService membershipService;

    @PostMapping("/communities/{communityId}/membership")
    @ResponseStatus(HttpStatus.CREATED)
    public MembershipResponse join(@PathVariable Long communityId, Authentication authentication) {
        return membershipService.join(communityId, authentication.getName());
    }

    @DeleteMapping("/communities/{communityId}/membership")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void leave(@PathVariable Long communityId, Authentication authentication) {
        membershipService.leave(communityId, authentication.getName());
    }

    @GetMapping("/communities/{communityId}/membership")
    public MembershipResponse findMine(@PathVariable Long communityId, Authentication authentication) {
        return membershipService.findMine(communityId, authentication.getName());
    }

    @GetMapping("/memberships/mine")
    public List<MembershipResponse> findAllMine(Authentication authentication) {
        return membershipService.findAllMine(authentication.getName());
    }

    @GetMapping("/communities/{communityId}/members")
    public List<MembershipResponse> findMembers(@PathVariable Long communityId, Authentication authentication) {
        String email = null;
        if (authentication != null) {
            email = authentication.getName();
        }
        return membershipService.findMembers(communityId, email);
    }
}
