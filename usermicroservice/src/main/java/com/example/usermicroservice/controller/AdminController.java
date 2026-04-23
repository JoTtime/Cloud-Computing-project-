package com.example.usermicroservice.controller;

import com.example.usermicroservice.dto.response.AuthenticatedUser;
import com.example.usermicroservice.dto.response.UserResponse;
import com.example.usermicroservice.service.AdminService;
import com.example.usermicroservice.service.JwtService;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.List;
import java.util.Map;

@RestController
@RequestMapping("/api/admin")
public class AdminController {
    private final AdminService adminService;
    private final JwtService jwtService;

    public AdminController(AdminService adminService, JwtService jwtService) {
        this.adminService = adminService;
        this.jwtService = jwtService;
    }

    @GetMapping("/users")
    public ResponseEntity<Map<String, Object>> listUsers(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(required = false) String userType,
            @RequestParam(required = false) Boolean verified
    ) {
        AuthenticatedUser admin = jwtService.authenticate(authorization);
        List<UserResponse> users = adminService.getUsers(admin, userType, verified);
        return ResponseEntity.ok(Map.of("success", true, "users", users));
    }

    @GetMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> getUserProfile(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String id
    ) {
        AuthenticatedUser admin = jwtService.authenticate(authorization);
        UserResponse user = adminService.getUserProfile(admin, id);
        return ResponseEntity.ok(Map.of("success", true, "user", user));
    }

    @PatchMapping("/users/{id}/approve-doctor")
    public ResponseEntity<Map<String, Object>> approveDoctor(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String id
    ) {
        AuthenticatedUser admin = jwtService.authenticate(authorization);
        UserResponse user = adminService.approveDoctor(admin, id);
        return ResponseEntity.ok(Map.of("success", true, "message", "Doctor approved", "user", user));
    }

    @DeleteMapping("/users/{id}")
    public ResponseEntity<Map<String, Object>> deleteUser(
            @RequestHeader("Authorization") String authorization,
            @PathVariable String id
    ) {
        AuthenticatedUser admin = jwtService.authenticate(authorization);
        adminService.deleteUser(admin, id);
        return ResponseEntity.ok(Map.of("success", true, "message", "User deleted"));
    }

    @GetMapping("/statistics")
    public ResponseEntity<Map<String, Object>> getStatistics(
            @RequestHeader("Authorization") String authorization,
            @RequestParam(defaultValue = "week") String period
    ) {
        AuthenticatedUser admin = jwtService.authenticate(authorization);
        return ResponseEntity.ok(Map.of("success", true, "data", adminService.getRegistrationStatistics(admin, period)));
    }
}
