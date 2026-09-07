# Travel CRM & HRM API

A backend API for a **Travel CRM & HRM (Human Resource Management) system** designed to manage a travel company's day-to-day operations, customers, employees, and internal business processes.

The application provides a centralized platform for managing customer information, employee records, authentication, and operational data required to run a travel business efficiently.

## 🚀 Features

- 🔐 **Authentication & Authorization**
  - JWT-based authentication
  - Secure password hashing with bcrypt
  - Passport-based authentication
  - Protected API routes

- 👥 **Customer Management**
  - Manage customer information
  - Maintain customer records
  - Track customer-related operational data

- 👨‍💼 **Employee Management**
  - Manage employee records
  - Maintain employee information
  - Support internal HR operations

- 🏢 **CRM Operations**
  - Centralized customer management
  - Organize business and customer-related information
  - Support day-to-day travel company operations

- 🧑‍💻 **HRM Operations**
  - Employee management
  - Employee-related records
  - Support internal workforce administration

- 🗄️ **Database Management**
  - MariaDB database
  - Prisma ORM
  - Type-safe database access

- ⚙️ **Backend Architecture**
  - Modular NestJS architecture
  - Environment-based configuration
  - Request validation using `class-validator`
  - Scheduled tasks using `@nestjs/schedule`

## 🛠️ Tech Stack

### Backend

- **NestJS**
- **TypeScript**
- **Node.js**
- **Express**

### Database

- **MariaDB**
- **Prisma ORM**

### Authentication & Security

- **JWT**
- **Passport**
- **bcrypt**
- **Cookie Parser**

### Validation & Utilities

- **class-validator**
- **class-transformer**
- **dotenv**
- **RxJS**

### Testing & Development

- **Jest**
- **Supertest**
- **ts-jest**
- **ESLint**
- **Prettier**

## ⚙️ Installation

Clone the repository:

```bash
git clone https://github.com/devsubhamdas/travel-crm-hrm-api
cd travel-crm-hrm-api
```

Install dependencies:

```bash
npm install
```

## 🔐 Environment Variables

Create a `.env` file in the project root and configure the required environment variables.

Example:

```env
PORT=5000

DATABASE_URL="mysql://username:password@localhost:3306/travel_crm_hrm"

JWT_SECRET=your_jwt_secret
JWT_EXPIRES_IN=1d
```

> Do not commit your `.env` file or expose credentials, database passwords, or JWT secrets in the repository.

## 🗄️ Database Setup

Make sure MariaDB is running and the database connection is configured in your environment variables.

Generate the Prisma client:

```bash
npx prisma generate
```

Apply the database schema:

```bash
npx prisma migrate dev
```

For production deployments:

```bash
npx prisma migrate deploy
```

## ▶️ Running the Application

### Development

```bash
npm run start:dev
```

The API will start in development/watch mode.

### Production Build

```bash
npm run build
```

Start the production application:

```bash
npm run start:prod
```

### Debug

```bash
npm run start:debug
```

## 📁 Project Structure

```text
travel-crm-hrm-api/
├── src/
│   ├── modules/
│   │   ├── auth/
│   │   ├── customers/
│   │   ├── employees/
│   │   └── ...
│   ├── app.module.ts
│   └── main.ts
│
├── test/
│   └── ...
│
├── prisma/
│   └── schema.prisma
│
├── .env
├── package.json
├── tsconfig.json
└── README.md
```

> The exact module structure may evolve as new CRM and HRM features are added.

## 🧪 Testing

Run unit tests:

```bash
npm test
```

Run tests in watch mode:

```bash
npm run test:watch
```

Generate test coverage:

```bash
npm run test:cov
```

Run end-to-end tests:

```bash
npm run test:e2e
```

## 🔍 Code Quality

Format the source code:

```bash
npm run format
```

Run ESLint:

```bash
npm run lint
```

## 🔒 Security

The application uses several mechanisms to improve API security:

- JWT-based authentication
- Password hashing with bcrypt
- Protected authentication routes
- Request validation
- Environment-based secret configuration
- Separation of configuration from application code

Sensitive configuration such as database credentials and JWT secrets should always be stored in environment variables.

## Associated Repository

**Frontend**: [travel-crm-hrm-ui](https://github.com/devsubhamdas/travel-crm-hrm-ui)

## 🎯 Project Purpose

The purpose of this project is to provide a **centralized backend system for managing the daily operations of a travel company**.

Instead of maintaining customer and employee information across multiple systems, the CRM and HRM functionality brings these operations together into a single platform.

The system is intended to support areas such as:

- Customer management
- Employee management
- Internal HR operations
- Travel business operations
- Authentication and access control
- Centralized business data management

The architecture is designed to be extensible so additional modules and business workflows can be added as the application grows.

## 🏗️ Architecture

The API is built using **NestJS's modular architecture**, allowing different business domains to remain separated and maintainable.

Core technologies include:

```text
Client / Frontend
       │
       ▼
   NestJS API
       │
 ┌─────┴──────────┐
 │                │
 ▼                ▼
CRM Modules     HRM Modules
 │                │
 └───────┬────────┘
         ▼
      Prisma ORM
         │
         ▼
      MariaDB
```

## 📌 Future Scope

Potential future modules and improvements include:

- Role-based access control
- Employee attendance management
- Leave management
- Payroll management
- Customer leads and follow-ups
- Travel booking management
- Sales and revenue tracking
- Reports and analytics
- Notifications
- Audit logs
- Dashboard APIs

## 📄 License

This project is licensed under the **MIT License**.

```

```
