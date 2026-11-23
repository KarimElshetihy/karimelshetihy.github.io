## Overview

This personal analytics project explored streak behavior in stock price movements — consecutive up/down days, streak length distributions, and conditional follow-on performance using public market data.

I used Python, Pandas, and API-sourced prices to build a reproducible notebook-style pipeline with exported summaries suitable for further statistical exploration.

---

## The challenge

- Raw API responses needed cleaning and alignment to trading calendars.
- Streak definitions had to be explicit and comparable across symbols.
- Large symbol lists required efficient batch processing.
- Results needed clear outputs, not ad hoc notebook state only.

## What I built

### 1. Data ingestion

Pulled historical prices via APIs, normalized timestamps, handled missing sessions, and stored tidy datasets for analysis.

### 2. Streak engine

Implemented streak detection for up/down/neutral sequences with summary stats by symbol, sector, and time window.

- Streak length distribution.
- Post-streak return windows.
- Batch processing with Pandas.

### 3. Automation shell

Wrapped execution in Bash for repeatable runs and parameterised symbol lists, making experiments easy to rerun.

---

## Results

- Reproducible pipeline for streak analysis across many symbols.
- Clear summaries replaced one-off manual charting.
- Framework reusable for other time-series pattern studies.
- Good foundation for deeper statistical or ML follow-ups.

## What I would do differently

I would package the streak engine as a small CLI tool with saved configs per experiment to compare runs over time.
