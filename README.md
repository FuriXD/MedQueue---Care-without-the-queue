# QueueLess prototype

A responsive, browser-based prototype for a healthcare virtual queue. It is a front-end demonstration and does not connect to a cloud database or send real notifications.

## Open it

Run a small local server from this folder with `python3 -m http.server 8000`, then open `http://localhost:8000` in a modern browser. Open the same address in two tabs to demonstrate live staff-to-patient queue updates. No build step or dependencies are required. Queue and profile data are stored in that browser's local storage; there is no cloud backend or real authentication. Google Fonts load when a network connection is available and fall back to system sans-serif fonts otherwise.

## Demonstrated flows

- Register a patient and issue a virtual token with an estimated position and wait.
- Review a priority-ordered queue and service-point capacity.
- Sign in to the staff or patient workspace and switch accounts/views.
- Edit a patient profile, saved locally in the browser.
- Follow token position and called status while the staff queue changes in another tab.
- See patient queue changes shared across tabs through local storage and `BroadcastChannel`.
- Call a patient and run a five-minute grace countdown.
- Mark arrival, or handle a no-show with a three-place bump-back, three-minute grace extension for the next call, and cancellation after three misses.
- Show the fifth-position heads-up as the queue advances.
- Raise an administrator inactivity prompt after an active call exceeds 15 minutes.
- See illustrative crowd-risk and staffing alerts, including the over-capacity lab from the presentation.

Priority weights and sample queue data are illustrative implementation choices, not calibrated clinical rules. The prototype is not intended for real patient care. Demo sign-in has no password or server-side identity verification.
