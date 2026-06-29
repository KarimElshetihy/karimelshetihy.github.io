# Incremental Loading

**Incremental loading** means loading only new or changed records instead of reloading the full dataset every time.

Example:

|Load type|Meaning|
|---|---|
|**Full load**|Reload all data from source to target|
|**Incremental load**|Load only new/changed data since last successful run|

---

## Full load vs incremental load

|Point|Full Load|Incremental Load|
|---|---|---|
|Data loaded|Entire source table/file|Only new or changed records|
|Speed|Slower for large data|Faster and cheaper|
|Complexity|Simple|More complex|
|Best for|Small tables, reference data, initial load|Large tables, frequent pipelines|
|Risk|Can overwrite everything if wrong|Can miss changes if logic is wrong|
|Recovery|Easier conceptually|Needs checkpoint/watermark handling|
|Example|Reload all customers daily|Load customers updated after last run|

---

## Watermark columns

A **watermark** is a column used to identify what has already been processed.

Common watermark columns:

|Watermark column|Example|Notes|
|---|---|---|
|`created_at`|New records only|Does not catch updates|
|`updated_at`|Inserts and updates|Most common|
|`last_modified_at`|Source modification timestamp|Good for incremental loads|
|`event_time`|Business event time|Useful for event data, but can arrive late|
|Auto-increment ID|`order_id > last_max_order_id`|Only works for append-only data|

---

## Watermark example

Last successful load processed until:

```text
last_watermark = 2026-06-27 23:59:59
```

Next run:

```sql
SELECT *
FROM source_orders
WHERE updated_at > '2026-06-27 23:59:59';
```

After successful load, update the control table:

|pipeline_name|last_successful_watermark|
|---|---|
|orders_incremental_load|2026-06-28 01:00:00|

---

## Important watermark best practices

|Best practice|Why|
|---|---|
|Store watermark in a control table|Makes pipeline restartable|
|Update watermark only after successful load|Avoids data loss|
|Use `>=` with deduplication sometimes|Handles boundary timestamp issues|
|Add overlap window|Handles late-arriving records|
|Use source extraction time separately|Avoids confusing event time with load time|
|Track pipeline run ID|Helps audit and rerun|

Example with overlap:

```sql
SELECT *
FROM source_orders
WHERE updated_at >= last_watermark - INTERVAL '10 minutes';
```

Then deduplicate in the target.

---

## CDC-based ingestion

**CDC = Change Data Capture**.

It captures inserts, updates, and deletes from the source system.

Common CDC methods:

|CDC type|How it works|Pros|Cons|
|---|---|---|---|
|Timestamp-based CDC|Uses `updated_at`|Simple|Misses deletes unless soft delete exists|
|Log-based CDC|Reads database transaction logs|Very reliable|More complex setup|
|Trigger-based CDC|DB triggers write changes to audit table|Captures changes|Adds load to source DB|
|Snapshot + CDC|Initial full snapshot, then CDC stream|Common production pattern|Needs careful reconciliation|

---

## CDC event example

|operation|order_id|amount|updated_at|
|---|--:|--:|---|
|INSERT|101|500|2026-06-28 10:00|
|UPDATE|101|650|2026-06-28 10:05|
|DELETE|102|NULL|2026-06-28 10:10|

Target handling:

|CDC operation|Target action|
|---|---|
|INSERT|Insert new row|
|UPDATE|Update existing row or create new SCD version|
|DELETE|Soft delete or hard delete depending on business rule|

---

## Incremental load using MERGE / UPSERT

A common pattern is:

```sql
MERGE INTO target_orders t
USING staging_orders s
ON t.order_id = s.order_id
WHEN MATCHED THEN UPDATE SET
    t.amount = s.amount,
    t.status = s.status,
    t.updated_at = s.updated_at
WHEN NOT MATCHED THEN INSERT (
    order_id, amount, status, updated_at
)
VALUES (
    s.order_id, s.amount, s.status, s.updated_at
);
```

This makes the load safer because the same batch can be rerun without creating duplicates.

---

## Handling missing records

Missing records can happen because of late arrival, source delay, failed extraction, or bad watermark logic.

