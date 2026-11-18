package com.example.demo.repository.registration;

import com.example.demo.model.registration.RegistrationAuthorization;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.*;

public interface RegistrationAuthorizationRepository extends JpaRepository<RegistrationAuthorization, Long> {
    Optional<RegistrationAuthorization> findByEmail(String email);
    List<RegistrationAuthorization> findAllByOrderByEmailAsc();
}
