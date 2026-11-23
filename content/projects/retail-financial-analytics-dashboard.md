## Overview

Retail finance stakeholders needed more than static reports — they wanted an interactive dashboard backed by a proper API, governed database, and deployable architecture they could evolve.

I delivered a retail financial analytics dashboard using Python/FastAPI, PostgreSQL, TypeScript frontend, Docker packaging, and GitHub-based CI workflows, with warehouse-aligned metrics and data governance considerations built in.

---

## The challenge

- Existing reporting was spreadsheet-heavy and hard to secure.
- Metrics needed a backend API, not just embedded report logic.
- Deployment and environment consistency mattered for handover.
- Data governance rules had to apply to self-service views.

## What I built

### 1. Data and API layer

Modeled retail financial metrics in PostgreSQL with FastAPI endpoints exposing filtered aggregates, detail drill-downs, and health checks for monitoring.

1. Curated metric tables from warehouse exports.
2. REST endpoints with role-aware filters.
3. Validation and error handling on query params.

### 2. Dashboard application

Built a TypeScript frontend consuming the API with responsive views for P&L-style summaries, trends, and store-level comparisons.

### 3. Delivery and ops

Containerized the stack with Docker, documented environment setup, and used Git/GitHub for version control and repeatable deployments.

- Docker compose for local and demo environments.
- Governed metric definitions documented alongside schema.
- Foundation ready for CI/CD extension.

![Retail financial dashboard](assets/img/masonry-portfolio/masonry-portfolio-3.jpg "Retail financial dashboard — API-backed metrics with interactive views.")

---

## Results

- Interactive dashboard replaced static spreadsheet distribution.
- API layer enabled future integrations without rebuilding metrics.
- Docker packaging simplified demo and deployment consistency.
- Governed metrics reduced conflicting retail finance numbers.

## What I would do differently

I would add automated API contract tests and seed data fixtures earlier so frontend and backend teams could iterate in parallel more safely.
