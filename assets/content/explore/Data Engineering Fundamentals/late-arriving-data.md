# Late-Arriving Data

**Late-arriving data** means records arrive **after the expected processing time** or after related data has already been loaded.

Common cases:

|Type|Meaning|Example|
|---|---|---|
|**Late-arriving fact**|Fact/event arrives late|Order from June 1 arrives on June 5|
|**Late-arriving dimension**|Dimension record arrives after fact|Sale arrives before customer exists in `dim_customer`|
|**Late dimension change**|Historical dimension change arrives late|Customer city changed on June 1, but update arrives June 10|

---

## 1. Late-arriving facts

A **late-arriving fact** is a business event that occurred in the past but arrived later.

Example:

|order_id|order_date|arrival_date|amount|
|---|---|---|--:|
|O1001|2026-06-01|2026-06-05|500|

The order happened on **June 1**, but the pipeline received it on **June 5**.

## Key issue

If your pipeline only processes today’s partition, the late fact may be missed.

Bad logic:

```sql
WHERE order_date = current_date
```

Better logic:

```sql
WHERE ingestion_date = current_date
```

or process an overlap window:

```sql
WHERE order_date >= current_date - INTERVAL '7 days'
```

## Common solutions

|Solution|How it helps|
|---|---|
|Use ingestion date|Captures when data arrived|
|Use event date for business partition|Stores fact in correct historical partition|
|Use overlap window|Rechecks recent past dates|
|Use MERGE/UPSERT|Avoids duplicate facts during reprocessing|
|Keep audit/control table|Tracks processed ranges and counts|

---

## 2. Late-arriving dimensions

A **late-arriving dimension** happens when a fact arrives before the matching dimension row exists.

Example:

Fact arrives:

|order_id|customer_id|order_date|amount|
|---|---|---|--:|
|O1001|C100|2026-06-01|500|

But `C100` is not yet in `dim_customer`.

## Common handling options

|Option|Meaning|When to use|
|---|---|---|
|Unknown key|Use `customer_key = -1`|Simple and common|
|Inferred member|Create temporary dimension row|Better if you expect dimension later|
|Reject/quarantine fact|Hold fact until dimension exists|When dimension is mandatory|
|Retry later|Reprocess unresolved facts|Common with late dimension pipelines|

---

## Unknown key example

|order_id|customer_key|amount|
|---|--:|--:|
|O1001|-1|500|

Where:

|customer_key|Meaning|
|--:|---|
|`-1`|Unknown customer|
|`-2`|Not applicable|
|`-3`|Invalid|

Later, when customer `C100` arrives, you can update or reprocess the fact.

---

## Inferred member example

Create a placeholder dimension row:

|customer_key|customer_id|customer_name|city|inferred_flag|
|--:|---|---|---|---|
|999|C100|Unknown|Unknown|Y|

Then the fact can point to `customer_key = 999`.

When full customer data arrives, update the placeholder:

|customer_key|customer_id|customer_name|city|inferred_flag|
|--:|---|---|---|---|
|999|C100|Ahmed|Cairo|N|

This avoids facts pointing to `-1`.

---

## 3. Late-arriving dimension changes

This is important for **SCD Type 2**.

Example:

Current dimension:

|customer_key|customer_id|city|effective_date|expiry_date|current_flag|
|--:|---|---|---|---|---|
|1|C100|Cairo|2026-01-01|9999-12-31|Y|

On June 10, you receive a late update:

```text
Customer C100 moved to Dubai on 2026-06-01
```

Correct result:

|customer_key|customer_id|city|effective_date|expiry_date|current_flag|
|--:|---|---|---|---|---|
|1|C100|Cairo|2026-01-01|2026-05-31|N|
|2|C100|Dubai|2026-06-01|9999-12-31|Y|

## Key issue

Facts between **2026-06-01** and **2026-06-10** may have joined to the wrong customer version and may need reprocessing.

---

## 4. Backfilling historical partitions

**Backfilling** means reloading or correcting old partitions.

