# Missing Person Intelligence System (MPIS)

## Abstract

The Missing Person Intelligence System (MPIS) is a comprehensive AI-powered platform designed for real-time detection of registered missing persons in surveillance camera feeds. It integrates advanced face recognition, strict matching logic, robust quality validation, and multi-frame confirmation to ensure reliable operation in law enforcement and public safety environments. The system is composed of three main modules: AI Engine (Python), Backend (Java Spring Boot), and Frontend (React + Vite).

## Project Overview

- **Title:** Missing Person Intelligence System (MPIS)
- **Purpose:** Real-time detection and alerting for missing persons using CCTV and face recognition
- **Components:**
  - AI Engine: Face embedding extraction, quality filtering, matching logic
  - Backend: REST API, database, authentication, alert management
  - Frontend: Real-time dashboard, alert visualization, registry management
- **Key Features:**
  - Strict thresholds to prevent false matches
  - Multi-frame confirmation for robust alerts
  - Face quality checks (blur, pose, size)
  - Comprehensive logging and error handling
  - End-to-end validation and audit

---

# MPIS Project Directory Structure

```
missing-person-intelligence-system/
├── ai-engine/
│   ├── main.py
│   ├── requirements.txt
│   ├── pyrightconfig.json
│   ├── cctv/
│   │   └── cctv_stream.py
│   ├── core/
│   │   └── ai_pipeline.py
│   ├── matching/
│   │   ├── matcher.py
│   │   └── multi_frame_tracker.py
│   ├── policy/
│   │   └── confidence_policy.py
│   ├── runtime/
│   │   └── deduplication_cache.py
│   ├── sender/
│   │   └── backend_client.py
│   ├── tools/
│   │   ├── face_quality_checker.py
│   │   ├── real_world_validation.py
│   │   ├── regenerate_embeddings.py
│   │   └── verify_matches.py
│   ├── vision/
│   │   ├── face_detector.py
│   │   ├── deploy.prototxt
│   │   └── res10_300x300_ssd_iter_140000.caffemodel
│   └── __pycache__/
├── backend/
│   ├── pom.xml
│   ├── HELP.md
│   ├── CCTV.txt
│   ├── src/
│   │   ├── main/
│   │   │   ├── java/com/mpsystem/backend/
│   │   │   │   ├── ai/
│   │   │   │   ├── config/
│   │   │   │   ├── controller/
│   │   │   │   ├── dto/
│   │   │   │   ├── exception/
│   │   │   │   ├── model/
│   │   │   │   ├── repository/
│   │   │   │   ├── service/
│   │   │   │   ├── util/
│   │   │   │   └── BackendApplication.java
│   │   │   ├── resources/
│   │   │   │   ├── application.yml
│   │   │   │   ├── static/
│   │   │   │   └── templates/
│   │   └── test/
│   ├── target/
│   │   ├── classes/
│   │   ├── generated-sources/
│   │   ├── generated-test-sources/
│   │   ├── maven-status/
│   │   └── test-classes/
│   └── uploads/
├── frontend_run/
│   ├── package.json
│   ├── vite.config.js
│   ├── index.html
│   ├── src/
│   │   ├── api/
│   │   │   └── axios.js
│   │   ├── components/
│   │   │   ├── common/
│   │   │   ├── layout/
│   │   │   └── widgets/
│   │   ├── contexts/
│   │   ├── features/
│   │   ├── pages/
│   │   │   ├── Alerts.jsx
│   │   │   ├── Analytics.jsx
│   │   │   ├── Dashboard.jsx
│   │   │   ├── DeploymentMap.jsx
│   │   │   ├── ForensicMatch.jsx
│   │   │   ├── LiveAlerts.jsx
│   │   │   ├── Login.jsx
│   │   │   ├── OfficialCaseFile.jsx
│   │   │   ├── RegisterCase.jsx
│   │   │   ├── Registry.jsx
│   │   │   └── SystemStatus.jsx
│   │   ├── services/
│   │   │   └── WebSocketService.js
│   │   ├── utils/
│   │   │   └── toast.js
│   │   ├── App.jsx
│   │   ├── main.jsx
│   │   └── index.css
│   └── dist/
├── embeddings_check.json
├── result.md
└── MPIS_Documentation.md
```

---

# MPIS AI Engine (Python)

