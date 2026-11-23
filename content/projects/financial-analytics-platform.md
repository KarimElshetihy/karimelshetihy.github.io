## Overview

This project delivered a complete financial analytics platform for a mid-size enterprise running Oracle ERP. Finance teams needed trusted numbers in one place, from ledger balances and budget variance to operational KPIs — without waiting days for manual spreadsheet consolidation.

I owned the solution end to end: extraction from ERP, warehouse modeling, SSAS semantic layer, Power BI reporting, and lightweight Oracle Apex apps for data entry and approvals where the ERP UI was too rigid.

---

## The challenge

- Financial data lived across ERP modules, spreadsheets, and legacy reports with no single source of truth.
- Month-end close took too long because reconciliations were manual and error-prone.
- Business users could not self-serve; every new metric required IT involvement.
- Existing batch jobs had no monitoring, so failures surfaced only when someone noticed missing numbers.

> We do not need more reports — we need one version of the truth that finance and operations both trust.
>
> — Finance director

## What I built

### 1. Ingestion and orchestration

Oracle Data Integrator (ODI) packages pulled GL, AP, AR, and budget data from ERP on a nightly schedule. Jython scripts handled edge cases — custom validations, file-based supplements, and API callbacks — where pure ODI mappings were not enough.

### 2. Warehouse and semantic layer

The data warehouse followed a Kimball-style star schema: conformed dimensions for account, cost center, period, and entity, with fact tables for transactions, balances, and budget snapshots. SSAS tabular models exposed reusable measures (YTD, variance %, rolling averages) so Power BI reports stayed consistent.

1. Staging layer for raw ERP extracts and audit columns.
2. Integration layer with business rules and slowly changing dimensions.
3. Presentation layer aligned to finance terminology, not source system codes.
4. SSAS as the governed metrics layer for all downstream consumers.

![Financial dashboard mockup](assets/img/portfolio/Coming%20Soon%20Dark.png "Executive dashboard — P&L, variance, and drill-down by cost center.")

### 3. Reporting and self-service

Power BI became the primary consumption layer for leadership and FP&A. Oracle Apex filled gaps: adjustment workflows, one-off uploads, and admin screens for mapping tables that analysts could maintain without redeploying ETL.

---

## Results

- Month-end reporting cycle shortened significantly by automating reconciliations.
- Finance and operations aligned on shared KPIs through the SSAS semantic model.
- New dashboard requests dropped because self-service Power BI covered most ad hoc needs.
- Pipeline failures became visible early through ODI logging and simple email alerts.

## What I would do differently

If I rebuilt this today, I would add explicit data quality checks at staging (row counts, balance tie-outs, referential integrity) and push more orchestration metadata into a small ops dashboard. The architecture held up well, but observability was the main area I would invest in earlier.
