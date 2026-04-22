package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.UserAccount;
import io.jsonwebtoken.Jwts;
import io.jsonwebtoken.security.Keys;
import io.jsonwebtoken.Claims;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;
import com.example.usermicroservice.dto.response.AuthenticatedUser;

import javax.crypto.SecretKey;
import java.nio.charset.StandardCharsets;
import java.util.Date;

@Service
public class JwtService {

    private final SecretKey signingKey;
    private final long expirationMs;

    public JwtService(
            @Value("${medconnect.jwt.secret}") String secret,
            @Value("${medconnect.jwt.expiration-ms}") long expirationMs
    ) {
        this.signingKey = resolveKey(secret);
        this.expirationMs = expirationMs;
    }

    private static SecretKey resolveKey(String secret) {
        if (secret.matches("^[0-9a-fA-F]{64}$")) {
            return Keys.hmacShaKeyFor(hexDecode(secret));
        }
        byte[] bytes = secret.getBytes(StandardCharsets.UTF_8);
        if (bytes.length < 32) {
            throw new IllegalStateException(
                    "JWT secret must be at least 32 UTF-8 bytes or exactly 64 hex characters for HS256"
            );
        }
        return Keys.hmacShaKeyFor(bytes);
    }

    private static byte[] hexDecode(String hex) {
        int len = hex.length();
        byte[] out = new byte[len / 2];
        for (int i = 0; i < len; i += 2) {
            out[i / 2] = (byte) ((Character.digit(hex.charAt(i), 16) << 4)
                    + Character.digit(hex.charAt(i + 1), 16));
        }
        return out;
    }

    public String generateToken(UserAccount user) {
        Date now = new Date();
        Date exp = new Date(now.getTime() + expirationMs);
        return Jwts.builder()
                .subject(user.getId())
                .claim("email", user.getEmail())
                .claim("userType", user.getUserType().name())
                .issuedAt(now)
                .expiration(exp)
                .signWith(signingKey)
                .compact();
    }

    public AuthenticatedUser authenticate(String authorizationHeader) {
        if (authorizationHeader == null || !authorizationHeader.startsWith("Bearer ")) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing or invalid Authorization header");
        }
        String token = authorizationHeader.substring(7);
        return authenticateToken(token);
    }

    public AuthenticatedUser authenticateToken(String token) {
        if (token == null || token.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Missing token");
        }
        Claims claims;
        try {
            claims = Jwts.parser().verifyWith(signingKey).build().parseSignedClaims(token).getPayload();
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Invalid or expired token");
        }
        String userId = claims.getSubject();
        String userType = claims.get("userType", String.class);
        if (userId == null || userId.isBlank() || userType == null || userType.isBlank()) {
            throw new ResponseStatusException(HttpStatus.UNAUTHORIZED, "Token is missing required claims");
        }
        return new AuthenticatedUser(userId, userType);
    }
}
