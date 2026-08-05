# Document Approval Management System - Domain Knowledge

## Overview

Sistem manajemen persetujuan dokumen yang memungkinkan user untuk mengajukan dokumen dan mendapatkan approval dari approver yang ditunjuk.

## Core Features

### 1. Document Management

- Upload dan manage dokumen
- Tracking status dokumen (draft, pending, approved, rejected)
- PDF generation dengan signature

### 2. Approval Workflow

- Multi-level approval system
- Group approval support
- Custom approval chains
- Reject dan revision workflow

### 3. Digital Signature

- Signature management per user
- Embedded signature pada PDF
- PIN verification untuk approval

### 4. User Roles

- **Admin**: Manage users, roles, dan system settings
- **User**: Submit documents untuk approval
- **Approver**: Review dan approve/reject documents

## Database Models

### Key Relationships

```
User
├── hasMany: Dokumen (sebagai pembuat)
├── hasMany: Approval (sebagai approver)
├── hasOne: Signature
└── belongsToMany: Roles

Dokumen
├── belongsTo: User (pembuat)
├── hasMany: Approval
└── hasMany: DokumenFile

Approval
├── belongsTo: Dokumen
├── belongsTo: User (approver)
└── hasOne: Signature (untuk approval)
```

## API Patterns

### Document Status Flow

```
draft → pending → approved/rejected
           ↓
        revision → pending (re-submit)
```

### Approval Actions

- `approve`: Setujui dokumen dengan signature
- `reject`: Tolak dokumen dengan alasan
- `request_revision`: Minta revisi dengan catatan

## Frontend Structure

- `/dashboard` - User dashboard
- `/dokumen` - Document management
- `/approvals` - Pending approvals
- `/admin` - Admin panel

## Real-time Features

- WebSocket untuk notifikasi real-time
- Status update broadcast
- Approval notification
