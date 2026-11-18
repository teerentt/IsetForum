package com.example.demo.sprint4;

import com.example.demo.dto.community.CommunityRequest;
import com.example.demo.enums.*;
import com.example.demo.model.registration.*;
import com.example.demo.repository.registration.*;
import com.example.demo.repository.attachment.PdfAttachmentRepository;
import com.example.demo.repository.user.UserRepository;
import com.example.demo.service.registration.*;
import com.example.demo.service.user.UserService;
import com.example.demo.service.community.*;
import com.example.demo.service.publication.PublicationService;
import com.example.demo.dto.publication.PublicationRequest;
import com.example.demo.service.attachment.PdfService;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.pdfbox.pdmodel.*;
import org.junit.jupiter.api.*;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.mock.web.MockMultipartFile;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.context.bean.override.mockito.MockitoBean;
import org.springframework.test.web.servlet.MockMvc;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.http.MediaType;
import org.springframework.web.server.ResponseStatusException;
import org.mockito.ArgumentCaptor;
import java.io.*;
import java.nio.file.*;
import java.time.LocalDateTime;
import java.util.*;
import static org.assertj.core.api.Assertions.*;
import static org.mockito.Mockito.*;
import static org.springframework.security.test.web.servlet.request.SecurityMockMvcRequestPostProcessors.*;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.*;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest @AutoConfigureMockMvc @ActiveProfiles({"dev","test"}) @Transactional
class RegistrationAndPdfTest {
    @Autowired RegistrationAuthorizationService authorizations;
    @Autowired RegistrationAuthorizationRepository addresses;
    @Autowired EmailVerificationService verification;
    @Autowired EmailVerificationTokenRepository tokens;
    @Autowired UserService users;
    @Autowired UserRepository userRepository;
    @Autowired CommunityService communities;
    @Autowired CommunityMembershipService memberships;
    @Autowired PublicationService publications;
    @Autowired PdfService pdfs;
    @Autowired PdfAttachmentRepository attachments;
    @Autowired MockMvc mvc;
    @MockitoBean ConfirmationMailService mail;
    static final String ADMIN = "admin@isetforum.test", STUDENT = "etudiant@isetforum.test", PROFESSOR = "professeur@isetforum.test";
    static byte[] pdf;
    @BeforeAll static void fixtures() throws Exception {
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage()); document.save(output); pdf = output.toByteArray();
        }
        Path directory = Path.of("target/fixtures"); Files.createDirectories(directory);
        Files.write(directory.resolve("document.pdf"), pdf);
        Files.write(directory.resolve("inscriptions-autorisees.xlsx"), excel(new String[][]{
                {"email","role"},{"etudiant.exemple@isetforum.test","STUDENT"},{"prof.exemple@isetforum.test","PROFESSOR"}}));
    }
    static byte[] excel(String[][] rows) throws Exception {
        try (var workbook = new XSSFWorkbook(); var output = new ByteArrayOutputStream()) {
            var sheet = workbook.createSheet("Autorisations");
            for (int i=0; i<rows.length; i++) { var row = sheet.createRow(i); for (int j=0; j<rows[i].length; j++) row.createCell(j).setCellValue(rows[i][j]); }
            workbook.write(output); return output.toByteArray();
        }
    }
    MockMultipartFile workbook(String[][] rows) throws Exception {
        return new MockMultipartFile("file","liste.xlsx","application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",excel(rows));
    }
    String address() { return UUID.randomUUID() + "@isetforum.test"; }
    void authorize(String email, Role role) {
        var value = new RegistrationAuthorization(); value.setEmail(email); value.setRole(role); value.setUpdatedAt(LocalDateTime.now()); addresses.saveAndFlush(value);
    }
    String register(String email) {
        users.register("Compte de test", email, "Password!2026");
        var captor = ArgumentCaptor.forClass(String.class); verify(mail).send(eq(email.trim().toLowerCase(Locale.ROOT)), captor.capture());
        return captor.getValue();
    }
    long community(CommunityVisibility visibility) {
        return communities.create(new CommunityRequest("Test " + UUID.randomUUID(),"Description",visibility),PROFESSOR).id();
    }
    long publication(long communityId) {
        var request = new PublicationRequest(); request.setTitle("Publication"); request.setContent("Contenu");
        return publications.create(communityId,request,PROFESSOR).id();
    }
    MockMultipartFile pdf(String name) { return new MockMultipartFile("file",name,"application/pdf",pdf); }
    void forbidden(Runnable action) { assertThatThrownBy(action::run).isInstanceOfSatisfying(ResponseStatusException.class, e -> assertThat(e.getStatusCode().value()).isEqualTo(403)); }

    @Test void importNormaliseRapporteDoublonsErreursEtRefuseAdmin() throws Exception {
        var report = authorizations.importExcel(workbook(new String[][]{{"email","role"},{"  A@EXEMPLE.TN ","student"},{"a@exemple.tn","PROFESSOR"},{"b@exemple.tn","PROFESSOR"},{"invalide","STUDENT"},{"admin@exemple.tn","ADMIN"}}),ADMIN);
        assertThat(report.imported()).isEqualTo(2); assertThat(report.duplicates()).isEqualTo(1);
        assertThat(report.invalidRows()).extracting(r -> r.row()).containsExactly(5,6);
        assertThat(addresses.findByEmail("a@exemple.tn").orElseThrow().getRole()).isEqualTo(Role.STUDENT);
        var second = authorizations.importExcel(workbook(new String[][]{{"email","role"},{"a@exemple.tn","PROFESSOR"}}),ADMIN);
        assertThat(second.updated()).isEqualTo(1);
        assertThat(addresses.findByEmail("b@exemple.tn")).isPresent();
    }
    @Test void importRefuseFichierCorrompuEtEnteteManquanteEtNonAdmin() throws Exception {
        assertThatThrownBy(() -> authorizations.importExcel(workbook(new String[][]{{"adresse","profil"}}),ADMIN)).isInstanceOf(ResponseStatusException.class);
        mvc.perform(multipart("/api/admin/registration-authorizations/import").file(workbook(new String[][]{{"email","role"}})).with(user(STUDENT).roles("STUDENT")).with(csrf())).andExpect(status().isForbidden());
        mvc.perform(multipart("/api/admin/registration-authorizations/import").file(new MockMultipartFile("file","liste.xlsx","application/octet-stream",new byte[]{1,2,3})).with(user(ADMIN).roles("ADMIN")).with(csrf())).andExpect(status().isBadRequest());
        mvc.perform(get("/api/admin/registration-authorizations").with(user(STUDENT).roles("ADMIN"))).andExpect(status().isForbidden());
        mvc.perform(get("/api/admin/registration-authorizations")).andExpect(status().isUnauthorized());
    }
    @Test void adresseAbsenteRefuseeEtRoleProfesseurAttribueSansChoixClient() throws Exception {
        String email = address();
        forbidden(() -> users.register("Inconnu",email,"Password!2026"));
        authorize(email,Role.PROFESSOR);
        mvc.perform(post("/api/auth/register").with(csrf()).contentType(MediaType.APPLICATION_JSON)
                .content("{\"name\":\"Enseignant\",\"email\":\""+email+"\",\"password\":\"Password!2026\",\"role\":\"ADMIN\"}"))
                .andExpect(status().isCreated()).andExpect(jsonPath("$.role").value("PROFESSOR"));
        assertThat(userRepository.findByEmailIgnoreCase(email).orElseThrow().isConfirmed()).isFalse();
    }
    @Test void compteBloquePuisConfirmationUniqueEtJetonHache() throws Exception {
        String email = address(); authorize(email,Role.STUDENT); String token = register(email);
        long id = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        assertThat(tokens.findByUserId(id).orElseThrow().getTokenHash()).isEqualTo(EmailVerificationService.hash(token)).isNotEqualTo(token);
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"email\":\""+email+"\",\"password\":\"Password!2026\"}")).andExpect(status().isForbidden());
        verification.confirm(token);
        assertThat(userRepository.findById(id).orElseThrow().isConfirmed()).isTrue();
        mvc.perform(post("/api/auth/login").with(csrf()).contentType(MediaType.APPLICATION_JSON).content("{\"email\":\""+email+"\",\"password\":\"Password!2026\"}")).andExpect(status().isOk());
        assertThatThrownBy(() -> verification.confirm(token)).isInstanceOf(ResponseStatusException.class);
    }
    @Test void expirationRenvoiEtAncienLienInvalide() {
        String email = address(); authorize(email,Role.STUDENT); String old = register(email);
        long id = userRepository.findByEmailIgnoreCase(email).orElseThrow().getId();
        var token = tokens.findByUserId(id).orElseThrow(); token.setExpiresAt(LocalDateTime.now().minusMinutes(1)); tokens.saveAndFlush(token);
        assertThatThrownBy(() -> verification.confirm(old)).isInstanceOf(ResponseStatusException.class);
        assertThatThrownBy(() -> verification.resend(email)).isInstanceOf(ResponseStatusException.class);
        token.setSentAt(LocalDateTime.now().minusMinutes(2)); tokens.saveAndFlush(token);
        clearInvocations(mail); verification.resend(email);
        var captor = ArgumentCaptor.forClass(String.class); verify(mail).send(eq(email),captor.capture());
        assertThat(captor.getValue()).isNotEqualTo(old);
        assertThatThrownBy(() -> verification.confirm(old)).isInstanceOf(ResponseStatusException.class);
        verification.confirm(captor.getValue());
    }
    @Test void retraitEtReimportNeModifientPasUnCompteExistant() throws Exception {
        String email = address(); authorize(email,Role.STUDENT); String token = register(email); verification.confirm(token);
        authorizations.importExcel(workbook(new String[][]{{"email","role"},{email,"PROFESSOR"}}),ADMIN);
        assertThat(userRepository.findByEmailIgnoreCase(email).orElseThrow().getRole()).isEqualTo(Role.STUDENT);
        authorizations.remove(addresses.findByEmail(email).orElseThrow().getId(),ADMIN);
        assertThat(users.loadUserByUsername(email).isEnabled()).isTrue();
        String other = address(); authorize(other,Role.STUDENT); authorizations.remove(addresses.findByEmail(other).orElseThrow().getId(),ADMIN);
        forbidden(() -> users.register("Compte",other,"Password!2026"));
    }
    @Test void renvoiInconnuNeRevelePasDeCompteEtCsrfObligatoire() throws Exception {
        verification.resend(address()); verifyNoInteractions(mail);
        mvc.perform(post("/api/auth/confirm").contentType(MediaType.APPLICATION_JSON).content("{\"token\":\"invalide\"}")).andExpect(status().isForbidden());
        mvc.perform(post("/api/auth/resend-confirmation").contentType(MediaType.APPLICATION_JSON).content("{\"email\":\"x@exemple.tn\"}")).andExpect(status().isForbidden());
    }
    @Test
    @Transactional(propagation = org.springframework.transaction.annotation.Propagation.NOT_SUPPORTED)
    void echecEnvoiAnnuleLaCreationDuCompteEtDuJeton() {
        String email = address(); authorize(email,Role.STUDENT);
        long tokenCount = tokens.count();
        doThrow(new ResponseStatusException(org.springframework.http.HttpStatus.SERVICE_UNAVAILABLE,"SMTP indisponible"))
                .when(mail).send(eq(email),anyString());
        try {
            assertThatThrownBy(() -> users.register("Compte",email,"Password!2026")).isInstanceOf(ResponseStatusException.class);
            assertThat(userRepository.findByEmailIgnoreCase(email)).isEmpty();
            assertThat(tokens.count()).isEqualTo(tokenCount);
        } finally {
            addresses.deleteById(addresses.findByEmail(email).orElseThrow().getId());
            reset(mail);
        }
    }
    @Test void pdfPriveProtegeParLienDirectEtAdminSansAdhesionPeutLire() throws Exception {
        long community = community(CommunityVisibility.PRIVATE), publication = publication(community);
        pdfs.save(community,true,pdf("cours.pdf"),ADMIN); pdfs.save(publication,false,pdf("publication.pdf"),PROFESSOR);
        var pending = memberships.join(community,STUDENT);
        for (String kind : new String[]{"communities","publications"}) {
            long id = kind.equals("communities") ? community : publication;
            mvc.perform(get("/api/"+kind+"/"+id+"/pdf")).andExpect(status().isUnauthorized());
            mvc.perform(get("/api/"+kind+"/"+id+"/pdf").with(user(STUDENT))).andExpect(status().isForbidden());
            mvc.perform(get("/api/"+kind+"/"+id+"/pdf/metadata").with(user(STUDENT))).andExpect(status().isForbidden());
            mvc.perform(get("/api/"+kind+"/"+id+"/pdf").with(user(ADMIN).roles("ADMIN"))).andExpect(status().isOk()).andExpect(content().bytes(pdf));
        }
        memberships.approve(pending.id(),ADMIN);
        mvc.perform(get("/api/publications/"+publication+"/pdf").with(user(STUDENT))).andExpect(status().isOk());
        memberships.leave(community,STUDENT);
        mvc.perform(get("/api/publications/"+publication+"/pdf").with(user(STUDENT))).andExpect(status().isForbidden());
    }
    @Test void droitsEcriturePdfEtRemplacementSansDoublon() {
        long community = community(CommunityVisibility.PUBLIC), post = publication(community);
        memberships.join(community,STUDENT);
        forbidden(() -> pdfs.save(community,true,pdf("cours.pdf"),PROFESSOR));
        forbidden(() -> pdfs.save(post,false,pdf("cours.pdf"),STUDENT));
        forbidden(() -> pdfs.save(post,false,pdf("cours.pdf"),ADMIN));
        pdfs.save(post,false,pdf("../cours.pdf"),PROFESSOR);
        long count = attachments.count();
        pdfs.save(post,false,pdf("nouveau.pdf"),PROFESSOR);
        assertThat(attachments.count()).isEqualTo(count);
        assertThat(pdfs.metadata(post,false,null).filename()).isEqualTo("nouveau.pdf");
        pdfs.delete(post,false,PROFESSOR);
        assertThat(pdfs.metadata(post,false,null)).isNull();
    }
    @Test void vraiPdfTailleEtExtensionVerifies() {
        long community = community(CommunityVisibility.PUBLIC);
        for (MockMultipartFile file : List.of(new MockMultipartFile("file","faux.pdf","application/pdf","%PDF- faux".getBytes()),
                new MockMultipartFile("file","vide.pdf","application/pdf",new byte[0]),
                new MockMultipartFile("file","trop.pdf","application/pdf",new byte[5242881]),pdf("cours.txt"))) {
            assertThatThrownBy(() -> pdfs.save(community,true,file,ADMIN)).isInstanceOf(ResponseStatusException.class);
        }
        try (var document = new PDDocument(); var output = new ByteArrayOutputStream()) {
            document.addPage(new PDPage());
            document.protect(new org.apache.pdfbox.pdmodel.encryption.StandardProtectionPolicy("secret","secret",new org.apache.pdfbox.pdmodel.encryption.AccessPermission()));
            document.save(output);
            assertThatThrownBy(() -> pdfs.save(community,true,new MockMultipartFile("file","secret.pdf","application/pdf",output.toByteArray()),ADMIN)).isInstanceOf(ResponseStatusException.class);
        } catch (IOException error) { throw new RuntimeException(error); }
    }
    @Test void pdfPublicEtNettoyageEnCascade() throws Exception {
        long community = community(CommunityVisibility.PUBLIC), post = publication(community);
        pdfs.save(community,true,pdf("communaute.pdf"),ADMIN); pdfs.save(post,false,pdf("publication.pdf"),PROFESSOR);
        mvc.perform(get("/api/communities/"+community+"/pdf")).andExpect(status().isOk()).andExpect(header().string("Cache-Control","no-store"));
        publications.delete(post,PROFESSOR); attachments.flush();
        assertThat(attachments.findByPublicationId(post)).isEmpty();
        communities.delete(community,ADMIN); attachments.flush();
        assertThat(attachments.findByCommunityId(community)).isEmpty();
    }
}
