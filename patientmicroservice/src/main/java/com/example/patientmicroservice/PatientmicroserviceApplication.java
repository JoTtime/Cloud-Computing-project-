package com.example.patientmicroservice;

import com.example.patientmicroservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class PatientmicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(PatientmicroserviceApplication.class);
        app.addListeners(new PostgresqlDatabaseBootstrapListener());
        app.run(args);
    }
}
