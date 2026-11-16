package com.example.demo.controller;

import com.example.demo.dto.MembershipResponse;
import com.example.demo.service.CommunityMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.http.HttpStatus;
import org.springframework.security.core.Authentication;
import org.springframework.web.bind.annotation.*;
import java.util.List;

@RestController
@RequestMapping("/api/admin/membership-requests")
@RequiredArgsConstructor
public class AdminMembershipController {
    private final CommunityMembershipService membershipService;

    @GetMapping
    public List<MembershipResponse> findPending(Authentication authentication) {
        return membershipService.findPendingRequests(authentication.getName());
    }

    @PostMapping("/{id}/approve")
    public MembershipResponse approve(@PathVariable Long id, Authentication authentication) {
        return membershipService.approve(id, authentication.getName());
    }

    @PostMapping("/{id}/reject")
    @ResponseStatus(HttpStatus.NO_CONTENT)
    public void reject(@PathVariable Long id, Authentication authentication) {
        membershipService.reject(id, authentication.getName());
    }
}
