package com.example.demo.publication;


import com.example.demo.dto.community.*;
import com.example.demo.enums.*;
import com.example.demo.repository.community.*;
import com.example.demo.repository.publication.*;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.service.community.*;
import com.fasterxml.jackson.databind.JsonNode;
import com.fasterxml.jackson.databind.ObjectMapper;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.test.web.servlet.request.MockHttpServletRequestBuilder;
import org.springframework.transaction.annotation.Transactional;
import java.util.Map;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles({"dev", "test"}) @Transactional
class PublicationTest {
    @Autowired MockMvc mvc;
    @Autowired ObjectMapper mapper;
    @Autowired CommunityService communities;
    @Autowired CommunityMembershipService memberships;
    @Autowired CommunityRepository communityRepository;
    @Autowired CommunityMembershipRepository membershipRepository;
    @org.springframework.test.context.bean.override.mockito.MockitoSpyBean PublicationRepository publications;
    @Autowired CommentRepository comments;
    @Autowired UserRepository users;
    static final String AUTHOR = "professeur@isetforum.test";
    static final String STUDENT = "etudiant@isetforum.test";
    static final String ADMIN = "admin@isetforum.test";
    long publicId, privateId;
    @BeforeEach void setup() {
        publicId = communities.create(new CommunityRequest("Public " + UUID.randomUUID(), "Description", CommunityVisibility.PUBLIC), AUTHOR).id();
        privateId = communities.create(new CommunityRequest("Privé " + UUID.randomUUID(), "Description", CommunityVisibility.PRIVATE), AUTHOR).id();
        memberships.join(publicId, STUDENT);
        memberships.join(privateId, STUDENT);
    }
    JsonNode response(MockHttpServletRequestBuilder request, int expected) throws Exception {
        String body = mvc.perform(request).andExpect(status().is(expected)).andReturn().getResponse().getContentAsString();
        return body.isEmpty() ? null : mapper.readTree(body);
    }
    MockHttpServletRequestBuilder writing(MockHttpServletRequestBuilder request, String email, Map<String, ?> body) throws Exception {
        String role = email.equals(ADMIN) ? "ADMIN" : email.equals(AUTHOR) ? "PROFESSOR" : "STUDENT";
        return request.with(user(email).roles(role)).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(body));
    }
    Map<String, String> content() { return Map.of("title", "Titre", "content", "Contenu"); }
    long publication(long communityId) throws Exception {
        return response(writing(post("/api/communities/{id}/publications", communityId), AUTHOR, content()), 201).get("id").asLong();
    }
    long comment(long publicationId, String email) throws Exception {
        return response(writing(post("/api/publications/{id}/comments", publicationId), email, Map.of("content", "Commentaire")), 201).get("id").asLong();
    }
    @Test void lecturePubliqueSansConnexionEtDates() throws Exception {
        long id = publication(publicId);
        JsonNode detail = response(get("/api/publications/{id}", id), 200);
        assertThat(detail.get("createdAt").asText()).isNotBlank();
        assertThat(detail.get("updatedAt").asText()).isNotBlank();
        response(get("/api/communities/{id}/publications", publicId), 200);
        comment(id, STUDENT);
        assertThat(response(get("/api/publications/{id}/comments", id), 200).size()).isEqualTo(1);
    }
    @Test void lecturePriveeProtegeTousLesCheminsEtApprobationDonneAcces() throws Exception {
        long id = publication(privateId);
        comment(id, AUTHOR);
        for (String path : new String[]{"/api/publications/" + id, "/api/publications/" + id + "/comments", "/api/communities/" + privateId + "/publications"}) {
            response(get(path), 401);
            response(get(path).with(user(STUDENT)), 403);
            response(get(path).with(user(AUTHOR)), 200);
            response(get(path).with(user(ADMIN).roles("ADMIN")), 200);
        }
        memberships.approve(memberships.findMine(privateId, STUDENT).id(), ADMIN);
        response(get("/api/publications/{id}", id).with(user(STUDENT)), 200);
        comment(id, STUDENT);
        memberships.leave(privateId, STUDENT);
        response(get("/api/publications/{id}", id).with(user(STUDENT)), 403);
    }
    @Test void auteurEtParentViennentDuServeur() throws Exception {
        long authorId = users.findByEmailIgnoreCase(AUTHOR).orElseThrow().getId();
        JsonNode result = response(writing(post("/api/communities/{id}/publications", publicId), AUTHOR,
                Map.of("title", " Titre ", "content", " Contenu ", "authorId", 99999, "communityId", 99999)), 201);
        long id = result.get("id").asLong();
        assertThat(result.get("authorId").asLong()).isEqualTo(authorId);
        assertThat(result.get("communityId").asLong()).isEqualTo(publicId);
        assertThat(result.get("title").asText()).isEqualTo("Titre");
        JsonNode c = response(writing(post("/api/publications/{id}/comments", id), AUTHOR,
                Map.of("content", " Oui ", "authorId", 99999, "publicationId", 99999)), 201);
        assertThat(c.get("authorId").asLong()).isEqualTo(authorId);
        assertThat(c.get("publicationId").asLong()).isEqualTo(id);
        response(writing(put("/api/publications/{id}", id), AUTHOR,
                Map.of("title", "Nouveau", "content", "Texte", "communityId", 99999, "authorId", 99999)), 200);
        assertThat(publications.findById(id).orElseThrow().getCommunity().getId()).isEqualTo(publicId);
    }
    @Test void creationExigeAdhesionActiveMemePourAdmin() throws Exception {
        long id = publication(privateId);
        response(post("/api/communities/{id}/publications", publicId).with(csrf()).contentType(MediaType.APPLICATION_JSON).content(mapper.writeValueAsString(content())), 401);
        response(writing(post("/api/communities/{id}/publications", privateId), STUDENT, content()), 403);
        response(writing(post("/api/communities/{id}/publications", publicId), ADMIN, content()), 403);
        response(writing(post("/api/publications/{id}/comments", id), STUDENT, Map.of("content", "Texte")), 403);
        response(writing(post("/api/publications/{id}/comments", id), ADMIN, Map.of("content", "Texte")), 403);
        comment(publication(publicId), STUDENT);
    }
    @Test void seulAuteurModifieEtSupprimeEtPublicationSupprimeSesCommentaires() throws Exception {
        long id = publication(publicId), c = comment(id, AUTHOR);
        for (String email : new String[]{STUDENT, ADMIN}) {
            response(writing(put("/api/publications/{id}", id), email, content()), 403);
            response(writing(put("/api/comments/{id}", c), email, Map.of("content", "Autre")), 403);
        }
        response(writing(delete("/api/publications/{id}", id), STUDENT, Map.of()), 403);
        response(writing(delete("/api/comments/{id}", c), STUDENT, Map.of()), 403);
        response(writing(put("/api/publications/{id}", id), AUTHOR, content()), 200);
        response(writing(put("/api/comments/{id}", c), AUTHOR, Map.of("content", "Corrigé")), 200);
        response(writing(delete("/api/comments/{id}", c), AUTHOR, Map.of()), 204);
        comment(id, STUDENT);
        response(writing(delete("/api/publications/{id}", id), AUTHOR, Map.of()), 204);
        assertThat(comments.findByPublicationIdOrderByCreatedAtAscIdAsc(id)).isEmpty();
    }
    @Test void ancienMembreConserveSesContenusMaisPerdLesDroits() throws Exception {
        long id = response(writing(post("/api/communities/{id}/publications", publicId), STUDENT, content()), 201).get("id").asLong();
        long c = comment(id, STUDENT);
        memberships.leave(publicId, STUDENT);
        response(get("/api/publications/{id}", id), 200);
        response(writing(put("/api/publications/{id}", id), STUDENT, content()), 403);
        response(writing(delete("/api/publications/{id}", id), STUDENT, Map.of()), 403);
        response(writing(put("/api/comments/{id}", c), STUDENT, Map.of("content", "Autre")), 403);
        response(writing(delete("/api/comments/{id}", c), STUDENT, Map.of()), 403);
        memberships.join(publicId, STUDENT);
        response(writing(delete("/api/comments/{id}", c), STUDENT, Map.of()), 204);
    }
    @Test void adminSupprimeSansAdhesionEtRessourcesSupprimeesRenvoient404() throws Exception {
        long id = publication(privateId), c = comment(id, AUTHOR);
        response(writing(delete("/api/comments/{id}", c), ADMIN, Map.of()), 204);
        comment(id, AUTHOR);
        response(writing(delete("/api/publications/{id}", id), ADMIN, Map.of()), 204);
        response(get("/api/publications/{id}", id), 404);
        response(get("/api/publications/{id}/comments", id), 404);
        response(writing(delete("/api/comments/{id}", c), AUTHOR, Map.of()), 404);
    }
    @Test void validationDesChampsEtLimites() throws Exception {
        for (Map<String, String> invalid : java.util.List.of(Map.of("title", " ", "content", "Texte"), Map.of("title", "Titre", "content", " "), Map.of("content", "Texte"), Map.of("title", "x".repeat(161), "content", "Texte"), Map.of("title", "Titre", "content", "x".repeat(10001)))) {
            response(writing(post("/api/communities/{id}/publications", publicId), AUTHOR, invalid), 400);
        }
        long id = publication(publicId);
        for (String text : new String[]{" ", "x".repeat(2001)}) response(writing(post("/api/publications/{id}/comments", id), AUTHOR, Map.of("content", text)), 400);
        response(writing(post("/api/communities/{id}/publications", publicId), AUTHOR, Map.of("title", "x".repeat(160), "content", "x".repeat(10000))), 201);
        response(writing(post("/api/publications/{id}/comments", id), AUTHOR, Map.of("content", "x".repeat(2000))), 201);
    }
    @Test void csrfObligatoireEtIdentifiantsInvalides() throws Exception {
        long id = publication(publicId), c = comment(id, AUTHOR);
        response(post("/api/communities/{id}/publications", publicId).with(user(AUTHOR)), 403);
        response(post("/api/publications/{id}/comments", id).with(user(AUTHOR)), 403);
        response(put("/api/publications/{id}", id).with(user(AUTHOR)), 403);
        response(put("/api/comments/{id}", c).with(user(AUTHOR)), 403);
        response(delete("/api/publications/{id}", id).with(user(AUTHOR)), 403);
        response(delete("/api/comments/{id}", c).with(user(AUTHOR)), 403);
        response(get("/api/publications/invalide"), 400);
        response(get("/api/publications/{id}", Long.MAX_VALUE), 404);
    }
    @Test void crudAdminEtSuppressionCompleteConserventLesAutresDonnees() throws Exception {
        long id = publication(privateId), c = comment(id, AUTHOR), unrelated = publication(publicId), userCount = users.count();
        response(get("/api/admin/communities").with(user(ADMIN).roles("ADMIN")), 200);
        response(get("/api/admin/communities/{id}", privateId).with(user(ADMIN).roles("ADMIN")), 200);
        JsonNode created = response(writing(post("/api/admin/communities"), ADMIN, Map.of("name", "Administration", "description", "Description", "visibility", "PRIVATE")), 201);
        response(writing(put("/api/admin/communities/{id}", created.get("id").asLong()), ADMIN, Map.of("name", "Modifiée", "description", "Description", "visibility", "PUBLIC")), 200);
        response(writing(delete("/api/admin/communities/{id}", privateId), ADMIN, Map.of()), 204);
        assertThat(communityRepository.existsById(privateId)).isFalse();
        assertThat(publications.existsById(id)).isFalse();
        assertThat(comments.existsById(c)).isFalse();
        assertThat(membershipRepository.countByCommunityIdAndStatus(privateId, MembershipStatus.PENDING)).isZero();
        assertThat(membershipRepository.countByCommunityIdAndStatus(privateId, MembershipStatus.ACTIVE)).isZero();
        assertThat(users.count()).isEqualTo(userCount);
        assertThat(publications.existsById(unrelated)).isTrue();
        response(get("/api/publications/{id}", id), 404);
        response(writing(delete("/api/admin/communities/{id}", privateId), ADMIN, Map.of()), 404);
    }
    @Test void crudAdminRefuseAuxAutresRolesEtReverifieLeRoleEnBase() throws Exception {
        for (String email : new String[]{AUTHOR, STUDENT}) {
            response(writing(get("/api/admin/communities"), email, Map.of()), 403);
            response(writing(get("/api/admin/communities/{id}", publicId), email, Map.of()), 403);
            response(writing(post("/api/admin/communities"), email, content()), 403);
            response(writing(put("/api/admin/communities/{id}", publicId), email, content()), 403);
            response(writing(delete("/api/admin/communities/{id}", publicId), email, Map.of()), 403);
        }
        response(get("/api/admin/communities"), 401);
        response(get("/api/admin/communities").with(user(STUDENT).roles("ADMIN")), 403);
        response(delete("/api/admin/communities/{id}", publicId).with(user(STUDENT).roles("ADMIN")).with(csrf()), 403);
        response(delete("/api/admin/communities/{id}", publicId).with(user(ADMIN).roles("ADMIN")), 403);
    }
    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void echecDeSuppressionAnnuleAussiLaSuppressionDesCommentaires() throws Exception {
        long id = publication(privateId), c = comment(id, AUTHOR);
        org.mockito.Mockito.doThrow(new IllegalStateException("Panne simulée")).when(publications).deleteByCommunityId(privateId);
        try {
            org.assertj.core.api.Assertions.assertThatThrownBy(() -> communities.delete(privateId, ADMIN))
                    .isInstanceOf(IllegalStateException.class);
            assertThat(communityRepository.existsById(privateId)).isTrue();
            assertThat(publications.existsById(id)).isTrue();
            assertThat(comments.existsById(c)).isTrue();
            assertThat(membershipRepository.countByCommunityIdAndStatus(privateId, MembershipStatus.PENDING)).isEqualTo(1);
        } finally {
            org.mockito.Mockito.reset(publications);
            communities.delete(privateId, ADMIN);
            communities.delete(publicId, ADMIN);
        }
    }
}
