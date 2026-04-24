package com.example.usermicroservice.config;

import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.Entity.UserType;
import com.example.usermicroservice.repository.UserAccountRepository;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.boot.CommandLineRunner;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Component;

@Component
public class AdminBootstrap implements CommandLineRunner {
    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;

    @Value("${medconnect.admin.email:admin@medconnect.com}")
    private String adminEmail;

    @Value("${medconnect.admin.password:Admin@12345}")
    private String adminPassword;

    @Value("${medconnect.admin.first-name:System}")
    private String firstName;

    @Value("${medconnect.admin.last-name:Admin}")
    private String lastName;

    @Value("${medconnect.admin.force-reset-password:true}")
    private boolean forceResetPassword;

    public AdminBootstrap(UserAccountRepository userAccountRepository, PasswordEncoder passwordEncoder) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
    }

    @Override
    public void run(String... args) {
        userAccountRepository.findByEmailIgnoreCase(adminEmail).ifPresentOrElse(existing -> {
            if (existing.getUserType() != UserType.admin || !existing.isVerified()) {
                existing.setUserType(UserType.admin);
                existing.setVerified(true);
            }
            if (forceResetPassword) {
                existing.setPasswordHash(passwordEncoder.encode(adminPassword));
            }
            userAccountRepository.save(existing);
        }, () -> {
            UserAccount admin = new UserAccount();
            admin.setEmail(adminEmail.toLowerCase());
            admin.setPasswordHash(passwordEncoder.encode(adminPassword));
            admin.setFirstName(firstName);
            admin.setLastName(lastName);
            admin.setUserType(UserType.admin);
            admin.setVerified(true);
            userAccountRepository.save(admin);
        });
    }
}
