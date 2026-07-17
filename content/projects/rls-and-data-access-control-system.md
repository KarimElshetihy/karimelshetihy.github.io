## Overview

Different business units needed access to the same dashboards and models, but each user group should only see data for their region, entity, or cost center. Static report copies were not scalable.

I implemented a row-level security and data access control system spanning SSAS roles, Power BI RLS, SQL views, and Oracle Apex authorization rules tied to a central access matrix.

---

## The challenge

- Report copies multiplied whenever a new access rule was needed.
- Security logic was embedded in reports inconsistently.
- Role changes required manual updates in multiple systems.
- Auditors needed proof of who could see which data slices.

> One dashboard for everyone — but each person sees only what they should.

> — Security stakeholder

## What I built

### 1. Access matrix design

Defined a central mapping of users, roles, entities, and data scopes used as the source of truth for all downstream security implementations.

### 2. Semantic and reporting layer

Configured SSAS roles and Power BI RLS filters driven from the same scope definitions, with SQL views enforcing restrictions at the warehouse layer where needed.

- Dynamic filters by region, entity, and department.
- Service accounts separated from interactive user access.
- Test cases for allowed and denied scenarios.

### 3. Application controls

Oracle Apex authorization schemes mirrored the same role model so self-service screens respected the same boundaries as enterprise dashboards.

---

## Results

- Report proliferation reduced by replacing copies with dynamic security.
- Role updates centralized instead of scattered across tools.
- Audit readiness improved with documented access mappings.
- Users kept a consistent UX while data exposure stayed controlled.

## What I would do differently

I would automate periodic access review reports that compare active directory groups to the access matrix and flag orphaned permissions.
