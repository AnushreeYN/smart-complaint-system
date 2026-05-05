# Gallery Auto-Delete System Documentation

This document provides a comprehensive overview of the **Gallery Auto-Delete System**, a background service designed for automated file pruning and HIPAA-compliant metadata scrubbing (PII/PHI).

## 1. System Architecture

The system is built using **Celery**, a distributed task queue, and is split into two main components:

-   **Celery Beat (The Scheduler)**: Periodically scans the database for expired files and queues deletion tasks.
-   **Celery Worker (The Executor)**: Processes each file deletion individually, ensuring resilience and re-verifying safety conditions.

### Technology Stack
-   **Framework**: Celery
-   **Broker/Backend**: Redis (`redis://localhost:6379/0`)
-   **Database**: Supabase (PostgreSQL)
-   **Storage**: DigitalOcean Spaces / S3 Compatible
-   **Timezone**: Asia/Kolkata (IST)

---

## 2. Database Requirements (Schema)

To support auto-delete, the following tables and columns must exist:

### A. `organizations` Table
Used to enable/disable the feature at the tenant level.
-   `auto_delete_enabled` (Boolean): Master switch for the organization.
-   `auto_delete_days` (Integer): Retention period (e.g., 30 days).

### B. `files` Table
The primary table for tracking slides/images.
-   `is_enabled` (Boolean): Manual toggle to disable auto-delete for specific files.
-   `is_starred` (Boolean): If `True`, the file is **NEVER** auto-deleted.
-   `is_deleted` (Boolean): Marked `True` after successful auto-delete.
-   `created_date` (DateTime): Used to calculate file age.
-   `barcode_id` (String): Used to check case-level dependencies.
-   `file_url` (String): Path to the object in storage.

### C. `barcodes` Table
The case/folder level metadata.
-   `is_deleted` (Boolean): Marked `True` when the last file in the case is deleted.
-   **PII/PHI Columns**: `name`, `biopsy_number`, `age`, `description`, `report`, etc. (These are NULLed out during scrubbing).

### D. `audit_logs` Table
-   `resource`: "file" or "barcode"
-   `action`: "auto_delete"
-   `resource_id`: The ID of the deleted item.

---

## 3. How It Works (The Logic Flow)

### Phase 1: Scheduling (Every 10 Minutes)
1.  **Celery Beat** triggers `run_auto_delete_scheduler`.
2.  It fetches all organizations where `auto_delete_enabled = True`.
3.  For each org, it calculates a `cutoff_date` based on `auto_delete_days`.
4.  It queries the `files` table for candidates that are:
    -   Older than the `cutoff_date`.
    -   `is_enabled = True`
    -   `is_starred = False`
    -   `is_deleted = False`
5.  Each valid file ID is queued as an individual `delete_file_task`.

### Phase 2: Execution & Safety Guards
When a worker picks up a task, it performs the following **"3 Safety Checks"**:
1.  **Freshness Re-check**: Fetches the latest state from the DB.
2.  **Enabled/Starred Status**: If the user starred the file or disabled it *after* it was queued, the task skips it.
3.  **Already Deleted**: If the file was already deleted by another process, it skips storage deletion.

### Phase 3: Deletion & Metadata Scrubbing
If all conditions are met:
1.  **Storage Purge**: Deletes the actual file from DigitalOcean Spaces.
2.  **File Scrubbing**: Updates the `files` record:
    -   Sets `is_deleted = True` and `file_exists = False`.
    -   NULLs out sensitive fields (`file_url`, `file_name`, `title`, etc.).
3.  **Case-Level Dependency**: 
    -   Counts remaining `is_deleted = False` files for the same `barcode_id`.
    -   If **0** files remain, it scrubs the **Barcode** record (NULLs out PII like name/age).
4.  **Audit Trail**: Inserts records into `audit_logs` for compliance.

---

## 4. Resilience & Reliability

### Automatic Retries
The worker is configured to handle network failures or database timeouts automatically:
-   **Max Retries**: 5
-   **Backoff**: Exponential (waits longer between each retry).
-   **Retry Jitter**: Prevents "thundering herd" if multiple tasks fail at once.

### Resume from Interruption
If a task fails after deleting the file but before scrubbing the case, the system is **self-healing**:
-   On the next run, it will detect that the file is `is_deleted = True` but the barcode cleanup was missed.
-   It will proactively finish the barcode scrubbing to ensure HIPAA compliance.

---

## 5. Deployment Commands

### To start the Worker (Execution):
```bash
celery -A celery_app worker --loglevel=info
```

### To start the Beat (Scheduling):
```bash
celery -A celery_app beat --loglevel=info
```

### To run locally for testing (One-off):
```bash
python3 worker_auto_delete.py
```

---

## 6. Summary of Key Files
-   `celery_app.py`: Contains connection settings and the 10-minute schedule.
-   `worker_auto_delete.py`: Contains the actual business logic for deletion and scrubbing.
-   `scratch/unit_test_logic.py`: Contains test scenarios for verifying the 3 conditions and case-level logic.
