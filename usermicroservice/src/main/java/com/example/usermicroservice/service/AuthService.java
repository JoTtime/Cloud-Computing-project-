package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.UserType;
import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.repository.UserAccountRepository;
import com.example.usermicroservice.service.JwtService;
import com.example.usermicroservice.dto.response.AuthPayload;
import com.example.usermicroservice.dto.response.AuthResponse;
import com.example.usermicroservice.dto.request.LoginRequest;
import com.example.usermicroservice.dto.request.SignupRequest;
import com.example.usermicroservice.dto.response.UserResponse;
import org.springframework.http.HttpStatus;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

@Service
public class AuthService {

    private final UserAccountRepository userAccountRepository;
    private final PasswordEncoder passwordEncoder;
    private final JwtService jwtService;

    public AuthService(
            UserAccountRepository userAccountRepository,
            PasswordEncoder passwordEncoder,
            JwtService jwtService
    ) {
        this.userAccountRepository = userAccountRepository;
        this.passwordEncoder = passwordEncoder;
        this.jwtService = jwtService;
    }

    @Transactional
    public AuthResponse signup(SignupRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        if (userAccountRepository.existsByEmailIgnoreCase(email)) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "An account with this email already exists");
        }

        UserAccount user = new UserAccount();
        user.setEmail(email);
        user.setPasswordHash(passwordEncoder.encode(request.getPassword()));
        user.setFirstName(request.getFirstName().trim());
        user.setLastName(request.getLastName().trim());
        user.setPhone(trimToNull(request.getPhone()));
        user.setAddress(trimToNull(request.getAddress()));
        if (request.getUserType() == UserType.admin) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin accounts cannot be created via signup");
        }
        user.setUserType(request.getUserType());
        // Doctors require admin approval before login; patients can login immediately.
        user.setVerified(request.getUserType() != UserType.doctor);

        userAccountRepository.save(user);

        String token = jwtService.generateToken(user);
        return AuthResponse.ok(
                "Account created successfully",
                new AuthPayload(toUserResponse(user), token)
        );
    }

    public AuthResponse login(LoginRequest request) {
        String email = request.getEmail().trim().toLowerCase();
        UserAccount user = userAccountRepository.findByEmailIgnoreCase(email)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password"));

        if (!passwordEncoder.matches(request.getPassword(), user.getPasswordHash())) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid email or password");
        }
        if (user.getUserType() == UserType.doctor && !user.isVerified()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Your doctor account is pending admin approval");
        }

        String token = jwtService.generateToken(user);
        return AuthResponse.ok(
                "Login successful",
                new AuthPayload(toUserResponse(user), token)
        );
    }

    private static UserResponse toUserResponse(UserAccount user) {
        UserResponse dto = new UserResponse();
        dto.setUserId(user.getId());
        dto.setEmail(user.getEmail());
        dto.setFirstName(user.getFirstName());
        dto.setLastName(user.getLastName());
        dto.setPhone(user.getPhone());
        dto.setAddress(user.getAddress());
        dto.setUserType(user.getUserType());
        dto.setVerified(user.isVerified());
        dto.setCreatedAt(user.getCreatedAt());
        return dto;
    }

    private static String trimToNull(String s) {
        if (s == null) {
            return null;
        }
        String t = s.trim();
        return t.isEmpty() ? null : t;
    }
}