### main.py
```python
"""
MPIS – AI Engine (Redesigned)
------------------------------
Stateless face embedding extraction service.
Uses dlib ResNet model for true 128-dimensional face embeddings.

CRITICAL REQUIREMENTS:
- All embeddings MUST be L2 normalized
- Supports both full frames with face detection and pre-cropped faces
- Minimum face size: 80px
"""

from flask import Flask, request, jsonify
from werkzeug.exceptions import HTTPException
import cv2
import numpy as np
import logging
import os
from datetime import datetime
import face_recognition
from typing import Optional, Tuple

from vision.face_detector import FaceDetector

# ...existing code...
```

### cctv_stream.py
```python
"""
MPIS CCTV Stream - Redesigned Face Recognition Pipeline
========================================================

CRITICAL REQUIREMENTS:
1. Only CONFIDENT_MATCH triggers multi-frame tracking
2. Only multi-frame CONFIRMED matches trigger alerts
3. UNCERTAIN_MATCH and NO_MATCH NEVER trigger alerts

Features:
- Real embeddings from backend database
- Multi-embedding support per person
- Alert cooldown per person (prevents spam)
- Enhanced face preprocessing
- Detailed debug logging (required format)

Author: MPIS AI Team
Version: 2.0.0 (Redesigned)
"""

import cv2
import requests
import time
import numpy as np
import threading
from flask import Flask, Response
from flask_cors import CORS
import os
import logging
from typing import Optional, Dict, Any

# ...existing code...
```

### matcher.py
```python
"""
MPIS Face Matcher - Redesigned for Accuracy
============================================

Features:
- Multiple embeddings per person support
- Strict decision rules (NO false positives)
- UNCERTAIN_MATCH detection for close scores
- Detailed debugging logs

DECISION RULES:
    Case 1: best_similarity < SIMILARITY_THRESHOLD → NO_MATCH
    Case 2: (best - second_best) < UNCERTAINTY_MARGIN → UNCERTAIN_MATCH
    Case 3: best >= threshold AND gap >= margin → CONFIDENT_MATCH

Author: MPIS AI Team
Version: 2.0.0 (Redesigned)
"""

import numpy as np
import logging
from typing import Optional, Dict, Any, List

# ...existing code...
```

### multi_frame_tracker.py
```python
"""
MPIS Multi-Frame Tracker - Production Grade (Redesigned)
=========================================================

Ensures alerts are ONLY triggered when the SAME person is detected
for N consecutive frames within a time window.

CRITICAL REQUIREMENTS:
- REQUIRED_CONSECUTIVE_FRAMES = 3
- TIME_WINDOW_SECONDS = 2.0
- Identity change between frames RESETS the tracker
- Average similarity must be >= threshold

This is a critical safety layer to prevent single-frame misidentifications.

Author: MPIS AI Team
Version: 2.0.0 (Redesigned)
"""

import time
import logging
from collections import deque
from typing import Optional, Dict, Any

# ...existing code...
```

### face_quality_checker.py
```python
import cv2
import numpy as np

class FaceQualityChecker:
    def __init__(self, min_size=80, blur_threshold=100, pose_threshold=30):
        self.min_size = min_size
        self.blur_threshold = blur_threshold
        self.pose_threshold = pose_threshold

    def check_size(self, face_bbox):
        x, y, w, h = face_bbox
        if w < self.min_size or h < self.min_size:
            return False, 'SIZE', f'{w}x{h}'
        return True, None, None

    def check_blur(self, face_img):
        gray = cv2.cvtColor(face_img, cv2.COLOR_BGR2GRAY)
        blur_score = cv2.Laplacian(gray, cv2.CV_64F).var()
        if blur_score < self.blur_threshold:
            return False, 'BLUR', blur_score
        return True, None, blur_score

    def check_pose(self, landmarks):
        # landmarks: dict with keys 'yaw', 'pitch', 'roll'
        yaw = landmarks.get('yaw', 0)
        if abs(yaw) > self.pose_threshold:
            return False, 'EXTREME_POSE', yaw
        return True, None, yaw

    def check(self, face_img, face_bbox, landmarks):
        # Check size
        size_ok, reason, detail = self.check_size(face_bbox)
        if not size_ok:
            return False, reason, detail
        # Check blur
        blur_ok, reason, blur_score = self.check_blur(face_img)
        if not blur_ok:
            return False, reason, blur_score
        # Check pose
        pose_ok, reason, yaw = self.check_pose(landmarks)
        if not pose_ok:
            return False, reason, yaw
        return True, 'OK', {'blur_score': blur_score, 'yaw': yaw}
```

