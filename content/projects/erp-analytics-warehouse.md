## Overview

ERP held the operational truth for finance and supply chain, but analytics teams struggled to query it directly. Reports were slow, logic was duplicated, and historical trends were hard to preserve.

I built an ERP analytics warehouse with staged Fusion extracts, dimensional models, SSAS semantic layers, and Power BI dashboards tuned for finance and operations KPIs.

---

## The challenge

- Direct ERP reporting overloaded operational systems and lacked history.
- Metrics were calculated differently in every departmental report.
- Data model complexity in Fusion made self-service analytics difficult.
- Integrations with Apex apps and APIs needed a stable analytics foundation.

## What I built

### 1. ERP extraction and staging

Scheduled pipelines extracted GL, procurement, inventory, and master data from Fusion into staging with audit columns and incremental load patterns.

### 2. Warehouse modeling

Implemented star schemas for finance and operations with conformed dimensions, snapshot facts where needed, and clear mapping from Fusion codes to business terms.

1. Staging for raw ERP payloads.
2. Integration for business rules and SCD handling.
3. Presentation models aligned to dashboard consumers.

### 3. Analytics delivery

SSAS and Power BI exposed governed measures; Oracle Apex and APIs consumed curated datasets for operational workflows and integrations.

![ERP warehouse architecture](assets/img/masonry-portfolio/masonry-portfolio-3.jpg "ERP analytics path — Fusion to warehouse to SSAS and Power BI.")

---

## Results

- Analytics workloads moved off the operational ERP database.
- Historical trends preserved in the warehouse for finance and ops.
- Shared KPIs reduced conflicting numbers across teams.
- Apex and API consumers gained stable, curated datasets.

## What I would do differently

I would add near-real-time CDC for high-priority finance facts if the business needed intraday visibility beyond nightly batches.
