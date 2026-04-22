package org.example.patientmicroservice.dto.response;

import org.example.patientmicroservice.model.Allergy;
import org.example.patientmicroservice.model.MedicalCondition;
import org.example.patientmicroservice.model.Patient;
import lombok.Builder;
import lombok.Data;

import java.time.LocalDate;
import java.util.List;

@Data
@Builder
public class MedicalHistoryResponse {

    private Long patientId;
    private String fullName;
    private List<ConditionDto> conditions;
    private List<AllergyDto> allergies;
    private String notes;

    @Data
    @Builder
    public static class ConditionDto {
        private Long id;
        private String condition;
        private LocalDate diagnosedDate;
        private String notes;

        public static ConditionDto from(MedicalCondition mc) {
            return ConditionDto.builder()
                    .id(mc.getId())
                    .condition(mc.getCondition())
                    .diagnosedDate(mc.getDiagnosedDate())
                    .notes(mc.getNotes())
                    .build();
        }
    }

    @Data
    @Builder
    public static class AllergyDto {
        private Long id;
        private String name;
        private Allergy.Severity severity;
        private String reaction;

        public static AllergyDto from(Allergy allergy) {
            return AllergyDto.builder()
                    .id(allergy.getId())
                    .name(allergy.getName())
                    .severity(allergy.getSeverity())
                    .reaction(allergy.getReaction())
                    .build();
        }
    }

    public static MedicalHistoryResponse from(Patient patient) {
        return MedicalHistoryResponse.builder()
                .patientId(patient.getId())
                .fullName(patient.getFirstName() + " " + patient.getLastName())
                .conditions(patient.getConditions().stream().map(ConditionDto::from).toList())
                .allergies(patient.getAllergies().stream().map(AllergyDto::from).toList())
                .notes(patient.getNotes())
                .build();
    }
}

