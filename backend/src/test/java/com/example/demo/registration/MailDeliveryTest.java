package com.example.demo.registration;

import com.example.demo.enums.Role;
import com.example.demo.model.registration.RegistrationAuthorization;
import com.example.demo.repository.registration.RegistrationAuthorizationRepository;
import com.example.demo.repository.registration.EmailVerificationTokenRepository;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.service.registration.EmailVerificationService;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.http.MediaType;
import org.springframework.mail.MailSendException;
import org.springframework.mail.SimpleMailMessage;
import org.springframework.mail.javamail.JavaMailSender;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.support.TransactionTemplate;
import org.springframework.transaction.PlatformTransactionManager;
import org.mockito.ArgumentCaptor;
import java.time.LocalDateTime;
import java.util.UUID;
import static org.assertj.core.api.Assertions.assertThat;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.csrf;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles({"dev", "test"})
class MailDeliveryTest {
    @Autowired MockMvc mvc;
    @Autowired UserRepository users;
    @Autowired RegistrationAuthorizationRepository addresses;
    @Autowired EmailVerificationTokenRepository tokens;
    @Autowired PlatformTransactionManager transactions;
    @MockitoBean JavaMailSender sender;

    String authorize() {
        String email = UUID.randomUUID() + "@isetforum.test";
        var address = new RegistrationAuthorization();
        address.setEmail(email); address.setRole(Role.STUDENT); address.setUpdatedAt(LocalDateTime.now());
        addresses.saveAndFlush(address);
        return email;
    }
    void register(String email, int status) throws Exception {
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Mail Test\",\"email\":\"" + email + "\",\"password\":\"Password!2026\"}"))
                .andExpect(status().is(status));
    }
    String sentToken() {
        var message = ArgumentCaptor.forClass(SimpleMailMessage.class);
        verify(sender).send(message.capture());
        assertThat(message.getValue().getSubject()).isEqualTo("Confirmez votre compte IsetForum");
        assertThat(message.getValue().getFrom()).isEqualTo("noreply@isetforum.tn");
        return message.getValue().getText().split("token=")[1];
    }
    @Test void unavailableMailReturns503RollsBackRegistrationAndAllowsRetry() throws Exception {
        String email = authorize();
        doThrow(new MailSendException("SMTP indisponible")).when(sender).send(any(SimpleMailMessage.class));
        register(email, 503);
        assertThat(users.findByEmailIgnoreCase(email)).isEmpty();
        reset(sender);
        register(email, 201);
        String token = sentToken();
        var user = users.findByEmailIgnoreCase(email).orElseThrow();
        assertThat(user.isConfirmed()).isFalse();
        new TransactionTemplate(transactions).executeWithoutResult(tx ->
                assertThat(tokens.findByUserId(user.getId()).orElseThrow().getTokenHash()).isEqualTo(EmailVerificationService.hash(token)));
    }
    @Test void failedResendPreservesPreviousLinkAndItsOneTimeUse() throws Exception {
        String email = authorize(); register(email, 201);
        String token = sentToken();
        Long userId = users.findByEmailIgnoreCase(email).orElseThrow().getId();
        new TransactionTemplate(transactions).executeWithoutResult(tx -> {
            var value = tokens.findByUserId(userId).orElseThrow();
            value.setSentAt(LocalDateTime.now().minusMinutes(2)); tokens.saveAndFlush(value);
        });
        doThrow(new MailSendException("SMTP indisponible")).when(sender).send(any(SimpleMailMessage.class));
        mvc.perform(post("/api/auth/resend-confirmation").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"email\":\"" + email + "\"}")).andExpect(status().isServiceUnavailable());
        new TransactionTemplate(transactions).executeWithoutResult(tx ->
                assertThat(tokens.findByUserId(userId).orElseThrow().getTokenHash()).isEqualTo(EmailVerificationService.hash(token)));
        for (int expected : new int[]{200, 400}) {
            mvc.perform(post("/api/auth/confirm").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                    .content("{\"token\":\"" + token + "\"}")).andExpect(status().is(expected));
        }
    }
}
