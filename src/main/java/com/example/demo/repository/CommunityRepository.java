package com.example.demo.repository;

import com.example.demo.model.Community;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface CommunityRepository extends JpaRepository<Community, Long> {
    List<Community> findAllByOrderByCreatedAtDescIdDesc();
    boolean existsByName(String name);
}
