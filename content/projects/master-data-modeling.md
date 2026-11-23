## Overview

The organization needed consistent master data structures that could serve both operational applications and analytics, without rebuilding models for every new use case.

I designed master data models with clear entity relationships, naming standards, and extension patterns so new attributes and sources could be onboarded without breaking existing consumers.

---

## The challenge

- Entity definitions varied by department and source system.
- Existing models were report-driven, not reusable across domains.
- Slowly changing attributes were handled inconsistently.
- No documented standards existed for hierarchy and reference data.

## What I built

### 1. Entity architecture

Modeled core entities, hierarchies, and reference tables with shared conformed keys and explicit cardinality rules usable across warehouse and application layers.

### 2. Standards and patterns

Introduced naming conventions, SCD patterns, and source-to-target mapping templates so new master domains followed the same design language.

- Reusable templates for party, product, and location domains.
- Documented grain and primary business keys.
- Extension tables for source-specific attributes.

### 3. Consumption-ready outputs

Published master views optimized for both SQL reporting and integration APIs, reducing duplicate modeling work in downstream projects.

---

## Results

- Master entities became reusable building blocks for new analytics use cases.
- Modeling effort dropped for subsequent warehouse and MDM work.
- Hierarchy and reference data became easier to govern and explain.
- Cross-team alignment improved through shared definitions and keys.

## What I would do differently

I would pair each master entity with a short data contract describing grain, refresh cadence, and approved consumers to reduce misuse over time.
