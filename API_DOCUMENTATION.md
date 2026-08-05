# API Documentation - Document Approval System

This document provides a comprehensive reference for the API endpoints available in the Document Approval Management System.

## Authentication

The system uses Laravel Sanctum for API authentication. Include the `Authorization: Bearer <token>` header in all protected requests.

### Login

Authenticate a user and retrieve an access token.

- **Endpoint:** `POST /api/login`
- **Public:** Yes
- **Parameters:**
    - `email` (string, required): User's email address.
    - `password` (string, required): User's password.
- **Response:**
    ```json
    {
        "user": { ... },
        "token": "1|abcdef...",
        "message": "Login successful"
    }
    ```

### Register

Register a new user account.

- **Endpoint:** `POST /api/register`
- **Public:** Yes
- **Parameters:**
    - `name` (string, required): Full name.
    - `email` (string, required): Email address (unique).
    - `password` (string, required, min: 8): Password.
    - `password_confirmation` (string, required): Confirm password.
- **Response:**
    ```json
    {
        "user": { ... },
        "token": "...",
        "message": "Registration successful"
    }
    ```

### Get Current User

Retrieve the authenticated user's profile.

- **Endpoint:** `GET /api/user`
- **Protected:** Yes
- **Response:** JSON object of the user.

### Logout

Invalidate the current access token.

- **Endpoint:** `POST /api/logout`
- **Protected:** Yes
- **Response:** `{ "message": "Logout successful" }`

---

## Document Management

Endpoints for creating, viewing, and managing documents.

### List Documents

Retrieve a list of documents. Results are filtered availability based on the user's current context (Company/Role).

- **Endpoint:** `GET /api/dokumen`
- **Protected:** Yes
- **Query Parameters:**
    - `status` (string, optional): Filter by overall status (e.g., `draft`, `submitted`, `approved`, `rejected`).
    - `status_current` (string, optional): Filter by granular status (e.g., `waiting_approval_1`).
    - `my_documents` (boolean, optional): Set to `1` to show only documents created by the current user.
    - `search` (string, optional): Search by title or description.
- **Response:** Array of document objects with `detailed_status`.

### Create Document

Create a new document.

- **Endpoint:** `POST /api/dokumen`
- **Protected:** Yes
- **Content-Type:** `multipart/form-data`
- **Parameters:**
    - `nomor_dokumen` (string, required, unique): Custom document number.
    - `judul_dokumen` (string, required): Title of the document.
    - `tgl_pengajuan` (date, required): Submission date (YYYY-MM-DD).
    - `tgl_deadline` (date, required): Deadline date (must be >= submission date).
    - `deskripsi` (string, nullable): Description.
    - `file` (file, required): Document file (pdf, doc, docx, xls, xlsx, ppt, pptx). Max 10MB.
    - `submit_type` (string, required): `draft` (save only) or `submit` (start workflow).
    - `masterflow_id` (int, required): ID of the masterflow to use. Pass `'custom'` for custom flow.

    **If using specific Masterflow (`masterflow_id` is an ID):**
    - `approvers` (array, optional): Map of step ID to user ID for single approver steps.
        - Example: `approvers[1] = 5` (Step 1 assigned to User 5).
    - `step_approvers` (array, optional): Configuration for group steps.
        - `step_approvers[{step_id}][jenis_group]` (enum): `all_required`, `any_one`, or `majority`.
        - `step_approvers[{step_id}][user_ids]` (array): List of user IDs.

    **If using Custom Flow (`masterflow_id` = 'custom'):**
    - `custom_approvers` (array, required):
        - `custom_approvers[{index}][email]` (email): Approver email.
        - `custom_approvers[{index}][order]` (int): Step order.

### Update Document

Update an existing document (only if `draft` or `rejected`).

- **Endpoint:** `PUT /api/dokumen/{id}`
- **Protected:** Yes
- **Parameters:**
    - `judul_dokumen` (string, required).
    - `tgl_deadline` (date, nullable).
    - `deskripsi` (string, nullable).
    - `file` (file, nullable): Upload new file to create a new version (v1.1, v1.2, etc.).

