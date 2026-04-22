package com.example.appointmentmicroservice.dto;

import java.util.List;

public record AvailabilityDto(
        String date,
        String dayName,
        List<TimeSlotDto> slots,
        int slotDuration,
        String location
) {
}
