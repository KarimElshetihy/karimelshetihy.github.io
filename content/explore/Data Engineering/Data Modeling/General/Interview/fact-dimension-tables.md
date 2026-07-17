# Fact vs Dimension Tables

In a data warehouse:

|Table type|Meaning|Contains|Example|
|---|---|---|---|
|**Fact table**|Stores business events or measurements|Numbers, metrics, foreign keys to dimensions|sales amount, quantity, order count|
|**Dimension table**|Describes the context of facts|Descriptive attributes|customer, product, date, store, region|

Example:

|Fact table: `fact_sales`|
|---|
|`date_key`|
|`customer_key`|
|`product_key`|
|`store_key`|
|`quantity`|
|`sales_amount`|

|Dimension table examples|
|---|
|`dim_customer`|
|`dim_product`|
|`dim_date`|
|`dim_store`|

---

## Fact table types comparison

|Type|Main idea|Grain|Example|Best for|
|---|---|---|---|---|
|**Transaction fact**|One row per business event|Very detailed|One row per order line or payment|Detailed analysis|
|**Periodic snapshot fact**|One row per time period|Fixed period|Daily account balance, monthly inventory|Trend analysis|
|**Accumulating snapshot fact**|One row per business process lifecycle|One row updated as process moves forward|Order lifecycle, claim process, shipment pipeline|Process tracking|

---

## 1. Transaction Fact

A **transaction fact table** stores individual events.

Example: one row per order item.

|order_id|date_key|customer_key|product_key|quantity|sales_amount|
|---|--:|--:|--:|--:|--:|
|O1001|20240601|10|501|2|500|
|O1002|20240601|11|502|1|300|

Characteristics:

|Point|Explanation|
|---|---|
|Grain|Lowest level of detail|
|Insert/update pattern|Mostly insert-only|
|Data volume|Usually very large|
|Use case|Sales, payments, clicks, transactions|

Interview phrase:

> A transaction fact captures each business event at the most atomic level, such as one row per order line.

---

## 2. Periodic Snapshot Fact

A **snapshot fact table** stores measurements at regular time intervals.

Example: daily inventory balance.

|snapshot_date_key|product_key|warehouse_key|stock_quantity|
|---|--:|--:|--:|
|20240601|501|1|120|
|20240602|501|1|95|
|20240603|501|1|110|

Characteristics:

|Point|Explanation|
|---|---|
|Grain|One row per period, such as daily/monthly|
|Insert/update pattern|Insert new snapshot each period|
|Data volume|Predictable growth|
|Use case|Inventory, balances, daily active users, monthly account status|

Interview phrase:

> A periodic snapshot fact captures the state of a business metric at a regular interval, even if no transaction happened.

---

## 3. Accumulating Snapshot Fact

An **accumulating snapshot fact table** tracks a process that has multiple stages.

Example: order fulfillment lifecycle.

|order_id|order_date|paid_date|shipped_date|delivered_date|order_amount|days_to_ship|
|---|---|---|---|---|--:|--:|
|O1001|2024-06-01|2024-06-01|2024-06-03|2024-06-05|500|2|
|O1002|2024-06-02|2024-06-02|NULL|NULL|300|NULL|

Characteristics:

|Point|Explanation|
|---|---|
|Grain|One row per process instance|
|Insert/update pattern|Insert once, then update as milestones happen|
|Data volume|Smaller than transaction facts|
|Use case|Orders, shipments, insurance claims, loan applications|

Interview phrase:

> An accumulating snapshot tracks a workflow from start to finish, updating the same row as each milestone is completed.

---

## Conformed Dimensions

A **conformed dimension** is a dimension shared across multiple fact tables with the same meaning and structure.

Example:

`dim_date`, `dim_customer`, and `dim_product` can be reused by:

|Fact table|Shared dimensions|
|---|---|
|`fact_sales`|`dim_date`, `dim_customer`, `dim_product`|
|`fact_returns`|`dim_date`, `dim_customer`, `dim_product`|
|`fact_inventory`|`dim_date`, `dim_product`, `dim_warehouse`|

Why it matters:

|Benefit|Explanation|
|---|---|
|Consistent reporting|Same customer/product/date definitions across reports|
|Easier joins|Facts can be compared using shared dimensions|
|Less duplication|Avoids creating different versions of the same dimension|
|Enterprise-wide analytics|Enables cross-process analysis|

Example question:

> “What is total sales vs returns by product category?”

This is easier if both `fact_sales` and `fact_returns` use the same `dim_product`.

---

## Quick comparison

|Concept|Key point|
|---|---|
|**Fact table**|Stores measurable business events|
|**Dimension table**|Stores descriptive context|
|**Transaction fact**|One row per event|
|**Periodic snapshot fact**|One row per time period|
|**Accumulating snapshot fact**|One row per process lifecycle|
|**Conformed dimension**|Shared dimension used consistently across fact tables|

## Most important interview points

For senior interviews, be ready to explain:

- **Grain** of the fact table
    
- Difference between **transaction**, **periodic snapshot**, and **accumulating snapshot**
    
- Why conformed dimensions are important
    
- How facts join to dimensions using surrogate keys
    
- How SCD Type 2 dimensions affect fact table joins