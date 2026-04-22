package com.example.appointmentmicroservice.repository;

import com.example.appointmentmicroservice.model.AppointmentEntity;
import com.example.appointmentmicroservice.model.AppointmentStatus;
import org.springframework.data.jpa.repository.JpaRepository;

import java.time.LocalDate;
import java.time.LocalTime;
import java.util.Collection;
import java.util.List;

public interface AppointmentRepository extends JpaRepository<AppointmentEntity, String> {

    List<AppointmentEntity> findByPatientIdOrderByAppointmentDateAscStartTimeAsc(String patientId);

    List<AppointmentEntity> findByPatientIdAndStatusOrderByAppointmentDateAscStartTimeAsc(String patientId, AppointmentStatus status);

    List<AppointmentEntity> findByDoctorIdOrderByAppointmentDateAscStartTimeAsc(String doctorId);

    List<AppointmentEntity> findByDoctorIdAndStatusOrderByAppointmentDateAscStartTimeAsc(String doctorId, AppointmentStatus status);

    List<AppointmentEntity> findByDoctorIdAndAppointmentDateOrderByStartTimeAsc(String doctorId, LocalDate appointmentDate);

    List<AppointmentEntity> findByDoctorIdAndAppointmentDateAndStatusOrderByStartTimeAsc(
            String doctorId,
            LocalDate appointmentDate,
            AppointmentStatus status
    );

    List<AppointmentEntity> findByDoctorIdAndAppointmentDateAndStatusNotInOrderByStartTimeAsc(
            String doctorId,
            LocalDate appointmentDate,
            Collection<AppointmentStatus> excludedStatuses
    );

    List<AppointmentEntity> findByDoctorIdAndAppointmentDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNotIn(
            String doctorId,
            LocalDate appointmentDate,
            LocalTime endTime,
            LocalTime startTime,
            Collection<AppointmentStatus> excludedStatuses
    );

    List<AppointmentEntity> findByPatientIdAndAppointmentDateAndStartTimeLessThanAndEndTimeGreaterThanAndStatusNotIn(
            String patientId,
            LocalDate appointmentDate,
            LocalTime endTime,
            LocalTime startTime,
            Collection<AppointmentStatus> excludedStatuses
    );
}
