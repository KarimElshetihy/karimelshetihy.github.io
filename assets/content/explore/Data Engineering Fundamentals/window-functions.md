# Window Functions

**Window functions** calculate values across a set of related rows without collapsing rows like `GROUP BY`.

They are very common in data engineering interviews for:

- deduplication
    
- ranking
    
- SCD logic
    
- running totals
    
- detecting changes
    
- comparing current row with previous/next row
    

Basic structure:

```sql
FUNCTION() OVER (
    PARTITION BY column
    ORDER BY column
)
```

---

## Window functions comparison

|Function|Purpose|Example use case|
|---|---|---|
|`ROW_NUMBER()`|Gives unique sequence number per partition|Deduplication|
|`RANK()`|Gives ranking with gaps after ties|Top products with tied sales|
|`DENSE_RANK()`|Ranking without gaps after ties|Cleaner ranking list|
|`LAG()`|Reads previous row value|Compare current status with previous status|
|`LEAD()`|Reads next row value|Find next event date|
|`SUM() OVER()`|Running total or rolling total|Cumulative sales|
|`COUNT() OVER()`|Count rows without grouping|Count orders per customer while keeping detail rows|

---

## 1. ROW_NUMBER

`ROW_NUMBER()` assigns a unique number to each row inside a partition.

```sql
SELECT
    order_id,
    customer_id,
    updated_at,
    ROW_NUMBER() OVER (
        PARTITION BY order_id
        ORDER BY updated_at DESC
    ) AS rn
FROM staging_orders;
```

Example result:

|order_id|status|updated_at|rn|
|---|---|--:|--:|
|O1001|Shipped|10:30|1|
|O1001|Paid|10:10|2|
|O1001|Created|10:00|3|

Use `rn = 1` to keep the latest record.

---

## 2. RANK and DENSE_RANK

`RANK()` gives the same rank for tied values, but skips the next rank.

```sql
SELECT
    product_id,
    sales_amount,
    RANK() OVER (
        ORDER BY sales_amount DESC
    ) AS sales_rank
FROM product_sales;
```

Example:

|product_id|sales_amount|RANK|DENSE_RANK|
|---|--:|--:|--:|
|P1|1000|1|1|
|P2|900|2|2|
|P3|900|2|2|
|P4|700|4|3|

Difference:

|Function|Tie behavior|
|---|---|
|`RANK()`|Same rank, then skips numbers|
|`DENSE_RANK()`|Same rank, no skipped numbers|
|`ROW_NUMBER()`|No ties; every row gets a unique number|

---

## 3. LAG

`LAG()` gets a value from the previous row.

Useful for detecting changes.

```sql
SELECT
    customer_id,
    status,
    updated_at,
    LAG(status) OVER (
        PARTITION BY customer_id
        ORDER BY updated_at
    ) AS previous_status
FROM customer_status_history;
```

Example:

|customer_id|status|updated_at|previous_status|
|---|---|--:|---|
|C001|New|10:00|NULL|
|C001|Active|10:30|New|
|C001|Suspended|11:00|Active|

Use cases:

- compare previous vs current status
    
- detect attribute changes
    
- calculate time between events
    
- build SCD Type 2 ranges
    

---

## 4. LEAD

`LEAD()` gets a value from the next row.

Useful for calculating expiry dates.

```sql
SELECT
    customer_id,
    city,
    effective_date,
    LEAD(effective_date) OVER (
        PARTITION BY customer_id
        ORDER BY effective_date
    ) AS next_effective_date
FROM customer_changes;
```

Example:

|customer_id|city|effective_date|next_effective_date|
|---|---|---|---|
|C001|Cairo|2024-01-01|2024-07-01|
|C001|Dubai|2024-07-01|NULL|

For SCD Type 2:

```sql
expiry_date = next_effective_date - 1 day
```

If `next_effective_date` is null, use:

```sql
expiry_date = '9999-12-31'
```

---

## 5. Running totals

A running total calculates cumulative values over time.

