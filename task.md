# Task Checklist — Control Center Refactoring

- `[x]` Create `ControlCenter.tsx` (`src/components/cleansync/ControlCenter.tsx`) with segregated component boundaries (`MetricsHeader`, `ControlToolbar`, `RoomGrid`, `InspectionSidebar`, `StaffRegistry`)
- `[x]` Integrate `ControlCenter` in `src/routes/index.tsx` replacing `OperationsView` and the standalone `KpiBar`
- `[x]` Verify application builds with zero compilation errors
- `[x]` Update `walkthrough.md` to document the new layout features
