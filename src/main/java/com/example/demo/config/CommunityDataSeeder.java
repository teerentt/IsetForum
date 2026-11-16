package com.example.demo.config;

import com.example.demo.dto.CommunityRequest;
import com.example.demo.dto.CommunityResponse;
import com.example.demo.enums.CommunityVisibility;
import com.example.demo.repository.CommunityRepository;
import com.example.demo.service.CommunityService;
import com.example.demo.service.CommunityMembershipService;
import lombok.RequiredArgsConstructor;
import org.springframework.boot.CommandLineRunner;
import org.springframework.context.annotation.Profile;
import org.springframework.core.annotation.Order;
import org.springframework.stereotype.Component;

@Component
@Profile("dev")
@Order(2)
@RequiredArgsConstructor
public class CommunityDataSeeder implements CommandLineRunner {
    private final CommunityRepository communityRepository;
    private final CommunityService communityService;
    private final CommunityMembershipService membershipService;

    @Override
    public void run(String... args) {
        seed("Informatique", "Un espace pour apprendre Java et construire des projets ensemble.", CommunityVisibility.PUBLIC);
        seed("Cercle de recherche IA", "Échanges entre étudiants et enseignants autour de l’intelligence artificielle.", CommunityVisibility.PRIVATE);
    }

    private void seed(String name, String description, CommunityVisibility visibility) {
        if (communityRepository.existsByName(name)) {
            return;
        }
        CommunityRequest request = new CommunityRequest(name, description, visibility);
        CommunityResponse community = communityService.create(request, "professeur@isetforum.test");
        membershipService.join(community.id(), "etudiant@isetforum.test");
    }
}
