package com.medconnect.billingservice.entity;

import jakarta.persistence.*;
import java.util.UUID;

@Entity
@Table(name = "pricing_rules")
public class PricingRule {

    @Id
    @Column(length = 36)
    private String id;

    @Column(nullable = false, unique = true)
    private String consultationType;

    @Column(nullable = false)
    private Double baseFee;

    @Column(nullable = false)
    private Double discountPercent = 0.0;

    @Column(nullable = false)
    private Double taxPercent = 0.0;

    private String description;

    @PrePersist
    void prePersist() { if (id == null) id = UUID.randomUUID().toString(); }

    public Double calculateFinalAmount() {
        return Math.round(baseFee * (1 - discountPercent / 100.0) * 100.0) / 100.0;
    }

    public Double calculateTax() {
        return Math.round(calculateFinalAmount() * (taxPercent / 100.0) * 100.0) / 100.0;
    }

    public Double calculateTotal() {
        return Math.round((calculateFinalAmount() + calculateTax()) * 100.0) / 100.0;
    }

    public String getId() { return id; }
    public void setId(String id) { this.id = id; }

    public String getConsultationType() { return consultationType; }
    public void setConsultationType(String t) { this.consultationType = t; }

    public Double getBaseFee() { return baseFee; }
    public void setBaseFee(Double baseFee) { this.baseFee = baseFee; }

    public Double getDiscountPercent() { return discountPercent; }
    public void setDiscountPercent(Double d) { this.discountPercent = d; }

    public Double getTaxPercent() { return taxPercent; }
    public void setTaxPercent(Double t) { this.taxPercent = t; }

    public String getDescription() { return description; }
    public void setDescription(String d) { this.description = d; }
}
