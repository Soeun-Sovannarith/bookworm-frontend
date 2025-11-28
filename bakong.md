# Bakong KHQR Integration Guide

## Overview
This guide provides complete instructions for integrating Bakong KHQR payment system into the BookHaven bookstore application.

---

## 1. Add Bakong KHQR SDK Dependency

### For Maven (`pom.xml`):
```xml
<dependency>
    <groupId>kh.gov.nbc</groupId>
    <artifactId>bakong-khqr</artifactId>
    <version>1.0.0</version>
</dependency>
```

### For Gradle (`build.gradle`):
```gradle
implementation 'kh.gov.nbc:bakong-khqr:1.0.0'
```

**Note:** You may need to add NBC's Maven repository or download the SDK manually from the official Bakong KHQR site.

---

## 2. Configuration Setup

### Add to `application.properties`:
```properties
# Bakong Individual Account Configuration
bakong.account.id=your_account@devb
bakong.account.phone=855XXXXXXXXX
bakong.acquiring.bank=Your Bank Name
bakong.merchant.name=BookHaven
bakong.merchant.city=PHNOM PENH
bakong.store.label=BookHaven Online Store
bakong.terminal.label=Web_Checkout
```

### Or for `application.yml`:
```yaml
bakong:
  account:
    id: soeun_sovannarith@aclb
    phone: 85516992144
  acquiring:
    bank: ACLEDA
  merchant:
    name: BookHaven
    city: PHNOM PENH
  store:
    label: BookHaven Online Store
  terminal:
    label: Web_Checkout
```

---

## 3. Create DTOs (Data Transfer Objects)

### BakongPaymentRequest.java
```java
package com.bookstore.dto;

public class BakongPaymentRequest {
    private Long orderId;
    private Double amount;
    private String currency; // "USD" or "KHR"
    private String billNumber;
    
    // Constructors
    public BakongPaymentRequest() {}
    
    public BakongPaymentRequest(Long orderId, Double amount, String currency, String billNumber) {
        this.orderId = orderId;
        this.amount = amount;
        this.currency = currency;
        this.billNumber = billNumber;
    }
    
    // Getters and Setters
    public Long getOrderId() {
        return orderId;
    }
    
    public void setOrderId(Long orderId) {
        this.orderId = orderId;
    }
    
    public Double getAmount() {
        return amount;
    }
    
    public void setAmount(Double amount) {
        this.amount = amount;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
    
    public String getBillNumber() {
        return billNumber;
    }
    
    public void setBillNumber(String billNumber) {
        this.billNumber = billNumber;
    }
}
```

### BakongPaymentResponse.java
```java
package com.bookstore.dto;

public class BakongPaymentResponse {
    private String qrCode;      // Base64 encoded QR code or KHQR string
    private String md5;         // MD5 hash for verification
    private String billNumber;
    private Double amount;
    private String currency;
    
    // Constructors
    public BakongPaymentResponse() {}
    
    public BakongPaymentResponse(String qrCode, String md5, String billNumber, Double amount, String currency) {
        this.qrCode = qrCode;
        this.md5 = md5;
        this.billNumber = billNumber;
        this.amount = amount;
        this.currency = currency;
    }
    
    // Getters and Setters
    public String getQrCode() {
        return qrCode;
    }
    
    public void setQrCode(String qrCode) {
        this.qrCode = qrCode;
    }
    
    public String getMd5() {
        return md5;
    }
    
    public void setMd5(String md5) {
        this.md5 = md5;
    }
    
    public String getBillNumber() {
        return billNumber;
    }
    
    public void setBillNumber(String billNumber) {
        this.billNumber = billNumber;
    }
    
    public Double getAmount() {
        return amount;
    }
    
    public void setAmount(Double amount) {
        this.amount = amount;
    }
    
    public String getCurrency() {
        return currency;
    }
    
    public void setCurrency(String currency) {
        this.currency = currency;
    }
}
```

---

## 4. Create Bakong Payment Service

