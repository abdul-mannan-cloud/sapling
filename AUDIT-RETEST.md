# Retest of current code

November 7, 2026, Asia/Karachi. Rebuilt both applications and reran the original audit against the updated working tree. Tests used temporary databases. No application behavior was changed for this retest.

## Results

| Check | Previous | Retest |
|---|---:|---:|
| Existing unit tests | 67/67 | **72/72** |
| Backend and frontend builds | Pass | **Pass** |
| Existing starter end-to-end test | 1/1 | **1/1** |
| Offline Phase 1 patient turns | 10/11 | **11/11** |
| Offline variations | 6/20 | **14/20** |
| AI Phase 1 patient turns | 6/11 | **5/11** |
| AI variations | 16/20 | **18/20** |
| REST/socket integration | 17/18 | **17/18** |
| Mock-provider voice checks | 4/4 | **4/4** |
| Real speech service checks | 2/2 | **2/2** |
| Real voice socket flows | 2/2 | **2/2** |
| Reviewed broad audit | 63/88 | **73/88** |
| Seven focused AI-configured cases, three runs each | 10/21 | **18/21** |
| Offline fallback/guard probes | 2/4 | **4/4** |
| Actual process restart | Pass | **Pass** |

Lint still exits successfully with warnings. The starter end-to-end test used a migrated temporary database and permission to open its local port. It is not a full UI test.

AI measurements are individual runs, not guaranteed stable rates. The focused runs for the bare “yes” passed 3/3, but the longer full scenario still created an undated request. The emergency and duplicate guards can handle turns before a model call; their successful interception is not a model fallback failure.

## Confirmed fixes

- The previously missed `I have pain in my chest and my left arm is tingling` now returns the exact emergency response and creates an emergency handoff: **3/3 focused runs**, plus the offline detector probe.
- Explicit negative consent containing “yes” no longer bypasses the duplicate guard.
- Offline clinical questions take precedence over scheduling/refill keywords in the tested mixed-intent cases.
- `Are you open Tuesday?` no longer creates an appointment request.
- Saturday hours and address/parking FAQ answers pass.
- Offline refill status questions and repeated refill requests now pass.
- The offline booked-status response now includes the monitoring caveat, and the entire original offline script passes.

## Still failing

1. **A newly added AI emergency flag misclassifies the scripted clinical question.** The full script's `my readings have been around 150/95 all week, should I take two pills?` returned the emergency response and `emergency`, instead of the required `clinical_question`. The spoken-number version did the same. Six additional focused probes found emergency handoffs in **1/3 numeric** cases and **3/3 spoken-number** cases; the other two numeric cases correctly created clinical-review handoffs. This is a regression against the supplied scenario; the emergency safety net needs calibration while preserving the successful paraphrase fix.

2. **The longer AI conversation still files an undated request after “yes”.** Three standalone focused runs passed, so this is context-sensitive/inconsistent rather than fixed.

3. **AI replies still omit required workflow details.** In the full scenario, the Tuesday response did not say staff review was required; a booked-status question produced an update action; the next-appointment reply omitted the pending recheck; and the balance reply omitted the FAQ payment URL.

4. **Additional-request consent remains unreliable.** All three focused AI probes for `yes, Thursday afternoon` after the duplicate warning updated the original request instead of creating a separate one. The broad AI variation happened to pass once. Offline mode still updates the original request. This workflow is not fixed.

5. **Offline exact time is lost.** `Tuesday at 3:30 PM please` still has no `slot_start`.

6. **Both paths lose an existing morning preference.** `actually Thursday instead` changed a stored morning request to afternoon in the broad tests.

7. **Offline pharmacy changes are not applied to the refill.** `actually use Main Street Pharmacy` still creates a generic handoff rather than updating the pending refill.

8. **Offline conflicting/past dates and Spanish requests still fail.** The November 3 input is silently mapped to November 10; the Spanish Tuesday-afternoon request becomes a generic handoff.

9. **The manual-edit API still accepts invalid dates.** `{ "date": "not-a-date" }` returns 200 and is saved in the isolated database.

## Voice and persistence

The actual Deepgram speech checks passed again. Generated appointment audio through the real socket created a request; a later typed change updated the same ID with both source messages linked. Generated scripted emergency audio returned the exact voice response, speech bytes and an emergency handoff. Empty transcripts, absent configuration and simulated TTS outages behaved as expected in the transport tests.

A separate backend process was started, stopped and restarted. The conversation retained all **10 messages**, both requests remained, and the issued JWT still worked.

Real microphone permissions, hardware recording, mobile codecs, actual browser playback and visual interaction remain untested. The frontend microphone-cleanup, late-audio/chat-switching, autoplay-retry and stale-history-response concerns from the original report remain unresolved by this retest; the relevant client code still lacks those protections. Server-side speech success does not establish that a browser played the audio.

## Evidence and interpretation

- `backend/audit-reviewed-results.json`: current **73/88** reviewed result set.
- `backend/audit-results.json`: raw run, **72/88**. One failure was the old harness incorrectly rejecting a deterministic duplicate-guard response as an AI fallback. The response contained no action and satisfied the negative-consent assertion; the reviewed result records that correction. The harness now accepts that explicit guard response.
- Two raw failures mention an unexpected `emergency` mode. Their underlying responses are genuine workflow failures—emergency instead of clinical review—not missing-model/network failures. The extra clinical probes reproduce that behavior.
- `backend/audit-offline-results.json`: current **46/53** offline/integration/transport run.
- `backend/ai-probe-results.json`: original seven focused cases rerun three times (**18/21**).
- `backend/ai-clinical-retest-results.json`: six additional clinical-versus-emergency classification probes (**2/6 passed**).
- `backend/offline-probe-results.json`: all four focused guard/fallback checks pass.
- `backend/persistence-audit-results.json`: actual restart result.
- `backend/audit-history/before-retest/`: preserved prior JSON evidence for comparison.

The implementation has improved, especially offline behavior and the previously missed emergency phrasing. It still does not pass all acceptance checks. The next priorities are server-side request validation/consent handling and correcting the AI clinical/emergency classification regression, followed by the unresolved browser voice lifecycle issues.
