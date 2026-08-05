# Document Approval Management System

A comprehensive web-based application for managing document approvals, digital signatures, and organizational workflows. Built with modern web technologies to ensure performance, scalability, and a premium user experience.

## 🚀 Technology Stack

This project leverages the latest versions of the Laravel ecosystem and React:

- **Backend**: Laravel 12.x
- **Frontend**: React 19.x, Inertia.js 2.0
- **Styling**: Tailwind CSS 4.x, Shadcn UI
- **Database**: MySQL
- **Realtime**: Laravel Reverb (WebSockets)
- **Authentication**: Laravel Sanctum, Google OAuth (Socialite)
- **Testing**: Pest PHP

## 📋 System Requirements

Ensuring your environment meets these requirements is critical for successfully running the application:

- **PHP**: >= 8.3
- **Composer**: Latest version
- **Node.js**: >= 20.x
- **MySQL**: >= 8.0
- **Web Server**: Nginx or Apache

## 🛠️ Installation & Setup

Follow these steps to set up the project on your local machine or production server.

### 1. Clone the Repository

```bash
git clone https://github.com/your-org/document-approval-management-system.git
cd document-approval-management-system
```

### 2. Install Dependencies

Install the backend (PHP) and frontend (Node) dependencies:

```bash
# Backend
composer install

# Frontend
npm install
```

### 3. Environment Configuration

Copy the example environment file and configure it:

```bash
cp .env.example .env
```

Open `.env` and set your specific configurations:

```ini
APP_NAME="Document Approval System"
APP_URL=http://your-domain.com

# Database Configuration
DB_CONNECTION=mysql
DB_HOST=127.0.0.1
DB_PORT=3306
DB_DATABASE=your_database_name
DB_USERNAME=your_username
DB_PASSWORD=your_password

# Google OAuth (Required for Login)
GOOGLE_CLIENT_ID=your_google_client_id
GOOGLE_CLIENT_SECRET=your_google_client_secret
GOOGLE_REDIRECT_URI="${APP_URL}/auth/google/callback"

# Reverb (Realtime Notifications)
REVERB_APP_ID=...
REVERB_APP_KEY=...
REVERB_APP_SECRET=...
```

### 4. Generate Application Key

```bash
php artisan key:generate
```

### 5. Database Setup & Seeding

Run the migrations to set up the database structure:

```bash
php artisan migrate
```

**🌱 Seeding Data (Important)**

To populate the database with initial master data (Jabatan, Companies, etc.) and default users, run the seeders:

```bash
# General Master Data
php artisan db:seed

# User Accounts (Specific for Handover)
# create 12 accounts: 1 Admin & 1 User for each of the 6 Jabatan levels
php artisan db:seed --class=UserJabatanSeeder
```

### 6. Storage Linking

Link the storage directory to the public directory for file accessibility:

```bash
php artisan storage:link
```

### 7. Build Assets

For development:

```bash
npm run dev
```

For production:

```bash
npm run build
```

---

## ▶️ Running the Application

After completing the installation steps, you need to run multiple services to get the application fully functional.

### Development Environment

You'll need to run these commands in **separate terminal windows/tabs**:

#### 1. Start the Laravel Development Server

```bash
php artisan serve
```

This will start the application at `http://localhost:8000` (or the port specified in your `.env`).

#### 2. Start the Frontend Build Process

In a new terminal:

```bash
npm run dev
```

This starts Vite's development server for hot module replacement (HMR).

#### 3. Start Laravel Reverb (WebSocket Server)

In a new terminal:

```bash
php artisan reverb:start
```

This enables real-time notifications and live updates.

#### 4. Start the Queue Worker

In a new terminal:

```bash
php artisan queue:work
```

This processes background jobs like sending emails and notifications.

### Quick Start Script (Optional)

For convenience, you can create a start script. Create a file `start-dev.sh` (Linux/Mac) or `start-dev.bat` (Windows):

**Windows (`start-dev.bat`):**

```batch
@echo off
start cmd /k "php artisan serve"
start cmd /k "npm run dev"
start cmd /k "php artisan reverb:start"
start cmd /k "php artisan queue:work"
```

**Linux/Mac (`start-dev.sh`):**