### BakongPaymentService.java
```java
package com.bookstore.service;

import kh.gov.nbc.bakong_khqr.BakongKHQR;
import kh.gov.nbc.bakong_khqr.model.IndividualInfo;
import kh.gov.nbc.bakong_khqr.model.KHQRCurrency;
import kh.gov.nbc.bakong_khqr.model.KHQRData;
import kh.gov.nbc.bakong_khqr.model.KHQRResponse;
import com.bookstore.dto.BakongPaymentResponse;
import org.springframework.beans.factory.annotation.Value;
import org.springframework.stereotype.Service;

@Service
public class BakongPaymentService {
    
    @Value("${bakong.account.id}")
    private String bakongAccountId;
    
    @Value("${bakong.account.phone}")
    private String accountPhone;
    
    @Value("${bakong.acquiring.bank}")
    private String acquiringBank;
    
    @Value("${bakong.merchant.name}")
    private String merchantName;
    
    @Value("${bakong.merchant.city}")
    private String merchantCity;
    
    @Value("${bakong.store.label}")
    private String storeLabel;
    
    @Value("${bakong.terminal.label}")
    private String terminalLabel;
    
    /**
     * Generate Bakong KHQR code for payment
     * 
     * @param billNumber Unique bill/order number
     * @param amount Payment amount
     * @param currency "USD" or "KHR"
     * @return BakongPaymentResponse containing QR code data
     */
    public BakongPaymentResponse generateQRCode(String billNumber, Double amount, String currency) {
        try {
            // Create individual info object
            IndividualInfo individualInfo = new IndividualInfo();
            individualInfo.setBakongAccountId(bakongAccountId);
            individualInfo.setAccountInformation(accountPhone);
            individualInfo.setAcquiringBank(acquiringBank);
            individualInfo.setCurrency(currency.equals("KHR") ? KHQRCurrency.KHR : KHQRCurrency.USD);
            individualInfo.setAmount(amount);
            individualInfo.setMerchantName(merchantName);
            individualInfo.setMerchantCity(merchantCity);
            individualInfo.setBillNumber(billNumber);
            individualInfo.setMobileNumber(accountPhone);
            individualInfo.setStoreLabel(storeLabel);
            individualInfo.setTerminalLabel(terminalLabel);
            
            // Generate KHQR
            KHQRResponse<KHQRData> response = BakongKHQR.generateIndividual(individualInfo);
            
            // Check if generation was successful
            if (response.getKHQRStatus().getCode() == 0) {
                BakongPaymentResponse paymentResponse = new BakongPaymentResponse();
                paymentResponse.setQrCode(response.getData().getQr());
                paymentResponse.setMd5(response.getData().getMd5());
                paymentResponse.setBillNumber(billNumber);
                paymentResponse.setAmount(amount);
                paymentResponse.setCurrency(currency);
                return paymentResponse;
            } else {
                throw new RuntimeException("Failed to generate QR code: " + response.getKHQRStatus().getMessage());
            }
        } catch (Exception e) {
            throw new RuntimeException("Error generating Bakong QR code: " + e.getMessage(), e);
        }
    }
}
```

---

## 5. Create REST Controller