### Submit Document

Submit a draft document to start the approval workflow.

- **Endpoint:** `POST /api/dokumen/{id}/submit`
- **Protected:** Yes

### Cancel Submission

Cancel a document that is currently under review. Reverts status to `draft`.

- **Endpoint:** `POST /api/dokumen/{id}/cancel`
- **Protected:** Yes

### Delete Document

Delete a draft document.

- **Endpoint:** `DELETE /api/dokumen/{id}`
- **Protected:** Yes

### Upload Revision

Upload a revised version for a document that was rejected or requested for revision.

- **Endpoint:** `POST /api/dokumen/{id}/upload-revision`
- **Protected:** Yes (Owner only)
- **Parameters:**
    - `file` (file, required): The revised document file.
    - `comment` (string, optional): Revision notes.

---

## Approval Workflow

Endpoints for approvers to take action on documents.

### List Approvals

Get a list of documents awaiting the user's approval.

- **Endpoint:** `GET /approvals`
- **Protected:** Yes
- **Query Parameters:**
    - `status` (string, optional): `pending`, `approved`, `rejected`, `history` (all non-pending).
    - `overdue` (boolean, optional): Set `1` to see overdue items.
    - `search` (string, optional): Search by document title.

### Approve Document

Approve a specific step.

- **Endpoint:** `POST /approvals/{id}/approve`
- **Protected:** Yes
- **Parameters:**
    - `signature` (string, required): Digital signature. Can be:
        - Base64 data URI (`data:image/png;base64,...`) for new drawings.
        - URL path (`/storage/...`) for saved/default signatures.
    - `signature_position` (string, optional): `bottom_right`, `bottom_left`, `bottom_center`.
    - `comment` (string, optional): Approval notes.

### Reject Document

Reject a document at the current step. This will stop the workflow.

- **Endpoint:** `POST /approvals/{id}/reject`
- **Protected:** Yes
- **Parameters:**
    - `alasan_reject` (string, required): Reason for rejection.
    - `comment` (string, optional): Additional comments.

### Request Revision

Ask the submitter to upload a new version without fully rejecting the document.

- **Endpoint:** `POST /approvals/{id}/request-revision`
- **Protected:** Yes
- **Parameters:**
    - `revision_notes` (string, required): Details on what needs to be changed.

### Delegate Approval

Assign the approval task to another user with the same role/jabatan.

- **Endpoint:** `POST /approvals/{id}/delegate`
- **Protected:** Yes
- **Parameters:**
    - `delegate_to` (int, required): ID of the target user.
    - `comment` (string, optional): Reason for delegation.

### Skip Approval

Skip an optional approval step.

- **Endpoint:** `POST /approvals/{id}/skip`
- **Protected:** Yes
- **Parameters:**
    - `comment` (string, optional).

---

## Masterflow & Resources

### Get Masterflows

List available approval workflows.

- **Endpoint:** `GET /api/masterflows`
- **Protected:** Yes

### Get Masterflow Steps

Get details of steps for a specific masterflow.

- **Endpoint:** `GET /api/masterflows/{id}/steps`
- **Protected:** Yes
- **Response:** JSON containing steps, associated roles, and default approvers.

### Users by Jabatan

Get a list of users holding a specific position (useful for selecting approvers).

- **Endpoint:** `GET /api/users-by-jabatan/{jabatan_id}`
- **Protected:** Yes

---

## Dashboard Statistics

### User Stats

Get summary statistics for the user dashboard.

- **Endpoint:** `GET /api/user/statistics`
- **Protected:** Yes
- **Response:** Counts of pending, approved, rejected, and overdue tasks.

### Recent Documents

Get a list of recently active documents for the user.

- **Endpoint:** `GET /api/user/recent-documents`
- **Protected:** Yes
