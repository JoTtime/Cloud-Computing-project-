package com.example.usermicroservice.repository;

import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.Entity.UserType;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDateTime;
import java.util.List;
import java.util.Optional;

public interface UserAccountRepository extends JpaRepository<UserAccount, String> {

    Optional<UserAccount> findByEmailIgnoreCase(String email);

    boolean existsByEmailIgnoreCase(String email);

    List<UserAccount> findByUserType(UserType userType);

    long countByUserTypeAndCreatedAtBetween(UserType userType, LocalDateTime start, LocalDateTime end);
}
