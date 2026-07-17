## Overview

Data architecture defines how systems connect, how ownership is divided, and how data flows from raw ingestion to governed analytics products. The right pattern depends on team size, domain complexity, and platform maturity.

## Common patterns

- Medallion (bronze / silver / gold): progressive quality layers in a lakehouse.
- Data mesh: domain-oriented data products with federated governance.
- Hub-and-spoke: centralized warehouse with departmental marts.
- Lambda / Kappa: batch and streaming paths for the same logical dataset.

> Architecture is not about picking the trendiest stack — it is about matching structure to how your organization actually creates and consumes data.
