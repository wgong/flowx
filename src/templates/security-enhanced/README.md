# 🔐 FlowX Security-Enhanced Templates

This directory contains comprehensive security templates that integrate OWASP Top 10 and ISO 27001 compliance into FlowX code generation, ensuring **secure-by-default** development practices.

## 📋 Overview

These templates provide:
- **AWS Lambda Security**: Secure Lambda handlers with built-in security features
- **TypeScript Security**: Type-safe security patterns and utilities
- **OWASP Top 10 Prevention**: Templates preventing all major security vulnerabilities
- **ISO 27001 Compliance**: Enterprise-grade security controls
- **Spring Security 3**: Modern Java security patterns for Lambda
- **Automated Security Testing**: Continuous security validation

## 🚀 Quick Start

### 1. Basic Usage with FlowX

```bash
# Generate secure Lambda function
flowx generate lambda --template security-enhanced/aws-security/lambda-security.ts

# Generate with OWASP prevention
flowx generate api --template security-enhanced/owasp-prevention/input-validation.ts

# Generate with TypeScript security types
flowx generate types --template security-enhanced/typescript-security/security-types.ts
```

### 2. Integration with Existing Code

```typescript
// Import security utilities
import { secureHandler } from './templates/security-enhanced/aws-security/lambda-security';
import { RequireAuth, AuditLog, ValidateInput } from './templates/security-enhanced/typescript-security/security-types';
import { InputValidator } from './templates/security-enhanced/owasp-prevention/input-validation';

// Use in your Lambda function
export const handler = secureHandler;

// Use decorators for automatic security
class UserService {
  @RequireAuth(['user:read'])
  @AuditLog('get_user')
  @ValidateInput({ userId: { type: 'string', required: true } })
  async getUser(request: SecureRequest) {
    // Your business logic here
  }
}
```

## 📁 Template Structure

```
security-enhanced/
├── aws-security/           # AWS-specific security templates
│   ├── lambda-security.ts.template
│   ├── api-gateway-security.yml.template
│   └── iam-least-privilege.yml.template
├── typescript-security/    # TypeScript security patterns
│   ├── security-types.ts.template
│   ├── decorators.ts.template
│   └── validation.ts.template
├── owasp-prevention/       # OWASP Top 10 prevention
│   ├── input-validation.ts.template
│   ├── authentication.ts.template
│   └── authorization.ts.template
├── spring-security-lambda/ # Spring Security for Lambda
│   ├── SecurityConfig.java.template
│   ├── LambdaHandler.java.template
│   └── JwtAuthenticationFilter.java.template
├── security-config/        # Security utilities and configuration
│   ├── security-utils.ts.template
│   ├── encryption.ts.template
│   └── audit-logging.ts.template
├── security-testing/       # Automated security testing
│   ├── security-tests.ts.template
│   ├── penetration-tests.ts.template
│   └── compliance-tests.ts.template
└── README.md              # This file
```

## 🛡️ Security Features

### AWS Lambda Security
- **Automatic Security Headers**: HSTS, CSP, X-Frame-Options, etc.
- **JWT Validation**: Secure token verification with proper error handling
- **Input Sanitization**: Automatic XSS and injection prevention
- **Rate Limiting**: Built-in request throttling
- **Audit Logging**: Comprehensive security event logging
- **Error Handling**: Secure error responses without data leakage

### TypeScript Security Patterns
- **Type-Safe Security**: Compile-time security validation
- **Security Decorators**: `@RequireAuth`, `@AuditLog`, `@RateLimit`
- **Validated Types**: `SanitizedString`, `ValidatedNumber`, etc.
- **Security Errors**: Structured error handling with proper HTTP codes

### OWASP Top 10 Prevention
- **A01 - Broken Access Control**: RBAC templates and authorization middleware
- **A02 - Cryptographic Failures**: Secure encryption and hashing utilities
- **A03 - Injection**: Comprehensive input validation and sanitization
- **A04 - Insecure Design**: Secure architecture patterns and templates
- **A05 - Security Misconfiguration**: Secure defaults and configuration templates
- **A06 - Vulnerable Components**: Dependency scanning and validation
- **A07 - Authentication Failures**: Secure authentication implementations
- **A08 - Software Integrity**: Code signing and verification templates
- **A09 - Logging Failures**: Comprehensive audit logging templates
- **A10 - SSRF**: Request validation and URL filtering

### ISO 27001 Compliance
- **Information Security Policies**: Template policies and procedures
- **Risk Management**: Risk assessment and treatment templates
- **Access Control**: User access management and review processes
- **Incident Management**: Incident response and recovery procedures
- **Audit and Compliance**: Audit trails and compliance reporting

## 🔧 Configuration

### Environment Variables
```bash
# Required for JWT operations
JWT_SECRET=your-secret-key-here

# Optional security configurations
RATE_LIMIT_WINDOW_MS=60000
RATE_LIMIT_MAX_REQUESTS=100
AUDIT_LOG_LEVEL=info
ENCRYPTION_KEY=your-encryption-key
```

