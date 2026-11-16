package com.example.demo.community;

import com.example.demo.config.seed.CommunityDataSeeder;
import com.example.demo.dto.community.CommunityRequest;
import com.example.demo.dto.community.CommunityResponse;
import com.example.demo.dto.membership.MembershipResponse;
import com.example.demo.enums.CommunityVisibility;
import com.example.demo.enums.MembershipStatus;
import com.example.demo.model.community.CommunityMembership;
import com.example.demo.repository.community.CommunityRepository;
import com.example.demo.repository.community.CommunityMembershipRepository;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.service.community.CommunityService;
import com.example.demo.service.community.CommunityMembershipService;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.dao.DataIntegrityViolationException;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.assertj.core.api.Assertions.assertThatThrownBy;
import static org.hamcrest.Matchers.hasItem;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "test"})
@Transactional
class CommunityTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CommunityService communityService;
    @Autowired CommunityMembershipService membershipService;
    @Autowired CommunityRepository communities;
    @Autowired CommunityMembershipRepository memberships;
    @Autowired UserRepository users;
    @Autowired CommunityDataSeeder seeder;

    private static final String STUDENT = "etudiant@isetforum.test";
    private static final String PROFESSOR = "professeur@isetforum.test";
    private static final String ADMIN = "admin@isetforum.test";

    private CommunityResponse createCommunity(CommunityVisibility visibility) {
        return communityService.create(new CommunityRequest("Communauté " + UUID.randomUUID(),
                "Un espace pour apprendre ensemble.", visibility), PROFESSOR);
    }

    @Test void presentationPubliqueMemePourUneCommunautePrivee() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        mvc.perform(get("/api/communities"))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(community.id().intValue())));
        mvc.perform(get("/api/communities/{id}", community.id()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.visibility").value("PRIVATE"))
                .andExpect(jsonPath("$.description").value("Un espace pour apprendre ensemble."))
                .andExpect(jsonPath("$.memberCount").value(1))
                .andExpect(jsonPath("$.password").doesNotExist()).andExpect(jsonPath("$.email").doesNotExist());
    }

    @Test void chaqueRolePeutCreerEtDevientMembre() throws Exception {
        for (String email : new String[]{STUDENT, PROFESSOR, ADMIN}) {
            String body = mapper.writeValueAsString(new CommunityRequest("Groupe de " + email,
                    "Une nouvelle communauté.", CommunityVisibility.PRIVATE));
            var result = mvc.perform(post("/api/communities").with(user(email)).with(csrf())
                    .contentType(MediaType.APPLICATION_JSON).content(body))
                    .andExpect(status().isCreated()).andExpect(jsonPath("$.memberCount").value(1))
                    .andExpect(jsonPath("$.creatorId").value(users.findByEmailIgnoreCase(email).orElseThrow().getId()))
                    .andReturn();
            long id = mapper.readTree(result.getResponse().getContentAsString()).get("id").asLong();
            assertThat(membershipService.findMine(id, email).status()).isEqualTo(MembershipStatus.ACTIVE);
        }
    }

    @Test void leCreateurVientDeLaSessionEtNonDuCorpsJson() throws Exception {
        long adminId = users.findByEmailIgnoreCase(ADMIN).orElseThrow().getId();
        long studentId = users.findByEmailIgnoreCase(STUDENT).orElseThrow().getId();
        mvc.perform(post("/api/communities").with(user(STUDENT)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"name":"Projet étudiant","description":"Un projet commun.","visibility":"PUBLIC","creatorId":%d}
                    """.formatted(adminId)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.creatorId").value(studentId));
    }

    @Test void validationDesChampsEnFrancais() throws Exception {
        mvc.perform(post("/api/communities").with(user(STUDENT)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"name":" ","description":"","visibility":null}
                    """))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").value("Le nom de la communauté est obligatoire."))
                .andExpect(jsonPath("$.fields.description").value("La description est obligatoire."))
                .andExpect(jsonPath("$.fields.visibility").exists());
        mvc.perform(post("/api/communities").with(user(STUDENT)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content("""
                    {"name":"Test","description":"Test","visibility":"INCONNUE"}
                    """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.message").value("La requête est invalide."));
    }

    @Test void unVisiteurNePeutPasCreerOuRejoindre() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PUBLIC);
        mvc.perform(post("/api/communities").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isUnauthorized());
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(csrf()))
                .andExpect(status().isUnauthorized());
        mvc.perform(get("/api/memberships/mine")).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/communities/{id}/membership", community.id())).andExpect(status().isUnauthorized());
    }

    @Test void adhesionPubliqueImmediateEtDoublonRefuse() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PUBLIC);
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isConflict());
        mvc.perform(get("/api/communities/{id}", community.id()))
                .andExpect(jsonPath("$.memberCount").value(2));
        mvc.perform(get("/api/communities/{id}/members", community.id()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
    }

    @Test void demandePriveeEnAttenteEtAccesRefuse() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"));
        mvc.perform(get("/api/communities/{id}/members", community.id())).andExpect(status().isUnauthorized());
        mvc.perform(get("/api/communities/{id}/members", community.id()).with(user(STUDENT)))
                .andExpect(status().isForbidden());
        mvc.perform(get("/api/communities/{id}", community.id()))
                .andExpect(jsonPath("$.memberCount").value(1));
    }

    @Test void seulUnAdministrateurPeutApprouver() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        MembershipResponse request = membershipService.join(community.id(), STUDENT);
        mvc.perform(get("/api/admin/membership-requests").with(user(PROFESSOR).roles("PROFESSOR")))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/admin/membership-requests/{id}/approve", request.id())
                .with(user(PROFESSOR).roles("PROFESSOR")).with(csrf())).andExpect(status().isForbidden());
        // Le service vérifie aussi le rôle en base, indépendamment des autorités de la requête.
        mvc.perform(post("/api/admin/membership-requests/{id}/approve", request.id())
                .with(user(STUDENT).roles("ADMIN")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/membership-requests").with(user(ADMIN).roles("ADMIN")))
                .andExpect(status().isOk()).andExpect(jsonPath("$[*].id", hasItem(request.id().intValue())));
        mvc.perform(post("/api/admin/membership-requests/{id}/approve", request.id())
                .with(user(ADMIN).roles("ADMIN")).with(csrf()))
                .andExpect(status().isOk()).andExpect(jsonPath("$.status").value("ACTIVE"));
        mvc.perform(get("/api/communities/{id}/members", community.id()).with(user(STUDENT)))
                .andExpect(status().isOk()).andExpect(jsonPath("$.length()").value(2));
        mvc.perform(post("/api/admin/membership-requests/{id}/approve", request.id())
                .with(user(ADMIN).roles("ADMIN")).with(csrf())).andExpect(status().isConflict());
        mvc.perform(post("/api/admin/membership-requests/{id}/reject", request.id())
                .with(user(ADMIN).roles("ADMIN")).with(csrf())).andExpect(status().isConflict());
    }

    @Test void refuserSupprimeLaDemandeEtPermetUneNouvelleDemande() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        MembershipResponse request = membershipService.join(community.id(), STUDENT);
        mvc.perform(post("/api/admin/membership-requests/{id}/reject", request.id())
                .with(user(ADMIN).roles("ADMIN")).with(csrf())).andExpect(status().isNoContent());
        mvc.perform(get("/api/communities/{id}/membership", community.id()).with(user(STUDENT)))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.status").value("PENDING"));
    }

    @Test void quitterRetireLAccesEtAnnulerSupprimeUneDemande() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        MembershipResponse request = membershipService.join(community.id(), STUDENT);
        membershipService.approve(request.id(), ADMIN);
        mvc.perform(delete("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/communities/{id}/members", community.id()).with(user(STUDENT)))
                .andExpect(status().isForbidden());
        membershipService.join(community.id(), STUDENT);
        mvc.perform(delete("/api/communities/{id}/membership", community.id()).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isNoContent());
        mvc.perform(get("/api/communities/{id}/membership", community.id()).with(user(STUDENT)))
                .andExpect(status().isNotFound());
    }

    @Test void leCreateurConserveSonAdhesion() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        mvc.perform(delete("/api/communities/{id}/membership", community.id()).with(user(PROFESSOR)).with(csrf()))
                .andExpect(status().isConflict());
        assertThat(membershipService.findMine(community.id(), PROFESSOR).status()).isEqualTo(MembershipStatus.ACTIVE);
    }

    @Test void mesAdhesionsIncluentLesDemandesSansExposerCellesDesAutres() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        membershipService.join(community.id(), STUDENT);
        mvc.perform(get("/api/memberships/mine").with(user(STUDENT)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$[*].communityId", hasItem(community.id().intValue())));
        mvc.perform(get("/api/communities/{id}/membership", community.id()).with(user(ADMIN)))
                .andExpect(status().isNotFound());
        mvc.perform(get("/api/communities/{id}/members", community.id()).with(user(ADMIN).roles("ADMIN")))
                .andExpect(status().isOk());
    }

    @Test void modificationReserveeAuCreateurOuAdministrateur() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PUBLIC);
        String body = mapper.writeValueAsString(new CommunityRequest("Nouveau nom", "Nouvelle description.", CommunityVisibility.PRIVATE));
        mvc.perform(put("/api/communities/{id}", community.id()).with(user(STUDENT)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isForbidden());
        mvc.perform(put("/api/communities/{id}", community.id()).with(user(PROFESSOR)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isOk()).andExpect(jsonPath("$.name").value("Nouveau nom"));
        mvc.perform(put("/api/communities/{id}", community.id()).with(user(ADMIN).roles("ADMIN")).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body)).andExpect(status().isOk());
    }

    @Test void passageEnPublicAccepteLesDemandesEtPassageEnPriveConserveLesMembres() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PRIVATE);
        membershipService.join(community.id(), STUDENT);
        CommunityResponse updated = communityService.update(community.id(),
                new CommunityRequest("Ouverte", "Adhésion immédiate.", CommunityVisibility.PUBLIC), PROFESSOR);
        assertThat(updated.memberCount()).isEqualTo(2);
        assertThat(membershipService.findMine(community.id(), STUDENT).status()).isEqualTo(MembershipStatus.ACTIVE);
        communityService.update(community.id(), new CommunityRequest("Privée", "Membres conservés.", CommunityVisibility.PRIVATE), PROFESSOR);
        mvc.perform(get("/api/communities/{id}/members", community.id()).with(user(STUDENT)))
                .andExpect(status().isOk());
    }

    @Test void ressourcesInexistantesRenvoient404() throws Exception {
        mvc.perform(get("/api/communities/{id}", Long.MAX_VALUE)).andExpect(status().isNotFound());
        mvc.perform(post("/api/communities/{id}/membership", Long.MAX_VALUE).with(user(STUDENT)).with(csrf()))
                .andExpect(status().isNotFound());
        mvc.perform(post("/api/admin/membership-requests/{id}/approve", Long.MAX_VALUE)
                .with(user(ADMIN).roles("ADMIN")).with(csrf())).andExpect(status().isNotFound());
    }

    @Test void identifiantInvalideEtNomTropLongRenvoientDesMessagesFrancais() throws Exception {
        mvc.perform(get("/api/communities/pas-un-nombre"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.message").value("Un paramètre de la requête est invalide."));
        String body = mapper.writeValueAsString(new CommunityRequest("a".repeat(101),
                "Description valide.", CommunityVisibility.PUBLIC));
        mvc.perform(post("/api/communities").with(user(STUDENT)).with(csrf())
                .contentType(MediaType.APPLICATION_JSON).content(body))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.fields.name").value("Le nom ne doit pas dépasser 100 caractères."));
    }

    @Test void lesMutationsRestentProtegeesParCsrf() throws Exception {
        CommunityResponse community = createCommunity(CommunityVisibility.PUBLIC);
        mvc.perform(post("/api/communities").with(user(STUDENT)).contentType(MediaType.APPLICATION_JSON).content("{}"))
                .andExpect(status().isForbidden());
        mvc.perform(post("/api/communities/{id}/membership", community.id()).with(user(STUDENT)))
                .andExpect(status().isForbidden());
    }

    @Test void laBaseInterditLesAdhesionsEnDouble() {
        CommunityResponse community = createCommunity(CommunityVisibility.PUBLIC);
        CommunityMembership duplicate = CommunityMembership.builder()
                .community(communities.findById(community.id()).orElseThrow())
                .user(users.findByEmailIgnoreCase(PROFESSOR).orElseThrow())
                .status(MembershipStatus.ACTIVE).requestedAt(LocalDateTime.now()).build();
        assertThatThrownBy(() -> memberships.saveAndFlush(duplicate)).isInstanceOf(DataIntegrityViolationException.class);
    }

    @Test void lesDonneesDeDemonstrationNeSontPasDupliquees() {
        long communityCount = communities.count();
        long membershipCount = memberships.count();
        seeder.run();
        seeder.run();
        assertThat(communities.count()).isEqualTo(communityCount);
        assertThat(memberships.count()).isEqualTo(membershipCount);
    }
}
