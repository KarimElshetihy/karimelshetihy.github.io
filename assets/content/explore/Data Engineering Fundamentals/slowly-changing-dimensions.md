# Slowly Changing Dimensions

**Slowly Changing Dimensions (SCD) are techniques used in data warehouses to handle changes in **dimension data** over time.

Example: a customer changes their city from **Cairo** to **Dubai**.  
The question is: do we overwrite the old city, keep history, or store limited history?

---

## Comparison table

|Topic|SCD Type 1|SCD Type 2|SCD Type 3|
|---|---|---|---|
|Main idea|Overwrite old value|Keep full history as new rows|Keep limited history in extra columns|
|History kept?|No|Yes, full history|Partial history|
|How change is stored|Update existing row|Insert a new row|Update current and previous-value columns|
|Best for|Corrections, non-historical fields|Auditing, reporting over time|Simple before/after comparison|
|Example|Fix misspelled customer name|Track customer address history|Track current city and previous city|
|Row count impact|Same row count|More rows over time|Same row count|
|Complexity|Low|Medium/High|Medium|
|Common in interviews?|Yes|Very common|Less common|

---

## Example

Customer changes city from **Cairo** to **Dubai**.

### SCD Type 1 — overwrite

|customer_id|name|city|
|---|---|---|
|101|Ahmed|Dubai|

Old value **Cairo is lost**.

Use when:

- correcting bad data
    
- no historical reporting is needed
    
- business only cares about latest value
    

---

### SCD Type 2 — keep history

|surrogate_key|customer_id|name|city|effective_date|expiry_date|current_flag|
|---|--:|---|---|---|---|---|
|1|101|Ahmed|Cairo|2023-01-01|2024-06-30|N|
|2|101|Ahmed|Dubai|2024-07-01|9999-12-31|Y|

Old and new values are both preserved.

Use when:

- business needs historical reporting
    
- facts must join to the correct dimension version
    
- auditing is important
    

---

### SCD Type 3 — limited history

|customer_id|name|current_city|previous_city|
|---|---|---|---|
|101|Ahmed|Dubai|Cairo|

Only limited history is stored.

Use when:

- only previous value matters
    
- full history is not required
    
- business wants simple comparison between old and new state
    

---

## Important SCD Type 2 columns

|Column|Meaning|
|---|---|
|`effective_date`|Date when this version became valid|
|`expiry_date`|Date when this version stopped being valid|
|`current_flag`|Shows the active/current record, usually `Y` or `N`|
|`surrogate_key`|Unique key for each dimension version|
|`business_key`|Natural key from source system, like `customer_id`|

---

## Handling late-arriving dimension changes

A **late-arriving dimension change** means the change arrives after related facts have already been loaded.

Example:

A sales fact for **2024-06-15** was loaded, but later you receive that the customer changed city on **2024-06-01**.

For **SCD Type 2**, you may need to:

|Step|Action|
|---|---|
|1|Find the dimension row active during the late change date|
|2|Expire the old row using `expiry_date`|
|3|Insert a new historical version with the correct `effective_date`|
|4|Reprocess or update affected fact rows if they point to the wrong surrogate key|
|5|Make sure date ranges do not overlap|

---

## Simple examples

|Type|Example when customer city changes Cairo → Dubai|
|---|---|
|**Type 0**|Keep `city = Cairo` forever|
|**Type 1**|Update row to `city = Dubai`; Cairo is lost|
|**Type 2**|Old row: Cairo, expired. New row: Dubai, current|
|**Type 3**|`current_city = Dubai`, `previous_city = Cairo`|
|**Type 4**|Customer table has Dubai; customer history table has Cairo|
|**Type 6**|New version row is inserted, but rows may also contain current city for easier reporting|
|**Type 7**|Fact can join to historical customer version or current customer state|

## Most important for interviews

Focus mainly on:

1. **Type 1** — overwrite
    
2. **Type 2** — full history
    
3. **Type 3** — limited history
    
4. **Type 6** — hybrid, often asked in senior interviews
    
5. **Late-arriving data with Type 2** — very important for senior roles
## Interview answer template

You can say:

> Slowly Changing Dimensions are used to manage changes in dimension attributes over time. Type 1 overwrites data and does not keep history. Type 2 keeps full history by inserting a new row with effective date, expiry date, and current flag. Type 3 keeps limited history using extra columns like current value and previous value. For senior data engineering roles, Type 2 is the most important because it supports accurate historical reporting and correct fact-to-dimension joins.
