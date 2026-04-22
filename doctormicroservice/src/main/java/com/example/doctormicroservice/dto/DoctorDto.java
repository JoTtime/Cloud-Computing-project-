package com.example.doctormicroservice.dto;

import com.example.doctormicroservice.model.DoctorEntity;

public record DoctorDto(
        String _id,
        String firstName,
        String lastName,
        String email,
        String phone,
        String address,
        String specialty,
        String hospital,
        double rating,
        int reviewCount,
        boolean availableToday,
        boolean isVerified
) {
    public static DoctorDto fromEntity(DoctorEntity doctor) {
        return new DoctorDto(
                doctor.getId(),
                doctor.getFirstName(),
                doctor.getLastName(),
                doctor.getEmail(),
                doctor.getPhone(),
                doctor.getAddress(),
                doctor.getSpecialty(),
                doctor.getHospital(),
                doctor.getRating() == null ? 0.0 : doctor.getRating(),
                doctor.getReviewCount() == null ? 0 : doctor.getReviewCount(),
                doctor.getAvailableToday() != null && doctor.getAvailableToday(),
                doctor.getIsVerified() != null && doctor.getIsVerified()
        );
    }
}
