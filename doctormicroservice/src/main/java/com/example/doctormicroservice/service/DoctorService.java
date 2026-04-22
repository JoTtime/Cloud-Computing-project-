package com.example.doctormicroservice.service;

import com.example.doctormicroservice.dto.DoctorDto;
import com.example.doctormicroservice.dto.DoctorProfileUpdateRequest;
import com.example.doctormicroservice.model.DoctorEntity;
import com.example.doctormicroservice.repository.DoctorRepository;
import com.example.doctormicroservice.security.AuthenticatedUser;
import org.springframework.http.HttpStatus;
import org.springframework.stereotype.Service;
import org.springframework.web.server.ResponseStatusException;

import java.util.List;
import java.util.Locale;
import java.util.Map;

@Service
public class DoctorService {

    private final DoctorRepository doctorRepository;

    public DoctorService(DoctorRepository doctorRepository) {
        this.doctorRepository = doctorRepository;
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
                .orElseGet(() -> createShellDoctor(user.userId()));

        if (request.getFirstName() != null) doctor.setFirstName(request.getFirstName());
        if (request.getLastName() != null) doctor.setLastName(request.getLastName());
        if (request.getEmail() != null) doctor.setEmail(request.getEmail());
        if (request.getSpecialty() != null) doctor.setSpecialty(request.getSpecialty());
        if (request.getPhone() != null) doctor.setPhone(request.getPhone());
        if (request.getHospital() != null) doctor.setHospital(request.getHospital());
        if (request.getYearsOfExperience() != null) doctor.setYearsOfExperience(request.getYearsOfExperience());
        if (request.getConsultationFee() != null) doctor.setConsultationFee(request.getConsultationFee());
        if (request.getBio() != null) doctor.setBio(request.getBio());

        doctorRepository.save(doctor);
    }

    public Map<String, Object> completeOnboarding(AuthenticatedUser user) {
        if (!user.isDoctor()) {
            throw new ResponseStatusException(HttpStatus.FORBIDDEN, "Only doctors can complete onboarding");
        }
        DoctorEntity doctor = doctorRepository.findById(user.userId())
                .orElseGet(() -> createShellDoctor(user.userId()));
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

    private DoctorEntity createShellDoctor(String doctorId) {
        DoctorEntity doctor = new DoctorEntity();
        doctor.setId(doctorId);
        doctor.setFirstName("Doctor");
        doctor.setLastName("User");
        doctor.setEmail("doctor+" + doctorId + "@medconnect.local");
        doctor.setSpecialty("General Practice");
        doctor.setHospital("MedConnect Hospital");
        return doctor;
    }
}
