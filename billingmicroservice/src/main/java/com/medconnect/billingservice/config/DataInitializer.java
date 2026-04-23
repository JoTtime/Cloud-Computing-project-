package com.medconnect.billingservice.config;

import com.medconnect.billingservice.entity.PricingRule;
import com.medconnect.billingservice.repository.PricingRuleRepository;
import org.springframework.boot.CommandLineRunner;
import org.springframework.stereotype.Component;

@Component
public class DataInitializer implements CommandLineRunner {

    private final PricingRuleRepository repo;

    public DataInitializer(PricingRuleRepository repo) {
        this.repo = repo;
    }

    @Override
    public void run(String... args) {
        seed("in_person", 50.0, 0.0, 10.0, "Standard in-person consultation");
        seed("video",     35.0, 0.0, 10.0, "Video consultation");
    }

    private void seed(String type, double base, double discount, double tax, String desc) {
        if (repo.findByConsultationType(type).isEmpty()) {
            PricingRule r = new PricingRule();
            r.setConsultationType(type);
            r.setBaseFee(base);
            r.setDiscountPercent(discount);
            r.setTaxPercent(tax);
            r.setDescription(desc);
            repo.save(r);
        }
    }
}
