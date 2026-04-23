package com.medconnect.billingservice.repository;

import com.medconnect.billingservice.entity.PricingRule;
import org.springframework.data.jpa.repository.JpaRepository;

import java.util.Optional;

public interface PricingRuleRepository extends JpaRepository<PricingRule, String> {
    Optional<PricingRule> findByConsultationType(String consultationType);
}
