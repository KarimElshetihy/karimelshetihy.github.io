---
category: data-architecture
group: fundamentals
title: Data Architecture
description: Lakehouse, Medallion, Data Mesh
icon: bi-layers-fill
order: 1
type: Fundamentals
subtitle: Lakehouse, medallion, and data mesh patterns for scalable platforms.
articleNavTitle: On this page
articleNavExpanded: true
projectInfo:
  - Field: Data Architecture
  - Patterns: Lakehouse, Medallion, Data Mesh, Hub-and-Spoke
  - Level: Beginner
updated: 2026-06-30
---
## Overview

Data architecture defines how systems connect, how ownership is divided, and how data flows from raw ingestion to governed analytics products. The right pattern depends on team size, domain complexity, and platform maturity.

## Common patterns

- Medallion (bronze / silver / gold): progressive quality layers in a lakehouse.
- Data mesh: domain-oriented data products with federated governance.
- Hub-and-spoke: centralized warehouse with departmental marts.
- Lambda / Kappa: batch and streaming paths for the same logical dataset.

> Architecture is not about picking the trendiest stack — it is about matching structure to how your organization actually creates and consumes data.
