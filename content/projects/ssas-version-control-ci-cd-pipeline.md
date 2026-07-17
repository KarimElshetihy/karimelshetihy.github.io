## Overview

Analytics teams relied on manual SSAS deployments — models changed in Visual Studio, published by hand, and tracked in email or shared folders. Releases were slow, hard to audit, and risky when multiple developers worked on the same semantic layer.

I designed and implemented a version-controlled CI/CD pipeline for SSAS: models in Git, automated builds and deployments through Jenkins and Azure DevOps, and PowerShell plus Ansible scripts to promote changes across dev, test, and production with consistent, repeatable steps.

---

## The challenge

- SSAS projects lived on individual machines with no single source of truth.
- Deployments required manual processing and were error-prone during month-end or release windows.
- There was no clear history of who changed what, or which model version was live in each environment.
- Rollback meant rebuilding from memory or old backups, not a controlled revert from Git.
- Dev, test, and prod drifted because promotion steps were not standardized.

> We need SSAS releases to behave like application releases — versioned, tested, and deployable on demand.
> — BI platform lead

## What I built

### 1. Source control and model structure

SSAS projects were reorganized for Git: clear folder layout for tabular and multidimensional assets, environment-specific configuration kept outside the model where possible, and branching rules so feature work did not block production hotfixes.

### 2. CI/CD pipeline

Jenkins and Azure DevOps pipelines triggered on pull requests and merges. Each run validated the model, ran automated processing where applicable, and packaged artifacts for deployment. PowerShell orchestrated SSAS processing, deployment targets, and logging; Ansible handled server-side steps and configuration on deployment hosts.

1. Commit and PR — developer changes tracked in Git with review before merge.
2. Build — automated validation and SSAS processing in a controlled build agent.
3. Deploy to test — promoted model deployed and smoke-checked before production.
4. Deploy to prod — approved release with audit trail and optional rollback tag.

<!-- ![CI/CD pipeline diagram mockup](assets/img/Coming%20Soon%20Dark.png "Pipeline flow — from Git commit to SSAS deployment across environments.") -->

### 3. Operations and governance

Deployment logs, build numbers, and environment tags gave the team visibility into what was live. Runbooks documented failure handling and rollback using Git tags and saved artifacts, so releases were no longer dependent on one person’s local knowledge.

---

## Results

- SSAS changes became traceable from commit to production deployment.
- Release cycles shortened with repeatable, automated promotion steps.
- Environment drift reduced through the same pipeline for dev, test, and prod.
- Rollback path improved using version control instead of ad hoc restores.
- Team could parallelize model work without overwriting each other’s deployments.

## What I would do differently

I would add automated regression checks on key measures and partition counts after each deploy, and integrate pipeline status into a single DataOps dashboard alongside ETL jobs. The foundation was solid; deeper test automation would catch model regressions even earlier.

