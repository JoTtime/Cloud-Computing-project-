package com.example.usermicroservice;

import com.example.usermicroservice.config.PostgresqlDatabaseBootstrapListener;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;

@SpringBootApplication
public class UsermicroserviceApplication {

	public static void main(String[] args) {
		SpringApplication app = new SpringApplication(UsermicroserviceApplication.class);
		app.addListeners(new PostgresqlDatabaseBootstrapListener());
		app.run(args);
	}

}
