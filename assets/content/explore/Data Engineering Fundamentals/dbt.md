# Data Build Tools (dbt)

**dbt** is a transformation framework used mainly for the **T** in ELT.

```text
Extract + Load data into warehouse/lakehouse
Then dbt transforms it using SQL/Python models
```

It is commonly used with Snowflake, BigQuery, Redshift, Databricks, Postgres, Spark, and other warehouses/lakehouse engines.

---

## dbt main concepts

|Concept|Meaning|Example|
|---|---|---|
|**Model**|SQL/Python file that creates a dataset|`stg_orders.sql`, `fact_sales.sql`|
|**Source**|Raw table reference|`source('erp', 'orders')`|
|**Ref**|Dependency between dbt models|`ref('stg_orders')`|
|**Materialization**|How dbt builds the model|view, table, incremental|
|**Test**|Data quality check|not null, unique, relationships|
|**Snapshot**|Tracks historical changes|SCD Type 2-like history|
|**Seed**|Static CSV loaded into warehouse|country codes, mappings|
|**Macro**|Reusable Jinja SQL logic|generate surrogate key|
|**Docs**|Auto-generated lineage and documentation|dbt docs site|

dbt projects are organized around a `dbt_project.yml` file plus directories such as `models`, `snapshots`, and others; models are files that define datasets and can reference each other. ([dbt Developer Hub](https://docs.getdbt.com/docs/build/projects?utm_source=chatgpt.com "About dbt projects | dbt Developer Hub - dbt Labs"))

---

# 1. dbt models

A **dbt model** is usually a SQL file with a final `SELECT` statement.

Example:

```sql
-- models/staging/stg_orders.sql

SELECT
    order_id,
    customer_id,
    order_date,
    amount
FROM {{ source('erp', 'orders') }}
WHERE order_id IS NOT NULL;
```

Then another model can reference it:

```sql
-- models/marts/fact_sales.sql

SELECT
    order_id,
    customer_id,
    order_date,
    amount
FROM {{ ref('stg_orders') }};
```

`ref()` is important because it tells dbt the dependency graph.

---

# 2. dbt materializations

**Materialization** means how dbt persists the model in the warehouse.

dbt built-in materializations include **view, table, incremental, ephemeral, and materialized view**. ([dbt Developer Hub](https://docs.getdbt.com/docs/build/materializations?utm_source=chatgpt.com "Materializations | dbt Developer Hub"))

|Materialization|Meaning|Best for|
|---|---|---|
|**view**|Creates a database view|Lightweight staging models|
|**table**|Rebuilds as physical table|Medium/large transformed data|
|**incremental**|Processes only new/changed data|Large fact tables|
|**ephemeral**|Not created in DB; inlined as CTE|Small reusable logic|
|**materialized_view**|Warehouse-managed materialized view|Repeated queries needing freshness/performance|

Example:

```sql
{{ config(materialized='table') }}

SELECT *
FROM {{ ref('stg_orders') }};
```

---

# 3. Incremental models

Incremental models are very important in senior interviews.

Example:

```sql
{{ config(
    materialized='incremental',
    unique_key='order_id'
) }}

SELECT
    order_id,
    customer_id,
    order_date,
    updated_at,
    amount
FROM {{ source('erp', 'orders') }}

{% if is_incremental() %}
WHERE updated_at > (
    SELECT MAX(updated_at)
    FROM {{ this }}
)
{% endif %}
```

|Point|Explanation|
|---|---|
|`is_incremental()`|Runs only during incremental execution|
|`unique_key`|Helps dbt update/merge existing rows|
|`{{ this }}`|Refers to the target model table|
|Full refresh|Rebuilds the full model|

Interview point:

> Incremental models are useful for large tables, but you must handle late-arriving data, duplicates, updates, deletes, and idempotency carefully.

---

# 4. dbt tests

dbt tests are used for data quality.

dbt ships with built-in generic tests such as reusable checks defined in YAML, commonly used on models, columns, sources, snapshots, and seeds. ([dbt Developer Hub](https://docs.getdbt.com/docs/build/data-tests?utm_source=chatgpt.com "Add data tests to your DAG | dbt Developer Hub"))

Common tests:

|Test|Meaning|
|---|---|
|`not_null`|Column cannot be null|
|`unique`|Column values must be unique|
|`relationships`|Foreign key-style check|
|`accepted_values`|Only allowed values are valid|

Example:

```yaml
models:
  - name: dim_customer
    columns:
      - name: customer_key
        tests:
          - unique
          - not_null

      - name: customer_status
        tests:
          - accepted_values:
              values: ['active', 'inactive', 'deleted']
```

---

# 5. dbt snapshots

**Snapshots** are used to track changes in mutable source tables over time.

They are similar to **SCD Type 2**.

dbt snapshots can track validity ranges using metadata columns such as `dbt_valid_from` and `dbt_valid_to`; snapshot strategies include timestamp-based and check-based approaches. ([dbt Developer Hub](https://docs.getdbt.com/docs/build/snapshots?utm_source=chatgpt.com "Add snapshots to your DAG | dbt Developer Hub"))

Example output:

|customer_id|city|dbt_valid_from|dbt_valid_to|
|---|---|---|---|
|C001|Cairo|2024-01-01|2024-07-01|
|C001|Dubai|2024-07-01|null|

Snapshot strategies:

|Strategy|Meaning|Best for|
|---|---|---|
|**timestamp**|Uses `updated_at` column|Source has reliable update timestamp|
|**check**|Compares selected columns|Source lacks reliable timestamp|

Interview point:

> dbt snapshots are good for tracking historical changes, but for complex enterprise SCD Type 2 dimensions, teams may still implement custom SCD logic.

---

# 6. Seeds

**Seeds** are CSV files stored in the dbt project and loaded into the warehouse.

They are best for small, static, version-controlled data like mappings or reference lists, not large production raw data or sensitive data. ([dbt Developer Hub](https://docs.getdbt.com/docs/build/seeds?utm_source=chatgpt.com "Add Seeds to your DAG | dbt Developer Hub"))

Example use cases:

|Seed|Example|
|---|---|
|Country mapping|`country_code → country_name`|
|Test users|Emails to exclude|
|Static business mapping|Region mappings|

Example:

```text
seeds/country_codes.csv
```

Then run:

```bash
dbt seed
```

---

# 7. Macros

**Macros** are reusable SQL/Jinja functions.

Example surrogate key macro usage:

```sql
{{ dbt_utils.generate_surrogate_key([
    'customer_id',
    'source_system'
]) }}
```

Use macros for:

|Use case|Example|
|---|---|
|Reusable SQL|Standard date logic|
|Surrogate keys|Hash multiple columns|
|Repeated filters|Exclude test users|
|Cross-database logic|Different SQL by adapter|
|Custom materializations|Advanced dbt behavior|

---

# 8. dbt project layers

A common dbt structure:

```text
models/
  staging/
    stg_orders.sql
    stg_customers.sql

  intermediate/
    int_customer_orders.sql

  marts/
    dim_customer.sql
    fact_sales.sql
```

|Layer|Purpose|
|---|---|
|**Staging**|Clean and standardize raw source tables|
|**Intermediate**|Reusable business logic|
|**Marts**|Final facts/dimensions for BI/reporting|

Good practice:

```text
Raw source → staging → intermediate → marts
```

Avoid letting final marts directly depend on raw source tables.

---

# 9. dbt commands

|Command|Meaning|
|---|---|
|`dbt run`|Build models|
|`dbt test`|Run data tests|
|`dbt build`|Run models, tests, snapshots, seeds together|
|`dbt seed`|Load seed CSVs|
|`dbt snapshot`|Run snapshots|
|`dbt docs generate`|Generate documentation|
|`dbt docs serve`|Serve docs locally|
|`dbt compile`|Compile SQL without running|
|`dbt source freshness`|Check source freshness|

---

# 10. dbt with orchestration

dbt can be orchestrated by:

|Tool|Pattern|
|---|---|
|Airflow|Trigger dbt commands/tasks|
|Dagster|Asset-based orchestration|
|dbt Cloud|Native scheduled jobs|
|GitHub Actions|CI/CD|
|Azure DevOps/GitLab CI|Deployment pipelines|

Typical flow:

```text
Airflow DAG
   ↓
Run source freshness
   ↓
dbt build --select staging+
   ↓
Run tests
   ↓
Refresh BI/reporting layer
```

---

## dbt strengths and limitations

|Strength|Limitation|
|---|---|
|SQL-first transformations|Not for heavy extraction|
|Version-controlled analytics logic|Not a full orchestration engine by itself|
|Built-in lineage|Complex DAG scheduling usually needs another tool|
|Tests and documentation|Very complex procedural logic can be awkward|
|Incremental models|Requires careful handling of late data/deletes|
|Strong collaboration|Warehouse cost can increase if models are poorly designed|

---

## Common interview questions

|Question|Expected answer|
|---|---|
|What is dbt?|SQL-based transformation framework for ELT|
|What is `ref()`?|References another model and creates dependency|
|What is `source()`?|References raw/source table|
|View vs table?|View is logical; table is physically stored|
|Incremental model?|Loads only new/changed data|
|Snapshot?|Tracks historical changes over time|
|Seed?|Static CSV reference data|
|Macro?|Reusable Jinja SQL logic|
|dbt tests?|Data quality checks|
|How to deploy?|CI/CD + scheduler/dbt Cloud/Airflow|
|How to handle SCD2?|Snapshots or custom dimension logic|

---

## Common mistakes

|Mistake|Why it is bad|
|---|---|
|Putting too much business logic in staging|Staging should be simple/standardized|
|Using views for very heavy transformations|Can make BI queries slow|
|Making everything a table|More storage and build time|
|Bad incremental logic|Misses late-arriving updates|
|No tests|Bad data reaches BI|
|Not using `ref()`|Breaks lineage and dependency management|
|Huge monolithic models|Hard to debug and reuse|
|Not documenting models|Hard for analysts and engineers|
|Ignoring source freshness|Reports may use stale data|

---

## Interview answer template

> dbt is an ELT transformation tool that lets us build warehouse models using SQL or Python, with version control, testing, documentation, and lineage. A dbt model is usually a SQL file with a final SELECT statement. Models reference each other using `ref()` and raw tables using `source()`, which lets dbt build a DAG. Materializations define how models are built, such as view, table, incremental, ephemeral, or materialized view. For large tables, I use incremental models with a reliable watermark and unique key. dbt tests help validate uniqueness, nullability, relationships, and accepted values. For historical tracking, dbt snapshots can capture changes over time similar to SCD Type 2.