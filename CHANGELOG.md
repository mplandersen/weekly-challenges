# Changelog

All notable changes to the Weekly Challenge Tracker will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [1.0.0] - 2025-08-28

### Added
- **User Authentication System**
  - User registration with email and password
  - Secure login with JWT token authentication
  - Session persistence with localStorage
  - Password visibility toggle

- **Weekly Challenge Management**
  - Create new weekly challenges with custom titles
  - Automatic weekly challenge start date assignment
  - Only one active challenge per user at a time
  - Challenge history view

- **Daily Progress Tracking**
  - 7-day grid interface (Monday through Sunday)
  - Mark daily completion status (completed/incomplete)
  - Rate difficulty on 1-5 scale with emoji indicators
  - Add personal notes for each day
  - Visual feedback with checkmarks and progress indicators

- **User Interface & Experience**
  - Mobile-first responsive design (max-width 384px)
  - Clean, modern interface with Tailwind-inspired styling
  - Intuitive day editing modal with form controls
  - Loading states and error handling
  - Version display in footer

- **Backend API (FastAPI)**
  - RESTful API with comprehensive endpoint coverage
  - PostgreSQL database with proper relational design
  - CORS configuration for cross-origin requests
  - Environment variable configuration
  - Input validation with Pydantic models
  - Secure password hashing with bcrypt

- **Database Schema**
  - User table with email and hashed password
  - Challenge table with title, active status, and week start date
  - DailyEntry table with day index (0-6), completion status, difficulty, and notes
  - Proper foreign key relationships between entities

- **Deployment & Infrastructure**
  - Backend deployed on Railway with PostgreSQL
  - Frontend deployed on Vercel with global CDN
  - Environment-based configuration
  - Automatic deployments from GitHub
  - Production-ready CORS and security settings

### Technical Details
- **Backend**: Python 3.13, FastAPI 0.104+, SQLAlchemy 2.0+, PostgreSQL
- **Frontend**: React 18, TypeScript, Custom CSS utilities
- **Deployment**: Railway (backend), Vercel (frontend)
- **Database**: PostgreSQL with automated migrations
- **Authentication**: JWT tokens with 30-minute expiration

### Security
- Passwords hashed using bcrypt
- JWT token-based authentication
- CORS properly configured for production domains
- Input validation on all API endpoints
- SQL injection prevention through ORM usage

---

## [Unreleased]
*Future features and improvements will be listed here*

### Planned Features
- Challenge categories and tags
- Progress statistics and charts
- Social sharing capabilities
- Challenge templates
- Dark mode support
- Mobile app (React Native)
- Push notifications
- Streak tracking
- Export progress data

---

**Legend:**
- `Added` for new features
- `Changed` for changes in existing functionality
- `Deprecated` for soon-to-be removed features
- `Removed` for now removed features
- `Fixed` for any bug fixes
- `Security` for vulnerability fixes