```sql
SELECT
    customer_id,
    order_date,
    amount,
    SUM(amount) OVER (
        PARTITION BY customer_id
        ORDER BY order_date
        ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
    ) AS running_total
FROM orders;
```

Example:

|customer_id|order_date|amount|running_total|
|---|---|--:|--:|
|C001|2026-06-01|100|100|
|C001|2026-06-03|50|150|
|C001|2026-06-05|200|350|

Important part:

```sql
ROWS BETWEEN UNBOUNDED PRECEDING AND CURRENT ROW
```

Meaning: start from the first row in the partition and sum until the current row.

---

## 6. Deduplication using windows

Most common interview pattern:

```sql
WITH ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id, order_line_id
            ORDER BY updated_at DESC
        ) AS rn
    FROM staging_order_lines
)
SELECT *
FROM ranked
WHERE rn = 1;
```

This keeps one latest row per `order_id + order_line_id`.

---

## Deduplication example

Input:

|order_id|order_line_id|product_id|updated_at|
|---|--:|---|--:|
|O1001|1|P1|10:00|
|O1001|1|P2|10:30|
|O1001|1|P2|10:30|

Better dedup:

```sql
WITH ranked AS (
    SELECT
        *,
        ROW_NUMBER() OVER (
            PARTITION BY order_id, order_line_id
            ORDER BY updated_at DESC, ingestion_time DESC
        ) AS rn
    FROM staging_order_lines
)
SELECT *
FROM ranked
WHERE rn = 1;
```

Add a tie-breaker like `ingestion_time`, `event_id`, or `cdc_log_position`.

---

## Window functions vs GROUP BY

|Point|Window functions|GROUP BY|
|---|---|---|
|Keeps detail rows?|Yes|No|
|Aggregates rows?|Calculates across rows but keeps rows|Collapses rows|
|Example|Running total per order row|Total sales per customer|
|Best for|Ranking, dedup, comparisons|Summary aggregation|

Example:

```sql
SELECT
    customer_id,
    order_id,
    amount,
    SUM(amount) OVER (PARTITION BY customer_id) AS total_customer_amount
FROM orders;
```

This keeps each order row.

But:

```sql
SELECT
    customer_id,
    SUM(amount) AS total_customer_amount
FROM orders
GROUP BY customer_id;
```

This returns one row per customer.

---

## Common senior interview use cases

|Use case|Window function|
|---|---|
|Latest record per key|`ROW_NUMBER()`|
|Top N products per category|`RANK()` / `DENSE_RANK()`|
|Detect status changes|`LAG()`|
|Calculate expiry date|`LEAD()`|
|Running revenue|`SUM() OVER()`|
|Remove duplicates before merge|`ROW_NUMBER()`|
|Compare current and previous event|`LAG()`|
|Sessionization|`LAG()` + timestamp difference|

---

## Common mistakes

|Mistake|Problem|
|---|---|
|Missing `ORDER BY`|Results may be nondeterministic|
|No tie-breaker in dedup|Random row may be selected|
|Wrong `PARTITION BY`|Dedup/rank happens at wrong grain|
|Using `RANK()` for dedup|Ties can return multiple rows|
|Using `GROUP BY` when detail rows are needed|Loses row-level detail|
|Not defining window frame for running total|Some engines behave differently|
|Ordering by processing time instead of event/source time|Can produce incorrect business result|

---

## Interview answer template

> Window functions let us calculate values across related rows while keeping row-level detail. I use `ROW_NUMBER()` for deduplication by partitioning on the business key and ordering by latest timestamp or CDC log position. `RANK()` and `DENSE_RANK()` are useful for top-N analysis, especially when ties matter. `LAG()` compares the current row with the previous row, while `LEAD()` looks at the next row and is useful for SCD Type 2 expiry dates. Running totals use aggregate windows like `SUM() OVER(PARTITION BY ... ORDER BY ...)`. For reliable deduplication, I always define the correct grain and include deterministic tie-breakers.
