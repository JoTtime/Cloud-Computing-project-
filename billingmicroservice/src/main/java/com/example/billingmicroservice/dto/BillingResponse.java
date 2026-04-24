package com.example.billingmicroservice.dto;

import java.util.List;

public class BillingResponse {
    private final boolean success;
    private final String message;
    private final InvoiceDto invoice;
    private final List<InvoiceDto> invoices;

    private BillingResponse(boolean success, String message, InvoiceDto invoice, List<InvoiceDto> invoices) {
        this.success = success;
        this.message = message;
        this.invoice = invoice;
        this.invoices = invoices;
    }

    public static BillingResponse successWithInvoice(String message, InvoiceDto invoice) {
        return new BillingResponse(true, message, invoice, null);
    }

    public static BillingResponse successWithInvoices(List<InvoiceDto> invoices) {
        return new BillingResponse(true, null, null, invoices);
    }

    public boolean isSuccess() { return success; }
    public String getMessage() { return message; }
    public InvoiceDto getInvoice() { return invoice; }
    public List<InvoiceDto> getInvoices() { return invoices; }
}
