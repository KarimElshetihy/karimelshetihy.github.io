# Data Skew

**Data skew** happens when data is not evenly distributed across partitions, workers, or keys.

Example:

```text
customer_id = C001 has 50 million rows
all other customers have 1,000 rows
```

This causes one task/worker to process much more data than others, making the whole job slow.

---

## Why skew is a problem

|Problem|Explanation|
|---|---|
|Slow jobs|One or few tasks take much longer|
|Failed jobs|Skewed task may run out of memory|
|Expensive shuffles|Large key sends too much data to one partition|
|Poor parallelism|Most workers finish early while one keeps running|
|Join bottlenecks|One join key creates a huge partition|

---

## How to detect skew

|Detection method|What to look for|
|---|---|
|Spark UI / job UI|Some tasks take much longer than others|
|Task input size|One task reads much more data|
|Shuffle read/write size|One partition has huge shuffle data|
|Key frequency analysis|One key appears far more than others|
|Partition row counts|Uneven rows across partitions|
|Long tail tasks|Few tasks keep running after most finish|

---

## SQL checks for skew

### 1. Check top keys

```sql
SELECT customer_id, COUNT(*) AS row_count
FROM fact_sales
GROUP BY customer_id
ORDER BY row_count DESC
LIMIT 20;
```

If one key is much larger than others, you likely have skew.

---

### 2. Compare max vs average key size

```sql
WITH key_counts AS (
    SELECT customer_id, COUNT(*) AS row_count
    FROM fact_sales
    GROUP BY customer_id
)
SELECT
    MAX(row_count) AS max_key_rows,
    AVG(row_count) AS avg_key_rows,
    MAX(row_count) / AVG(row_count) AS skew_ratio
FROM key_counts;
```

A high `skew_ratio` means some keys are much heavier than average.

---

### 3. Check partition distribution

```sql
SELECT
    partition_id,
    COUNT(*) AS row_count
FROM (
    SELECT
        *,
        MOD(ABS(HASH(customer_id)), 100) AS partition_id
    FROM fact_sales
) x
GROUP BY partition_id
ORDER BY row_count DESC;
```

This shows whether hash distribution is balanced.

---

## 1. Salting keys

**Salting** means adding a random or calculated suffix to a skewed key to spread it across multiple partitions.

Instead of:

```text
customer_id = C001
```

Use:

```text
customer_id_salted = C001_0, C001_1, C001_2, ... C001_9
```

This spreads one hot key across many partitions.

---

## Salting example

Suppose `customer_id = C001` is huge.

### Large fact table

```sql
SELECT
    *,
    CONCAT(customer_id, '_', CAST(FLOOR(RAND() * 10) AS INT)) AS salted_customer_id
FROM fact_sales;
```

### Small dimension table

Duplicate the matching dimension row across all salt values:

|customer_id|salt|salted_customer_id|
|---|--:|---|
|C001|0|C001_0|
|C001|1|C001_1|
|C001|2|C001_2|
|C001|...|...|
|C001|9|C001_9|

Then join on `salted_customer_id`.

---

## When salting helps

|Good use case|Why|
|---|---|
|One or few hot keys dominate|Spreads hot keys across partitions|
|Large fact joins small/medium dimension|Dimension can be duplicated|
|Aggregation by skewed key|Partial aggregation can be spread|
|Hot customer/product/account|Reduces single-task bottleneck|

---

## Salting cautions

|Risk|Explanation|
|---|---|
|More data duplication|Small side must be expanded|
|More complex logic|Need to add/remove salt correctly|
|Wrong salt size|Too small does not fix skew; too large adds overhead|
|Aggregations need final combine|Salted partial results must be merged|
|Not needed for all keys|Usually only salt hot keys|

---

## 2. Broadcast joins

A **broadcast join** sends the small table to all workers so the large table does not need to shuffle.

Good when joining:

```text
Large fact table + small dimension table
```

Example:

```python
from pyspark.sql.functions import broadcast

result = fact_sales.join(
    broadcast(dim_product),
    "product_id",
    "left"
)
```

Or SQL hint:

```sql
SELECT /*+ BROADCAST(d) */
    f.*,
    d.product_name
FROM fact_sales f
JOIN dim_product d
  ON f.product_id = d.product_id;
```

---

## When broadcast joins help

|Situation|Why|
|---|---|
|Dimension table is small|Can fit in executor memory|
|Join key is skewed|Avoids shuffle on join key|
|Star schema joins|Facts join small dimensions|
|Lookup/reference data|Small table copied to workers|

---

## Broadcast join cautions