Example:

```text
Reprocess fact_sales partitions from 2026-06-01 to 2026-06-10
```

## Common reasons for backfill

|Reason|Example|
|---|---|
|Late facts|Old events arrived late|
|Bad transformation logic|Bug in calculation|
|Late dimension change|SCD Type 2 ranges changed|
|Source correction|Source sent corrected historical data|
|Missed pipeline run|Job failed for past dates|

## Backfill best practices

|Practice|Why|
|---|---|
|Backfill by partition|Limits cost and risk|
|Use idempotent MERGE|Safe reruns|
|Write to temp table first|Validate before replacing target|
|Recalculate aggregates|Gold tables must reflect corrected facts|
|Track backfill run ID|Helps audit and rollback|
|Avoid full reload unless necessary|Saves time and cost|

---

## 5. Reprocessing strategy

A strong reprocessing strategy has clear layers.

```text
Bronze/raw → Silver/cleaned → Gold/business tables
```

## Recommended approach

|Layer|Strategy|
|---|---|
|**Bronze/raw**|Keep immutable raw data exactly as received|
|**Silver/staging**|Deduplicate, validate, apply corrections|
|**Gold/facts/dimensions**|Rebuild affected partitions or MERGE corrected records|
|**Aggregates/marts**|Recompute affected summaries|

---

## Reprocessing flow

```text
1. Identify affected date range or business keys
2. Read raw data from Bronze
3. Rebuild Silver for affected range
4. Rebuild or MERGE into Fact/Dimension tables
5. Recompute dependent aggregates
6. Run data quality checks
7. Update audit/control tables
```

---

## Late-arriving facts vs dimensions

|Topic|Late-arriving facts|Late-arriving dimensions|
|---|---|---|
|Problem|Event arrives late|Descriptive entity arrives late|
|Example|Old order arrives today|Customer arrives after order|
|Target impact|Historical fact partition|Dimension lookup / surrogate key|
|Common solution|Backfill or merge old partition|Unknown key or inferred member|
|Reprocessing needed?|Usually affected partitions|Facts with unknown/wrong dimension keys|
|Important date|Event date|Dimension effective date|

---

## Practical comparison

|Scenario|Example|Best handling|
|---|---|---|
|Fact arrives late but dimension exists|June 1 sale arrives June 5|Insert into June 1 partition using MERGE|
|Fact arrives but dimension missing|Sale for unknown customer|Use unknown key or inferred member|
|Dimension arrives later|Customer details arrive after sale|Update inferred member or reprocess fact lookup|
|Historical dimension change arrives late|Customer moved on June 1, update arrives June 10|Adjust SCD2 ranges and reprocess affected facts|
|Old partition already closed|Correction for last month|Controlled backfill of affected partition|
|Aggregates already published|Daily sales total is wrong|Recompute affected aggregate dates|

---

## Important interview points

- Separate **event time** from **ingestion time**.
    
- Partition facts by **business/event date**, but track **arrival/ingestion date**.
    
- Use **overlap windows** for incremental pipelines.
    
- Use **unknown keys** or **inferred members** for missing dimensions.
    
- For SCD Type 2, facts must join to the dimension version valid at the event date.
    
- Backfill only affected partitions when possible.
    
- Reprocessing must be **idempotent**.
    
- Raw/Bronze data should be immutable to support replay.
    
- Recompute downstream aggregates after correcting facts or dimensions.
    

---

## Interview answer template

> Late-arriving data happens when facts or dimensions arrive after the expected processing window. For late-arriving facts, I load them into the correct historical partition based on event date and use MERGE to avoid duplicates. For late-arriving dimensions, I either use an unknown key, create an inferred member, or quarantine the fact until the dimension arrives. For SCD Type 2 changes that arrive late, I adjust the effective and expiry dates, insert the correct historical dimension version, and reprocess affected facts so they point to the right surrogate key. For backfills, I prefer partition-level reprocessing from immutable raw data with audit checks and idempotent logic.
