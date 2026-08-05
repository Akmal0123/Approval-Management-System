# Digital Signature Configuration Guide

This document provides comprehensive guidance on configuring and managing digital signatures in the Document Approval Management System.

## 📑 Table of Contents

- [Overview](#overview)
- [Database Schema](#database-schema)
- [Signature Types](#signature-types)
- [User Interface](#user-interface)
- [PDF Signature Positioning](#pdf-signature-positioning)
- [Configuration Options](#configuration-options)
- [Advanced Scenarios](#advanced-scenarios)
- [Troubleshooting](#troubleshooting)

---

## Overview

The system supports digital signatures for document approvals with two primary methods:

1. **Manual Drawing**: Users can draw their signature using a canvas
2. **Saved Signatures**: Users can select from previously saved signatures

All signatures are embedded into PDF documents at configurable positions.

---

## Database Schema

### `signatures` Table

Stores user signature images and metadata:

| Column           | Type      | Description                                  |
| ---------------- | --------- | -------------------------------------------- |
| `id`             | bigint    | Primary key                                  |
| `user_id`        | bigint    | Foreign key to users table                   |
| `signature_path` | varchar   | Storage path to signature image              |
| `signature_type` | varchar   | Type: `manual` or `uploaded`                 |
| `is_default`     | boolean   | Whether this is the user's default signature |
| `created_at`     | timestamp | Creation timestamp                           |
| `updated_at`     | timestamp | Last update timestamp                        |
| `deleted_at`     | timestamp | Soft delete timestamp                        |

**Key Features:**

- Soft deletes enabled (signatures aren't permanently removed)
- Automatic file cleanup when deleted
- Only one default signature per user
- Indexed by `user_id` for fast lookups

---

## Signature Types

### 1. Manual (Drawn) Signature

Users draw their signature on a canvas element:

**Canvas Specifications:**

- **Dimensions**: 600x200 pixels
- **Line Color**: Black (#000000)
- **Line Width**: 2 pixels
- **Background**: White (#ffffff)
- **Export Format**: PNG (base64 data URL)

**File Location:** `resources/js/components/signature-pad.tsx`

### 2. Saved Signature

Pre-saved signatures stored in the database can be reused:

**Storage Path:** `storage/app/public/signatures/approvals/{approval_id}/`

**Naming Convention:** `approval_signature_{timestamp}_{random_string}.png`

---

## User Interface

### Signature Modal Component

**Location:** `resources/js/components/signature-pad.tsx`

**Features:**

- Tabbed interface (Draw / Saved)
- Auto-selects default signature if available
- Touch-enabled for mobile devices
- Canvas clear functionality
- Signature preview before use

**Usage Example:**

```tsx
<SignaturePad
    onSignatureComplete={(signatureData) => {
        // Handle signature data (base64 or URL)
        console.log(signatureData);
    }}
    onCancel={() => {
        // Handle cancel
    }}
/>
```

---

## PDF Signature Positioning

### Service Class

**Location:** `app/Services/PdfSignatureService.php`

This service handles embedding signatures into PDF documents using the FPDI library.

### Default Position Configuration

```php
$defaultOptions = [
    'page' => $pageCount,        // Last page by default
    'x' => 140,                  // X position (mm from left)
    'y' => 250,                  // Y position (mm from top)
    'width' => 40,               // Signature width (mm)
    'height' => 15,              // Signature height (mm)
    'add_text' => true,          // Add text below signature
    'text' => 'Digitally Signed',
    'date' => now()->format('d/m/Y H:i'),
    'name' => null,              // Approver name
];
```

### Coordinate System

The PDF uses millimeters (mm) as the measurement unit:

- **Origin (0,0)**: Top-left corner of the page
- **X-axis**: Increases from left to right
- **Y-axis**: Increases from top to bottom

**Standard A4 Page:**

- Width: ~210mm
- Height: ~297mm

### Position Presets

The service provides three preset positions via `getSignaturePlacementSuggestions()`:

| Position          | X (mm) | Y (mm) | Description      |
| ----------------- | ------ | ------ | ---------------- |
| **Bottom Right**  | 140    | 250    | Default position |
| **Bottom Left**   | 20     | 250    | Left-aligned     |
| **Bottom Center** | 85     | 250    | Center-aligned   |

---

## Configuration Options

### Single Signature

```php
use App\Services\PdfSignatureService;

$pdfSignatureService = new PdfSignatureService();

$signedPdfPath = $pdfSignatureService->addSignatureToPdf(
    pdfPath: 'documents/sample.pdf',
    signaturePath: 'signatures/approvals/1/signature.png',
    options: [
        'page' => 1,                    // First page
        'x' => 20,                      // 20mm from left
        'y' => 200,                     // 200mm from top
        'width' => 50,                  // 50mm wide
        'height' => 20,                 // 20mm tall
        'add_text' => true,             // Include text
        'text' => 'Approved',           // Custom text
        'date' => '13/01/2026',         // Custom date
        'name' => 'John Doe',           // Approver name
    ]
);
```

### Multiple Signatures

For documents requiring multiple approvers:

```php
$signatures = [
    [
        'path' => 'signatures/user1.png',
        'text' => 'Approved by Manager',
        'date' => '13/01/2026',
        'name' => 'Jane Smith',
        'options' => [
            'x' => 20,
            'y' => 220,
        ]
    ],
    [
        'path' => 'signatures/user2.png',
        'text' => 'Approved by Director',
        'date' => '13/01/2026',
        'name' => 'John Doe',
        'options' => [
            'x' => 80,
            'y' => 220,
        ]
    ],
];

$signedPdfPath = $pdfSignatureService->addMultipleSignaturesToPdf(
    pdfPath: 'documents/sample.pdf',
    signatures: $signatures
);
```

**Default Multi-Signature Layout:**

- **Starting Position**: (20mm, 220mm)
- **Signatures Per Row**: 3
- **Horizontal Spacing**: 60mm
- **Vertical Spacing**: 30mm
- **Signature Dimensions**: 35mm × 13mm

---

## Advanced Scenarios

### Custom Position Calculator

To position signatures dynamically based on page size:

```php
$suggestions = $pdfSignatureService->getSignaturePlacementSuggestions($pdfPath);

// Use bottom-right position
$options = [
    'x' => $suggestions['bottom_right']['x'],
    'y' => $suggestions['bottom_right']['y'],
];
```

### Signature Without Text

```php
$options = [
    'add_text' => false,  // Disable text below signature
];
```

### Positioning on Specific Page

```php
$options = [
    'page' => 2,  // Add signature to page 2
];
```

---

## Troubleshooting

### Common Issues

#### 1. Signature Not Appearing

**Problem:** Signature is embedded but not visible

**Solutions:**

- Check if coordinates are within page boundaries (A4: 210×297mm)
- Verify signature file exists at specified path
- Ensure signature image format is PNG or JPG

#### 2. Signature Position Incorrect

**Problem:** Signature appears in wrong location

**Solutions:**

- Verify `x` and `y` coordinates (origin is top-left)
- Check page number (pages start at 1, not 0)
- Use `getSignaturePlacementSuggestions()` for safe defaults

#### 3. Signature Overlapping Content

**Problem:** Signature covers document text

**Solutions:**

- Adjust `y` coordinate to lower position
- Reduce `width` and `height` dimensions
- Consider using the last page (`page => $pageCount`)

#### 4. Multiple Signatures Overlapping

**Problem:** Multiple signatures on same position

**Solutions:**

- Use `addMultipleSignaturesToPdf()` for automatic grid layout
- Manually set distinct `x` and `y` for each signature
- Increase horizontal spacing (default 60mm)

---

## File Locations Reference

| Component              | Path                                                                |
| ---------------------- | ------------------------------------------------------------------- |
| **Service**            | `app/Services/PdfSignatureService.php`                              |
| **Model**              | `app/Models/Signature.php`                                          |
| **Controller**         | `app/Http/Controllers/SignatureController.php`                      |
| **Frontend Component** | `resources/js/components/signature-pad.tsx`                         |
| **Migration**          | `database/migrations/2025_11_11_144222_create_signatures_table.php` |
| **Storage**            | `storage/app/public/signatures/approvals/`                          |

---

## Related Documentation

- Main README: [`README.md`](../README.md)
- Laravel FPDI Documentation: [https://www.setasign.com/products/fpdi/manual/](https://www.setasign.com/products/fpdi/manual/)

---

_Last Updated: 2026-01-13_
