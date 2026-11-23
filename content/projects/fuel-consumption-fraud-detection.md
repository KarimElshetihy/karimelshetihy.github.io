## Overview

Alongside consumption analytics, the business needed to detect suspicious fuel transactions — unusual volumes, off-hours fills, mismatched locations, and patterns that manual review could not scale to.

I extended the fuel analytics platform with rule-based and machine-learning-assisted anomaly detection, surfaced through SSAS/Power BI alerts and review workflows.

---

## The challenge

- Fraud patterns were subtle and varied by depot and vehicle type.
- Manual review could not cover every transaction each month.
- False positives risked overwhelming investigators if rules were too broad.
- Investigators needed context, not just alert flags.

## What I built

### 1. Feature and rule layer

Engineered SQL features for transaction timing, volume vs tank capacity, location mismatch, and frequency outliers, combined with tunable business rules.

### 2. Detection models

Applied machine learning scoring on top of governed warehouse data, with thresholds calibrated to balance alert volume and precision.

- Rule-based flags for hard violations.
- ML scores for subtle pattern anomalies.
- Analyst review queue with transaction context.

### 3. Investigation dashboards

Power BI views grouped alerts by severity, depot, and repeat offenders, giving investigators drill-down to transaction history and vehicle metadata.

---

## Results

- Suspicious transactions surfaced automatically instead of by chance.
- Investigation time reduced through contextual alert dashboards.
- Repeat anomaly patterns became visible across depots and vendors.
- Finance and operations shared one fraud monitoring view.

## What I would do differently

I would add feedback loops so investigator outcomes retrain thresholds and reduce false positives over time.
