# Idempotency

**Idempotency** means a pipeline can run multiple times with the same input and still produce the same final result.

In data engineering:

```text
Run once  → correct result
Run twice → same correct result, no duplicates, no corruption
```

It is very important for retries, failures, backfills, CDC replays, and incremental loads.

---

## Why idempotency matters

|Situation|Without idempotency|With idempotency|
|---|---|---|
|Job retry|Duplicate rows inserted|Same records updated/ignored safely|
|Pipeline failure halfway|Partial bad data remains|Can rerun from checkpoint safely|
|Backfill|Historical records duplicated|Historical partitions rebuilt safely|
|CDC replay|Same events applied twice|Events deduped or merged correctly|
|Overlap window|Same records extracted again|Existing records updated, not duplicated|

---

## Designing pipelines that can safely rerun

A safe rerunnable pipeline usually has these patterns:

|Pattern|Purpose|
|---|---|
|**Stable business key**|Identifies the same record across reruns|
|**Dedup before load**|Removes duplicate records in staging|
|**MERGE / UPSERT**|Updates existing records instead of blindly inserting|
|**Atomic writes**|Avoids half-written output|
|**Control table**|Tracks successful runs and watermarks|
|**Immutable raw layer**|Allows replay from original data|
|**Partition overwrite**|Safely rebuilds affected partitions|
|**Audit checks**|Validates counts and quality after load|

---

## Bad vs good pattern

### Bad: append-only insert

```sql
INSERT INTO fact_sales
SELECT *
FROM staging_sales;
```

If the job runs twice, it inserts the same rows twice.

---

### Good: merge/upsert

```sql
MERGE INTO fact_sales t
USING staging_sales s
ON t.order_id = s.order_id
AND t.order_line_id = s.order_line_id

WHEN MATCHED THEN UPDATE SET
    t.quantity = s.quantity,
    t.amount = s.amount,
    t.updated_at = s.updated_at

WHEN NOT MATCHED THEN INSERT (
    order_id,
    order_line_id,
    quantity,
    amount,
    updated_at
)
VALUES (
    s.order_id,
    s.order_line_id,
    s.quantity,
    s.amount,
    s.updated_at
);
```

Now rerunning the same batch will not create duplicate facts.

---

## Avoiding duplicate inserts

To avoid duplicate inserts, first define the **grain** of the table.

|Table|Example grain|Dedup key|
|---|---|---|
|`fact_sales`|One row per order line|`order_id + order_line_id`|
|`fact_payment`|One row per payment|`payment_id`|
|`fact_clickstream`|One row per event|`event_id`|
|`dim_customer_current`|One row per customer|`customer_id`|
|`dim_customer_scd2`|One row per customer version|`customer_id + effective_date`|

---

## Dedup before merge

Use `ROW_NUMBER()` to keep one record per key.

```sql
WITH deduped AS (
    SELECT *
    FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY order_id, order_line_id
                ORDER BY updated_at DESC
            ) AS rn
        FROM staging_sales
    ) x
    WHERE rn = 1
)
MERGE INTO fact_sales t
USING deduped s
ON t.order_id = s.order_id
AND t.order_line_id = s.order_line_id
WHEN MATCHED THEN UPDATE SET
    t.quantity = s.quantity,
    t.amount = s.amount,
    t.updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (
    order_id,
    order_line_id,
    quantity,
    amount,
    updated_at
)
VALUES (
    s.order_id,
    s.order_line_id,
    s.quantity,
    s.amount,
    s.updated_at
);
```

This avoids problems when the staging data contains duplicates.

---

## Merge / upsert patterns

|Pattern|Use case|Logic|
|---|---|---|
|**Insert-only with unique constraint**|Immutable events|Insert only if event ID does not exist|
|**MERGE update + insert**|Current-state tables|Update matched rows, insert new rows|
|**Partition overwrite**|Batch snapshots/backfills|Replace whole affected partition|
|**Delete + insert partition**|Warehouses without good MERGE support|Delete old partition, insert rebuilt partition|
|**SCD Type 2 merge**|Historical dimensions|Expire old row, insert new version|
|**CDC merge**|Change events|Apply insert/update/delete operations|

