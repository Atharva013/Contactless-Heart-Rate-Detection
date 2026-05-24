# PulseGuard: Camera-Based Heart Rate and Stress Monitoring

PulseGuard extracts heart rate, heart rate variability, and cardiac stress indicators from phone or webcam video. It supports two app modes:

- **Finger pulse scan**: fingertip over rear camera + flashlight for the strongest BPM signal.
- **Face scan**: contactless rPPG from facial skin color changes, with visual triage fallback when signal quality is poor.

This project is intended for wellness, education, and triage-assistance experiments. It is **not a medical device** and should not replace professional medical evaluation.

## Core Capabilities

- **Heart Rate (BPM)** extraction from 30-second facial video or live webcam
- **Finger PPG BPM** using phone rear camera and flashlight
- **Inter-Beat Interval (IBI)** waveform visualization
- **HRV Metrics**: RMSSD, SDNN, pNN50, LF/HF ratio
- **Stress Classification**: three-tier (Low / Moderate / High) based on HRV feature analysis
- **Signal Quality Index (SQI)**: composite confidence score that suppresses output when the measurement is unreliable
- **Multi-ROI Adaptive Fusion**: independent signal extraction from forehead and both cheeks, weighted by per-region quality
- **Expo mobile app** with email auth, local fallback history, and optional Supabase patient-record sync

## Architecture Overview

```
Video Input --> Face Mesh Detection --> Multi-ROI Green Channel Extraction
    --> POS + CHROM Signal Processing --> Ensemble Fusion (SNR-weighted)
    --> Signal Quality Assessment --> BPM / IBI Extraction
    --> HRV Analysis --> Stress Classification --> Dashboard Output
```

The pipeline is modular: each stage communicates through well-defined data structures (see `src/models.py`) and can be developed, tested, and replaced independently.

## Project Structure

```
src/
    models.py               Shared data structures used across all modules
    roi_extractor.py         Face detection and multi-ROI green channel extraction
    signal_processor.py      POS and CHROM rPPG algorithms with bandpass filtering
    ensemble.py              Multi-algorithm, multi-ROI weighted signal fusion
    sqi_engine.py            Signal quality scoring (SNR, kurtosis, spectral purity)
    hrv_analyzer.py          HRV metric computation from IBI data
    stress_classifier.py     Stress level classification from HRV features
    api/
        main.py              FastAPI server with video upload and analysis endpoints

frontend/
    index.html               Dashboard layout
    style.css                Styling and visual design
    app.js                   Client logic, API calls, chart rendering

PulseGuardApp/
    App.js                    Expo app navigation and auth gate
    src/screens/             Auth, home, camera, finger pulse, and results screens
    src/services/            API, auth, Supabase, patient-record, and triage clients
    .env.example             Mobile app environment variables

tests/
    unit/                    Per-module unit tests
    api/                     API endpoint contract tests
    integration/             End-to-end pipeline tests
    fixtures/                Test data (synthetic signals, sample frames)

docs/modules/               Detailed development guide per module
scripts/                    Utility scripts (video recording, data prep)
demo_videos/                Pre-recorded clips for demo and testing
notebooks/                  Exploratory analysis and prototyping
```

## Backend Quick Start

### Prerequisites

- Python 3.9+
- pip
- A webcam or a pre-recorded face video (30 seconds, 30fps preferred)

### Installation

```bash
git clone https://github.com/Priyank-Adhav/Contactless-Heart-Rate-Detection.git
cd Contactless-Heart-Rate-Detection

python -m venv venv
source venv/bin/activate        # Linux/Mac
# venv\Scripts\activate         # Windows

pip install -r requirements.txt
pip install -r requirements-dev.txt   # for testing
```

### Running the Server

```bash
uvicorn src.api.main:app --reload --host 0.0.0.0 --port 8000
```

Then open `http://localhost:8000` in your browser.

## Mobile App Quick Start

Use Node **20.19.4 or newer** for Expo SDK 54 / React Native 0.81.

```bash
cd PulseGuardApp
npm install
cp .env.example .env
```

Edit `PulseGuardApp/.env`:

```bash
EXPO_PUBLIC_API_BASE_URL=http://YOUR_COMPUTER_LAN_IP:8000
EXPO_PUBLIC_SUPABASE_URL=https://YOUR_PROJECT.supabase.co
EXPO_PUBLIC_SUPABASE_ANON_KEY=YOUR_SUPABASE_ANON_KEY
```

For local testing, your phone and laptop must be on the same Wi-Fi network, and the backend must run with `--host 0.0.0.0`.

```bash
npm start
```

Scan the Expo QR code with Expo Go.

## Email Auth and Patient Records

PulseGuard uses Supabase for email/password auth and secure scan history. If Supabase env values are missing, the app still runs in local demo mode, but records stay only on the device.

