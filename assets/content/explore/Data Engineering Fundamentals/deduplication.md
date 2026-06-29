# Deduplication

**Deduplication** means removing repeated records/events so the target table contains only the correct version of each business entity or event.

Duplicates usually happen because of:

|Cause|Example|
|---|---|
|Pipeline retries|Same file or batch loaded twice|
|CDC replay|Same Kafka events consumed again|
|Source system issue|Same order sent multiple times|
|Overlap window|Incremental load intentionally reloads last 10 minutes|
|Multiple updates|Same business key appears many times in one batch|

---

## 1. Removing duplicate events

First define the **deduplication key**.

|Scenario|Dedup key|
|---|---|
|Orders|`order_id`|
|Order lines|`order_id + order_line_id`|
|Payments|`payment_id`|
|Clickstream|`event_id`|
|CDC events|`primary_key + log_position` or `event_id`|
|IoT events|`device_id + event_timestamp + sequence_number`|

The best dedup key is usually a **stable business event ID**, not just timestamp.

---

## 2. Using `ROW_NUMBER()`

Most common batch dedup pattern:

```sql
WITH ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id
            ORDER BY updated_at DESC
        ) AS rn
    FROM staging_orders
)
SELECT *
FROM ranked
WHERE rn = 1;
```

Meaning:

|Part|Meaning|
|---|---|
|`PARTITION BY order_id`|Group duplicates by business key|
|`ORDER BY updated_at DESC`|Keep the latest record|
|`rn = 1`|Select only one row per key|

---

## Example

Input:

|order_id|status|updated_at|
|---|---|---|
|O1001|Created|2026-06-28 10:00|
|O1001|Paid|2026-06-28 10:10|
|O1001|Shipped|2026-06-28 10:30|

After dedup:

|order_id|status|updated_at|
|---|---|---|
|O1001|Shipped|2026-06-28 10:30|

Because it is the latest record.

---

## Better ordering for CDC

For CDC, do not rely only on `updated_at` if possible.

Use stronger ordering fields:

|Field|Why|
|---|---|
|`cdc_log_position`|Exact source change order|
|`transaction_id`|Groups changes from same DB transaction|
|`event_sequence`|Handles multiple changes with same timestamp|
|`source_commit_timestamp`|Better than processing timestamp|
|`ingestion_time`|Last fallback only|

Example:

```sql
WITH ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY customer_id
            ORDER BY cdc_log_position DESC
        ) AS rn
    FROM customer_cdc_events
)
SELECT *
FROM ranked
WHERE rn = 1;
```

---

## 3. Deduping in batch vs streaming pipelines

|Point|Batch deduplication|Streaming deduplication|
|---|---|---|
|Data scope|Fixed dataset/batch|Continuous events|
|Main method|Window function, group by, merge|State store + watermark|
|Common key|Business key or event ID|Event ID or business key|
|Late data handling|Reprocess batch or overlap window|Watermark controls how late data is accepted|
|Duplicate memory|Only during batch job|State must be stored for a time window|
|Complexity|Lower|Higher|
|Cost concern|Query/shuffle cost|State size and checkpoint cost|
|Example tool|SQL, Spark batch, dbt|Spark Structured Streaming, Flink, Kafka Streams|

---

## Batch dedup pattern

Batch dedup is usually:

```text
Read staging data
→ rank records by key
→ keep latest
→ MERGE into target
```

Example:

```sql
MERGE INTO target_orders t
USING (
    SELECT *
    FROM (
        SELECT
            *,
            ROW_NUMBER() OVER (
                PARTITION BY order_id
                ORDER BY updated_at DESC
            ) AS rn
        FROM staging_orders
    ) x
    WHERE rn = 1
) s
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET
    t.status = s.status,
    t.updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (
    order_id, status, updated_at
)
VALUES (
    s.order_id, s.status, s.updated_at
);
```

This makes the load **idempotent**, meaning rerunning the same batch should not create duplicates.

---

## Streaming dedup pattern

In streaming, you usually deduplicate using:

```text
event_id + watermark + checkpoint/state store
```

Example logic:

