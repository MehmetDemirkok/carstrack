You are acting as a senior product designer + senior full-stack engineer.

I already have an existing fleet management SaaS called CarsTrack with a working UI, theme, layout and component system.

IMPORTANT:
Do NOT redesign the product.
Do NOT change the current visual identity.
Do NOT replace the existing theme, gradients, spacing system, cards, sidebar structure or general UI language.
Preserve the current premium minimal aesthetic exactly as it is.

Your task is to evolve and complete the product by filling feature gaps and improving product depth while staying fully consistent with the current design.

Goals:
Turn the existing product into a more complete “AI-powered Fleet Health & Maintenance OS”.

Implement and refine these modules:

1. Dashboard Improvements
- Keep current dashboard layout intact
- Add more data-dense widgets without clutter
- Add:
  - Upcoming maintenance widget
  - Document expiry alerts
  - Recent activity feed
  - Fleet risk overview
  - Health score breakdown panel
- Improve spacing and balance in the current dashboard grid

2. Fleet Health Intelligence
- Expand existing Fleet Health Score into a real scoring engine
- Add score breakdown (maintenance, risk, documentation, usage)
- Add per-vehicle health indicators
- Add health trend history

3. Vehicle Detail Module
Create a vehicle detail page while matching current design:
- Service timeline
- Maintenance records
- Vehicle profile data
- Notes/history
- Risk indicators
- Documents section

4. Predictive Maintenance Alerts
- Add proactive warning system
- Critical / warning / info alert states
- Notification center UI

5. AI Fleet Copilot
Add a side-panel AI assistant module inside the product:
Examples:
- Which vehicles need maintenance soon?
- Show risky vehicles
- Summarize service history

Use existing visual style.

6. Document Automation Module
Add document tracking for:
- Inspection
- Insurance
- Registrations

Include expiration reminders and status badges.

7. UX Improvements
Without changing design language:
- Add global search
- Command palette (Cmd+K)
- Better empty states
- Bulk actions for future scaling
- Improve microinteractions and hover states

8. Architecture / Code
Refactor where needed for production quality:
- modular components
- scalable data models
- reusable patterns
- keep codebase clean

Constraints:
- Preserve all current pages and navigation
- Do not break current functionality
- Do not overcomplicate UI
- Keep minimalist aesthetic
- Add features as natural extensions of current product
- Think “improve an already good product”, not “start over”

Priority:
Feature depth > redesign.

Act like you are shipping a polished SaaS v2 on top of an existing v1.