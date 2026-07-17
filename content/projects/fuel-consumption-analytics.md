## Overview

Operations teams tracked fleet fuel usage through manual summaries and inconsistent spreadsheets. They needed reliable consumption metrics, trend analysis, and benchmarks by route, vehicle, and driver.

I built a fuel consumption analytics solution with warehouse models, SSAS measures, and Power BI dashboards highlighting usage patterns, outliers, and cost drivers.

---

## The challenge

- Source data arrived from multiple fleet systems with different formats.
- No standard KPIs existed for consumption per distance or route.
- Outliers were spotted late, after costs had already accumulated.
- Operations lacked drill-down from summary to vehicle level.

## What I built

### 1. Data integration

Combined fleet telematics, fuel purchase records, and master vehicle data into a unified model with validated joins and unit normalization.

### 2. Analytics model

Created SSAS measures for consumption rates, variance vs benchmark, and period-over-period trends, exposed through Power BI with intuitive drill paths.

- Consumption per km and per route.
- Vehicle and driver benchmarking.
- Monthly variance and exception flags.

### 3. Operational reporting

Delivered dashboards for fleet managers with filters by depot, vehicle type, and time period, replacing manual Excel consolidation.

---

## Results

- Fuel KPIs standardized across operations and finance.
- Managers identified high-consumption vehicles and routes faster.
- Reporting cycle moved from manual spreadsheets to automated dashboards.
- Benchmarking enabled more objective performance conversations.

## What I would do differently

I would enrich the model with maintenance and route metadata earlier to explain consumption spikes with more context, not just flag them.
