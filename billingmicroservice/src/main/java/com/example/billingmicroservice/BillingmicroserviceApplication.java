package com.example.billingmicroservice;

import com.example.billingmicroservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BillingmicroserviceApplication {

    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(BillingmicroserviceApplication.class);
        app.addListeners(new PostgresqlDatabaseBootstrapListener());
        app.run(args);
    }
}