### regenerate_embeddings.py
```python
"""
MPIS Embedding Regeneration Tool
--------------------------------
Regenerates face embeddings for all registered persons in the system.

This script:
1. Fetches all registered persons from the backend API
2. Downloads or decodes their image data
3. Sends each image to the AI engine /extract-embedding endpoint
4. Generates 5 embeddings per person using image augmentation
5. Stores the normalized embeddings in the backend database

USAGE:
    python regenerate_embeddings.py

REQUIREMENTS:
    - Backend server must be running at BACKEND_API_URL
    - AI Engine must be running at AI_ENGINE_URL
"""

import cv2
import requests
import numpy as np
import os
import sys
import base64
from io import BytesIO
import time

# ...existing code...
```

### verify_matches.py
```python
"""
MPIS Verification Test Suite
=============================

This script verifies the face recognition system meets the strict requirements:

Test 1 — Correct Match:
    Show Durga Prasad in camera
    Expected:
        - Durga similarity > 0.75
        - Other persons < 0.55
        - Decision → CONFIDENT_MATCH

Test 2 — Non Matching Person:
    Show an unregistered face
    Expected:
        - All similarities < threshold
        - Decision → NO_MATCH

Test 3 — Similar Faces:
    If two identities have similar scores
    Example:
        - Durga 0.71
        - Chandu 0.68
    Expected:
        - gap < 0.10
        - Decision → UNCERTAIN_MATCH
        - No alert must be triggered

USAGE:
    python verify_matches.py

The test uses synthetic embeddings to simulate the scenarios without
requiring actual image processing.

Author: MPIS AI Team
Version: 2.0.0
"""

import numpy as np
import sys
import os
import logging
import time

# ...existing code...
```

---

# MPIS Backend (Java Spring Boot)

### BackendApplication.java
```java
package com.mpsystem.backend;

import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.scheduling.annotation.EnableAsync;
import org.springframework.scheduling.annotation.EnableScheduling;

@EnableAsync
@EnableScheduling
@SpringBootApplication
public class BackendApplication {

    public static void main(String[] args) {
        SpringApplication.run(BackendApplication.class, args);
    }
}
```

### application.yml
```yaml
spring:
  application:
    name: backend
  data:
    mongodb:
      uri: mongodb://localhost:27017/mpis_db
  servlet:
    multipart:
      enabled: true
      max-file-size: 10MB
      max-request-size: 10MB

server:
  port: 8080

# Demo Mode Config
otp:
  demo-mode: true
  expiration-seconds: 130

# MPIS Production Observability
management:
  endpoints:
    web:
      exposure:
        include: health,info,prometheus
  endpoint:
    health:
      show-details: ALWAYS
    prometheus:
      enabled: true

# Centralized Business Logic Configuration
mpis:
  ai:
    # Must match AI Engine SIMILARITY_THRESHOLD (0.65)
    similarity-threshold: 0.65
  cache:
    dedup-window-seconds: 5
  jwt:
    # PRODUCTION: Use environment variable MPIS_JWT_SECRET
    # Current value is for development only
    secret: "${MPIS_JWT_SECRET:abcefg1234567890mnopqrstuvwxyzABCEFG1234567890MNOPQRS}"
    expiration-ms: 86400000  # 24 hours
```

---

# MPIS Frontend (React + Vite)

### App.jsx
```jsx
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import Layout from './components/layout/Layout';
import Login from './pages/Login';
import Dashboard from './pages/Dashboard';
import RegisterCase from './pages/RegisterCase';
import Registry from './pages/Registry';
import Alerts from './pages/Alerts';
import LiveAlerts from './pages/LiveAlerts';
import SystemStatus from './pages/SystemStatus';
import ForensicMatch from './pages/ForensicMatch';
import Analytics from './pages/Analytics';
import DeploymentMap from './pages/DeploymentMap';
import OfficialCaseFile from './pages/OfficialCaseFile';
import Protection from './components/common/Protection';
import ToastContainer from './components/common/ToastContainer';
import ErrorBoundary from './components/common/ErrorBoundary';

function App() {
    return (
        <ErrorBoundary>
            <Router>
                <ToastContainer />
                <Routes>
                    <Route path="/login" element={<Login />} />
                    {/* Case File Page - Protected but standalone (no Layout) */}
                    <Route path="/case-file" element={<Protection><OfficialCaseFile /></Protection>} />
                    <Route element={<Protection><Layout /></Protection>}>
                        <Route path="/" element={<Navigate to="/dashboard" replace />} />
                        <Route path="/dashboard" element={<Dashboard />} />
                        <Route path="/register" element={<RegisterCase />} />
                        <Route path="/registry" element={<Registry />} />
                        <Route path="/alerts" element={<Alerts />} />
                        <Route path="/live" element={<LiveAlerts />} />
                        <Route path="/forensic" element={<ForensicMatch />} />
                        <Route path="/analytics" element={<Analytics />} />
                        <Route path="/map" element={<DeploymentMap />} />
                        <Route path="/status" element={<SystemStatus />} />
                    </Route>
                    <Route path="*" element={<Navigate to="/login" replace />} />
                </Routes>
            </Router>
        </ErrorBoundary>
    );
}

export default App;
```