### BakongPaymentController.java
```java
package com.bookstore.controller;

import com.bookstore.dto.BakongPaymentRequest;
import com.bookstore.dto.BakongPaymentResponse;
import com.bookstore.service.BakongPaymentService;
import com.bookstore.service.OrderService;
import com.bookstore.model.Order;
import org.springframework.beans.factory.annotation.Autowired;
import org.springframework.http.ResponseEntity;
import org.springframework.web.bind.annotation.*;

import java.util.Map;

@RestController
@RequestMapping("/api/payments/bakong")
@CrossOrigin(origins = "http://localhost:5173") // Your React frontend URL
public class BakongPaymentController {
    
    @Autowired
    private BakongPaymentService bakongPaymentService;
    
    @Autowired
    private OrderService orderService;
    
    /**
     * Generate Bakong QR code for an order
     * 
     * @param request Payment request containing orderId, amount, and currency
     * @return BakongPaymentResponse with QR code data
     */
    @PostMapping("/generate-qr")
    public ResponseEntity<BakongPaymentResponse> generateQRCode(@RequestBody BakongPaymentRequest request) {
        try {
            // Validate order exists
            Order order = orderService.findById(request.getOrderId());
            
            if (order == null) {
                return ResponseEntity.notFound().build();
            }
            
            // Generate unique bill number
            String billNumber = "ORDER-" + request.getOrderId() + "-" + System.currentTimeMillis();
            
            // Determine currency (default to USD if not specified)
            String currency = request.getCurrency() != null ? request.getCurrency() : "USD";
            
            // Generate QR code
            BakongPaymentResponse response = bakongPaymentService.generateQRCode(
                billNumber,
                order.getTotalAmount(),
                currency
            );
            
            // Optional: Save payment record in database
            // paymentService.createPaymentRecord(order.getId(), billNumber, response.getMd5());
            
            return ResponseEntity.ok(response);
        } catch (Exception e) {
            return ResponseEntity.internalServerError().build();
        }
    }
    
    /**
     * Verify payment status
     * 
     * @param md5 MD5 hash from QR generation
     * @param orderId Order ID to verify
     * @return Payment status
     */
    @PostMapping("/verify-payment")
    public ResponseEntity<?> verifyPayment(
        @RequestParam String md5,
        @RequestParam Long orderId
    ) {
        // TODO: Implement payment verification logic
        // This would check if payment was received via:
        // 1. Webhook from Bakong
        // 2. Polling Bakong API
        // 3. Database record update
        
        return ResponseEntity.ok().body(Map.of(
            "status", "pending",
            "message", "Payment verification not yet implemented"
        ));
    }
    
    /**
     * Webhook endpoint for Bakong payment notifications
     * (Optional - requires Bakong webhook setup)
     */
    @PostMapping("/webhook")
    public ResponseEntity<?> handleWebhook(@RequestBody Map<String, Object> payload) {
        // TODO: Implement webhook handler
        // 1. Verify webhook signature
        // 2. Extract payment details
        // 3. Update order status
        // 4. Send confirmation to customer
        
        return ResponseEntity.ok().build();
    }
}
```

---

## 6. API Endpoints

### Generate QR Code
```http
POST http://localhost:8080/api/payments/bakong/generate-qr
Content-Type: application/json
Authorization: Bearer {token}

{
  "orderId": 123,
  "amount": 100.0,
  "currency": "USD"
}
```

**Response:**
```json
{
  "qrCode": "00020101021229370016khqr.aba.com.kh011234567890...",
  "md5": "abc123def456...",
  "billNumber": "ORDER-123-1701234567890",
  "amount": 100.0,
  "currency": "USD"
}
```

### Verify Payment
```http
POST http://localhost:8080/api/payments/bakong/verify-payment?md5=abc123&orderId=123
```

---

## 7. Integration Checklist

- [ ] **SDK Setup**
  - [ ] Download Bakong KHQR SDK
  - [ ] Add dependency to project
  - [ ] Verify SDK imports work

- [ ] **Configuration**
  - [ ] Create Bakong individual account (sandbox for testing)
  - [ ] Get Bakong account ID
  - [ ] Configure application.properties
  - [ ] Test configuration loading

- [ ] **Code Implementation**
  - [ ] Create BakongPaymentRequest DTO
  - [ ] Create BakongPaymentResponse DTO
  - [ ] Implement BakongPaymentService
  - [ ] Implement BakongPaymentController
  - [ ] Add CORS configuration for frontend

- [ ] **Testing**
  - [ ] Test QR generation with Postman
  - [ ] Verify QR code format
  - [ ] Test with Bakong app (sandbox)
  - [ ] Validate error handling

- [ ] **Frontend Integration**
  - [ ] Install QR code display library
  - [ ] Add Bakong payment option
  - [ ] Implement QR display component
  - [ ] Add payment instructions
  - [ ] Handle payment confirmation

---

## 8. Testing Guide

### Using Postman

