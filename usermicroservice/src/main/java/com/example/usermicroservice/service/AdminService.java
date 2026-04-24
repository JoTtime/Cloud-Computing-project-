package com.example.usermicroservice.service;

import com.example.usermicroservice.Entity.UserAccount;
import com.example.usermicroservice.Entity.UserType;
import com.example.usermicroservice.dto.response.AuthenticatedUser;
import com.example.usermicroservice.dto.response.UserResponse;
import com.example.usermicroservice.repository.UserAccountRepository;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.web.server.ResponseStatusException;

import java.time.DayOfWeek;
import java.time.LocalDate;
import java.time.LocalDateTime;
import java.time.YearMonth;
import java.time.format.DateTimeFormatter;
import java.time.temporal.TemporalAdjusters;
import java.util.ArrayList;
import java.util.Comparator;
import java.util.LinkedHashMap;
import java.util.List;
import java.util.Map;
import java.util.stream.Collectors;

@Service
public class AdminService {
    private final UserAccountRepository userAccountRepository;

    public AdminService(UserAccountRepository userAccountRepository) {
        this.userAccountRepository = userAccountRepository;
    }

    public List<UserResponse> getUsers(AuthenticatedUser admin, String userType, Boolean verified) {
        requireAdmin(admin);
        List<UserAccount> users;
        if (userType != null && !userType.isBlank()) {
            UserType type = parseUserType(userType);
            users = userAccountRepository.findByUserType(type);
        } else {
            users = userAccountRepository.findAll();
        }
        return users.stream()
                .filter(u -> verified == null || u.isVerified() == verified)
                .sorted(Comparator.comparing(UserAccount::getCreatedAt, Comparator.nullsLast(Comparator.reverseOrder())))
                .map(this::toUserResponse)
                .collect(Collectors.toList());
    }

    public UserResponse getUserProfile(AuthenticatedUser admin, String userId) {
        requireAdmin(admin);
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        return toUserResponse(user);
    }

    @Transactional
    public UserResponse approveDoctor(AuthenticatedUser admin, String userId) {
        requireAdmin(admin);
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getUserType() != UserType.doctor) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Only doctor accounts can be approved");
        }
        user.setVerified(true);
        return toUserResponse(userAccountRepository.save(user));
    }

    @Transactional
    public void deleteUser(AuthenticatedUser admin, String userId) {
        requireAdmin(admin);
        UserAccount user = userAccountRepository.findById(userId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "User not found"));
        if (user.getUserType() == UserType.admin) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Admin account cannot be deleted");
        }
        userAccountRepository.delete(user);
    }

    public Map<String, Object> getRegistrationStatistics(AuthenticatedUser admin, String period) {
        requireAdmin(admin);
        String normalizedPeriod = (period == null || period.isBlank()) ? "week" : period.toLowerCase();

        switch (normalizedPeriod) {
            case "week":
                return buildWeeklyStats();
            case "month":
                return buildMonthlyStats();
            case "year":
                return buildYearlyStats();
            default:
                throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Period must be week, month, or year");
        }
    }

    private Map<String, Object> buildWeeklyStats() {
        LocalDate monday = LocalDate.now().with(TemporalAdjusters.previousOrSame(DayOfWeek.MONDAY));
        List<Map<String, Object>> patientSeries = new ArrayList<>();
        List<Map<String, Object>> doctorSeries = new ArrayList<>();
        long totalPatients = 0;
        long totalDoctors = 0;

        for (int i = 0; i < 7; i++) {
            LocalDate day = monday.plusDays(i);
            LocalDateTime start = day.atStartOfDay();
            LocalDateTime end = day.plusDays(1).atStartOfDay();
            long patientCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.patient, start, end);
            long doctorCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.doctor, start, end);
            totalPatients += patientCount;
            totalDoctors += doctorCount;
            patientSeries.add(Map.of("label", day.getDayOfWeek().name().substring(0, 3), "count", patientCount));
            doctorSeries.add(Map.of("label", day.getDayOfWeek().name().substring(0, 3), "count", doctorCount));
        }

        return statsPayload("week", totalPatients, totalDoctors, patientSeries, doctorSeries);
    }

    private Map<String, Object> buildMonthlyStats() {
        YearMonth now = YearMonth.now();
        List<Map<String, Object>> patientSeries = new ArrayList<>();
        List<Map<String, Object>> doctorSeries = new ArrayList<>();
        long totalPatients = 0;
        long totalDoctors = 0;

        for (int i = 1; i <= now.lengthOfMonth(); i++) {
            LocalDate day = now.atDay(i);
            LocalDateTime start = day.atStartOfDay();
            LocalDateTime end = day.plusDays(1).atStartOfDay();
            long patientCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.patient, start, end);
            long doctorCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.doctor, start, end);
            totalPatients += patientCount;
            totalDoctors += doctorCount;
            patientSeries.add(Map.of("label", String.valueOf(i), "count", patientCount));
            doctorSeries.add(Map.of("label", String.valueOf(i), "count", doctorCount));
        }

        return statsPayload("month", totalPatients, totalDoctors, patientSeries, doctorSeries);
    }

    private Map<String, Object> buildYearlyStats() {
        int year = LocalDate.now().getYear();
        List<Map<String, Object>> patientSeries = new ArrayList<>();
        List<Map<String, Object>> doctorSeries = new ArrayList<>();
        long totalPatients = 0;
        long totalDoctors = 0;
        DateTimeFormatter monthFmt = DateTimeFormatter.ofPattern("MMM");

        for (int month = 1; month <= 12; month++) {
            YearMonth ym = YearMonth.of(year, month);
            LocalDateTime start = ym.atDay(1).atStartOfDay();
            LocalDateTime end = ym.plusMonths(1).atDay(1).atStartOfDay();
            long patientCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.patient, start, end);
            long doctorCount = userAccountRepository.countByUserTypeAndCreatedAtBetween(UserType.doctor, start, end);
            totalPatients += patientCount;
            totalDoctors += doctorCount;
            patientSeries.add(Map.of("label", ym.atDay(1).format(monthFmt), "count", patientCount));
            doctorSeries.add(Map.of("label", ym.atDay(1).format(monthFmt), "count", doctorCount));
        }

        return statsPayload("year", totalPatients, totalDoctors, patientSeries, doctorSeries);
    }

    private Map<String, Object> statsPayload(String period,
                                             long totalPatients,
                                             long totalDoctors,
                                             List<Map<String, Object>> patientSeries,
                                             List<Map<String, Object>> doctorSeries) {
        Map<String, Object> payload = new LinkedHashMap<>();
        payload.put("period", period);
        payload.put("totals", Map.of(
                "patients", totalPatients,
                "doctors", totalDoctors,
                "allUsers", totalPatients + totalDoctors
        ));
        payload.put("patientSeries", patientSeries);
        payload.put("doctorSeries", doctorSeries);
        payload.put("pendingDoctorApprovals",
                userAccountRepository.findByUserType(UserType.doctor).stream().filter(u -> !u.isVerified()).count());
        return payload;
    }

    private UserResponse toUserResponse(UserAccount user) {
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

    private static UserType parseUserType(String value) {
        try {
            return UserType.valueOf(value.toLowerCase());
        } catch (Exception ex) {
            throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid userType");
        }
    }

    private static void requireAdmin(AuthenticatedUser user) {
        if (user == null || !user.isAdmin()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Admin access required");
        }
    }
}
