# Data Warehouse Modeling

Data warehouse modeling is about organizing data so it is easy to query, analyze, and report on.

The most common interview topics are:

| Topic                | Main idea                                                     |
| -------------------- | ------------------------------------------------------------- |
| **Star schema**      | One central fact table connected directly to dimension tables |
| **Snowflake schema** | Dimensions are normalized into multiple related tables        |
| **Galaxy schema**    | Multiple fact tables share common dimensions                  |
| **Kimball approach** | Bottom-up dimensional modeling using data marts               |
| **Inmon approach**   | Top-down enterprise data warehouse using normalized modeling  |

---

## 1. Star Schema

A **star schema** has one fact table in the center and dimension tables around it.

Example:

```text
              dim_customer
                   |
dim_product — fact_sales — dim_date
                   |
               dim_store
```

### Example tables

**fact_sales**

|sale_id|date_key|customer_key|product_key|store_key|quantity|sales_amount|
|---|--:|--:|--:|--:|--:|--:|
|1|20240601|101|501|10|2|500|

**dim_product**

|product_key|product_name|category|brand|
|--:|---|---|---|
|501|iPhone|Mobile|Apple|

### Key points

|Point|Explanation|
|---|---|
|Structure|Denormalized dimensions|
|Query performance|Usually faster|
|Joins|Fewer joins|
|Storage|More redundancy|
|Best for|BI, dashboards, analytics|

Interview phrase:

> A star schema is a dimensional model where a central fact table connects directly to denormalized dimension tables. It is simple, fast for reporting, and widely used in BI systems.

---

## 2. Snowflake Schema

A **snowflake schema** is like a star schema, but dimension tables are normalized into smaller related tables.

Example:

```text
fact_sales → dim_product → dim_category → dim_department
```

### Example

Instead of storing category inside `dim_product`:

|product_key|product_name|category_key|
|--:|---|--:|
|501|iPhone|20|

And category is stored separately:

|category_key|category_name|department_key|
|--:|---|--:|
|20|Mobile|3|

|department_key|department_name|
|--:|---|
|3|Electronics|

### Key points

|Point|Explanation|
|---|---|
|Structure|Normalized dimensions|
|Query performance|Can be slower|
|Joins|More joins|
|Storage|Less redundancy|
|Best for|Complex hierarchies, data governance, storage optimization|

Interview phrase:

> A snowflake schema normalizes dimensions into multiple tables, reducing redundancy but increasing join complexity.

---

## 3. Galaxy Schema / Fact Constellation

A **galaxy schema** has multiple fact tables sharing common dimension tables.

Example:

```text
             dim_date
                |
fact_sales — dim_product — fact_inventory
                |
           fact_returns
```

### Example

|Fact table|Measures|
|---|---|
|`fact_sales`|quantity_sold, sales_amount|
|`fact_returns`|return_quantity, refund_amount|
|`fact_inventory`|stock_quantity, inventory_value|

Shared dimensions:

|Dimension|Used by|
|---|---|
|`dim_date`|sales, returns, inventory|
|`dim_product`|sales, returns, inventory|
|`dim_store`|sales, returns, inventory|

### Key points

|Point|Explanation|
|---|---|
|Structure|Multiple facts + shared dimensions|
|Also called|Fact constellation|
|Best for|Enterprise reporting across multiple business processes|
|Important concept|Conformed dimensions|

Interview phrase:

> A galaxy schema contains multiple fact tables that share conformed dimensions, allowing analysis across different business processes like sales, returns, and inventory.

---

## Comparison table

