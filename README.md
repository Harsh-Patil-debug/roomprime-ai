# 🏨 RoomFlow — AI-Powered Hotel Housekeeping & Operations Platform

> **Next-Generation Hospitality Management**: Real-time room turnaround dispatch, Gemini 1.5 Flash Vision AI staging inspections, guest concierge services, and cross-department operational routing.

---

## 🌟 Table of Contents
- [Overview](#-overview)
- [Demo Credentials & Persona Switcher](#-demo-credentials--persona-switcher)
- [Key Features & Portals](#-key-features--portals)
  - [👑 1. Supervisor Command Center](#1-supervisor-command-center)
  - [🧹 2. Field Staff & Housekeeper Portal](#2-field-staff--housekeeper-portal)
  - [🛎 3. Guest Concierge Portal](#3-guest-concierge-portal)
  - [📋 4. Request Management Dashboard](#4-request-management-dashboard)
  - [💬 5. Live Guest ⇄ Staff Chat](#5-live-guest--staff-chat)
- [🧠 Gemini 1.5 Flash Vision AI Pipeline](#-gemini-15-flash-vision-ai-pipeline)
- [📐 Priority Auto-Dispatch Algorithm](#-priority-auto-dispatch-algorithm)
- [🛠 Tech Stack & Architecture](#-tech-stack--architecture)
- [🚀 Getting Started](#-getting-started)
- [📁 Project Structure](#-project-structure)

---

## 📖 Overview

**RoomFlow** revolutionizes hotel operations by connecting Supervisors, Housekeepers, Front Desk, Engineering, and Guests into a unified, reactive state machine. By integrating **Google Gemini 1.5 Flash Vision AI**, rooms are inspected, scored, and auto-released for guest check-in within seconds—eliminating operational bottlenecks and SLA breaches.

---

## 🔑 Demo Credentials & Persona Switcher

The platform provides role-isolated authentication and an instant **Persona Switcher Pill** in the top header:

| Persona | Email | Password | Direct Route |
|---|---|---|---|
| 👑 **Supervisor / Ops** | `supervisor@1234` | `12345` | `/control` |
| 🧹 **Field Staff / Housekeeper** | `staff@1234` | `12345` | `/staff` |
| 🛎 **Guest Concierge** | `guest@1234` | `12345` | `/concierge?room=203` |

> 💡 **Instant Testing**: You can also use the **Persona Switcher Pill** (`👑 Supervisor` | `🧹 Staff` | `🛎 Guest`) in the header bar to jump between perspectives in 1 click.

---

## 🚀 Key Features & Portals

### 1. 👑 Supervisor Command Center (`/control`)
- **⚡ Priority Auto-Dispatch Engine**: Automatically pairs vacant dirty rooms with on-duty housekeepers on the same floor or lowest workload index.
- **🔍 AI Staging Review Queue**: Inspects rooms flagged with defects ($< 95\%$ score) with visual defect tags (`⚠️ Rumpled Linens`, `⚠️ Trash on Floor`) and 1-tap overrides (**[ Send Re-clean Request ]** or **[ Overrule & Approve ]**).
- **🖨 Room QR Placard Generator**: Generates and prints QR codes for all 12 guest suites with instant door scanning.
- **⭳ PMS / Excel Ingest**: Ingests arrival schedules, VIP tags, and room lists via CSV or single-entry modal.
- **⚠️ Maintenance Locks**: Puts rooms on `Maintenance Blocked` status and automatically generates a Critical ticket in the Engineering queue.
- **🔔 Header Notification Bell**: Real-time unread alert badges, categorized severity logs, and 1-tap `Clear All`.

### 2. 🧹 Field Staff & Housekeeper Portal (`/staff`)
- **📷 QR Scanner Simulator**: Aiming at door placard automatically loads the room's SOP checklist and begins the cleaning stopwatch.
- **📋 4-Step Tactile SOP Cards**: Stripping & Linen Removal, Bath Sanitization, Amenities Restocking, and Final Polish ($25\% \to 50\% \to 75\% \to 100\%$) with micro-haptic simulation.
- **✨ 3-Slot Visual AI Staging Scanner**:
  - Checkpoints for **Bed**, **Bathroom**, and **Trash / Presentation**.
  - Animated glowing laser sweep during Gemini analysis.
  - Camera capture, photo upload, and instant demo simulation presets.
- **✔ Auto-Release System**:
  - **$\ge 95\%$ QA Score**: Auto-released to `Ready for Guest` and increments staff turnaround count.
  - **$< 95\%$ QA Score**: Flags defects and routes room to Supervisor Review Queue.
- **📶 Offline Sync Mode**: Queues checklist taps and photos in `localStorage` with background sync when reconnected.

### 3. 🛎 Guest Concierge Portal (`/concierge`)
- **⚡ Amenity Quick-Order Catalog**: 1-tap ordering for extra towels, pillows, espresso pods, and toiletries.
- **📍 Live 4-Stage Order Tracker**: Real-time progress bar (`Received` ➔ `Assigned` ➔ `On the Way` ➔ `Delivered`) with assigned staff info.
- **📷 "Snap-a-Need" AI Triage**: Guests can snap a photo of any issue (e.g. broken AC, spill). Gemini AI automatically classifies the category, urgency, and routes the ticket to Engineering or Housekeeping without typing.
- **📶 Wi-Fi 1-Tap Copy**: Quick network credential copy with toast confirmation.

### 4. 📋 Request Management Dashboard (`/control` ➔ Requests Tab)
- **⚡ Smart Request Routing**: Auto-routes issues to `Housekeeping`, `Maintenance`, `Front Desk`, or `Room Service`.
- **⏱ Live SLA Countdowns**: Dynamic second-by-second countdown with auto-escalation to `Critical` if SLA is breached.
- **🏃 Auto-Assign Nearest Runner**: Locates available staff on the same floor with lowest workload.
- **✔ 1-Tap Resolve**: Marks ticket `Completed` and updates SLA adherence KPIs.
- **📱 Slide-over WhatsApp Drawer**: 1-tap preformatted messaging presets.

### 5. 💬 Live Guest ⇄ Staff Chat
- Slide-over chat interface accessible via the top-bar chat button.
- Live bi-directional message synchronization.
- Read receipts (`CheckCheck`), message status timestamps, typing indicators, and simulated concierge replies.

---

## 🧠 Gemini 1.5 Flash Vision AI Pipeline

RoomFlow integrates **Google Gemini 1.5 Flash** for rapid, resilient visual inspections:

```
[ Camera / Upload ] 
       │
       ▼
[ Client Canvas Compression (≤1024x1024 JPEG, 0.8) ]
       │
       ▼
[ AbortController (4.5s Timeout Guard) ]
       │
       ├──► [ Live Gemini API ] ──► [ Strict JSON Parse ] ──► { score, checklist, bboxes }
       │
       └──► [ Fallback Ruleset ] (If key missing / offline / timed out)
```

### Structured Prompt Schema:
```json
{
  "score": 97,
  "passed": true,
  "summary": "All staging criteria verified. Linens taut and aligned, surfaces sanitized.",
  "detectedIssues": [],
  "checklist": {
    "linensTaut": true,
    "trashCleared": true,
    "towelsStaged": true,
    "surfacesClean": true
  }
}
```

---

## 📐 Priority Auto-Dispatch Algorithm

Housekeeping turnaround priority is dynamically calculated using:

$$\text{Priority Score} = \left( \frac{\text{Weight}_{\text{Priority}}}{\text{Minutes until Check-in}} \right) \times 1000$$

Where:
- $\text{Weight}_{\text{VIP}} = 2.0$
- $\text{Weight}_{\text{Overdue}} = 1.8$
- $\text{Weight}_{\text{Early Arrival}} = 1.4$
- $\text{Weight}_{\text{Regular}} = 1.0$

Rooms with the highest scores are routed first to housekeepers matching the room's floor.

---

## 🛠 Tech Stack & Architecture

- **Frontend**: React 18, TanStack Router, TanStack Start
- **Styling**: Tailwind CSS, Lucide Icons, Radix UI primitives, Sonner toasts
- **AI Engine**: Google Gemini 1.5 Flash Vision API (`gemini-1.5-flash`)
- **State Management**: Reactive React Context (`RoomFlowContext` / `store.tsx`)
- **Image Processing**: In-browser Canvas API downscaling & Base64 encoding
- **Persistence**: LocalStorage offline queues + Server Functions API integration

---

## 🚀 Getting Started

### 1. Clone & Install Dependencies
```bash
git clone <repository-url>
cd roomprime-ai
npm install
```

### 2. Configure Environment Variables
Create a `.env` file in the project root:
```env
VITE_GEMINI_API_KEY="your-gemini-api-key-here"
```
*(Note: If no API key is provided, the platform automatically utilizes its built-in hotel QA ruleset with 100% feature parity).*

### 3. Run Development Server
```bash
npm run dev
```
Open `http://localhost:8080` in your browser.

---

## 📁 Project Structure

```
src/
├── components/
│   ├── cleansync/
│   │   ├── AppLayout.tsx               # Top header, notification bell, persona switcher
│   │   ├── auth.tsx                    # Role auth, credentials provider, logout
│   │   ├── ChatPanel.tsx               # Real-time slide-over guest-staff chat
│   │   ├── ControlCenter.tsx           # Full control center with grid, kanban & queue
│   │   ├── GuestPortal.tsx             # Guest concierge, catalog & Snap-a-Need AI
│   │   ├── LoginScreen.tsx             # Login modal with demo credential chips
│   │   ├── QrScannerModal.tsx          # Door placard scanner modal
│   │   ├── RequestDashboard.tsx        # SLA request queue & runner dispatch
│   │   ├── RoomQrCard.tsx              # Printable QR placard card component
│   │   ├── StaffPortalInteractive.tsx  # SOP checklist, 3-slot AI scanner, offline sync
│   │   ├── SupervisorDashboard.tsx     # Supervisor dashboard, auto-dispatch & AI queue
│   │   └── store.tsx                   # Central reactive state store & actions
│   └── ui/                             # Radix UI primitives & components
├── lib/
│   ├── cleansync-data.ts               # Types, initial rooms, staff & requests
│   ├── dispatchEngine.ts               # State transitions, priority formulas, AI scoring
│   └── server-functions.ts            # Server-side persistence handlers
├── routes/
│   ├── index.tsx                       # Main landing & authentication gate
│   ├── control.tsx                     # Supervisor & Request management route
│   ├── concierge.tsx                   # Guest portal route
│   └── staff/index.tsx                 # Staff portal route
└── services/
    └── geminiService.ts                # Gemini 1.5 Flash Vision AI service & fallbacks
```

---

## 📄 License
This project is licensed under the MIT License.
