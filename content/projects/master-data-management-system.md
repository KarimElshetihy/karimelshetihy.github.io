## Overview

Critical master entities — customers, products, and suppliers — existed in multiple systems with inconsistent formats, duplicates, and no clear ownership.

I implemented a master data management approach combining modeled golden records, data quality rules, stewardship workflows in Oracle Apex, and integration hooks for downstream consumers.

---

## The challenge

- Duplicate and conflicting records made reporting unreliable.
- No workflow existed for requesting, approving, or correcting master data changes.
- Data quality issues were discovered late, after bad data reached dashboards.
- Teams lacked a single place to see entity history and stewardship status.

> Fix the master data once, then stop re-cleaning the same problems in every report.

> — Data governance lead

## What I built

### 1. Golden record model

Created hub-and-spoke style models for core entities with survivorship rules, source system lineage, and status flags for active, merged, or deprecated records.

### 2. Quality and governance rules

Defined validation checks for completeness, format, referential integrity, and duplicate detection, with exception queues routed to data stewards.

- Duplicate matching with configurable thresholds.
- Mandatory fields enforced before publish.
- Audit columns on every change.

### 3. Stewardship application

Oracle Apex screens supported create/merge requests, approvals, and searchable entity history so business owners could manage master data without IT bottlenecks.

![MDM workflow](assets/img/masonry-portfolio/masonry-portfolio-3.jpg "Stewardship workflow — request, validate, approve, publish.")

---

## Results

- Golden records became the trusted source for key entities.
- Duplicate rates dropped through matching and merge workflows.
- Stewards gained self-service tools instead of email-driven fixes.
- Downstream analytics consumed cleaner, more consistent dimensions.

## What I would do differently

I would introduce a lightweight data quality scorecard per entity domain so leadership could see MDM health trends over time, not just exception counts.
