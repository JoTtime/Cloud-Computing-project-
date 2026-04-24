package com.example.billingmicroservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.Connection;
import java.sql.DriverManager;
import java.sql.ResultSet;
import java.sql.SQLException;
import java.sql.Statement;
import java.util.regex.Pattern;

public class PostgresqlDatabaseBootstrapListener implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final Logger log = LoggerFactory.getLogger(PostgresqlDatabaseBootstrapListener.class);
    private static final Pattern SAFE_DB_NAME = Pattern.compile("^[a-zA-Z][a-zA-Z0-9_]*$");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        Environment env = event.getEnvironment();
        if (!env.getProperty("medconnect.database.create-if-not-exists", Boolean.class, Boolean.TRUE)) {
            return;
        }

        String url = env.getProperty("spring.datasource.url");
        if (url == null || !url.startsWith("jdbc:postgresql:")) {
            return;
        }

        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");
        if (username == null) {
            log.warn("spring.datasource.username is missing; skip auto-create");
            return;
        }

        String adminDatabase = env.getProperty("medconnect.database.admin-database", "postgres");
        ParsedUrl parsed;
        try {
            parsed = parsePostgresqlUrl(url);
        } catch (IllegalArgumentException ex) {
            log.warn("could not parse spring.datasource.url ({}); skip auto-create", ex.getMessage());
            return;
        }

        if (parsed.targetDatabase().equalsIgnoreCase(adminDatabase)) {
            return;
        }

        if (!SAFE_DB_NAME.matcher(parsed.targetDatabase()).matches()) {
            log.warn("target database '{}' is not allowed for auto-create", parsed.targetDatabase());
            return;
        }

        String maintenanceUrl = "jdbc:postgresql://" + parsed.authority() + "/" + adminDatabase + parsed.querySuffix();
        try {
            ensureDatabaseExists(maintenanceUrl, username, password, parsed.targetDatabase());
        } catch (SQLException e) {
            throw new IllegalStateException("Failed to ensure PostgreSQL database '" + parsed.targetDatabase() + "' exists", e);
        }
    }

    private static void ensureDatabaseExists(String maintenanceUrl, String username, String password, String targetDatabase)
            throws SQLException {
        try (Connection connection = DriverManager.getConnection(maintenanceUrl, username, password)) {
            connection.setAutoCommit(true);
            if (databaseExists(connection, targetDatabase)) {
                return;
            }
            try (Statement statement = connection.createStatement()) {
                statement.executeUpdate("CREATE DATABASE \"" + targetDatabase.replace("\"", "\"\"") + "\"");
            }
        }
    }

    private static boolean databaseExists(Connection connection, String name) throws SQLException {
        try (var ps = connection.prepareStatement("SELECT 1 FROM pg_database WHERE datname = ?")) {
            ps.setString(1, name);
            try (ResultSet rs = ps.executeQuery()) {
                return rs.next();
            }
        }
    }

    private static ParsedUrl parsePostgresqlUrl(String url) {
        String prefix = "jdbc:postgresql://";
        String rest = url.substring(prefix.length());
        int slash = rest.indexOf('/');
        if (slash <= 0 || slash == rest.length() - 1) {
            throw new IllegalArgumentException("missing database path");
        }
        String authority = rest.substring(0, slash);
        String pathAndQuery = rest.substring(slash + 1);
        int q = pathAndQuery.indexOf('?');
        String pathDb = q >= 0 ? pathAndQuery.substring(0, q) : pathAndQuery;
        String querySuffix = q >= 0 ? pathAndQuery.substring(q) : "";
        String targetDatabase = URLDecoder.decode(pathDb, StandardCharsets.UTF_8);
        return new ParsedUrl(authority, targetDatabase, querySuffix);
    }

    private record ParsedUrl(String authority, String targetDatabase, String querySuffix) {
    }
}
