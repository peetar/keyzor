# KEYZOR — API & Skill Improvement Plan

**Project:** KEYZOR (`https://keyzor.vercel.app`)  
**Target Audience:** Keyzor Core Backend & Skill Engineers / AI Dev Agents  
**Goal:** Enhance the Keyzor API developer experience, eliminate agent friction during feature batching/completion, and upgrade instructional guidance in `SKILL.md` and the `/hello` route.

---

## 1. Executive Summary & Objectives

During recent real-world usage where an AI agent created and transitioned 9 features across diverse lifecycle stages (backlog, testing, and production completion), the self-guiding `agent_guidance` envelopes and auto-stage transition logic proved highly effective.

However, several friction points were identified:
1. **Double Round-Trips on Creation:** Features cannot be initialized directly into advanced stages (e.g., deployed or completed) at creation time.
2. **No Bulk Ingestion:** Seeding a roadmap requires $N$ sequential HTTP requests.
3. **REST Misrouting (405):** Standard `PATCH /features/:id` calls fail with 405 because updates are routed exclusively through `/features/:id/status`.
4. **Undocumented Completion State:** `SKILL.md` documents stage advancement, but omits the exact schema required to reach 100% completion (`status: "completed"`).

---

## 2. API Level Enhancements (`/api/v1`)

### A. Support Initial Stage & Status on Feature Creation
* **Endpoint:** `POST /api/v1/projects/:slug/features`
* **Problem:** Every feature currently starts at Stage 0 (`Brainstorming & Scope`, `percentComplete: 0%`). Recording an existing feature requires a `POST` followed by a `PATCH .../status`.
* **Proposed Enhancement:** Accept optional initial stage and status parameters:
  ```json
  {
    "title": "Cashier Partial Payments",
    "summary": "Accept fractional payments with dynamic ledger balance tracking.",
    "currentOwner": "Released",
    "targetDate": "2026-10-27",
    "expectedDate": "2026-10-27",
    "priority": "high",
    "stageName": "Live in Production",
    "status": "completed",
    "notes": "Verified and released.",
    "links": [
      {
        "label": "Implementation Spec",
        "url": "https://github.com/org/repo/blob/main/spec.md",
        "linkType": "design_doc"
      }
    ],
    "actorName": "Coding Agent"
  }
  ```
* **Backend Behavior:**
  - If `stageName` (or `initialStage`) is supplied, find the matching stage in the project's lifecycle.
  - Automatically set all preceding stages to `status: "completed"`.
  - Set the target stage to `status: "in_progress"` (or `status: "completed"` if the top-level payload specifies `status: "completed"`).
  - Calculate `percentComplete` accordingly (e.g., 100% for completed final stage).

---

### B. Batch Feature Ingestion Endpoint
* **Endpoint:** `POST /api/v1/projects/:slug/features/batch`
* **Problem:** Roadmap imports or multi-feature generations currently require 8–16 sequential HTTP round-trips.
* **Proposed Schema:**
  ```json
  {
    "features": [
      {
        "title": "Inpatient Module",
        "summary": "Ward bed management and clinical rounding.",
        "stageName": "Bugfixes & Feedback",
        "currentOwner": "QA Team",
        "targetDate": "2026-11-15"
      },
      {
        "title": "Insurance Claims Workbench",
        "summary": "Batch submission and claim tracking.",
        "stageName": "Bugfixes & Feedback",
        "currentOwner": "Billing Testers",
        "targetDate": "2026-11-15"
      }
    ],
    "actorName": "Coding Agent"
  }
  ```
* **Response:** Returns an array of created features with their respective `agent_guidance` envelopes.

---

### C. Graceful Handling of `PATCH /features/:id` (Alias or 405 Guidance)
* **Endpoint:** `PATCH /api/v1/features/:featureIdOrSlug`
* **Problem:** REST-oriented AI agents instinctively call `PATCH /features/:id` to update top-level metadata (such as `status`, `summary`, or `priority`), which currently returns `405 Method Not Allowed`.
* **Proposed Fix:**
  - **Option 1 (Recommended - Route Alias):** Route `PATCH /features/:featureIdOrSlug` directly to the status/metadata update handler so both `/features/:id` and `/features/:id/status` succeed.
  - **Option 2 (Helpful Guidance on 405):** If preserving 405, return an instructive JSON body:
    ```json
    {
      "ok": false,
      "error": "Method Not Allowed",
      "agent_guidance": {
        "message": "To update this feature or advance its lifecycle stage, use PATCH /api/v1/features/:featureIdOrSlug/status",
        "correct_endpoint": "https://keyzor.vercel.app/api/v1/features/:featureIdOrSlug/status"
      }
    }
    ```

