## Overview

Finance processes needed reliable daily currency conversion rates, but manual downloads from public sources were inconsistent and easy to forget.

I built a Python scraping and API ingestion job that collected rates on schedule, normalized currencies, and published clean outputs for warehouse and reporting consumers.

---

## The challenge

- Rates were copied manually from websites with no audit trail.
- Missing days caused downstream calculation failures.
- Multiple currency pairs required consistent formatting and storage.
- Source layout changes broke informal copy-paste workflows.

## What I built

### 1. Collection pipeline

Python scripts scraped and/or called public rate sources, with retries, logging, and validation for missing pairs or abnormal movements.

- Scheduled daily execution.
- Normalized currency codes and decimal precision.
- Alerting on failed runs or stale data.

### 2. Published outputs

Stored results in files or tables ready for warehouse ingestion, with historical retention for backdated financial recalculations.

---

## Results

- Daily FX rates collected automatically with history retained.
- Downstream jobs stopped failing due to missing conversion data.
- Manual download effort removed from the finance support routine.
- Source changes isolated to the scraper instead of breaking spreadsheets.

## What I would do differently

I would add multi-source fallback and variance checks when two providers diverge beyond a tolerance.
