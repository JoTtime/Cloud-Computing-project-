package com.example.doctormicroservice;

import com.example.doctormicroservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class DoctormicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(DoctormicroserviceApplication.class);
        app.addListeners(new PostgresqlDatabaseBootstrapListener());
        app.run(args);
    }
}
