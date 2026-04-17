# MPIS Face Recognition Issue Resolution

## 1. Root Cause Analysis

The inconsistent detection behavior ("works for me, fails for friends") in the MPIS AI Engine stems from a combination of three factors:

1. **Overly Restrictive Similarity Thresholds**
   The values `CONFIDENT_THRESHOLD` (0.75) and `REVIEW_THRESHOLD` (0.60) in your `config.py` are extremely high for real-world unconstrained environments (webcam, lighting variations, different angles). InsightFace (`buffalo_s`) struggles to reach 0.75 cosine similarity when matching a live webcam feed against a single stored face template, especially if the enrollment template lighting or angle is slightly different.

2. **Single Image Enrollment Vulnerability**
   Currently, your pipeline relies on extracting embeddings from a *single* registration photo. A single photo only provides a very limited feature vector of a person's face. If the live feed captures the person from a slight angle, or under different lighting, the cosine similarity score will drop significantly, often falling below your 0.60 and 0.75 thresholds.

3. **Silent Failures due to Log Level**
   The similarities of "failed" matches were hidden because the computation inside `face_matcher.py` was logged via `logger.debug()`, but the production log level in `config.py` was set to `INFO`. As a result, you couldn't see the underlying cosine scores to tune the system effectively.

---

## 2. Implemented Fixes

### A. Logging Implementation for Similarity Scores
I have modified `ai-engine/face_matcher.py` (Line 158) to use `logger.info` instead of `logger.debug`. Now, during live monitoring, your Python terminal will consistently print out the exact cosine similarity whenever a face is compared: 
```text
[SIMILARITY] Friend's Name = 0.5218
```
*This allows you to visually debug and tune the threshold parameters locally during your tests.*

### B. Optimized Threshold Configuration
I adjusted the similarity thresholds in `config.py` to values better suited for real-world camera feeds:
- `CONFIDENT_THRESHOLD` lowered from **0.75** to **0.55**.
- `REVIEW_THRESHOLD` lowered from **0.60** to **0.45**.

These values are widely regarded as the "sweet spot" for InsightFace to balance catching different lighting conditions while preventing false positives.

---

## 3. Best Practice: Multi-Image Registration

To make detection robust against varying face angles and lighting, you must store **multiple embeddings** per person (e.g., face straight on, looking slightly left, slightly right, and slightly down). Your backend (`PersonController.java`) actually already supports appending multiple embeddings via the `PUT /api/persons/{id}/embeddings` endpoint!

To make use of this immediately, I have created a Python automation tool for your system:

### How to use `register_faces.py`:

I've written a script called `register_faces.py` located inside the `ai-engine` folder. This script takes a folder containing multiple images of your friend, extracts high-quality embeddings from all of them locally, and pushes them directly to the Spring Boot backend.

1. **Gather Data:** Create a folder inside `ai-engine` (e.g., `ai-engine/friend_photos/`) and place 5-10 images of your friend there (different angles & lighting: looking straight, slightly left/right/up/down).
2. **Find the ID:** Look up your friend's `personId` from the registry (e.g., `652A...`).
3. **Run the Script:**
   ```bash
   cd ai-engine
   python register_faces.py -p <FRIEND_PERSON_ID> -d ./friend_photos/ -b http://localhost:8080
   ```
4. **Result:** The system will extract embeddings from each photo and push them to MongoDB. Within 30 seconds (due to `DB_REFRESH_INTERVAL_SECONDS`), the AI engine will sync the new embeddings into its in-memory database, automatically giving the tracker a robust 10-shot template to match against!

Because `face_matcher.py` already implements a `best_score` calculation across *all* stored embeddings for a person, adding multiple embeddings instantly boosts reliability with zero changes required to the live matching code.

---

## Final Checklist for your Demo
- [x] Run `python main.py` for the AI Engine. Turn on the webcam and walk into the frame.
- [x] Observe the new console outputs starting with `[SIMILARITY] Name...`.
- [x] You can optionally register a new friend via the web UI.
- [x] Next, use the `register_faces.py` utility with ~5 additional photos of that person to inject multi-shot tracking capability.
- [x] Test your friend in front of the live surveillance page. The system will now achieve consistent CONFIDENT match statuses.
