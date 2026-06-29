## Overview

Fee logic was spread across spreadsheets, legacy SQL, and departmental reports. Finance and operations calculated master fees differently, which slowed billing cycles and made audits painful.

I delivered a unified master fees calculation model in the warehouse with clear business rules, reusable dimensions, and Oracle Apex screens for analysts to maintain fee parameters safely.

---

## The challenge

- Multiple fee formulas existed for the same product family with no documented owner.
- Manual adjustments bypassed controls and were hard to reconcile at month-end.
- Downstream reports showed conflicting fee totals depending on the source.
- Product teams needed a faster way to simulate fee changes before go-live.

> We need one fee model that billing, finance, and product management all trust.

> — Operations manager

## What I built

### 1. Dimensional fee model

Designed conformed dimensions for product, channel, customer segment, and fee type, with a central fact table for calculated fees and audit-friendly adjustment rows.

- Versioned fee rules with effective dates.
- Transparent calculation steps stored for audit.
- Reconciliation views comparing model output to legacy totals.

### 2. Integration and APIs

Built SQL-based transformation pipelines and lightweight APIs so upstream systems could submit fee inputs and downstream apps could consume governed totals.

1. Staging validations for missing rates and invalid combinations.
2. Business rule layer applied before publishing to reporting.
3. Published datasets consumed by dashboards and Apex workflows.

### 3. Analyst tooling

Oracle Apex provided parameter maintenance, approval-friendly forms, and exception queues so business users could manage fees without direct database access.

![Fee model diagram](assets/img/Coming%20Soon%20Dark.png "Unified fee model — single calculation path from inputs to reporting.")

---

## Results

- Fee calculations consolidated into one governed warehouse model.
- Month-end reconciliation time reduced through standardized rules.
- Product teams gained a controlled way to test fee changes before production.
- Audit trail improved with versioned parameters and adjustment history.

## What I would do differently

I would add automated regression tests that compare fee outputs across rule versions whenever parameters change, catching unintended side effects earlier.
