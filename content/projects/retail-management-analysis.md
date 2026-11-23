## Overview

Fractal Investors needed a clear view of retail performance across stores and product lines — sales trends, margin drivers, inventory health, and comparisons that supported investment and operational decisions.

I built a retail management analysis solution on a governed warehouse and Power BI semantic model, with Git-backed development and Microsoft Fabric-ready patterns for scalable refresh and collaboration.

---

## The challenge

- Retail metrics were defined differently across reports and spreadsheets.
- Inventory and sales data came from multiple extracts with timing mismatches.
- Investors needed trustworthy KPIs without waiting for manual consolidation.
- The solution had to be maintainable as new stores and SKUs were added.

> We need retail KPIs we can defend in a meeting, not rebuild in Excel every week.

> — Client stakeholder

## What I built

### 1. Retail data model

Designed dimensional models for store, product, calendar, and promotions with facts for sales, margin, and inventory snapshots suitable for investor reporting.

### 2. Power BI and DAX metrics

Implemented reusable DAX measures for growth, mix, margin, and stock cover, with drill-through from portfolio summary to store and SKU detail.

- Same-store and new-store comparisons.
- Category mix and margin bridge views.
- Inventory aging and cover metrics.

### 3. Delivery workflow

Used Git for report and model versioning and structured refresh patterns compatible with Fabric, so the client could evolve the solution without losing governance.

---

## Results

- Retail KPIs standardized for investor and management reviews.
- Manual Excel consolidation replaced by refreshed dashboards.
- Drill-down enabled faster answers during operational meetings.
- Version control improved confidence when publishing model changes.

## What I would do differently

I would add explicit data freshness indicators on each dashboard page so users always know the as-of date for sales and inventory snapshots.
