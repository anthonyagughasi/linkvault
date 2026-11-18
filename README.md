# LinkVault — URL Shortening & Analytics Platform

**A smarter way to create, manage and track shortened URLs.**

### Project Overview

LinkVault is a full-stack URL shortening and analytics platform designed to simplify link sharing while providing meaningful insights into link engagement.

The platform allows users to convert lengthy URLs into short, shareable links, create custom slugs, generate QR codes and monitor how their links perform through an analytics dashboard.

### The Problem

Long URLs can be difficult to share, manage and track. Beyond shortening links, users also need visibility into how their audience interacts with shared content.

LinkVault addresses this by combining link management and engagement analytics in a single application.

### Key Features

- User registration and authentication.
- Google sign-in.
- Short URL generation.
- Custom URL slugs.
- Link management and organization.
- Click tracking and analytics.
- Referral source tracking.
- Browser, operating system and device insights.
- QR code generation and downloads.
- Link expiration and availability controls.

### Technical Implementation

**Frontend:** React, TypeScript and Vite.

**Backend:** Node.js and Express.js, deployed through Vercel serverless functions.

**Database:** Firebase Firestore.

**Authentication:** Firebase Authentication.

**Deployment:** Vercel with GitHub integration.

### Engineering Highlights

- Developed a full-stack application connecting a React frontend to backend API functionality.
- Integrated Firebase Authentication and Firestore for user identity and application data.
- Implemented short-link generation and redirect handling.
- Built click-tracking functionality to capture link engagement metadata.
- Developed analytics features for visualizing traffic sources and visitor environments.
- Implemented QR code generation for shortened URLs.
- Configured serverless deployment and production environment variables.

### Challenges & Problem Solving

One of the key challenges was configuring the Express backend for Vercel's serverless runtime.

I also worked through dependency compatibility issues, Firebase authentication domain authorization and production module packaging to ensure the application could run correctly after deployment.

### Outcome

LinkVault demonstrates my ability to build and deploy a full-stack web application involving frontend development, backend services, database integration, authentication, analytics and production deployment.

**Live Application:** https://linkvault-eight-opal.vercel.app/

**Source Code:** https://github.com/anthonyagughasi/linkvault

