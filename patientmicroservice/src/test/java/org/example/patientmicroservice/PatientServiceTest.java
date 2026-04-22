package org.example.patientmicroservice;

import org.example.patientmicroservice.dto.request.LoginRequest;
import org.example.patientmicroservice.dto.request.RegisterRequest;
import org.example.patientmicroservice.dto.response.PatientResponse;
import org.example.patientmicroservice.exception.EmailAlreadyExistsException;
import org.example.patientmicroservice.model.Patient;
import org.example.patientmicroservice.repository.PatientRepository;
import org.example.patientmicroservice.security.JwtTokenProvider;
import org.example.patientmicroservice.service.PatientService;
import org.junit.jupiter.api.BeforeEach;
import org.junit.jupiter.api.DisplayName;
import org.junit.jupiter.api.Test;
import org.junit.jupiter.api.extension.ExtendWith;
import org.mockito.InjectMocks;
import org.mockito.Mock;
import org.mockito.junit.jupiter.MockitoExtension;
import org.springframework.security.authentication.AuthenticationManager;
import org.springframework.security.authentication.BadCredentialsException;
import org.springframework.security.authentication.UsernamePasswordAuthenticationToken;
import org.springframework.security.crypto.password.PasswordEncoder;

import java.time.LocalDate;
import java.util.Optional;

import static org.assertj.core.api.Assertions.*;
import static org.mockito.ArgumentMatchers.*;
import static org.mockito.Mockito.*;

@ExtendWith(MockitoExtension.class)
@DisplayName("PatientService Unit Tests")
class PatientServiceTest {

    @Mock private PatientRepository patientRepository;
    @Mock private PasswordEncoder passwordEncoder;
    @Mock private AuthenticationManager authenticationManager;
    @Mock private JwtTokenProvider tokenProvider;

    @InjectMocks
    private PatientService patientService;

    private RegisterRequest validRegisterRequest;

    @BeforeEach
    void setUp() {
        validRegisterRequest = new RegisterRequest();
        validRegisterRequest.setFirstName("Jean");
        validRegisterRequest.setLastName("Dupont");
        validRegisterRequest.setEmail("jean.dupont@example.com");
        validRegisterRequest.setPassword("SecurePass123");
        validRegisterRequest.setDateOfBirth(LocalDate.of(1990, 5, 15));
        validRegisterRequest.setGender(Patient.Gender.MALE);
        validRegisterRequest.setPhone("+237600000000");
        validRegisterRequest.setAddress("Yaoundé, Cameroun");
    }

    // ── Registration Tests ─────────────────────────────────────────────────────

    @Test
    @DisplayName("Register: valid data creates patient successfully")
    void register_withValidData_createsPatient() {
        when(patientRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode(anyString())).thenReturn("hashed-password");

        Patient savedPatient = Patient.builder()
                .id(1L)
                .firstName("Jean")
                .lastName("Dupont")
                .email("jean.dupont@example.com")
                .password("hashed-password")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .gender(Patient.Gender.MALE)
                .phone("+237600000000")
                .address("Yaoundé, Cameroun")
                .status(Patient.AccountStatus.ACTIVE)
                .build();

        when(patientRepository.save(any(Patient.class))).thenReturn(savedPatient);

        PatientResponse response = patientService.register(validRegisterRequest);

        assertThat(response).isNotNull();
        assertThat(response.getEmail()).isEqualTo("jean.dupont@example.com");
        assertThat(response.getFirstName()).isEqualTo("Jean");
        assertThat(response.getStatus()).isEqualTo(Patient.AccountStatus.ACTIVE);

        verify(patientRepository).save(any(Patient.class));
        verify(passwordEncoder).encode("SecurePass123");
    }

    @Test
    @DisplayName("Register: duplicate email throws EmailAlreadyExistsException")
    void register_withDuplicateEmail_throwsException() {
        when(patientRepository.existsByEmail("jean.dupont@example.com")).thenReturn(true);

        assertThatThrownBy(() -> patientService.register(validRegisterRequest))
                .isInstanceOf(EmailAlreadyExistsException.class)
                .hasMessageContaining("jean.dupont@example.com");

        verify(patientRepository, never()).save(any());
    }

    @Test
    @DisplayName("Register: password is encoded before saving")
    void register_passwordIsEncodedBeforeSaving() {
        when(patientRepository.existsByEmail(anyString())).thenReturn(false);
        when(passwordEncoder.encode("SecurePass123")).thenReturn("bcrypt-hash");

        Patient savedPatient = Patient.builder()
                .id(1L)
                .firstName("Jean")
                .lastName("Dupont")
                .email("jean.dupont@example.com")
                .password("bcrypt-hash")
                .dateOfBirth(LocalDate.of(1990, 5, 15))
                .gender(Patient.Gender.MALE)
                .status(Patient.AccountStatus.ACTIVE)
                .build();

        when(patientRepository.save(any(Patient.class))).thenReturn(savedPatient);

        patientService.register(validRegisterRequest);

        verify(passwordEncoder).encode("SecurePass123");
        verify(patientRepository).save(argThat(p -> "bcrypt-hash".equals(p.getPassword())));
    }

    // ── Login Tests ────────────────────────────────────────────────────────────

    @Test
    @DisplayName("Login: correct credentials returns token and patient")
    void login_withCorrectCredentials_returnsAuthResponse() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("jean.dupont@example.com");
        loginRequest.setPassword("SecurePass123");

        Patient patient = Patient.builder()
                .id(1L)
                .firstName("Jean")
                .lastName("Dupont")
                .email("jean.dupont@example.com")
                .password("hashed-password")
                .status(Patient.AccountStatus.ACTIVE)
                .build();

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenReturn(new UsernamePasswordAuthenticationToken("jean.dupont@example.com", null));
        when(tokenProvider.generateToken("jean.dupont@example.com")).thenReturn("mocked-jwt-token");
        when(patientRepository.findByEmail("jean.dupont@example.com")).thenReturn(Optional.of(patient));

        var authResponse = patientService.login(loginRequest);

        assertThat(authResponse).isNotNull();
        assertThat(authResponse.getToken()).isEqualTo("mocked-jwt-token");
        assertThat(authResponse.getPatient().getEmail()).isEqualTo("jean.dupont@example.com");
    }

    @Test
    @DisplayName("Login: wrong password throws BadCredentialsException")
    void login_withWrongPassword_throwsBadCredentialsException() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("jean.dupont@example.com");
        loginRequest.setPassword("WrongPassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> patientService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);

        verify(tokenProvider, never()).generateToken(anyString());
    }

    @Test
    @DisplayName("Login: non-existent email throws BadCredentialsException")
    void login_withNonExistentEmail_throwsBadCredentialsException() {
        LoginRequest loginRequest = new LoginRequest();
        loginRequest.setEmail("ghost@example.com");
        loginRequest.setPassword("AnyPassword");

        when(authenticationManager.authenticate(any(UsernamePasswordAuthenticationToken.class)))
                .thenThrow(new BadCredentialsException("Bad credentials"));

        assertThatThrownBy(() -> patientService.login(loginRequest))
                .isInstanceOf(BadCredentialsException.class);
    }
}

