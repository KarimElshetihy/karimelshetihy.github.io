# Partitioning

**Partitioning** means physically or logically splitting a large table into smaller parts so queries and loads are faster and cheaper.

Instead of scanning the whole table:

```text
fact_sales
```

we split it by a useful column:

```text
fact_sales/order_date=2026-06-28/
fact_sales/order_date=2026-06-29/
fact_sales/order_date=2026-06-30/
```

---

## Partitioning comparison

|Topic|Meaning|Example|Best for|Risk|
|---|---|---|---|---|
|**Date partitioning**|Split data by date/time|`order_date`, `event_date`, `load_date`|Facts, logs, events, daily loads|Too many tiny partitions|
|**Hash partitioning**|Split data using hash of a key|`hash(customer_id) % 16`|Even distribution, avoiding skew|Harder for date filtering|
|**Partition pruning**|Query engine skips irrelevant partitions|Query only June 2026|Faster queries and lower cost|Fails if filter is not on partition column|
|**Small files problem**|Too many small files inside partitions|Thousands of 1 MB files|Common in Spark/lakehouse|Slow metadata and query planning|

---

## 1. Date partitioning

**Date partitioning** is the most common pattern for fact tables and event tables.

Example:

```sql
PARTITION BY order_date
```

or in a data lake:

```text
/sales/order_date=2026-06-28/
/sales/order_date=2026-06-29/
```

### Good use cases

|Use case|Good partition column|
|---|---|
|Sales facts|`order_date`|
|Clickstream events|`event_date`|
|IoT readings|`event_date` or `event_hour`|
|Data ingestion audit|`ingestion_date`|
|Daily snapshots|`snapshot_date`|

### Best practice

For business facts, usually store both:

|Column|Purpose|
|---|---|
|`event_date` / `business_date`|When the business event happened|
|`ingestion_date`|When the data arrived|

Usually partition by **event/business date** for analytics, while keeping `ingestion_date` for late-arrival tracking.

---

## 2. Choosing partition granularity

|Granularity|Example|When to use|
|---|---|---|
|Year|`year=2026`|Small data volume|
|Month|`year=2026/month=06`|Medium data volume|
|Day|`date=2026-06-28`|Most common for large fact/event tables|
|Hour|`date=2026-06-28/hour=10`|Very high-volume streaming/event data|

Important rule:

> Choose partitioning based on query filters and data volume, not just habit.

Bad example:

```text
partition by customer_id
```

If there are millions of customers, this creates too many partitions.

---

## 3. Hash partitioning

**Hash partitioning** distributes records using a hash function.

Example:

```text
partition_id = hash(customer_id) % 16
```

Result:

|customer_id|hash_partition|
|---|--:|
|C001|3|
|C002|11|
|C003|3|

### When hash partitioning helps

|Scenario|Why it helps|
|---|---|
|Data skew|Spreads records across partitions|
|Large joins|Helps distribute join keys|
|No natural date filter|Gives even distribution|
|Parallel processing|Multiple workers process partitions|
|High-cardinality keys|Avoids one huge partition|

### Limitation

Hash partitioning is not very helpful if most queries are like:

```sql
WHERE order_date BETWEEN '2026-06-01' AND '2026-06-30'
```

because the table is not organized by date.

---

## 4. Date vs hash partitioning

|Point|Date partitioning|Hash partitioning|
|---|---|---|
|Main goal|Query by time range|Even data distribution|
|Best for|Facts, events, snapshots|Skewed or high-volume keys|
|Example key|`order_date`|`customer_id`, `account_id`|
|Query pruning|Strong for date filters|Strong only if hash key/filter is known|
|Operational use|Easy backfills by date|Good parallelism|
|Risk|Hot partitions or small files|Less intuitive for analysts|

Often, systems combine both:

```text
/date=2026-06-28/hash_bucket=00/
/date=2026-06-28/hash_bucket=01/
...
```

This is useful when each date partition is very large.

---

## 5. Partition pruning

**Partition pruning** means the query engine reads only the partitions needed.

