# IMPLEMENTATION PLAN V1.2 RECOVERY
## Dashboard Stabilization & UI Refinement

This plan addresses the intelligence intake stall, Gemini API exhaustion, and the Archive UI refinement following the emergency production restoration.

## User Review Required

> [!IMPORTANT]
> **API Frequency Adjustment**: I will reduce the Synthesis frequency from hourly to every 3 hours to stay within Gemini API free-tier limits while maintaining fresh intelligence.

## Proposed Changes

### 1. Intelligence Pipeline (Emergency Clean)

#### [MODIFY] [LayerA_Intake.ts](file:///c:/rapidmonthly/Clients/ChronosSentinel/src/pipeline/LayerA_Intake.ts)
- **Status**: Corrupted with merge conflicts.
- **Action**: Remove ALL git conflict markers. Restore V1.2 HEAD logic.

#### [MODIFY] [LayerCD_Synthesis.ts](file:///c:/rapidmonthly/Clients/ChronosSentinel/src/pipeline/LayerCD_Synthesis.ts)
- **Status**: Corrupted with merge conflicts + API limits reached.
- **Action**: 
  - Remove ALL git conflict markers.
  - Update model to `gemini-1.5-flash`.
  - **Schema Alignment**: Force output properties to `shared_facts`, `source_differences`, `synthesis`, and `confidence`.
  - Implement intelligent clustering to minimize API calls.

### 2. Archive UI Refinement (MIMO)

#### [MODIFY] [index.html](file:///c:/rapidmonthly/Clients/ChronosSentinel/public/index.html)
- **Action**: Add a Modal dialog structure for the Archive Day Detail to avoid the "scroll-down" friction.

#### [MODIFY] [style.css](file:///c:/rapidmonthly/Clients/ChronosSentinel/public/css/style.css)
- **Action**: Implement high-performance Modal styling with dark-backdrop and tactical overlays.

#### [MODIFY] [app.js](file:///c:/rapidmonthly/Clients/ChronosSentinel/public/js/app.js)
- **Action**: Refactor `renderDayDetail` to launch the data modal.

---
*Status: PENDING EXECUTION*
*Neural Link: PERSISTENT*
