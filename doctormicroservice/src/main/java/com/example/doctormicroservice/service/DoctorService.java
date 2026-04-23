package com.example.doctormicroservice.service;

import com.example.doctormicroservice.dto.DoctorDto;
import com.example.doctormicroservice.dto.DoctorProfileUpdateRequest;
import com.example.doctormicroservice.model.DoctorEntity;
import com.example.doctormicroservice.repository.DoctorRepository;
import com.fasterxml.jackson.core.type.TypeReference;
import com.fasterxml.jackson.databind.ObjectMapper;
import com.example.doctormicroservice.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.LinkedHashMap;
import java.util.Map;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;
    private final ObjectMapper objectMapper;

    public DoctorService(DoctorRepository doctorRepository, ObjectMapper objectMapper) {
        this.doctorRepository = doctorRepository;
        this.objectMapper = objectMapper;
    }

    public List<DoctorDto> getDoctors(String specialty, String search) {
        String specialtyFilter = specialty == null ? "" : specialty.trim().toLowerCase(Locale.ENGLISH);
        String searchFilter = search == null ? "" : search.trim().toLowerCase(Locale.ENGLISH);

        return doctorRepository.findAll().stream()
                .filter(d -> {
                    if (specialtyFilter.isBlank() || "all".equals(specialtyFilter)) {
                        return true;
                    }
                    String doctorSpecialty = d.getSpecialty() == null ? "" : d.getSpecialty().toLowerCase(Locale.ENGLISH);
                    return doctorSpecialty.contains(specialtyFilter);
                })
                .filter(d -> {
                    if (searchFilter.isBlank()) {
                        return true;
                    }
                    String first = d.getFirstName() == null ? "" : d.getFirstName().toLowerCase(Locale.ENGLISH);
                    String last = d.getLastName() == null ? "" : d.getLastName().toLowerCase(Locale.ENGLISH);
                    String full = (first + " " + last).trim();
                    return first.contains(searchFilter) || last.contains(searchFilter) || full.contains(searchFilter);
                })
                .map(DoctorDto::fromEntity)
                .toList();
    }

    public DoctorDto getDoctorById(String id) {
        DoctorEntity doctor = doctorRepository.findById(id)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));
        return DoctorDto.fromEntity(doctor);
    }

    public void updateProfile(AuthenticatedUser user, DoctorProfileUpdateRequest request) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can update doctor profile");
        }
        DoctorEntity doctor = doctorRepository.findById(user.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Doctor profile not found for authenticated user"
                ));

        if (request.getFirstName() != null) doctor.setFirstName(request.getFirstName());
        if (request.getLastName() != null) doctor.setLastName(request.getLastName());
        if (request.getEmail() != null) doctor.setEmail(request.getEmail());
        if (request.getSpecialty() != null) doctor.setSpecialty(request.getSpecialty());
        if (request.getPhone() != null) doctor.setPhone(request.getPhone());
        if (request.getHospital() != null) doctor.setHospital(request.getHospital());
        if (request.getYearsOfExperience() != null) doctor.setYearsOfExperience(request.getYearsOfExperience());
        if (request.getConsultationFee() != null) doctor.setConsultationFee(request.getConsultationFee());
        if (request.getBio() != null) doctor.setBio(request.getBio());
        if (request.getAvailability() != null) {
            DoctorProfileUpdateRequest.Availability availability = request.getAvailability();
            if (availability.getSchedule() != null) {
                try {
                    doctor.setAvailabilityScheduleJson(objectMapper.writeValueAsString(availability.getSchedule()));
                } catch (Exception ex) {
                    throw new ResponseStatusException(HttpStatus.BAD_REQUEST, "Invalid availability schedule format");
                }
            }
            if (availability.getSlotDuration() != null) {
                doctor.setAvailabilitySlotDuration(availability.getSlotDuration());
            }
            if (availability.getLocation() != null) {
                doctor.setAvailabilityLocation(availability.getLocation());
            }
        }

        doctorRepository.save(doctor);
    }

    public Map<String, Object> completeOnboarding(AuthenticatedUser user) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can complete onboarding");
        }
        DoctorEntity doctor = doctorRepository.findById(user.userId())
                .orElseThrow(() -> new ResponseStatusException(
                        HttpStatus.NOT_FOUND,
                        "Doctor profile not found for authenticated user"
                ));
        doctor.setIsVerified(true);
        DoctorEntity saved = doctorRepository.save(doctor);
        return Map.of(
                "userId", saved.getId(),
                "_id", saved.getId(),
                "firstName", saved.getFirstName(),
                "lastName", saved.getLastName(),
                "email", saved.getEmail(),
                "phone", saved.getPhone() == null ? "" : saved.getPhone(),
                "address", saved.getAddress() == null ? "" : saved.getAddress(),
                "userType", "doctor",
                "isVerified", saved.getIsVerified() != null && saved.getIsVerified()
        );
    }

    public Map<String, Object> getAvailabilityConfig(String doctorId) {
        DoctorEntity doctor = doctorRepository.findById(doctorId)
                .orElseThrow(() -> new ResponseStatusException(HttpStatus.NOT_FOUND, "Doctor not found"));

        Map<String, Object> schedule = new LinkedHashMap<>();
        if (doctor.getAvailabilityScheduleJson() != null && !doctor.getAvailabilityScheduleJson().isBlank()) {
            try {
                schedule = objectMapper.readValue(
                        doctor.getAvailabilityScheduleJson(),
                        new TypeReference<LinkedHashMap<String, Object>>() {}
                );
            } catch (Exception ignored) {
                schedule = new LinkedHashMap<>();
            }
        }

        return Map.of(
                "schedule", schedule,
                "slotDuration", doctor.getAvailabilitySlotDuration() == null ? 30 : doctor.getAvailabilitySlotDuration(),
                "location", doctor.getAvailabilityLocation() == null ? "" : doctor.getAvailabilityLocation()
        );
    }

}