| Risk | Explanation |  
|---|  
| Small table too large | Can cause executor memory errors |  
| Wrong statistics | Engine may not broadcast automatically |  
| Many broadcasts | Memory pressure |  
| Wide dimension table | Larger broadcast size than expected |

Rule of thumb:

> Broadcast only when the small side safely fits in memory.

---

## 3. Repartitioning strategy

**Repartitioning** controls how data is distributed before joins, aggregations, or writes.

Example:

```python
df = df.repartition(200, "customer_id")
```

This redistributes data by `customer_id` into 200 partitions.

---

## Repartitioning options

|Strategy|Use when|Example|
|---|---|---|
|Repartition by join key|Before large joins|`repartition("customer_id")`|
|Repartition by aggregation key|Before group by|`repartition("product_id")`|
|Increase partition count|Tasks are too large|200 → 800 partitions|
|Decrease partition count|Too many small tasks/files|`coalesce(50)`|
|Repartition by date|Before partitioned write|`repartition("event_date")`|
|Range repartition|For ordered/range data|`repartitionByRange("event_time")`|

---

## Repartition vs coalesce

|Concept|Meaning|Best for|
|---|---|---|
|`repartition`|Full shuffle to increase or rebalance partitions|Fixing uneven data, increasing parallelism|
|`coalesce`|Reduces partitions with less/no shuffle|Reducing output files|
|`repartitionByRange`|Distributes data by ranges|Time/range queries or sorted writes|

---

## Example: before writing partitioned data

Bad:

```python
df.write.partitionBy("event_date").parquet(path)
```

May create many small files if data is poorly distributed.

Better:

```python
df.repartition("event_date") \
  .write.partitionBy("event_date") \
  .parquet(path)
```

This groups records by partition column before writing.

For large partitions:

```python
df.repartition(400, "event_date") \
  .write.partitionBy("event_date") \
  .parquet(path)
```

---

## 4. Strategy comparison

|Technique|Best for|How it solves skew|Tradeoff|
|---|---|---|---|
|**Salting keys**|Hot keys|Splits one big key into many keys|More logic and duplication|
|**Broadcast join**|Large table + small table|Avoids shuffling by skewed key|Needs memory|
|**Repartitioning**|Uneven partitions|Redistributes data|Causes shuffle|
|**AQE skew join handling**|Spark skewed joins|Splits skewed shuffle partitions|Depends on engine/settings|
|**Pre-aggregation**|Skewed aggregations|Reduces data before shuffle|Extra step|
|**Filter/separate hot keys**|Few known hot keys|Process hot keys separately|More pipeline branches|

---

## 5. Pre-aggregation

For skewed aggregations, reduce data before final aggregation.

Example:

```sql
-- First aggregate locally by customer and date
WITH partial AS (
    SELECT
        customer_id,
        event_date,
        SUM(amount) AS amount
    FROM fact_sales
    GROUP BY customer_id, event_date
)
SELECT
    customer_id,
    SUM(amount) AS total_amount
FROM partial
GROUP BY customer_id;
```

This can reduce shuffle volume.

---

## 6. Separate hot-key processing

If only a few keys are skewed, process them separately.

```text
Normal keys → standard pipeline
Hot keys    → salted or special pipeline
Union results
```

Example:

|Branch|Logic|
|---|---|
|Non-skewed customers|Normal join|
|Hot customer C001|Salted join|
|Final result|Union both outputs|

This avoids complicating all data for one hot key.

---

## Common mistakes

|Mistake|Why it is bad|
|---|---|
|Increasing partitions blindly|May not fix hot-key skew|
|Salting every key|Adds unnecessary overhead|
|Broadcasting a table that is too large|Memory failures|
|Repartitioning too often|Extra expensive shuffles|
|Ignoring Spark UI/task metrics|Hard to know real bottleneck|
|Using wrong join key|Causes massive shuffle|
|Not updating table statistics|Optimizer chooses bad plan|
|Writing too many partitions|Small files problem|

---

## Interview answer template

> Data skew happens when some keys or partitions have much more data than others, causing a few tasks to run much longer or fail. I detect it using Spark UI task duration, shuffle size, partition row counts, and key frequency analysis. To fix it, I first check if a broadcast join is possible for small dimensions, because it avoids shuffle. For hot keys, I use salting to split the skewed key across multiple partitions and duplicate the small side accordingly. I also repartition by the correct join or aggregation key and tune the number of partitions. In Spark, I would also enable AQE skew join handling, but I still verify with metrics because repartitioning alone does not always solve hot-key skew.
