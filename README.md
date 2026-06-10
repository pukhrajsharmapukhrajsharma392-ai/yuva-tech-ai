# 🎯 Yuva Tracking Thorn

[![Live Deployment](https://img.shields.io/badge/Live-Deployment-success?style=for-the-badge&logo=vercel)](https://yuvatrackingthorn.online)
[![HTML5](https://img.shields.io/badge/HTML5-E34F26?style=for-the-badge&logo=html5&logoColor=white)]()
[![JavaScript](https://img.shields.io/badge/JavaScript-F7DF1E?style=for-the-badge&logo=javascript&logoColor=black)]()

**Yuva Tracking Thorn** is a high-performance, web-based computer vision application featuring real-time simultaneous face and hand tracking. It boasts a premium, dark-themed sci-fi dashboard with dynamic visual effects and a fluid animation smoothing system.

---

## 🌟 Key Features

* **Real-Time Tracking:** Uses MediaPipe Holistic for simultaneous detection and tracking of facial landmarks and hand joints.
* **Fluid Animation Smoothing (EMA):** Custom Exponential Moving Average (EMA) algorithm predicts and smooths raw landmark data, creating continuous, jelly-like motion for tracking lines.
* **Sci-Fi Cyberpunk UI:** A complete UI overhaul featuring animated scanlines over the camera feed, active side-panel telemetry dashboards, a rotating radar overlay, and dynamic status readouts.
* **Dynamic Neon Visuals:** Accurate neon green (`#00ff00`) connectors are drawn over the face mesh and hand joints with intense shadow blur effects to create a true neon glow.
* **Camera Controls:** Built-in controls for flipping the camera feed and a header button to manually decouple face mesh rendering while continuing to track hand coordinates.
* **Screen Recording:** Capture the interactive canvas output and download it locally.
* **Mobile-First & Full-Screen:** Designed to provide a seamless, full-screen mobile experience.

## 🚀 Live Demo

Experience the application live:
[https://yuvatrackingthorn.online](https://yuvatrackingthorn.online)

## 🛠️ Technology Stack

* **Frontend:** HTML5, CSS3, Vanilla JavaScript
* **Computer Vision:** [MediaPipe Holistic](https://google.github.io/mediapipe/solutions/holistic)
* **Rendering:** HTML5 Canvas API
* **Deployment:** Vercel

## 💻 Local Setup

1. **Clone the repository:**
   ```bash
   git clone https://github.com/pukhrajsharmapukhrajsharma392-ai/yuva-tech-ai.git
   ```
2. **Navigate to the directory:**
   ```bash
   cd yuva-tech-ai
   ```
3. **Run a local server:**
   Since this project uses ES modules or requires fetching external resources (MediaPipe models), it needs to be served over HTTP/HTTPS rather than just opening the `index.html` file.
   
   Using Python 3:
   ```bash
   python -m http.server 8000
   ```
   Or using Node.js (`http-server`):
   ```bash
   npx http-server .
   ```
4. **Open in browser:**
   Navigate to `http://localhost:8000`

> **Note:** Please allow camera permissions when prompted by your browser to enable the tracking features.

## 📄 License

This project is open-source and available under the [MIT License](LICENSE).
