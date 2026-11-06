# Phase 1 test evidence — rule-based (offline) agent

Run against the scenario clock fixed at **Wednesday, November 4, 2026, 10:00 AM Pacific**, with `OPENAI_API_KEY` unset so the deterministic rule-based agent (`backend/src/agent/rule-agent.service.ts`) handled every step. This is the same code path exercised automatically by `backend/src/agent/rule-agent.service.spec.ts`; the run below is the manual, end-to-end proof through the real HTTP API and SQLite store (via curl against a single conversation, created fresh for this run).

All records below were confirmed to survive a full backend process restart (see "Persistence check" at the end).

| # | Input | Expected behavior | Observed |
|---|---|---|---|
| 0 | Clinic outbound: "Hi Alex, this is Sapling Family Clinic. Dr. Lee asked to recheck your blood pressure about 4 weeks after your Oct 6 visit. Would you like us to request a time for you? Reply here anytime." | Displayed and saved in the local thread; no real message sent. | Stored as a `clinic` message. No agent run (clinic-authored messages are never routed to the agent). |
| 1 | "yes" | Match "yes" to message 0. Ask when Alex prefers to come in (slots OK to suggest). Don't ask for the reason. | *"Great — when would you like to come in for the recheck? We have openings such as Tuesday, November 10, 2026 at 14:00; Tuesday, November 10, 2026 at 15:30; Thursday, November 12, 2026 at 13:30; Thursday, November 12, 2026 at 16:00, or let me know a day/time that works."* No handoff created yet (correct — no date chosen). Reason was never asked for. |
| 2 | "Tuesday afternoon works" | Resolve to Tue Nov 10, afternoon, say it back. Create one `appointment_request` (BP recheck, Dr. Lee, date, window). Tell Alex pending staff review. | Created handoff `type: appointment_request`, `details: {reason: "BP recheck", provider: "Dr. Priya Lee", date: "2026-11-10", window: "afternoon"}`, `status: pending_staff`. Reply: *"Thanks — I've requested Tuesday, November 10, 2026 (afternoon) for your BP recheck with Dr. Priya Lee. This is pending staff review; they'll confirm the exact time."* |
| 3 | "actually can we do Thursday instead" | Update the **same** request to Thu Nov 12, afternoon. Confirm change, still pending. Still one request. | Same handoff id updated in place: `date: "2026-11-12"`, `window: "afternoon"`; `messageIds` grew from 1 to 2 entries (both the Tuesday and Thursday messages). No second handoff was created. Reply: *"Got it — I've updated your request to Thursday, November 12, 2026 (afternoon). Still pending staff review; we'll let you know once it's booked."* |
| 4 | "is it booked yet?" | Read actual status: pending staff review, not booked. No timeline. | *"Not yet — your request for Thursday, November 12, 2026 (afternoon) is still pending staff review, not booked. Texts aren't monitored continuously, so I can't give a timeline."* No new handoff. |
| 5 | "when is my next appointment?" | Jan 14 2027 physical is the only booked appointment. Keep the pending recheck distinct from a booked appointment. | *"Your next confirmed appointment is Thursday, January 14, 2027 at 09:30 with Dr. Priya Lee (Annual physical). Separately, your BP recheck is a pending request awaiting staff review — it isn't booked yet."* |
| 6 | "what time do you close today?" | 5:00 p.m. Pacific. | *"We're open Monday–Friday, 9:00 a.m.–5:00 p.m. Pacific, so we close at 5:00 p.m. Pacific today."* |
| 7 | "do you take Aetna?" | Not available; no guessing; offer/pass to staff. | *"I don't have that on file — our FAQ doesn't list which insurance plans we accept. I'm passing this question to staff."* Created `type: other`, `details: {question: "do you take Aetna?"}`. |
| 8 | "can I get a refill on my BP med" | Refill handoff for Lisinopril 10mg / once daily / Elm Street Pharmacy, without asking Alex for any of it. Pending staff review. | Created `type: refill`, `details: {medication: "Lisinopril", dose: "10 mg", frequency: "once daily", pharmacy: "Elm Street Pharmacy, (555) 010-0142"}`. Alex was asked for nothing. |
| 9 | "my readings have been around 150/95 all week, should I take two pills?" | No medical advice. `clinical_question` handoff with readings + question. Tell Alex a clinician will review; no monitoring promise. | Reply: *"I can't give medical advice. I've shared what you told me with a clinician for review — texts aren't monitored continuously."* Created `type: clinical_question`, `details: {question: "...", readings: "150/95"}`. |
| 10 | "why do I owe $40?" | From the record: Oct 6 copay. Give the FAQ payment link. | *"That's the Copay for Oct 6, 2026 visit — $40.00 total. You can pay online at https://pay.example.test/sapling or by phone during business hours."* No handoff (fully answerable from data). |
| 11 | "I have chest pain and my left arm feels numb" | Exact emergency text, nothing else. Emergency handoff logged. Never imply staff will review. | Reply is the **exact** required string (verified character-for-character against the spec). Created `type: emergency`, `status: pending_staff`, `details: {message: "I have chest pain and my left arm feels numb"}`. `mode: "emergency"` confirms the deterministic pre-check fired, bypassing the agent entirely. |

Final handoff queue after the full script (5 records, matching 5 of the 12 steps that actually needed one — steps 0/1/4/5/6/10 correctly produced none):

| type | status |
|---|---|
| appointment_request | pending_staff |
| other (Aetna question) | pending_staff |
| refill | pending_staff |
| clinical_question | pending_staff |
| emergency | pending_staff |

## Persistence check

The backend process was killed (`pkill -f dist/main.js`) and restarted fresh. Querying the same conversation id afterward returned all 23 stored messages (12 inbound + 11 agent/clinic replies across the script) and all 5 handoff records intact, with the last message correctly identified as the emergency reply. No data loss, no duplicate handoffs created by the restart.

## What's not yet covered here

The LLM-powered path (`agent/llm-agent.service.ts`, used automatically once `OPENAI_API_KEY` is set in `backend/.env`) exercises the same scenario through a structured-output call to `gpt-4o-mini` instead of the keyword matcher above. It hasn't been run end-to-end yet in this environment (no key configured at the time of this evidence capture). Once a key is added, re-running the same 12-step script and diffing the handoff/reply behavior against this table is the natural next check — see `next priorities` in the root README.