1. **Generate QR Code:**
```bash
POST http://localhost:8080/api/payments/bakong/generate-qr
Headers:
  Content-Type: application/json
  Authorization: Bearer YOUR_TOKEN
Body:
{
  "orderId": 1,
  "amount": 50.0,
  "currency": "USD"
}
```

2. **Expected Response:**
```json
{
  "qrCode": "00020101021229370016...",
  "md5": "abc123...",
  "billNumber": "ORDER-1-1701234567890",
  "amount": 50.0,
  "currency": "USD"
}
```

3. **Test QR Code:**
   - Copy the `qrCode` value
   - Generate QR image using online tool or frontend
   - Scan with Bakong app

---

## 9. Frontend Requirements

Once backend is ready, frontend needs:

### Install QR Code Library
```bash
npm install qrcode.react
```

### API Integration
```typescript
// In src/lib/api.ts
export const bakongAPI = {
  generateQR: (orderId: number, currency: string = "USD") =>
    fetchAPI<BakongPaymentResponse>("/api/payments/bakong/generate-qr", {
      method: "POST",
      headers: getAuthHeader(),
      body: JSON.stringify({ orderId, currency }),
    }),
};
```

### Component Features Needed
- Display QR code using `qrcode.react`
- Show payment amount and currency
- Display payment instructions in Khmer/English
- Add countdown timer (optional)
- Poll for payment confirmation
- Handle success/failure states

---

## 10. Payment Flow

```
1. Customer proceeds to checkout
   ↓
2. Frontend calls POST /api/payments/bakong/generate-qr
   ↓
3. Backend generates KHQR and returns QR code string
   ↓
4. Frontend displays QR code + instructions
   ↓
5. Customer scans QR with Bakong app
   ↓
6. Customer confirms payment in Bakong app
   ↓
7. Bakong processes payment
   ↓
8. Backend receives webhook/confirmation
   ↓
9. Order status updated to PAID
   ↓
10. Customer sees success message
```

---

## 11. Security Considerations

- ✅ Never expose Bakong credentials in frontend
- ✅ Validate all incoming requests
- ✅ Implement webhook signature verification
- ✅ Use HTTPS in production
- ✅ Store payment records in database
- ✅ Implement payment timeout (e.g., 15 minutes)
- ✅ Add rate limiting on endpoints
- ✅ Log all payment attempts for auditing

---

## 12. Production Deployment

### Before Going Live:

1. **Switch to Production Bakong Account**
   - Register official merchant account
   - Update credentials in production config
   - Test with real Bakong app

2. **Environment Variables**
   ```bash
   BAKONG_ACCOUNT_ID=production_account@bakong
   BAKONG_PHONE=855XXXXXXXXX
   BAKONG_BANK=Your Bank
   ```

3. **Enable Webhooks**
   - Configure webhook URL with Bakong
   - Implement signature verification
   - Test webhook delivery

4. **Monitoring**
   - Log all QR generations
   - Track payment success rate
   - Monitor API response times
   - Set up alerts for failures

---

## 13. Troubleshooting

### Common Issues:

**QR Code Not Generating:**
- Check SDK is properly imported
- Verify configuration values are loaded
- Check logs for error messages
- Validate account ID format

**QR Code Not Scanning:**
- Ensure QR code string is complete
- Verify currency format (USD/KHR)
- Check amount is positive number
- Test with Bakong sandbox app first

**Payment Not Confirming:**
- Implement webhook handler
- Check webhook URL is accessible
- Verify payment was successful in Bakong
- Check database for payment record

---

## 14. Resources

- **Bakong KHQR Documentation:** Contact NBC or authorized provider
- **SDK Download:** https://bakong.nbc.gov.kh (check official site)
- **Technical Support:** Contact NBC technical team
- **Sandbox Environment:** Request access from NBC

---

## 15. Contact & Support

For Bakong integration support:
- **National Bank of Cambodia (NBC)**
- **Bakong Technical Team**
- **Email:** [Check official Bakong website]
- **Hotline:** [Check official Bakong website]

---

**Document Version:** 1.0  
**Last Updated:** November 28, 2025  
**Project:** BookHaven Bookstore - Bakong Integration
