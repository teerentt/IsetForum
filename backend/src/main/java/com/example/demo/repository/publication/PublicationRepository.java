package com.example.demo.repository.publication;

import com.example.demo.model.publication.Publication;
import org.springframework.data.jpa.repository.JpaRepository;
import java.util.List;

public interface PublicationRepository extends JpaRepository<Publication, Long> {
    List<Publication> findByCommunityIdOrderByCreatedAtDescIdDesc(Long communityId);
    void deleteByCommunityId(Long communityId);
}
