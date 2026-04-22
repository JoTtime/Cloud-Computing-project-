package com.example.appointmentmicroservice;

import com.example.appointmentmicroservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class AppointmentmicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(AppointmentmicroserviceApplication.class);
        app.addListeners(new PostgresqlDatabaseBootstrapListener());
        app.run(args);
    }
}