|Problem|Example|Solution|
|---|---|---|
|Late-arriving record|Record updated before watermark but arrives later|Use overlap window and dedup|
|Source extraction failure|Some files/tables missing|Validate counts and fail the pipeline|
|Missing dimension|Fact arrives before dimension|Use unknown key, then reprocess later|
|Hard delete in source|Record disappears from source|Use CDC delete event or reconciliation|
|Watermark skipped ahead|Pipeline updates watermark before target load succeeds|Update watermark only after successful commit|

---

## Handling duplicated records

Duplicates can happen from retries, overlapping windows, CDC replays, or source duplication.

|Cause|Example|Solution|
|---|---|---|
|Pipeline retry|Same batch loaded twice|Make pipeline idempotent|
|Overlap window|Same record extracted again|Deduplicate by business key + latest timestamp|
|CDC replay|Same CDC event replayed|Use event ID / log position|
|Multiple updates in batch|Same key appears many times|Keep latest version using window function|
|Source duplicates|Bad upstream data|Apply data quality rules|

---

## Deduplication example

Keep latest record per business key:

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

For CDC, order by a stronger field when available:

```sql
ORDER BY cdc_log_position DESC
```

because timestamps may not be unique.

---

## Senior-level design pattern

A strong incremental pipeline usually has:

|Layer|Purpose|
|---|---|
|**Raw/Bronze**|Store extracted data exactly as received|
|**Staging/Silver**|Clean, deduplicate, validate|
|**Target/Gold**|Merge into final fact/dimension tables|
|**Control table**|Store watermark, status, run ID|
|**Audit table**|Store counts, rejected records, errors|

---

## Good control table columns

|Column|Purpose|
|---|---|
|`pipeline_name`|Identifies the pipeline|
|`last_successful_watermark`|Last processed point|
|`current_run_watermark`|Upper bound for current run|
|`run_id`|Unique pipeline execution ID|
|`status`|Running, success, failed|
|`source_count`|Number of extracted records|
|`target_insert_count`|Inserted rows|
|`target_update_count`|Updated rows|
|`target_reject_count`|Bad records|

---

## Important interview points

Be ready to explain:

- Full load is simple but expensive for large data.
    
- Incremental load is efficient but needs reliable change detection.
    
- Watermarks should be updated only after successful loads.
    
- Use overlap windows to handle late-arriving records.
    
- Use deduplication to handle duplicate extraction.
    
- CDC is better than timestamp logic when deletes and all updates must be captured.
    
- MERGE/UPSERT makes pipelines idempotent.
    
- Reconciliation is needed to detect missed or deleted records.
    

---

## Interview answer template

> Incremental loading means loading only new or changed records since the last successful run. Compared to a full load, it is faster and cheaper but more complex. We usually use watermark columns like `updated_at`, CDC log positions, or auto-increment IDs to detect changes. The watermark should be stored in a control table and updated only after the target load succeeds. To handle missing or late records, I use overlap windows, reconciliation checks, and reprocessing. To handle duplicates, I make the pipeline idempotent using deduplication and MERGE/UPSERT logic.

---

## Change Data Capture — Debezium & Kafka CDC Patterns

**Change Data Capture (CDC)** captures database changes like **insert, update, delete** and sends them to downstream systems.

Instead of repeatedly querying the source table, CDC reads changes from database logs and streams them.

Example flow:

```text
Database → Debezium → Kafka Topic → Consumer/Spark/Flink → Data Lake/Warehouse
```

---

## Why CDC is used

|Reason|Explanation|
|---|---|
|Near real-time ingestion|Changes are captured quickly after they happen|
|Lower source load|Avoids heavy repeated full-table queries|
|Captures deletes|Unlike simple `updated_at` incremental loading|
|Preserves change history|Useful for audit and SCD Type 2|
|Reliable replay|Kafka can retain events and replay them|

---

## Debezium

**Debezium** is an open-source CDC tool that captures row-level changes from databases and publishes them to Kafka.

It commonly supports databases like:

- PostgreSQL
    
- MySQL
    
- SQL Server
    
- Oracle
    
- MongoDB
    

---

## Debezium basic architecture

```text
Source Database
   |
   | transaction log / binlog / WAL
   v
Debezium Connector
   |
   v
Kafka Topic
   |
   v
Consumers
```

Examples:

|Database|Log used|
|---|---|
|MySQL|Binlog|
|PostgreSQL|WAL|
|SQL Server|Transaction log|
|Oracle|Redo logs|

---

## Debezium event structure

A Debezium event usually contains:

|Field|Meaning|
|---|---|
|`before`|Row values before change|
|`after`|Row values after change|
|`op`|Operation type|
|`ts_ms`|Event timestamp|
|`source`|Source metadata|
|`transaction`|Transaction info, if enabled|

---

## Operation types

|`op` value|Meaning|
|---|---|
|`c`|Create / insert|
|`u`|Update|
|`d`|Delete|
|`r`|Snapshot read|

Example update event:

```json
{
  "before": {
    "customer_id": 101,
    "city": "Cairo"
  },
  "after": {
    "customer_id": 101,
    "city": "Dubai"
  },
  "op": "u",
  "ts_ms": 1719800000000
}
```

---

## Kafka CDC Patterns

## 1. Topic per table

Most common CDC pattern:

```text
dbserver.public.customers
dbserver.public.orders
dbserver.public.order_items
```

Each source table has its own Kafka topic.

|Pros|Cons|
|---|---|
|Simple to consume|Many topics|
|Preserves table structure|Joins happen downstream|
|Easy schema evolution per table|Topic management needed|

---

## 2. Snapshot + streaming CDC

CDC pipelines usually start with an initial snapshot, then continue streaming changes.

```text
Initial snapshot → ongoing CDC changes
```

|Step|Description|
|---|---|
|1|Debezium takes initial snapshot of existing table data|
|2|Snapshot records are emitted with `op = r`|
|3|Then Debezium streams new inserts/updates/deletes|
|4|Downstream applies changes in order|

This is important because CDC alone captures only changes after the connector starts.

---

## 3. Upsert/KTable pattern

This pattern keeps only the latest state of each key.

Kafka topic is keyed by primary key:

```text
key = customer_id
value = latest customer record
```

Consumer applies:

|CDC operation|Target action|
|---|---|
|Insert|Insert row|
|Update|Update row|
|Delete|Delete or mark inactive|

This pattern is good for building **current-state tables**.

Example target:

|customer_id|name|city|is_deleted|
|--:|---|---|---|
|101|Ahmed|Dubai|false|

---

## 4. Append-only event log pattern

Instead of keeping only the latest state, store every CDC event.

```text
cdc_customer_events
```

| customer_id | op | old_city | new_city | event_time |  
|---:|---|---|---|  
| 101 | c | NULL | Cairo | 2024-01-01 |  
| 101 | u | Cairo | Dubai | 2024-07-01 |  
| 101 | d | Dubai | NULL | 2024-12-01 |

Good for:

- audit
    
- replay
    
- debugging
    
- SCD Type 2
    
- time-travel reconstruction
    

---

## 5. SCD Type 2 from CDC

CDC is very useful for building Type 2 dimensions.

For update events:

|Step|Action|
|---|---|
|1|Find current dimension row by natural key|
|2|Expire old row|
|3|Insert new row using `after` values|
|4|Set `effective_date` from event timestamp or business timestamp|
|5|Set `current_flag = Y`|

Example:

|customer_key|customer_id|city|effective_date|expiry_date|current_flag|
|--:|--:|---|---|---|---|
|1|101|Cairo|2024-01-01|2024-06-30|N|
|2|101|Dubai|2024-07-01|9999-12-31|Y|

---

## 6. Delete handling pattern

Debezium can emit delete events.

You need to decide what to do downstream:

|Delete strategy|Explanation|
|---|---|
|Hard delete|Remove row from target|
|Soft delete|Set `is_deleted = true`|
|SCD Type 2 delete|Expire current dimension row|
|Tombstone handling|Kafka compacted topics may use null-value tombstones|

For analytics, **soft delete** is often safer than hard delete.

---

## 7. Kafka compacted topic pattern

Kafka log compaction keeps the latest value per key.

Useful for current-state tables.

Example:

```text
Topic key = customer_id
Latest value = current customer record
```

|Pros|Cons|
|---|---|
|Efficient for latest state|Not good for full audit history|
|Can rebuild current table|Deletes need tombstone handling|
|Good for lookup/reference data|Historical changes may be removed|

