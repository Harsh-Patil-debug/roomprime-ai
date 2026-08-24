# CleanFlow AI

Build a comprehensive, real-time Hotel Operations & Housekeeping Turnaround Optimization Platform called "CleanSync AI". The UI should be sleek, modern, executive, and responsive (using Tailwind CSS, Lucide React icons, and Shadcn UI components). 

Include a top role-switcher navigation bar to easily toggle between three main views: 

1) Front Desk & Operations Dashboard

2) Floor Supervisor & Dynamic Dispatcher

3) Housekeeper Mobile View

---

### Core Data & Mock State Needed:

- Mock list of 20+ rooms across 4 floors with attributes: Room #, Type (Deluxe, Suite, Standard), Status (Occupied, Vacant Dirty, Cleaning in Progress, Inspection Pending, Ready for Guest, Maintenance Blocked), Priority Tag (VIP, Early Arrival, Regular, Overdue), Assigned Staff, Expected Check-in Time, and Estimated Turnaround Time (mins).

- Mock list of Housekeeping Staff with: Name, Active Status, Rooms Completed, Current Assigned Room, Workload Balance %, and Avg Turnaround Speed.

---

### Key Views & Components to Build:

1. **Top Metric KPI Bar (Global across views):**

   - Live Room Readiness % (e.g., 78% Ready)

   - Average Turnaround Time (e.g., 28 mins)

   - VIP Rooms Pending (e.g., 4)

   - Active Staff Workload Utilization (e.g., 84%)

2. **View 1: Operations & Live Matrix View (Front Desk & GM):**

   - **Interactive Room Grid:** Visual color-coded cards for each room showing real-time status, VIP badge, and assigned cleaner with one-click status overrides.

   - **Filter & Search Bar:** Filter by floor, room status, VIP tag, or maintenance flag.

   - **Arrivals vs Readiness Timeline:** A visual schedule showing incoming guest arrival spikes vs available clean rooms.

3. **View 2: Supervisor & Smart Dispatch Engine (The Core Feature):**

   - **Dynamic Priority Queue:** A drag-and-drop or algorithmically sorted list of dirty rooms calculated by urgency (VIP check-ins + early arrivals ranked at top).

   - **"Auto-Optimize Dispatch" Action Button:** Simulates rebalancing tasks across active staff using AI/clustering rules with an interactive success notification showing time saved.

   - **Inspection Queue:** Quick modal to approve or flag rooms with an AI Photo Check simulation (displays uploaded room photo with simulated CV checks: "Bed Made: PASS", "Amenities: PASS", "Trash Empty: PASS").

   - **Maintenance Logging Drawer:** Quick modal to block a room, flag AC/plumbing issues, and notify maintenance.

4. **View 3: Housekeeper Task View (Simulated Mobile UI Container):**

   - Responsive card-based mobile view for the cleaner.

   - Shows their active assigned room, step-by-step checklist (Stripping, Sanitizing, Restocking, Final Polish), and a prominent "Start Cleaning" / "Mark for Inspection" timer button.

   - Simulated Camera Upload button to trigger the automated AI cleanliness inspection check.

5. **Design & Aesthetic:**

   - Dark/Light mode support, luxury hospitality aesthetic (deep slate/navy accents, clean emerald greens for ready rooms, amber for cleaning, rose red for urgent/maintenance).

   - Interactive modals, smooth toast notifications for room status changes, and filter tabs.

This project was built with [Lovable](https://lovable.dev).

**Live app**: https://roomprime-ai.lovable.app

## Build with Lovable

Continue developing this project in the [Lovable editor](https://lovable.dev/projects/c50bab81-3705-4b3b-9e9a-5962c2dace97).

- **Ship faster**: describe what you want to build and Lovable handles the code.
- **Stay in sync**: every change made in Lovable is committed straight to this repository.
- **Full ownership**: this code is yours. Push to `main` on GitHub and your changes sync back into Lovable, ready for your next prompt.

## Development

Prefer working locally? You need Node.js and npm — [install with nvm](https://github.com/nvm-sh/nvm#installing-and-updating).

```sh
git clone <this-repository-url>
cd <repository-name>
npm i
npm run dev
```
