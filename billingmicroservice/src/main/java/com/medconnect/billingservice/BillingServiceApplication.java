package com.medconnect.billingservice;

import com.medconnect.billingservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class BillingServiceApplication {
    public static void main(String[] args) {
        SpringApplication app = new SpringApplication(BillingServiceApplication.class);
        app.addListeners(new PostgresqlDatabaseBootstrapListener());
        app.run(args);
    }
}