---

## 8. Outbox pattern

The **outbox pattern** is used when you want reliable business events.

Instead of directly publishing events from the application, the app writes to an `outbox` table in the same transaction as the business change.

```text
Application transaction:
1. Update order table
2. Insert event into outbox table
```

Then Debezium reads the outbox table and sends events to Kafka.

Good for:

- avoiding dual-write problems
    
- reliable event publishing
    
- microservices
    
- business event streams
    

Example:

|outbox_id|aggregate_id|event_type|payload|
|---|---|---|---|
|1|O1001|OrderCreated|`{...}`|
|2|O1001|OrderPaid|`{...}`|

---

## Important Kafka CDC design points

## Message keys

Always key CDC messages by the business or primary key.

Example:

```text
customer_id
order_id
product_id
```

Why:

- preserves ordering per key
    
- supports compaction
    
- allows correct upserts
    
- helps partitioning
    

---

## Ordering

Kafka guarantees ordering **within a partition**, not across all partitions.

So if order matters for one customer/order, use the same key so all changes go to the same partition.

Example:

```text
key = customer_id
```

All changes for that customer go to the same partition.

---

## Exactly-once vs at-least-once

Most CDC systems are practically **at-least-once** end-to-end unless carefully designed.

That means duplicates can happen.

So consumers must be:

- idempotent
    
- able to deduplicate
    
- able to handle replays
    
- able to process events in order per key
    

---

## Offset management

Kafka consumers track offsets.

|Concept|Meaning|
|---|---|
|Offset|Position of message in Kafka partition|
|Consumer group|Group of consumers sharing topic processing|
|Commit offset|Mark messages as processed|
|Replay|Reprocess messages from old offset|

Best practice:

> Commit offsets only after successful processing to the target.

---

## Schema evolution

CDC messages can change when source table schema changes.

You should handle:

|Change|Impact|
|---|---|
|Add column|Usually safe|
|Rename column|Breaking change|
|Drop column|Breaking change|
|Change data type|Potentially breaking|
|Add nullable column|Usually easier|
|Add NOT NULL column|Can break consumers|

Common tool:

```text
Kafka Schema Registry
```

Used with Avro, Protobuf, or JSON Schema.

---

## CDC target patterns

|Target|Common pattern|
|---|---|
|Data lake bronze|Store raw CDC events append-only|
|Data lake silver|Apply upserts/deletes into current-state tables|
|Data warehouse|Merge CDC into facts/dimensions|
|SCD Type 2 dimension|Use CDC events to expire/insert versions|
|Search index|Apply upsert/delete events|
|Cache|Keep latest state by key|

---

## Common CDC issues and solutions

|Issue|Cause|Solution|
|---|---|---|
|Duplicate events|Retry or replay|Idempotent merge, dedup by event id/log position|
|Out-of-order events|Multiple partitions or late processing|Key by PK, use source log position|
|Missing deletes|Timestamp incremental loading|Use log-based CDC|
|Schema changes|Source DDL changes|Schema registry, compatibility checks|
|Snapshot duplicates|Snapshot overlaps with stream|Use primary key merge|
|Large transactions|Many events at once|Tune connector and consumer batching|
|Reprocessing needed|Bad downstream logic|Replay Kafka from older offset|
|Tombstone confusion|Kafka compaction delete marker|Handle null values explicitly|

---

## Debezium + Kafka to warehouse example

```text
PostgreSQL WAL
   ↓
Debezium PostgreSQL Connector
   ↓
Kafka topic: db.public.customers
   ↓
Spark/Flink/Kafka Streams consumer
   ↓
Bronze raw CDC table
   ↓
Silver current customers table
   ↓
Gold SCD Type 2 dim_customer
```

---

## Interview answer template

> CDC captures inserts, updates, and deletes from source systems, often using database transaction logs. Debezium is a common CDC tool that reads logs such as MySQL binlog or PostgreSQL WAL and publishes change events to Kafka. In Kafka CDC design, we usually use one topic per source table, key messages by primary key, store raw events append-only in bronze, and then apply upsert or SCD Type 2 logic downstream. Important considerations are ordering per key, duplicate handling, offset management, schema evolution, tombstone deletes, and idempotent consumers.
