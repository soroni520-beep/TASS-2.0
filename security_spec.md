# Security Specification & Test Scenarios: TASS INPUT 2.0

## 1. Data Invariants
1. **Administrative Boundary**: Only designated super-admin (or users listed in `/admins/{uid}`) have unrestricted administrative access, including creating/modifying user roles and viewing all activity audit logs.
2. **Identity Integrity**: `operatorEmail` or `createdBy` must match the authenticated caller's verified email/uid.
3. **Immutability of Audit Logs**: Records in `/activity_logs/` can only be appended (created), never updated or deleted by standard operators.
4. **Calculated Quantities**: Production inputs must contain valid positive total quantities and properly formatted size strings.
5. **No Anonymous Data Pollution**: All create and update operations require an authenticated account.

## 2. The "Dirty Dozen" Vulnerability Payloads (Must Return PERMISSION_DENIED)
1. **Payload 1 (Self-Elevation Attack)**: Operator attempting to promote themselves by writing `{ role: "admin" }` to their user profile.
2. **Payload 2 (Ghost Field Injection)**: Creating a production input with undeclared root properties (`{ isVerified: true, fakeField: "bypass" }`).
3. **Payload 3 (Unauthenticated Read of Activity Logs)**: Unauthenticated visitor querying `/activity_logs`.
4. **Payload 4 (Log Tampering)**: Standard operator attempting `delete` on `/activity_logs/log_123`.
5. **Payload 5 (Huge Buffer Attack)**: An operator passing a 2MB string into `blkNumber` to trigger Denial of Wallet.
6. **Payload 6 (Operator Spoofing)**: Operator user A writing an input record claiming `operatorEmail: "soroni520@gmail.com"`.
7. **Payload 7 (Negative Stock Requisition)**: Creating an accessory transaction with negative quantity `{ quantity: -500 }`.
8. **Payload 8 (Blanket List Query Violation)**: Client attempting an open unbounded read on another user's restricted profile without auth.
9. **Payload 9 (Terminal State Tampering)**: Non-admin trying to revert a completed BLK order back to pending without authorization.
10. **Payload 10 (Path Traversal / Malicious ID)**: Accessing path `/accessories/../../secret_key`.
11. **Payload 11 (Timestamp Falsification)**: Client attempting to inject an arbitrary past or future timestamp for `createdAt`.
12. **Payload 12 (Admin Bypass with unverified email)**: Attempting admin operations with an unverified email claiming admin address.