### axios.js
```js
import axios from 'axios';
import toast from '../utils/toast';

/**
 * MPIS API Client - Production Grade
 * 
 * Features:
 * - Environment-aware base URL
 * - Proper token handling (standard Authorization header only)
 * - Comprehensive error handling
 * - WebSocket disconnect on 401
 */

// Use environment variable or default to proxy
const getBaseUrl = () => {
    if (import.meta.env?.VITE_API_URL) {
        return import.meta.env.VITE_API_URL;
    }
    // Vite proxy handles /api in development
    return '/api';
};

const api = axios.create({
    baseURL: getBaseUrl(),
    headers: {
        'Content-Type': 'application/json',
    },
    timeout: 30000, // 30 second timeout
});

// Request interceptor - add auth token
api.interceptors.request.use(
    (config) => {
        const token = localStorage.getItem('token');
        if (token) {
            // Use only standard Authorization header
            config.headers.Authorization = `Bearer ${token}`;
        }
        return config;
    },
    (error) => Promise.reject(error)
);

// Response interceptor - handle errors
api.interceptors.response.use(
    (response) => response,
    async (error) => {
        if (!error.response) {
            // Network error or timeout
            toast.error("Network error. Please check your connection.");
            return Promise.reject(error);
        }
        
        const { status, data } = error.response;
        const message = data?.message || "An unexpected error occurred.";

        switch (status) {
            case 400:
                // Bad Request - validation errors
                toast.error(`Error: ${message}`);
                break;
                
            case 401:
                // Unauthorized - session expired
                toast.warn("Session expired. Please login again.");
                localStorage.removeItem('token');
                localStorage.removeItem('user');
                
                // Disconnect WebSocket before redirect
                try {
                    const { default: webSocketService } = await import('../services/WebSocketService');
                    webSocketService.disconnect();
                } catch (e) {
                    console.warn('Could not disconnect WebSocket:', e);
                }
                
                // Redirect to login
                window.location.href = '/login';
                break;
                
            case 403:
                // Forbidden
                toast.error("Access denied. You do not have permission.");
                break;
                
            case 404:
                // Not Found
                toast.error("Resource not found.");
                break;
                
            case 408:
                // Request Timeout
                toast.error("Request timed out. Please try again.");
                break;
                
            case 429:
                // Too Many Requests
                toast.warn("Too many requests. Please wait a moment.");
                break;
                
            case 500:
                // Server Error
                toast.error("Server error. Please try again later.");
                break;
                
            case 502:
            case 503:
            case 504:
                // Gateway errors
                toast.error("Service temporarily unavailable. Please try again.");
                break;
                
            default:
                toast.error(`Error: ${message}`);
        }
        
        return Promise.reject(error);
    }
);

export default api;
```

### WebSocketService.js
```js
import { Client } from '@stomp/stompjs';
import SockJS from 'sockjs-client';

/**
 * MPIS WebSocket Service - Production Grade
 * 
 * Features:
 * - Environment-aware URL configuration
 * - Exponential backoff for reconnection
 * - Proper subscription management on reconnect
 * - Connection timeout handling
 * - Graceful cleanup
 */

// ...existing code...
```

### Alerts.jsx
```jsx
import React, { useState, useEffect } from 'react';
import { Search, Filter, Eye, Download, ChevronLeft, ChevronRight, Calendar, Bell, Shield, Camera, Clock, AlertTriangle, CheckCircle2, Target, Zap, MapPin, Printer, FileText, Radio, X, Siren, TrendingUp, Video, BadgeAlert, Activity, ScanFace, User } from 'lucide-react';
import api from '../api/axios';

const Alerts = () => {
    // ...existing code...
}

export default Alerts;
```

### Dashboard.jsx
```jsx
import React, { useState, useEffect, useRef } from 'react';
import { Users, AlertTriangle, Video, Activity, Globe, Shield, Radio, Cpu, HardDrive, AlertOctagon, Info, Target } from 'lucide-react';

// ...existing code...
```