---

## Pattern 1: insert-only with unique event ID

Best for immutable events such as clickstream or payment events.

```sql
INSERT INTO fact_events
SELECT s.*
FROM staging_events s
LEFT JOIN fact_events t
  ON s.event_id = t.event_id
WHERE t.event_id IS NULL;
```

This prevents inserting the same event twice.

---

## Pattern 2: current-state merge

Best for tables that represent the latest state.

```sql
MERGE INTO customer_current t
USING staging_customer s
ON t.customer_id = s.customer_id

WHEN MATCHED THEN UPDATE SET
    t.name = s.name,
    t.city = s.city,
    t.updated_at = s.updated_at

WHEN NOT MATCHED THEN INSERT (
    customer_id,
    name,
    city,
    updated_at
)
VALUES (
    s.customer_id,
    s.name,
    s.city,
    s.updated_at
);
```

---

## Pattern 3: partition overwrite

Best when you can rebuild a full date partition.

Example:

```text
Rebuild sales partition for 2026-06-28
```

Steps:

|Step|Action|
|---|---|
|1|Read raw data for the date|
|2|Transform and deduplicate|
|3|Write to temp partition/table|
|4|Validate row counts and totals|
|5|Atomically replace target partition|

This is very common for batch pipelines.

---

## Pattern 4: SCD Type 2 idempotency

For SCD Type 2, do not insert a new version every time the pipeline reruns.

Use a **hash diff** to detect real changes.

|customer_id|city|hash_diff|
|---|---|---|
|C001|Cairo|hash1|
|C001|Dubai|hash2|

Logic:

|Condition|Action|
|---|---|
|New customer|Insert new current row|
|Existing customer, same hash|Do nothing|
|Existing customer, changed hash|Expire old row and insert new row|
|Same batch rerun|No new row inserted|

---

## SCD Type 2 example logic

```sql
-- Only changed records should be inserted
SELECT s.*
FROM staging_customer s
JOIN dim_customer d
  ON s.customer_id = d.customer_id
 AND d.current_flag = 'Y'
WHERE s.hash_diff <> d.hash_diff;
```

This prevents duplicate historical versions when rerunning the same batch.

---

## Pattern 5: CDC idempotency

For CDC, use a unique event identifier or log position.

|Source field|Purpose|
|---|---|
|`event_id`|Unique CDC event|
|`transaction_id`|Source transaction|
|`log_sequence_number`|Ordering and dedup|
|`op`|Insert/update/delete|
|`event_time`|Business/source time|

CDC consumer should track processed events:

```text
processed_event_id
or
source_partition + source_offset
or
log_sequence_number
```

This protects against replaying the same CDC events.

---

## Control table for idempotency

A control table helps avoid moving the watermark too early.

|Column|Purpose|
|---|---|
|`pipeline_name`|Pipeline identifier|
|`run_id`|Unique execution|
|`status`|Running, success, failed|
|`from_watermark`|Start point|
|`to_watermark`|End point|
|`source_count`|Extracted records|
|`target_count`|Loaded records|
|`started_at`|Run start|
|`completed_at`|Run end|

Rule:

> Update the final watermark only after the target load and validation succeed.

---

## Common mistakes

|Mistake|Why it is dangerous|
|---|---|
|Blind `INSERT INTO` on retry|Creates duplicates|
|No stable business key|Cannot identify duplicate records|
|Updating watermark before load succeeds|Causes missing data|
|Not deduping staging data|MERGE may fail or update unpredictably|
|Using timestamp only as key|Different events can share timestamps|
|Reprocessing without partition replacement|Old and new data coexist|
|SCD2 insert without change detection|Creates duplicate dimension versions|
|Ignoring CDC replay|Same change applied multiple times|

---

## Interview answer template

> Idempotency means the pipeline can be rerun safely without changing the final result incorrectly. I design for idempotency by defining the correct grain and stable business key, deduplicating staging data, and using MERGE or UPSERT instead of blind inserts. For batch pipelines, I often rebuild and atomically replace affected partitions. For CDC pipelines, I deduplicate by event ID or source log position and apply insert, update, and delete events idempotently. I also update watermarks only after the target load and validation succeed.
