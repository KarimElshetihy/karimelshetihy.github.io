# Query Optimization

**Query optimization** means improving SQL/query performance by reducing:

- data scanned
    
- unnecessary joins
    
- expensive shuffles/sorts
    
- full table scans
    
- repeated calculations
    

In interviews, they usually expect you to explain **how you diagnose first**, then optimize.

---

## Main topics comparison

|Topic|Meaning|Why it matters|Example optimization|
|---|---|---|---|
|**Explain plan**|Shows how the engine will execute the query|Helps find bottlenecks|Detect full scan, bad join, missing index|
|**Indexing**|Data structure to speed up lookups|Avoids scanning full table|Index on `customer_id`|
|**Statistics**|Metadata about table size, values, distribution|Helps optimizer choose good plan|Refresh stats after big load|
|**Join order**|Order in which tables are joined|Affects data volume and cost|Filter small tables before joining|
|**Materialized view**|Precomputed query result stored physically|Speeds repeated expensive queries|Daily sales summary view|

---

## 1. Explain plans

An **explain plan** shows the execution steps chosen by the query engine.

Common commands:

```sql
EXPLAIN
SELECT ...
```

or:

```sql
EXPLAIN ANALYZE
SELECT ...
```

`EXPLAIN` shows the estimated plan.  
`EXPLAIN ANALYZE` runs the query and shows actual execution metrics.

---

## What to look for in explain plans

|Signal|Meaning|Possible fix|
|---|---|---|
|Full table scan|Engine reads entire table|Add filter, partition pruning, index|
|High row estimate|Too much data early|Push filters earlier|
|Bad join type|Inefficient join chosen|Add stats/indexes, rewrite query|
|Large shuffle/sort|Expensive distributed operation|Repartition, pre-aggregate, reduce columns|
|Nested loop on big tables|Very expensive join|Use hash/merge join, add index|
|Missing partition pruning|Reads too many partitions|Filter directly on partition column|
|Spilling to disk|Not enough memory|Reduce data, tune join, aggregate earlier|

---

## Example explain-plan thinking

Bad query:

```sql
SELECT *
FROM fact_sales f
JOIN dim_customer c
  ON f.customer_id = c.customer_id
WHERE DATE(f.order_timestamp) = DATE '2026-06-28';
```

Problem:

```sql
DATE(f.order_timestamp)
```

may prevent partition pruning or index usage.

Better:

```sql
SELECT
    f.order_id,
    f.amount,
    c.customer_name
FROM fact_sales f
JOIN dim_customer c
  ON f.customer_id = c.customer_id
WHERE f.order_timestamp >= TIMESTAMP '2026-06-28 00:00:00'
  AND f.order_timestamp <  TIMESTAMP '2026-06-29 00:00:00';
```

Or better if table is partitioned by `order_date`:

```sql
WHERE f.order_date = DATE '2026-06-28'
```

---

## 2. Indexing

An **index** helps the database find rows faster without scanning the whole table.

Example:

```sql
CREATE INDEX idx_orders_customer_id
ON orders(customer_id);
```

Useful for:

- filters
    
- joins
    
- sorting
    
- uniqueness checks
    

---

## Common index types

|Index type|Best for|Example|
|---|---|---|
|**B-tree index**|Equality/range filters|`customer_id`, `order_date`|
|**Composite index**|Multi-column filters|`(customer_id, order_date)`|
|**Unique index**|Prevent duplicates|`order_id`|
|**Bitmap index**|Low-cardinality columns in some warehouses|`status`, `gender`|
|**Clustered index**|Physically orders table data|`order_date`|
|**Covering index**|Query can be served from index only|`(customer_id, order_date, amount)`|

---

## Indexing best practices

|Practice|Reason|
|---|---|
|Index join keys|Speeds joins|
|Index common filter columns|Reduces scanned rows|
|Use composite indexes based on query pattern|Helps multi-column filters|
|Avoid too many indexes|Slows inserts/updates|
|Avoid indexing columns rarely used|Wastes storage|
|Put selective columns early in index|Improves filtering|
|Rebuild/maintain indexes if fragmented|Keeps performance stable|

Example composite index:

```sql
CREATE INDEX idx_orders_customer_date
ON orders(customer_id, order_date);
```

Good for:

```sql
WHERE customer_id = 'C001'
  AND order_date >= DATE '2026-06-01'
```

---

## Indexing in data warehouses/lakehouses

In many modern analytical systems, “indexing” may be replaced or complemented by:

|System style|Optimization|
|---|---|
|Data warehouse|Indexes, clustering, sort keys, distribution keys|
|BigQuery|Partitioning and clustering|
|Snowflake|Micro-partition pruning, clustering|
|Redshift|Sort keys and distribution keys|
|Delta Lake|Partitioning, Z-ordering, data skipping|
|Spark files|Partitioning, bucketing, file statistics|

So in interviews, do not say indexing is always the answer. In big data systems, layout and pruning are often more important.

---

## 3. Statistics

**Statistics** describe data to the optimizer.

Examples:

|Statistic|Meaning|
|---|---|
|Row count|Number of rows in table|
|Table size|Data volume|
|Number of distinct values|Cardinality|
|Min/max values|Helps pruning|
|Null count|Helps selectivity|
|Histograms|Distribution of values|
|Column correlation|Relationship between columns|

The optimizer uses statistics to choose:

- join order
    
- join type
    
- scan method
    
- whether to broadcast
    
- estimated cost
    

---

## Why stale statistics hurt

Example:

Table had **1 million rows**, now it has **500 million rows**, but stats were not refreshed.

Optimizer may:

- choose wrong join order
    
- broadcast a table that is too big
    
- use nested loop join
    
- underestimate shuffle size
    
- pick inefficient scan strategy
    

---

## Statistics commands examples

```sql
ANALYZE TABLE fact_sales;
```

or:

```sql
ANALYZE TABLE fact_sales COMPUTE STATISTICS;
```

Exact syntax depends on the database/engine.

---

## 4. Join order

**Join order** is the sequence in which tables are joined.

For large queries, wrong join order can explode intermediate data.

General rule:

```text
Filter early → reduce data → then join
```

---

## Join order example

Bad:

```sql
SELECT *
FROM fact_sales f
JOIN fact_clicks c
  ON f.customer_id = c.customer_id
JOIN dim_customer d
  ON f.customer_id = d.customer_id
WHERE d.country = 'EG';
```

Potential issue: joining two large fact tables before filtering customers.

Better:

```sql
WITH egypt_customers AS (
    SELECT customer_id
    FROM dim_customer
    WHERE country = 'EG'
)
SELECT *
FROM fact_sales f
JOIN egypt_customers d
  ON f.customer_id = d.customer_id
JOIN fact_clicks c
  ON f.customer_id = c.customer_id;
```

This reduces customers first.

---

## Join optimization techniques

|Technique|When to use|
|---|---|
|Filter before join|Reduce input rows|
|Select only needed columns|Reduce data movement|
|Broadcast small dimension|Large fact + small dimension|
|Pre-aggregate before join|Reduce fact table size|
|Avoid many-to-many joins|Prevent row explosion|
|Use correct join keys|Avoid accidental cartesian products|
|Check null keys|Nulls may cause unexpected results|
|Update statistics|Helps optimizer choose join order|

---

## 5. Materialized views

A **materialized view** stores a precomputed query result.

Unlike a normal view, it physically stores data.

Example:

```sql
CREATE MATERIALIZED VIEW mv_daily_sales AS
SELECT
    order_date,
    product_id,
    SUM(amount) AS total_sales
FROM fact_sales
GROUP BY order_date, product_id;
```

Then dashboards query:

```sql
SELECT *
FROM mv_daily_sales
WHERE order_date >= DATE '2026-06-01';
```

instead of scanning the full `fact_sales` table every time.

---

## Materialized view vs normal view

|Point|Normal view|Materialized view|
|---|---|---|
|Stores data?|No|Yes|
|Query speed|Same as underlying query|Usually faster|
|Freshness|Always current|Depends on refresh|
|Storage cost|Low|Higher|
|Maintenance|Simple|Needs refresh strategy|
|Best for|Reusable SQL logic|Repeated expensive aggregations|

---

## When materialized views help

|Good use case|Why|
|---|---|
|Repeated dashboard queries|Avoids recalculating same logic|
|Expensive aggregations|Precomputes totals|
|Joins used by many reports|Stores joined result|
|Slowly changing summary data|Refresh cost is manageable|
|BI semantic layer acceleration|Fast response for users|

---

## Materialized view cautions

|Risk|Explanation|
|---|---|
|Stale data|Refresh may lag source tables|
|Extra storage|Results are stored physically|
|Refresh cost|Large views can be expensive to refresh|
|Not good for ad-hoc queries|Benefit only if query pattern repeats|
|Complex dependencies|Refresh order matters|
|Incorrect grain|Aggregation may not support all reports|

---

## Senior-level query optimization checklist

|Step|What to check|
|---|---|
|1|Confirm query purpose and required columns|
|2|Check `EXPLAIN` / `EXPLAIN ANALYZE`|
|3|Look for full scans, bad joins, large shuffles, spills|
|4|Make filters partition/index friendly|
|5|Push filters and projections early|
|6|Validate join keys and join cardinality|
|7|Refresh/update table statistics|
|8|Add or adjust indexes/layout/clustering|
|9|Consider materialized views for repeated heavy queries|
|10|Re-test using actual runtime metrics|

---

## Common mistakes

|Mistake|Why it hurts|
|---|---|
|Using `SELECT *`|Reads unnecessary columns|
|Applying functions to filter columns|Can block index/partition pruning|
|Joining before filtering|Creates large intermediate data|
|Missing stats|Optimizer makes bad decisions|
|Too many indexes|Slows writes and increases storage|
|Wrong composite index order|Index not used efficiently|
|Many-to-many joins accidentally|Row explosion|
|Materialized view without refresh plan|Users see stale data|
|Optimizing without explain plan|Guesswork instead of diagnosis|

---

## Interview answer template

> I start query optimization by looking at the explain plan, not by guessing. I check whether the query is doing full table scans, missing partition pruning, bad join types, large shuffles, sorts, or spills. Then I reduce data early by filtering and selecting only needed columns, make predicates index or partition friendly, and validate join keys and join order. Indexing can help OLTP or relational warehouses, while in big data systems partitioning, clustering, sort keys, and file statistics may matter more. I also make sure table statistics are fresh so the optimizer can choose the right plan. For repeated expensive aggregations or dashboard queries, I consider materialized views with a clear refresh strategy.