```text
Keep event_id in state for 24 hours.
If same event_id appears again within 24 hours, drop it.
If event is older than watermark, either drop it or route to late-events table.
```

Conceptual Spark Structured Streaming example:

```python
deduped = (
    stream_df
    .withWatermark("event_time", "24 hours")
    .dropDuplicates(["event_id"])
)
```

For composite keys:

```python
deduped = (
    stream_df
    .withWatermark("event_time", "24 hours")
    .dropDuplicates(["order_id", "event_type"])
)
```

---

## Watermark in streaming

A **watermark** defines how long the system waits for late events.

Example:

```text
Watermark = 24 hours
```

Meaning:

|Event case|Result|
|---|---|
|Duplicate arrives after 5 minutes|Dropped|
|Duplicate arrives after 3 hours|Dropped|
|Duplicate arrives after 2 days|May not be detected because state expired|
|Very late new event|May be dropped or sent to late-events handling|

Tradeoff:

|Longer watermark|Shorter watermark|
|---|---|
|Catches more late duplicates|Lower memory/state cost|
|More expensive state|Faster and cheaper|
|Better correctness for late data|More risk of missed late events|

---

## Common dedup strategies

|Strategy|Best for|Example|
|---|---|---|
|Keep latest record|Current-state tables|Latest customer status|
|Keep earliest record|First-touch attribution|First login, first purchase|
|Exact duplicate removal|File duplicates|Same row repeated|
|Event ID dedup|Streaming events|Same `event_id` replayed|
|CDC log-position dedup|CDC ingestion|Same binlog/WAL event replayed|
|Business-key dedup|Entity updates|One row per customer/order|
|Hash-based dedup|Wide rows/no event ID|Hash all important columns|

---

## Exact duplicate removal

If the entire row is duplicated:

```sql
SELECT DISTINCT *
FROM staging_table;
```

But this is not enough when duplicates differ slightly.

Example:

|order_id|status|updated_at|
|---|---|---|
|O1001|Paid|10:00|
|O1001|Shipped|10:30|

`DISTINCT` keeps both rows, so use `ROW_NUMBER()`.

---

## Dedup with hash

Useful when you need to detect exact duplicate payloads.

```sql
SELECT
    *,
    MD5(CONCAT_WS('|', col1, col2, col3)) AS row_hash
FROM staging_table;
```

Then dedup by:

```text
business_key + row_hash
```

This helps identify whether the same event was replayed.

---

## Handling duplicates in facts

For fact tables, define the **grain** first.

Example grain:

```text
One row per order line
```

Dedup key:

```text
order_id + order_line_id
```

Bad dedup key:

```text
order_id
```

because one order can have many lines.

---

## Handling duplicates in dimensions

For dimensions, duplicates are usually handled by natural key and change detection.

For SCD Type 1:

```text
One current row per natural key
```

For SCD Type 2:

```text
One current row per natural key
No overlapping effective/expiry date ranges
```

Important check:

```sql
SELECT customer_id, COUNT(*)
FROM dim_customer
WHERE current_flag = 'Y'
GROUP BY customer_id
HAVING COUNT(*) > 1;
```

This detects invalid duplicate current dimension rows.

---

## Common mistakes

|Mistake|Why it is bad|
|---|---|
|Dedup by timestamp only|Different events can have same timestamp|
|Using `DISTINCT` blindly|Does not handle latest-version logic|
|No stable event ID|Hard to detect replayed events|
|Dedup after merge|Duplicates may already pollute target|
|Not handling late events|Streaming results become inconsistent|
|Wrong fact grain|Removes valid rows by mistake|
|No idempotency|Retries create duplicate records|

---

## Interview answer template

> Deduplication starts by defining the correct grain and deduplication key. In batch pipelines, I usually use `ROW_NUMBER()` partitioned by the business key or event ID and ordered by a reliable ordering column like `updated_at`, CDC log position, or event sequence, then keep `rn = 1`. In streaming, deduplication requires state, watermarking, and checkpointing; we keep event IDs or keys in state for a defined time window and drop duplicates that arrive within that window. The main tradeoff in streaming is correctness versus state size and latency.