### FlowX Integration
```json
{
  "security": {
    "templates": "security-enhanced",
    "defaultMode": "secure",
    "owasp": {
      "enabled": true,
      "level": "strict"
    },
    "iso27001": {
      "enabled": true,
      "controls": ["A.5", "A.6", "A.8", "A.9", "A.10"]
    }
  }
}
```

## 📊 Security Metrics

The templates automatically collect security metrics:

```typescript
import { AuditLogger } from './security-config/security-utils';

// Get security metrics
const metrics = AuditLogger.getSecurityMetrics();
console.log(metrics);
/*
{
  totalRequests: 1250,
  failedRequests: 23,
  successRate: 0.982,
  failedLogins: 5,
  successfulLogins: 145,
  uniqueUsers: 89,
  topActions: [
    { action: 'login', count: 150 },
    { action: 'get_user', count: 300 }
  ],
  suspiciousActivity: [
    {
      type: 'multiple_failed_logins',
      userId: 'user123',
      count: 5,
      severity: 'high'
    }
  ]
}
*/
```

## 🧪 Testing

### Security Test Templates
```typescript
import { SecurityTester } from './security-testing/security-tests';

// Run OWASP Top 10 tests
const results = await SecurityTester.runOWASPTests();

// Run penetration tests
const penTestResults = await SecurityTester.runPenetrationTests();

// Run compliance tests
const complianceResults = await SecurityTester.runComplianceTests();
```

### Automated Security Pipeline
```yaml
# .github/workflows/security.yml
name: Security Testing
on: [push, pull_request]
jobs:
  security:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v3
      - name: Run Security Tests
        run: |
          npm install
          npm run test:security
          npm run test:owasp
          npm run test:compliance
```

## 🔄 Integration with CI/CD

### GitHub Actions
```yaml
- name: Security Scan
  uses: flowx-security/action@v1
  with:
    template: security-enhanced
    owasp-level: strict
    iso27001: true
```

### GitLab CI
```yaml
security_scan:
  stage: test
  script:
    - flowx security-scan --template security-enhanced
    - flowx compliance-check --standard iso27001
```

## 📚 Examples

### Secure API Endpoint
```typescript
import { secureHandler } from './aws-security/lambda-security';
import { RequireAuth, ValidateInput } from './typescript-security/security-types';

export const createUser = secureHandler(async (event, context) => {
  // Input validation happens automatically
  const userData = JSON.parse(event.body);
  
  // Business logic
  const user = await userService.createUser(userData);
  
  return {
    statusCode: 201,
    body: JSON.stringify(user)
  };
});
```

### Secure Database Query
```typescript
import { SQLInjectionPrevention } from './owasp-prevention/input-validation';

class UserRepository {
  async findUser(userId: string) {
    const { query, params } = SQLInjectionPrevention.buildParameterizedQuery(
      'SELECT * FROM users WHERE id = ?',
      [userId]
    );
    
    return await this.db.query(query, params);
  }
}
```

### Secure File Upload
```typescript
import { XSSPrevention } from './owasp-prevention/input-validation';

class FileUploadHandler {
  @RequireAuth(['file:upload'])
  @AuditLog('file_upload')
  async uploadFile(request: SecureRequest<FileUploadData>) {
    // Sanitize filename
    const safeFilename = XSSPrevention.sanitizeHTML(request.data.filename);
    
    // Validate file type
    if (!this.isAllowedFileType(request.data.contentType)) {
      throw new ValidationError('File type not allowed');
    }
    
    // Process upload
    return await this.processUpload(safeFilename, request.data.content);
  }
}
```

## 🔐 Best Practices

### 1. Always Use Templates
- Never write security code from scratch
- Use the provided templates as starting points
- Customize templates for your specific needs

### 2. Environment-Specific Configuration
```typescript
// Development
const config = {
  jwtExpiration: '1h',
  rateLimitRequests: 1000,
  logLevel: 'debug'
};

// Production
const config = {
  jwtExpiration: '15m',
  rateLimitRequests: 100,
  logLevel: 'warn'
};
```

### 3. Regular Security Updates
```bash
# Update security templates
flowx update-templates --security

# Run security audit
flowx security-audit --full

# Generate compliance report
flowx compliance-report --standard iso27001
```

## 🚨 Security Alerts

The templates include built-in security monitoring:

```typescript
// Automatic alerts for suspicious activity
AuditLogger.onSuspiciousActivity((activity) => {
  if (activity.severity === 'high') {
    alerting.sendAlert({
      type: 'security_incident',
      message: `Suspicious activity detected: ${activity.type}`,
      details: activity
    });
  }
});
```

## 📞 Support

For security-related questions or issues:
- Review the security documentation
- Check the OWASP and ISO 27001 compliance guides
- Run the built-in security tests
- Contact the security team for critical issues

## 🔄 Updates

Security templates are regularly updated to address:
- New OWASP Top 10 vulnerabilities
- ISO 27001 standard updates
- AWS security best practices
- Emerging threat patterns

Stay updated with:
```bash
flowx security-updates --subscribe
```

---

**Remember**: Security is not a one-time implementation but an ongoing process. These templates provide a solid foundation, but regular security reviews and updates are essential for maintaining a secure application. 