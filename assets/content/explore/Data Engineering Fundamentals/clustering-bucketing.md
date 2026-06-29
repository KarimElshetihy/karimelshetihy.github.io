# Clustering / Bucketing

**Clustering** and **bucketing** organize data inside a table to make filtering and joins faster.

They are different from partitioning:

```text
Partitioning = split table into folders/large chunks
Clustering/Bucketing = organize data inside those chunks
```

---

## Comparison table

|Concept|Main idea|Best for|Example|Main benefit|
|---|---|---|---|---|
|**Partitioning**|Splits data into separate partitions|Large date/event tables|`PARTITION BY order_date`|Skip whole partitions|
|**Clustering**|Physically groups similar values together|Filtering on common columns|Cluster by `customer_id`, `country`, `status`|Reduce scanned data inside partitions|
|**Bucketing**|Distributes rows into fixed buckets using hash|Joins and aggregations|Bucket by `customer_id` into 32 buckets|Better joins and balanced files|
|**Z-ordering**|Multi-column data skipping layout|Lakehouse/Delta tables|Z-order by `customer_id`, `product_id`|Faster multi-column filters|

---

## 1. Clustering

**Clustering** means organizing data so rows with similar values are stored close together.

Example:

```text
Table partitioned by order_date
Inside each date partition, cluster by customer_id
```

So a query like:

```sql
SELECT *
FROM fact_sales
WHERE order_date = DATE '2026-06-28'
  AND customer_id = 'C001';
```

can first prune the date partition, then scan less data inside that partition.

---

## When clustering helps

Clustering helps when:

|Situation|Why clustering helps|
|---|---|
|Queries filter often on the same columns|Less data scanned|
|Partition is still very large|Clustering narrows scan inside partition|
|Column has medium/high cardinality|Better grouping of similar values|
|Queries use range filters|Clustered ranges can be skipped|
|Table is read much more than written|Clustering cost is worth it|
|You frequently filter by customer/product/account|Common analytical access pattern|

Good clustering columns:

|Good column|Why|
|---|---|
|`customer_id`|Common lookup/filter|
|`product_id`|Common product analysis|
|`account_id`|Account-level queries|
|`country` + `status`|Common dashboard filters|
|`event_time`|Range queries inside date partitions|

Bad clustering columns:

|Bad column|Why|
|---|---|
|Very low-cardinality column alone, like `gender`|Not selective enough|
|Column rarely used in filters|No query benefit|
|Highly volatile column|Causes frequent reclustering|
|Too many clustering columns|Maintenance cost increases|

---

## 2. Partitioning vs clustering

|Point|Partitioning|Clustering|
|---|---|---|
|Physical layout|Creates separate partitions/directories|Sorts/groups data inside table/partition|
|Main purpose|Skip large sections of data|Skip smaller blocks/files inside partitions|
|Best column type|Low/medium cardinality, often date|Medium/high cardinality filter columns|
|Example|`order_date`|`customer_id`, `product_id`|
|Too many values problem|Creates too many partitions|Usually safer than partitioning high-cardinality columns|
|Maintenance|Partition management|Reclustering/optimization|
|Common use|Fact tables by date|Large partitions with frequent filters|
|Query benefit|Partition pruning|Data skipping / file pruning|

### Simple rule

Use:

```text
Partitioning for broad filters, usually date.
Clustering for selective filters inside partitions.
```

Example:

```text
Partition by order_date
Cluster by customer_id
```

---

## 3. Bucketing

**Bucketing** divides data into a fixed number of buckets based on a hash of a column.

Example:

```text
bucket_id = hash(customer_id) % 32
```

Rows with the same `customer_id` go to the same bucket.

---

## Bucketing example

```sql
CREATE TABLE fact_sales (
    order_id STRING,
    customer_id STRING,
    amount DECIMAL(10,2)
)
CLUSTERED BY (customer_id) INTO 32 BUCKETS;
```

Depending on the engine, syntax differs.

---

## When bucketing helps

|Situation|Why|
|---|---|
|Large joins on the same key|Matching keys are colocated|
|Frequent aggregations by key|Less shuffle|
|Very large fact-to-fact joins|Better distribution|
|Avoiding skew with controlled buckets|More balanced files|
|Hive/Spark style lake tables|Bucketing can improve join planning|

Example join:

```sql
SELECT *
FROM fact_sales s
JOIN fact_returns r
  ON s.customer_id = r.customer_id;
```

If both tables are bucketed by `customer_id` with compatible bucket counts, the engine may reduce shuffle.

---

## Bucketing cautions

