package com.example.demo.service.registration;

import com.example.demo.dto.registration.*;
import com.example.demo.enums.Role;
import com.example.demo.model.registration.RegistrationAuthorization;
import com.example.demo.repository.registration.RegistrationAuthorizationRepository;
import com.example.demo.service.community.CommunityAccessService;
import jakarta.validation.Validator;
import jakarta.validation.constraints.Email;
import jakarta.validation.constraints.NotBlank;
import lombok.RequiredArgsConstructor;
import org.apache.poi.xssf.usermodel.XSSFWorkbook;
import org.apache.poi.ss.usermodel.*;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.multipart.MultipartFile;
import org.springframework.web.server.ResponseStatusException;
import java.time.LocalDateTime;
import java.util.*;

@Service @RequiredArgsConstructor @Transactional
public class RegistrationAuthorizationService {
    private final RegistrationAuthorizationRepository repository;
    private final CommunityAccessService access;
    private final Validator validator;
    private record Address(@NotBlank @Email String email) {}
    public static String normalize(String email) { return email.trim().toLowerCase(Locale.ROOT); }

    @Transactional(readOnly = true)
    public List<AuthorizationResponse> list(String email) {
        access.requireAdmin(email);
        return repository.findAllByOrderByEmailAsc().stream().map(AuthorizationResponse::from).toList();
    }
    public void remove(Long id, String email) {
        access.requireAdmin(email);
        var value = repository.findById(id).orElseThrow(() -> bad(HttpStatus.NOT_FOUND, "Autorisation introuvable."));
        repository.delete(value);
    }
    public ImportReport importExcel(MultipartFile file, String actor) {
        access.requireAdmin(actor);
        if (file.isEmpty() || file.getSize() > 2 * 1024 * 1024 || file.getOriginalFilename() == null
                || !file.getOriginalFilename().toLowerCase(Locale.ROOT).endsWith(".xlsx")) {
            throw bad(HttpStatus.BAD_REQUEST, "Choisissez un fichier .xlsx de 2 Mo maximum.");
        }
        int imported = 0, updated = 0, duplicates = 0;
        List<ImportReport.RowError> errors = new ArrayList<>();
        Set<String> seen = new HashSet<>();
        try (var workbook = new XSSFWorkbook(file.getInputStream())) {
            if (workbook.getNumberOfSheets() == 0) throw bad(HttpStatus.BAD_REQUEST, "Le classeur est vide.");
            Sheet sheet = workbook.getSheetAt(0);
            if (sheet.getLastRowNum() > 5000) throw bad(HttpStatus.BAD_REQUEST, "Le fichier est limité à 5 000 lignes.");
            Row header = sheet.getRow(0);
            int emailColumn = -1, roleColumn = -1;
            DataFormatter formatter = new DataFormatter(Locale.ROOT);
            if (header != null) for (Cell cell : header) {
                String name = formatter.formatCellValue(cell).trim().toLowerCase(Locale.ROOT);
                if (name.equals("email")) emailColumn = cell.getColumnIndex();
                if (name.equals("role")) roleColumn = cell.getColumnIndex();
            }
            if (emailColumn < 0 || roleColumn < 0) throw bad(HttpStatus.BAD_REQUEST, "La première ligne doit contenir les colonnes email et role.");
            for (int index = 1; index <= sheet.getLastRowNum(); index++) {
                Row row = sheet.getRow(index);
                if (row == null) continue;
                Cell emailCell = row.getCell(emailColumn), roleCell = row.getCell(roleColumn);
                String email = normalize(formatter.formatCellValue(emailCell));
                String role = formatter.formatCellValue(roleCell).trim().toUpperCase(Locale.ROOT);
                if (email.isEmpty() && role.isEmpty()) continue;
                if ((emailCell != null && emailCell.getCellType() == CellType.FORMULA)
                        || (roleCell != null && roleCell.getCellType() == CellType.FORMULA)
                        || email.length() > 254 || !validator.validate(new Address(email)).isEmpty()
                        || (!role.equals("STUDENT") && !role.equals("PROFESSOR"))) {
                    errors.add(new ImportReport.RowError(index + 1, "Adresse invalide ou rôle différent de STUDENT / PROFESSOR."));
                    continue;
                }
                if (!seen.add(email)) { duplicates++; continue; }
                var existing = repository.findByEmail(email);
                RegistrationAuthorization value = existing.orElseGet(RegistrationAuthorization::new);
                if (existing.isPresent()) updated++; else imported++;
                value.setEmail(email); value.setRole(Role.valueOf(role)); value.setUpdatedAt(LocalDateTime.now());
                repository.save(value);
            }
            return new ImportReport(imported, updated, duplicates, errors);
        } catch (ResponseStatusException error) { throw error; }
        catch (Exception error) {
            org.slf4j.LoggerFactory.getLogger(RegistrationAuthorizationService.class).warn("Import Excel refusé : {}", error.toString());
            throw bad(HttpStatus.BAD_REQUEST, "Le fichier Excel est illisible ou invalide.");
        }
    }
    private ResponseStatusException bad(HttpStatus status, String message) { return new ResponseStatusException(status, message); }
}