1. Create a Supabase project.
2. In Supabase Auth, enable Email provider.
3. Copy the Project URL and anon key into `PulseGuardApp/.env`.
4. Run the SQL in [`docs/app/supabase_setup.sql`](docs/app/supabase_setup.sql) in Supabase SQL Editor.

The SQL enables row-level security so users can read, insert, and delete only their own scan records.

## Building an APK

```bash
cd PulseGuardApp
npm install -g eas-cli
eas login
eas build --platform android --profile preview
```

Share the generated APK link from Expo/EAS for GitHub or Reddit testers. Keep the backend URL reachable from testers; for public testing, deploy the FastAPI backend to a stable host instead of using a private LAN IP.

### Running Tests

```bash
# All tests
pytest tests/ -v

# Unit tests only (fast)
pytest tests/unit/ -v

# With coverage report
pytest tests/ -v --cov=src --cov-report=term-missing
```

## Module Documentation

Each module has a dedicated development guide in `docs/modules/`:

| Module | Guide | Owner |
|--------|-------|-------|
| ROI Extraction | [01_roi_extraction.md](docs/modules/01_roi_extraction.md) | P1 |
| Signal Processing | [02_signal_processing.md](docs/modules/02_signal_processing.md) | P2 |
| Signal Quality | [03_sqi_engine.md](docs/modules/03_sqi_engine.md) | P1 |
| HRV Analysis | [04_hrv_analysis.md](docs/modules/04_hrv_analysis.md) | P3 |
| Stress Classification | [05_stress_classification.md](docs/modules/05_stress_classification.md) | P3 |
| API Server | [06_api_server.md](docs/modules/06_api_server.md) | P3 |
| Frontend Dashboard | [07_frontend_dashboard.md](docs/modules/07_frontend_dashboard.md) | P4 |

## Signal Processing Approach

PulseGuard uses an ensemble of two established rPPG methods:

- **POS (Plane Orthogonal to Skin)**: projects RGB channels onto a plane orthogonal to the skin-tone direction, effectively isolating the blood volume pulse from motion and illumination artifacts.
- **CHROM (Chrominance-based)**: uses a chrominance model to separate the pulsatile component from specular reflections and ambient light variation.

Both methods run independently on each of three facial ROIs (forehead, left cheek, right cheek), producing six candidate signals. These are fused using SNR-weighted averaging, where each candidate's contribution is proportional to its measured signal quality.

## Signal Quality Index

The SQI engine computes a composite score from three metrics:

| Metric | Weight | Purpose |
|--------|--------|---------|
| Spectral SNR | 0.50 | Ratio of cardiac-band power to total signal power |
| Kurtosis | 0.25 | Detects non-physiological amplitude distributions |
| Spectral Purity | 0.25 | Penalizes broad, noisy frequency peaks |

When the composite score drops below a threshold, the system suppresses BPM output entirely and displays a quality warning. This prevents the system from presenting unreliable measurements as valid readings.

## Tech Stack

| Layer | Technology | Rationale |
|-------|-----------|-----------|
| Face Detection | MediaPipe Face Mesh | 468 landmarks, robust across angles and skin tones |
| Image Processing | OpenCV | Standard, well-documented |
| Signal Processing | SciPy, NumPy | FFT, filtering, peak detection |
| HRV Analysis | SciPy + NumPy | IBI cleaning, time-domain HRV, Lomb-Scargle LF/HF |
| Web Server | FastAPI + Uvicorn | Async support, automatic OpenAPI docs |
| Frontend | HTML / CSS / JavaScript | No build step, full design control |
| Mobile App | Expo + React Native | Android/iOS testing through Expo Go and EAS APK builds |
| App Auth/DB | Supabase | Email auth plus row-level secured patient records |
| Charts | Chart.js | Lightweight, good waveform rendering |
| Testing | pytest | Industry standard |

## Release Checklist

- Run `pytest tests/ -v`.
- Run `cd PulseGuardApp && npm start` on Node 20.19.4+ and test finger scan, face scan, upload, auth, and history.
- Confirm `EXPO_PUBLIC_API_BASE_URL` points to a reachable backend.
- Confirm Supabase RLS policies are enabled before storing real patient records.
- Keep the disclaimer visible: PulseGuard is not a medical device.

## References

- Wang, W., den Brinker, A. C., Stuijk, S., & de Haan, G. (2017). Algorithmic Principles of Remote PPG. IEEE TBME.
- de Haan, G., & Jeanne, V. (2013). Robust Pulse Rate from Chrominance-Based rPPG. IEEE TBME.
- Boccignone, G., et al. (2022). pyVHR: a Python framework for remote photoplethysmography. PeerJ Computer Science.
- Makowski, D., et al. (2021). NeuroKit2: A Python toolbox for neurophysiological signal processing.

## License

MIT License. See [LICENSE](LICENSE) for details.