|Issue|Explanation|
|---|---|
|Engine support varies|Some engines ignore or partially use bucketing|
|Bucket count matters|Too few = large buckets, too many = small files|
|Must match join key|Bucketing helps only on bucketed key|
|Hard to change later|Rebucketing large tables is expensive|
|Can still suffer skew|Hot keys can create large buckets|

---

## 4. Z-ordering in Delta Lake

**Z-ordering** is a Delta Lake optimization that colocates related data across multiple columns.

It helps Delta Lake skip files more effectively when filtering on those columns.

Example:

```sql
OPTIMIZE fact_sales
ZORDER BY (customer_id, product_id);
```

Use it when queries often filter by:

```sql
WHERE customer_id = 'C001'
```

or:

```sql
WHERE customer_id = 'C001'
  AND product_id = 'P100'
```

---

## Z-ordering vs regular clustering

|Point|Clustering|Z-ordering|
|---|---|---|
|General idea|Groups/sorts similar data|Multi-dimensional clustering|
|Common in|Warehouses and lakehouses|Delta Lake|
|Best for|One or more common filter columns|Multi-column data skipping|
|Example|Cluster by `customer_id`|Z-order by `customer_id`, `product_id`|
|Benefit|Fewer files/blocks scanned|Better skipping for combined filters|

---

## When Z-ordering helps

|Good use case|Example|
|---|---|
|Large Delta table|Billions of rows|
|Queries filter by selective columns|`customer_id`, `device_id`, `product_id`|
|Table already partitioned by date|Partition by `event_date`, Z-order by `customer_id`|
|Multi-column lookups|`customer_id + product_id`|
|Read-heavy workloads|Optimization cost pays off|

Bad use case:

|Bad use case|Why|
|---|---|
|Small table|No meaningful benefit|
|Column not used in filters|Wasted optimization|
|Very frequently updated table|Re-optimization cost|
|Too many Z-order columns|Diminishing returns|
|Low-selectivity column only|Limited skipping|

---

## 5. Recommended design patterns

## Pattern 1: Event/fact table

```text
Partition by event_date
Cluster/Z-order by customer_id or product_id
```

Example:

```sql
-- Delta Lake
OPTIMIZE fact_events
WHERE event_date >= DATE '2026-06-01'
ZORDER BY (customer_id);
```

Use when most queries filter by date and customer.

---

## Pattern 2: Customer 360 / account table

```text
Cluster by customer_id
```

Use when the table is not huge by date but analysts frequently search by customer/account.

---

## Pattern 3: Large joins

```text
Bucket both tables by join key
```

Example:

```text
fact_sales bucketed by product_id
fact_inventory bucketed by product_id
```

Can reduce shuffle during joins if the query engine uses bucket metadata.

---

## Pattern 4: High-cardinality column

Do **not** partition by high-cardinality columns like:

```text
customer_id
user_id
device_id
transaction_id
```

Instead, consider:

```text
Cluster/Z-order by customer_id
```

This avoids millions of partitions.

---

## Partitioning, clustering, bucketing quick guide

|Question|Best choice|
|---|---|
|Queries mostly filter by date?|Partition by date|
|Date partitions are still huge?|Cluster/Z-order inside date partitions|
|Queries filter by customer/product often?|Cluster/Z-order by customer/product|
|Large joins on same key?|Bucketing may help|
|Too many small partitions?|Reduce partitioning, use clustering instead|
|Delta Lake multi-column filters?|Use Z-ordering|
|High-cardinality key?|Avoid partitioning; use clustering/Z-ordering|

---

## Common mistakes

|Mistake|Why it is bad|
|---|---|
|Partitioning by `customer_id`|Too many partitions|
|Clustering by unused columns|No performance benefit|
|Using too many clustering columns|More maintenance cost|
|Z-ordering small tables|Wasted optimization|
|Bucketing with wrong bucket count|Poor performance or small files|
|Assuming bucketing always works|Engine may not use it|
|Not compacting before Z-ordering|Small files still hurt performance|
|Ignoring query patterns|Layout should match real filters/joins|

---

## Interview answer template

> Partitioning splits data into larger physical groups, usually by date, so the engine can skip whole partitions. Clustering organizes data inside partitions so queries can skip files or blocks based on common filter columns. Bucketing uses a hash of a key to distribute rows into fixed buckets and can help large joins or aggregations when both tables are bucketed on the join key. In Delta Lake, Z-ordering is a multi-column clustering technique that colocates related values and improves data skipping. A good pattern is to partition facts by event date and Z-order or cluster by selective columns like customer_id or product_id.