---

### D. Response Envelope Normalization
* **Observation:**
  - `GET /projects/:slug` nests data under `data.project.features`.
  - `POST /projects/:slug/features` nests data under `data.feature`.
  - `fourQuestions` is sometimes at `data.fourQuestions` and sometimes at `data.feature.fourQuestions`.
* **Standardization:**
  - Single-entity endpoints (`GET /features/:id`, `POST /features`, `PATCH /features/:id/status`) should consistently return:
    ```json
    {
      "ok": true,
      "agent_guidance": { ... },
      "data": {
        "feature": {
          "id": "...",
          "title": "...",
          "status": "...",
          "fourQuestions": { ... },
          "stages": [ ... ],
          "links": [ ... ]
        }
      }
    }
    ```

---

## 3. Skill & Documentation Improvements (`SKILL.md` & `/hello`)

### A. Document the "100% Completed / Done" Recipe
Update Section 5.C of `SKILL.md` to explicitly show how to mark a feature as completed:
```markdown
### Completing a Feature (100% Shipped)
To advance a feature to the final stage and mark it 100% complete:

```bash
curl -X PATCH "https://keyzor.vercel.app/api/v1/features/<featureSlug>/status" \
  -H "Authorization: Bearer <KEY>" \
  -H "Content-Type: application/json" \
  -d '{
    "stageName": "Live in Production",
    "status": "completed",
    "currentOwner": "Released",
    "notes": "Feature verified, merged, and live in production.",
    "links": [
      {
        "label": "Release / PR Link",
        "url": "https://github.com/org/repo/pull/123",
        "linkType": "pr"
      }
    ],
    "actorName": "Coding Agent"
  }'
```
```

---

### B. Explicitly Clarify `id` vs `slug` Interchangeability
Add a note in the API Reference section:
> **Tip for AI Agents:** You can use either the full ID (`feat_e70bc59839`) or the URL slug (`decouple-screening-from-registration-triage`) interchangeably in all `/api/v1/features/:idOrSlug` routes.

---

### C. Provide a Zero-Dependency Node.js Script Recipe
Inline `curl` with complex JSON payloads often encounters quoting and escaping issues in PowerShell and Windows shells. Providing a cross-platform Node.js snippet in `SKILL.md` ensures flawless execution:

```javascript
// Quick Keyzor API Helper (zero dependencies)
const https = require('https');

function keyzorRequest(method, path, body, apiKey) {
  return new Promise((resolve, reject) => {
    const payload = body ? JSON.stringify(body) : '';
    const req = https.request({
      hostname: 'keyzor.vercel.app',
      path,
      method,
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
        'Content-Length': Buffer.byteLength(payload)
      }
    }, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => resolve(JSON.parse(data)));
    });
    req.on('error', reject);
    if (payload) req.write(payload);
    req.end();
  });
}
```

---

## 4. Implementation Checklist for Keyzor AI Dev Agent

- [x] **Feature Creation Route (`POST /api/v1/projects/:slug/features`):**
  - Accept optional `stageName` (or `initialStage`), `status`, `notes`, and `links`.
  - Automatically complete preceding stages when `stageName` is specified.
- [x] **Batch Route (`POST /api/v1/projects/:slug/features/batch`):**
  - Iterate through `features` array and create each with optional initial stages.
  - Return `{ ok: true, data: { features: [...] } }`.
- [x] **Router / Controller Aliasing:**
  - Allow `PATCH /api/v1/features/:id` as an alias to `PATCH /api/v1/features/:id/status`.
- [x] **Instructional Response (`/hello` & `agent_guidance`):**
  - Update example curl payloads to highlight batch creation and the 100% completion recipe.
- [x] **Documentation Update (`SKILL.md`):**
  - Add the "Completing a Feature" snippet.
  - Document `idOrSlug` interchangeability.
  - Include the Node.js zero-dependency execution example.
