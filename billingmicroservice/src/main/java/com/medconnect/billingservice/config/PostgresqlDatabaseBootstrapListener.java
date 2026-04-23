package com.medconnect.billingservice.config;

import org.slf4j.Logger;
import org.slf4j.LoggerFactory;
import org.springframework.boot.context.event.ApplicationEnvironmentPreparedEvent;
import org.springframework.context.ApplicationListener;
import org.springframework.core.env.Environment;

import java.net.URLDecoder;
import java.nio.charset.StandardCharsets;
import java.sql.*;
import java.util.regex.Pattern;

public class PostgresqlDatabaseBootstrapListener
        implements ApplicationListener<ApplicationEnvironmentPreparedEvent> {

    private static final Logger log = LoggerFactory.getLogger(PostgresqlDatabaseBootstrapListener.class);
    private static final Pattern SAFE = Pattern.compile("^[a-zA-Z][a-zA-Z0-9_]*$");

    @Override
    public void onApplicationEvent(ApplicationEnvironmentPreparedEvent event) {
        Environment env = event.getEnvironment();
        String url = env.getProperty("spring.datasource.url");
        if (url == null || !url.startsWith("jdbc:postgresql:")) return;

        String username = env.getProperty("spring.datasource.username");
        String password = env.getProperty("spring.datasource.password");
        String adminDb  = env.getProperty("medconnect.database.admin-database", "postgres");

        ParsedUrl p;
        try { p = parse(url); } catch (Exception e) { return; }

        if (!SAFE.matcher(p.db()).matches()) return;

        String adminUrl = "jdbc:postgresql://" + p.host() + "/" + adminDb + p.query();
        try (Connection c = DriverManager.getConnection(adminUrl, username, password)) {
            c.setAutoCommit(true);
            try (PreparedStatement ps = c.prepareStatement("SELECT 1 FROM pg_database WHERE datname=?")) {
                ps.setString(1, p.db());
                if (!ps.executeQuery().next()) {
                    log.info("Creating database '{}'", p.db());
                    try (Statement s = c.createStatement()) {
                        s.executeUpdate("CREATE DATABASE \"" + p.db() + "\"");
                    }
                }
            }
        } catch (SQLException e) {
            throw new IllegalStateException("Cannot create database '" + p.db() + "': " + e.getMessage(), e);
        }
    }

    private static ParsedUrl parse(String url) {
        String rest = url.substring("jdbc:postgresql://".length());
        int slash = rest.indexOf('/');
        String host = rest.substring(0, slash);
        String path = rest.substring(slash + 1);
        int q = path.indexOf('?');
        String db    = URLDecoder.decode(q >= 0 ? path.substring(0, q) : path, StandardCharsets.UTF_8);
        String query = q >= 0 ? path.substring(q) : "";
        return new ParsedUrl(host, db, query);
    }

    private record ParsedUrl(String host, String db, String query) {}
}
