package com.example.demo;

import com.example.demo.config.DevelopmentDataSeeder;
import com.example.demo.enums.Role;
import com.example.demo.model.User;
import com.example.demo.repository.UserRepository;
import com.example.demo.service.UserService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mock.web.MockHttpSession;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles({"dev", "test"})
class AuthenticationTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired PasswordEncoder encoder;
    @Autowired DevelopmentDataSeeder seeder;
    @Autowired UserService service;

    @Test void registrationIsStudentOnlyAndPasswordIsHashed() throws Exception {
        String email = UUID.randomUUID() + "@isetforum.test";
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"  Étudiant Test  ","email":"%s","password":"Password!2026","role":"ADMIN"}
                    """.formatted(email)))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.name").value("Étudiant Test")).andExpect(jsonPath("$.password").doesNotExist());
        User user = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(encoder.matches("Password!2026", user.getPassword())).isTrue();
        assertThat(user.getPassword()).isNotEqualTo("Password!2026");
    }

    @Test void duplicateEmailReturnsConflictRegardlessOfCase() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Duplicate","email":"ETUDIANT@ISETFORUM.TEST","password":"Password!2026"}
                    """))
                .andExpect(status().isConflict()).andExpect(jsonPath("$.message").isNotEmpty());
    }

    @Test void validatesRegistrationAndUtf8PasswordByteLimit() throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content(""" 
                    {"name":" ","email":"invalid","password":"short"}
                    """))
                .andExpect(status().isBadRequest()).andExpect(jsonPath("$.fields.email").exists());
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"name":"Test","email":"unicode@isetforum.test","password":"%s"}
                    """.formatted("é".repeat(40))))
                .andExpect(status().isBadRequest());
    }

    @Test void loginPersistsSessionRotatesSessionIdAndLogoutInvalidatesIt() throws Exception {
        var session = new MockHttpSession();
        String previousId = session.getId();
        var result = mvc.perform(post("/api/auth/login").session(session).with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("""
                    {"email":"ETUDIANT@ISETFORUM.TEST","password":"IsetForumDev!2026"}
                    """))
                .andExpect(status().isOk()).andExpect(jsonPath("$.role").value("STUDENT"))
                .andExpect(jsonPath("$.password").doesNotExist()).andReturn();
        var authenticatedSession = (MockHttpSession) result.getRequest().getSession(false);
        assertThat(authenticatedSession).isNotNull();
        assertThat(authenticatedSession.getId()).isNotEqualTo(previousId);
        mvc.perform(get("/api/auth/me").session(authenticatedSession)).andExpect(status().isOk())
                .andExpect(jsonPath("$.email").value("etudiant@isetforum.test"));
        mvc.perform(post("/api/auth/logout").session(authenticatedSession).with(csrf())).andExpect(status().isNoContent());
        assertThat(authenticatedSession.isInvalid()).isTrue();
        mvc.perform(get("/api/auth/me")).andExpect(status().isUnauthorized());
    }

    @Test void badPasswordAndUnknownEmailReturnSameError() throws Exception {
        for (String email : new String[]{"etudiant@isetforum.test", "unknown@isetforum.test"}) {
            mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"email\":\"" + email + "\",\"password\":\"wrong-password\"}"))
                    .andExpect(status().isUnauthorized())
                    .andExpect(jsonPath("$.message").value("Adresse e-mail ou mot de passe incorrect."));
        }
    }

    @Test void requiresCsrfForAllAuthMutations() throws Exception {
        for (String path : new String[]{"login", "register", "logout"}) {
            mvc.perform(post("/api/auth/" + path).contentType(MediaType.APPLICATION_JSON).content("{}"))
                    .andExpect(status().isForbidden());
        }
        mvc.perform(get("/api/auth/csrf")).andExpect(status().isOk())
                .andExpect(cookie().exists("XSRF-TOKEN")).andExpect(jsonPath("$.token").isNotEmpty());
    }

    @Test void developmentSeedIsIdempotentAndPreservesExistingAccounts() {
        long count = users.count();
        User original = users.findByEmailIgnoreCase("admin@isetforum.test").orElseThrow();
        String hash = original.getPassword();
        seeder.run();
        seeder.run();
        assertThat(users.count()).isEqualTo(count);
        assertThat(users.findByEmailIgnoreCase(original.getEmail()).orElseThrow().getPassword()).isEqualTo(hash);
        assertThat(service.loadUserByUsername(original.getEmail()).getAuthorities())
                .extracting(Object::toString).contains("ROLE_ADMIN", "ROLE_PROFESSOR");
    }

    @Test void supportsLegacyUserRoles() {
        String email = UUID.randomUUID() + "@isetforum.test";
        users.saveAndFlush(User.builder().name("Legacy").email(email).password(encoder.encode("Password!2026")).role(Role.USER).build());
        assertThat(service.currentUser(email).role()).isEqualTo(Role.STUDENT);
        assertThat(service.loadUserByUsername(email).getAuthorities()).extracting(Object::toString).contains("ROLE_STUDENT");
    }
}
