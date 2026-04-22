package org.example.patientmicroservice;

import com.fasterxml.jackson.databind.ObjectMapper;
import org.example.patientmicroservice.dto.request.LoginRequest;
import org.example.patientmicroservice.dto.request.RegisterRequest;
import org.example.patientmicroservice.dto.response.AuthResponse;
import org.example.patientmicroservice.dto.response.PatientResponse;
import org.example.patientmicroservice.exception.EmailAlreadyExistsException;
import org.example.patientmicroservice.model.Patient;
import org.example.patientmicroservice.security.JwtTokenProvider;
import org.example.patientmicroservice.service.PatientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.boot.test.autoconfigure.web.servlet.AutoConfigureMockMvc;
import org.springframework.boot.test.context.SpringBootTest;
import org.springframework.boot.test.mock.mockito.MockBean;
import org.springframework.http.MediaType;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.test.context.ActiveProfiles;
import org.springframework.test.web.servlet.MockMvc;

import java.time.LocalDate;
import java.time.LocalDateTime;

import static org.mockito.ArgumentMatchers.any;
import static org.mockito.Mockito.when;
import static org.springframework.test.web.servlet.request.MockMvcRequestBuilders.post;
import static org.springframework.test.web.servlet.result.MockMvcResultMatchers.*;

@SpringBootTest
@AutoConfigureMockMvc
@ActiveProfiles("test")
@DisplayName("PatientController Integration Tests")
class PatientControllerTest {

    @Autowired
    private MockMvc mockMvc;

    @Autowired
    private ObjectMapper objectMapper;

    @MockBean
    private PatientService patientService;

    @MockBean
    private JwtTokenProvider jwtTokenProvider;

    private RegisterRequest validRegisterRequest;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setFirstName("Marie");
        validRegisterRequest.setLastName("Curie");
        validRegisterRequest.setEmail("marie.curie@example.com");
        validRegisterRequest.setPassword("SecurePass123");
        validRegisterRequest.setDateOfBirth(LocalDate.of(1985, 3, 20));
        validRegisterRequest.setGender(Patient.Gender.FEMALE);
        validRegisterRequest.setPhone("+237699000000");
        validRegisterRequest.setAddress("Douala, Cameroun");
    }

    // ── Registration ───────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /patients/register — valid request returns 201")
    void register_validRequest_returns201() throws Exception {
        PatientResponse mockResponse = PatientResponse.builder()
                .id(1L)
                .firstName("Marie")
                .lastName("Curie")
                .email("marie.curie@example.com")
                .status(Patient.AccountStatus.ACTIVE)
                .gender(Patient.Gender.FEMALE)
                .dateOfBirth(LocalDate.of(1985, 3, 20))
                .createdAt(LocalDateTime.now())
                .build();

        when(patientService.register(any(RegisterRequest.class))).thenReturn(mockResponse);

        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isCreated())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.email").value("marie.curie@example.com"))
                .andExpect(jsonPath("$.data.status").value("ACTIVE"));
    }

    @Test
    @DisplayName("POST /patients/register — missing firstName returns 400")
    void register_missingFirstName_returns400() throws Exception {
        validRegisterRequest.setFirstName(null);

        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.firstName").exists());
    }

    @Test
    @DisplayName("POST /patients/register — invalid email returns 400")
    void register_invalidEmail_returns400() throws Exception {
        validRegisterRequest.setEmail("not-an-email");

        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data.email").exists());
    }

    @Test
    @DisplayName("POST /patients/register — password too short returns 400")
    void register_shortPassword_returns400() throws Exception {
        validRegisterRequest.setPassword("abc");

        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.password").exists());
    }

    @Test
    @DisplayName("POST /patients/register — duplicate email returns 409")
    void register_duplicateEmail_returns409() throws Exception {
        when(patientService.register(any(RegisterRequest.class)))
                .thenThrow(new EmailAlreadyExistsException("marie.curie@example.com"));

        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(validRegisterRequest)))
                .andExpect(status().isConflict())
                .andExpect(jsonPath("$.success").value(false));
    }

    @Test
    @DisplayName("POST /patients/register — missing all fields returns 400 with multiple errors")
    void register_emptyBody_returns400WithMultipleErrors() throws Exception {
        mockMvc.perform(post("/patients/register")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content("{}"))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.data").isMap());
    }

    // ── Login ──────────────────────────────────────────────────────────────────

    @Test
    @DisplayName("POST /patients/login — correct credentials returns 200 with token")
    void login_validCredentials_returns200() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("marie.curie@example.com");
        loginRequest.setPassword("SecurePass123");

        PatientResponse patientResponse = PatientResponse.builder()
                .id(1L)
                .email("marie.curie@example.com")
                .firstName("Marie")
                .lastName("Curie")
                .status(Patient.AccountStatus.ACTIVE)
                .build();

        AuthResponse authResponse = new AuthResponse("mocked-jwt-token", patientResponse);
        when(patientService.login(any(LoginRequest.class))).thenReturn(authResponse);

        mockMvc.perform(post("/patients/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isOk())
                .andExpect(jsonPath("$.success").value(true))
                .andExpect(jsonPath("$.data.token").value("mocked-jwt-token"))
                .andExpect(jsonPath("$.data.patient.email").value("marie.curie@example.com"));
    }

    @Test
    @DisplayName("POST /patients/login — wrong password returns 401")
    void login_wrongPassword_returns401() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("marie.curie@example.com");
        loginRequest.setPassword("WrongPassword");

        when(patientService.login(any(LoginRequest.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        mockMvc.perform(post("/patients/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isUnauthorized())
                .andExpect(jsonPath("$.success").value(false))
                .andExpect(jsonPath("$.message").value("Invalid email or password"));
    }

    @Test
    @DisplayName("POST /patients/login — missing email returns 400")
    void login_missingEmail_returns400() throws Exception {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setPassword("SecurePass123");

        mockMvc.perform(post("/patients/login")
                        .contentType(MediaType.APPLICATION_JSON)
                        .content(objectMapper.writeValueAsString(loginRequest)))
                .andExpect(status().isBadRequest())
                .andExpect(jsonPath("$.data.email").exists());
    }
}

