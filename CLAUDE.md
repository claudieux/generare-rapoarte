# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

This is a **Marketing Performance Dashboard Generator** - a React application built with Vite and TypeScript that allows users to create custom marketing dashboards. The app generates HTML reports with marketing metrics (impressions, reach, clicks, CTR) across platforms and visualizes media campaign timelines.

## Development Commands

- **Start development server**: `npm run dev`
- **Build for production**: `npm run build`
- **Preview production build**: `npm run preview`
- **Install dependencies**: `npm install`

## Architecture

### Core Structure
- **Single Page Application**: Built with React 19, Vite, and TypeScript
- **State Management**: Uses React's useState hooks with local component state
- **Styling**: Tailwind CSS for UI components, inline CSS for generated dashboard HTML
- **Data Persistence**: Firebase Firestore for saving/loading reports

### Key Components
- `App.tsx` - Main application component containing all form logic and state management
- `components/Card.tsx` - Reusable card wrapper component
- `components/Toast.tsx` - Toast notification system
- `utils/dashboardGenerator.ts` - Core HTML generation logic for marketing dashboards
- `types.ts` - TypeScript type definitions for Platform, Channel, DashboardData, etc.
- `constants.ts` - Month and year constants

### Data Model
The application works with three main data types:
- **Platform**: Marketing platform data (name, impressions, reach, clicks, CTR)
- **Channel**: Media channel with monthly activity tracking (12 boolean flags)
- **OverallResults**: Aggregated metrics across all platforms

### Firebase Integration
- Optional Firebase Firestore integration for report persistence
- Configuration in `firebase.ts` - requires valid Firebase project setup
- Gracefully degrades when Firebase is not configured
- Report saving/loading with automatic error handling and user feedback

### Dashboard Generation
- Generates standalone HTML reports with embedded CSS
- Responsive design with gradient styling using user-selected colors
- Dynamic metric formatting (K/M abbreviations for large numbers)
- Timeline visualization showing channel activity by month
- Opens generated dashboard in new browser tab

## Development Notes

### Firebase Setup
To enable save/load functionality, update `firebase.ts` with valid Firebase project configuration. The app will automatically detect if Firebase is configured and enable/disable features accordingly.

### State Management Pattern
All form data is managed in the main App component using controlled inputs. Each platform and channel has a unique ID for React key management.

### Dashboard Customization
Generated dashboards use a gradient color scheme based on user-selected primary and secondary colors. All styling is embedded in the generated HTML for portability.

### Error Handling
Toast notifications provide user feedback for all Firebase operations and form validation errors.