|Feature|Star Schema|Snowflake Schema|Galaxy Schema|
|---|---|---|---|
|Fact tables|Usually one main fact|Usually one main fact|Multiple fact tables|
|Dimensions|Denormalized|Normalized|Shared/conformed dimensions|
|Joins|Fewer|More|Depends on number of facts/dimensions|
|Query performance|Usually fastest|Usually slower|Depends on design|
|Storage|More redundancy|Less redundancy|Medium to high|
|Complexity|Low|Medium|High|
|Best for|Dashboards, simple BI|Complex hierarchies|Enterprise analytics|
|Example|Sales fact with customer/product/date dimensions|Product split into product/category/department|Sales, returns, inventory sharing product/date|

---

## Kimball vs Inmon

## 4. Kimball Approach

The **Kimball approach** is a **bottom-up** approach.

You build business-specific **data marts** first, using dimensional models like star schemas. These data marts are integrated using **conformed dimensions**.

Example:

```text
Sales Data Mart
Returns Data Mart
Inventory Data Mart
        ↓
Shared conformed dimensions
```

### Key points

|Point|Explanation|
|---|---|
|Approach|Bottom-up|
|Main model|Dimensional model|
|Common schema|Star schema|
|Delivery|Faster, incremental|
|Best for|BI and analytics|
|Key concept|Conformed dimensions|

Interview phrase:

> Kimball is a bottom-up dimensional modeling approach where we build data marts around business processes and integrate them using conformed dimensions.

---

## 5. Inmon Approach

The **Inmon approach** is a **top-down** approach.

You first build a centralized **Enterprise Data Warehouse**, usually in a normalized structure. Then you create data marts from it.

Example:

```text
Source Systems
      ↓
Enterprise Data Warehouse
      ↓
Department Data Marts
```

### Key points

|Point|Explanation|
|---|---|
|Approach|Top-down|
|Main model|Normalized enterprise model|
|Common form|3NF|
|Delivery|Slower initial setup|
|Best for|Enterprise-wide consistency and governance|
|Data marts|Built after EDW|

Interview phrase:

> Inmon is a top-down approach where an enterprise-wide normalized data warehouse is built first, and department-level data marts are created from it.

---

## Kimball vs Inmon comparison

| Feature        | Kimball                               | Inmon                                       |
| -------------- | ------------------------------------- | ------------------------------------------- |
| Approach       | Bottom-up                             | Top-down                                    |
| Starts with    | Data marts                            | Enterprise Data Warehouse                   |
| Modeling style | Dimensional                           | Normalized, often 3NF                       |
| Common schema  | Star schema                           | 3NF core model                              |
| Delivery speed | Faster initial delivery               | Slower initial delivery                     |
| Flexibility    | High for business analytics           | High for enterprise integration             |
| Business focus | Process/subject area reporting        | Enterprise-wide data integration            |
| Complexity     | Lower at start                        | Higher at start                             |
| Best for       | BI, dashboards, agile delivery        | Large enterprise governance and consistency |
| Example        | Build Sales Mart, then Inventory Mart | Build full EDW, then create marts           |

---

## Senior interview focus

Be ready to explain:

| Question                                | Expected angle                                                                                                 |
| --------------------------------------- | -------------------------------------------------------------------------------------------------------------- |
| When would you use star schema?         | Fast BI reporting and simpler queries                                                                          |
| When would you use snowflake schema?    | When dimensions have complex hierarchies or you want less redundancy                                           |
| What is galaxy schema?                  | Multiple fact tables sharing conformed dimensions                                                              |
| Why are conformed dimensions important? | They allow consistent cross-fact reporting                                                                     |
| Kimball vs Inmon?                       | Bottom-up dimensional marts vs top-down normalized EDW                                                         |
| Which is better?                        | Depends on business needs; Kimball is often faster for analytics, Inmon is stronger for enterprise consistency |

## Very short answer for interview

> Star schema is simple and fast for reporting because facts join directly to denormalized dimensions. Snowflake schema normalizes dimensions to reduce redundancy but adds joins. Galaxy schema has multiple fact tables sharing conformed dimensions. Kimball is bottom-up and builds dimensional data marts first, while Inmon is top-down and builds a normalized enterprise data warehouse first.
