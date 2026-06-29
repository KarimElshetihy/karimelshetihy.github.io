## Overview

ATM transaction logs arrived as semi-structured text files with inconsistent delimiters, embedded codes, and occasional malformed rows. Loading them manually into the warehouse was slow and error-prone.

I built a Python parsing pipeline using Pandas and regex to extract fields, validate records, quarantine bad rows, and output clean tables for downstream DWH loads.

---

## The challenge

- File formats varied by source device and export job.
- Regex-only scripts were brittle when new codes appeared.
- Bad rows could silently corrupt aggregates if not quarantined.
- Operations needed daily loads with minimal manual intervention.

## What I built

### 1. Parser framework

Created modular parsers per file variant with shared validation, logging, and output schemas so new formats could be added without rewriting the whole job.

- Regex and delimiter-based field extraction.
- Row-level validation and error codes.
- Quarantine files for malformed records.

### 2. Warehouse handoff

Published structured CSV or table outputs aligned to staging schemas, orchestrated via Bash for nightly execution alongside existing DWH jobs.

---

## Results

- ATM logs loaded reliably into structured staging tables.
- Malformed records isolated instead of breaking pipelines.
- Manual parsing effort reduced to exception handling only.
- New file variants onboarded by adding parser modules, not new projects.

## What I would do differently

I would add schema versioning metadata on each output batch so downstream models can trace which parser version produced a given load.