Example table partitioned by `order_date`.

Good query:

```sql
SELECT SUM(amount)
FROM fact_sales
WHERE order_date = DATE '2026-06-28';
```

The engine reads only:

```text
/order_date=2026-06-28/
```

Bad query:

```sql
SELECT SUM(amount)
FROM fact_sales
WHERE DATE(order_timestamp) = DATE '2026-06-28';
```

This may prevent pruning because a function is applied to the column.

Better:

```sql
SELECT SUM(amount)
FROM fact_sales
WHERE order_timestamp >= TIMESTAMP '2026-06-28 00:00:00'
  AND order_timestamp <  TIMESTAMP '2026-06-29 00:00:00';
```

Or include a separate partition column:

```sql
WHERE order_date = DATE '2026-06-28'
```

---

## Partition pruning best practices

|Practice|Why|
|---|---|
|Filter directly on partition column|Enables pruning|
|Avoid functions on partition column|Functions can block pruning|
|Use bounded date ranges|Prevents scanning all partitions|
|Keep partition column in the table|Helps query optimizer|
|Check query plan|Confirms partitions are skipped|
|Avoid overly granular partitions|Too many partitions hurt planning|

---

## 6. Small files problem

The **small files problem** happens when a table has many tiny files.

Example:

```text
/date=2026-06-28/file_001.parquet 1 MB
/date=2026-06-28/file_002.parquet 2 MB
/date=2026-06-28/file_003.parquet 500 KB
...
```

This is bad because query engines spend too much time on:

- file listing
    
- metadata reading
    
- task scheduling
    
- opening and closing files
    
- excessive small tasks
    

Even if the total data size is not huge, performance can be poor.

---

## Common causes of small files

|Cause|Example|
|---|---|
|Streaming writes|Micro-batches create many files|
|Too many partitions|Partition by hour/customer/device|
|Low-volume partitions|Daily partition has only a few rows|
|Frequent incremental loads|Many small appends|
|Over-repartitioning|Spark writes too many output files|
|Each worker writes tiny output|Too many parallel tasks|

---

## How to fix small files

|Fix|Explanation|
|---|---|
|Compact files|Merge small files into larger files|
|Optimize write size|Control number of output files|
|Use partition overwrite carefully|Rebuild partitions with fewer files|
|Reduce partition granularity|Use daily instead of hourly if volume is low|
|Batch streaming output|Larger micro-batches create fewer files|
|Use table optimization commands|Example: `OPTIMIZE` in Delta Lake|
|Avoid high-cardinality partitions|Do not partition by user/customer ID|

Example Spark approach:

```python
df.repartition("order_date").write.partitionBy("order_date").parquet(path)
```

If one partition still creates many tiny files, control number of output files carefully:

```python
df.coalesce(10).write.mode("overwrite").parquet(path)
```

Use `coalesce` carefully; too few files can reduce parallelism.

---

## 7. Partitioning mistakes

|Mistake|Why it is bad|
|---|---|
|Partitioning by high-cardinality column|Creates millions of partitions|
|Partitioning by low-value column|Partitions are too large or useless|
|Hourly partitioning for small data|Creates many tiny partitions|
|Not filtering by partition column|No pruning benefit|
|Applying functions on partition column|Can prevent pruning|
|Too many small files|Slow queries despite partitioning|
|Partitioning only by ingestion date|Business queries by event date may scan more data|
|Partitioning by every useful column|Too many directories and metadata overhead|

---

## Strong interview answer

> Partitioning improves performance by splitting large tables into smaller physical/logical units. Date partitioning is common for facts and event data because most analytics filter by business date or event date. Hash partitioning is useful when we need even distribution or want to reduce skew, especially for large joins or high-volume keys. Partition pruning is when the engine skips partitions that do not match the query filter, so queries must filter directly on the partition column. A common issue in data lakes is the small files problem, where frequent writes or too many partitions create many tiny files; this hurts planning and read performance. I usually fix it with compaction, proper partition granularity, and optimized write sizing.