```bash
#!/bin/bash
gnome-terminal --tab -- bash -c "php artisan serve; exec bash"
gnome-terminal --tab -- bash -c "npm run dev; exec bash"
gnome-terminal --tab -- bash -c "php artisan reverb:start; exec bash"
gnome-terminal --tab -- bash -c "php artisan queue:work; exec bash"
```

### Production Environment

For production, use a process manager like **Supervisor** to keep services running:

1. **Web Server**: Configure Nginx/Apache to serve from the `public` directory
2. **Queue Worker**: Run via Supervisor
3. **Reverb**: Run via Supervisor or use a service like Pusher/Ably
4. **Scheduler**: Add to cron: `* * * * * php /path/to/artisan schedule:run >> /dev/null 2>&1`

### Accessing the Application

Once all services are running:

- **Application URL**: `http://localhost:8000`
- **Login**: Use any of the seeded accounts (see User Accounts section)
- **Default Password**: `password123`

---

## 👥 User Accounts (Seeder Generated)

After running `php artisan db:seed --class=UserJabatanSeeder`, the following accounts are available for testing and handover.

**Default Credentials:**

- **Password**: `password123`
- **PIN**: `12345678`

| Jabatan            | Admin Account                  | User Account                  |
| :----------------- | :----------------------------- | :---------------------------- |
| **Direktur Utama** | `admin.dirut@example.com`      | `user.dirut@example.com`      |
| **Direktur**       | `admin.direktur@example.com`   | `user.direktur@example.com`   |
| **Kepala Divisi**  | `admin.kadiv@example.com`      | `user.kadiv@example.com`      |
| **Manager**        | `admin.manager@example.com`    | `user.manager@example.com`    |
| **Supervisor**     | `admin.supervisor@example.com` | `user.supervisor@example.com` |
| **Staff**          | `admin.staff@example.com`      | `user.staff@example.com`      |

> **Note:** The `Super Administrator` account is also created via the main `DatabaseSeeder`:
>
> - **Email**: `superadmin@example.com`
> - **Password**: `password123`

---

## 🔑 Key Features

- **Multi-Level Approval Workflows**: Configure dynamic approval flows based on document types and user roles.
- **Digital Signatures**: secure digital signing of documents with strict identity verification.
- **Real-time Notifications**: Instant updates on document status changes via WebSockets.
- **Role-Based Access Control (RBAC)**: Granular permissions based on Position (Jabatan) and Role (Admin/User).
- **Context Switching**: Users can switch between different organizational contexts if assigned to multiple.
- **PDF Generation & Viewer**: Integrated PDF handling for document previews and finalization.

## 📚 Documentation

For detailed technical documentation on specific features:

- **[Email Notification Guide](docs/FITUR_EMAIL_NOTIFICATION.md)** - Complete guide on email notification setup, Gmail SMTP configuration, all email types, and troubleshooting.
- **[Browser Notification Guide](docs/FITUR_BROWSER_NOTIFICATION.md)** - Real-time browser notification setup, permission handling, and WebSocket configuration.
- **[Digital Signature Configuration Guide](docs/SIGNATURE_CONFIGURATION.md)** - Comprehensive guide on configuring signature positions, multiple signatures, and troubleshooting signature-related issues.
- **[QR Code Document Tracking](docs/FITUR_QR_CODE_DOKUMEN.md)** - Documentation for QR code feature for document verification and tracking.
- **[API Documentation](API_DOCUMENTATION.md)** - Reference for all API endpoints, including authentication, document management, and approval workflows.

## 🚢 Deployment Notes

When deploying to production:

1.  Ensure `APP_ENV=production` and `APP_DEBUG=false` in `.env`.
2.  Optimize the application:
    ```bash
    php artisan optimize
    php artisan config:cache
    php artisan route:cache
    php artisan view:cache
    ```
3.  Set up a Supervisor process for the Queue Worker and Reverb (WebSockets).
    - _See `laravel-worker.conf` and `laravel-reverb.conf` (if included) for configuration examples._
4.  Ensure the web server (Nginx/Apache) points to the `public` directory.

## 🤝 Support

For technical support or inquiries regarding this project, please contact the development team.

---

_Documentation generated on 2026-01-11_
