# WEIC Time Tracker

## Overview

WEIC Time Tracker is a full-stack web application designed for managing teacher time tracking and payroll calculations. The application provides a dual interface: a simple teacher check-in/check-out system and a comprehensive admin dashboard for managing teachers, viewing time entries, and calculating pay. The system features PIN-based authentication for admin access and maintains detailed records of work hours with automatic pay calculations based on hourly rates and billable hour limits.

## User Preferences

Preferred communication style: Simple, everyday language.

## System Architecture

### Frontend Architecture
- **React 18** with TypeScript for the user interface
- **Vite** as the build tool and development server
- **Wouter** for client-side routing instead of React Router
- **Tailwind CSS** with **shadcn/ui** component library for styling
- **TanStack Query (React Query)** for server state management and API calls
- **React Hook Form** with Zod validation for form handling

### Backend Architecture
- **Express.js** server with TypeScript
- **RESTful API** design with structured endpoints
- **Session-based authentication** using express-session
- **In-memory storage** as the primary data layer (MemStorage class)
- **Drizzle ORM** configured for PostgreSQL schema definitions
- **bcryptjs** for password hashing and PIN security

### Data Storage Solutions
- **Primary**: In-memory storage implementation with full CRUD operations
- **Configured**: PostgreSQL with Drizzle ORM (ready for production deployment)
- **Session Storage**: PostgreSQL-backed sessions using connect-pg-simple
- **Schema**: Defined using Drizzle with proper relationships between teachers, time entries, and app settings

### Authentication and Authorization
- **PIN-based admin authentication** with bcrypt hashing
- **Session management** with secure cookie configuration
- **Initial setup flow** for first-time PIN configuration
- **Session persistence** across browser sessions
- **Admin reset functionality** for complete data and PIN reset

### API Structure
- **Teachers API**: CRUD operations for teacher management
- **Time Entries API**: Check-in/out functionality and time tracking
- **Settings API**: PIN setup and configuration management
- **Auth API**: PIN validation and session management
- **Payroll Calculations**: Automatic computation of hours worked, billable hours, and pay based on hourly rates and maximum billable hour limits

### Component Architecture
- **shadcn/ui** components for consistent design system
- **Modal-based workflows** for admin functions
- **Responsive design** with mobile-first approach
- **Toast notifications** for user feedback
- **Form validation** with Zod schemas
- **Reusable UI components** with proper TypeScript interfaces

## External Dependencies

### Core Framework Dependencies
- **@neondatabase/serverless**: PostgreSQL serverless driver for database connectivity
- **drizzle-orm** and **drizzle-kit**: Type-safe ORM and migration toolkit
- **@tanstack/react-query**: Server state management and caching
- **wouter**: Lightweight React router
- **bcryptjs**: Password hashing and security
- **connect-pg-simple**: PostgreSQL session store

### UI and Styling Dependencies
- **@radix-ui/***: Comprehensive set of accessible UI primitives
- **tailwindcss**: Utility-first CSS framework
- **class-variance-authority**: Utility for managing component variants
- **clsx**: Utility for conditional class names
- **lucide-react**: Icon library

### Development Dependencies
- **Vite**: Build tool and development server with HMR
- **TypeScript**: Static type checking
- **@replit/vite-plugin-***: Replit-specific development tools
- **esbuild**: Fast JavaScript bundler for production builds

### Form and Validation
- **react-hook-form**: Performant form library
- **@hookform/resolvers**: Form validation resolvers
- **zod**: Schema validation library
- **drizzle-zod**: Integration between Drizzle and Zod

### Date and Time
- **date-fns**: Modern JavaScript date utility library for time calculations and formatting