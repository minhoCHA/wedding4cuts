# Project Overview
**Name:** Live Motion 4-Cut Photo Booth (Web Application)
**Target Device:** iPad Pro (Kiosk mode/Safari Browser), Landscape/Portrait responsive.
**Core Concept:** A digital photo booth web app for a wedding event. Instead of capturing 4 static photos, it captures 4 short video clips (2-3 seconds each). It composites these moving clips into a 2x2 grid behind a fixed transparent PNG frame. Users can print the static version directly or scan a QR code to download either the static image or the moving video to their mobile devices.

# Tech Stack Requirement
*   **Framework:** Next.js (React) / TypeScript
*   **Styling:** Tailwind CSS
*   **Backend/Storage:** Supabase (Database & Storage) for uploading assets and serving mobile download pages.
*   **Core Web APIs:** `MediaDevices.getUserMedia`, `MediaRecorder` (for capturing clips), HTML5 `<canvas>` (for composing static/moving frames), `window.print()` (for AirPrint).
*   **Libraries:** `qrcode.react` (for QR generation). (Optional: `ffmpeg.wasm` if complex video encoding is needed, but prefer Canvas recording).

# Global Variables & Default Assets
*   **Default Frame Overlay:** A transparent PNG file overlaying the 2x2 grid.
*   **Default Text on Frame:** "Minho & Claire | October 17, 2026 | Samcheonggak" (This should be visually integrated into the frame or laid over via CSS/Canvas).

# View 1: Capture Screen (Simplified UI)
**Goal:** Clean interface, foolproof for guests.
*   **Video Feed:** Fullscreen or large container displaying the real-time webcam feed.
*   **UI Elements (Only 3):**
    1.  **Camera Switch Toggle:** Button to switch between `user` (front) and `environment` (back) cameras using `enumerateDevices`.
    2.  **Timer Selector:** A simple toggle/dropdown for 3s, 5s, or 10s countdown.
    3.  **"Shoot Now" Button:** A prominent button to start the sequence.
*   **Capture Logic (Crucial):**
    *   When "Shoot Now" is clicked, initiate a sequence of 4 captures.
    *   For each capture: Run the countdown, then use `MediaRecorder` to record a 2-second video clip of the stream.
    *   Store the 4 recorded Blob/URL objects in the React state.

# View 2: Result & Edit Screen (Simplified UI)
**Goal:** Review the motion 4-cut and provide final actions. No unnecessary social/premium buttons.
*   **Display:** 
    *   Show the 4 recorded video clips playing simultaneously on a loop in a 2x2 grid.
    *   The "Minho & Claire | Samcheonggak" PNG frame is overlaid on top of the looping videos.
*   **Filter UI:**
    *   A row of circular thumbnails to apply CSS filters (e.g., Grayscale, Sepia, Vintage, Bright).
    *   Clicking a filter applies the CSS filter to all 4 video elements in real-time.
*   **Action Buttons (Only 2, fixed at the bottom):**
    1.  **"Print" Button:** 
        *   Takes the first frame of each of the 4 videos, draws them onto an off-screen HTML5 `<canvas>` along with the PNG frame and applied filters.
        *   Calls `window.print()` so the iPad can send it to the local AirPrint photo printer.
    2.  **"QR Code" Button:**
        *   Uploads the 4 video blobs and the selected filter metadata to Supabase Storage.
        *   Generates a unique record ID and constructs a URL (e.g., `https://[app-domain]/download/[id]`).
        *   Displays a Modal with the generated QR code (`qrcode.react`) of that URL.

# View 3: Mobile Download Page (Accessed via QR)
**Goal:** The webpage the guest opens on their personal smartphone after scanning the QR.
*   **Retrieval:** Fetches the 4 video clips and metadata from Supabase based on the ID in the URL.
*   **Display:** Renders the looping motion 4-cut with the frame on the mobile browser.
*   **Action Buttons:**
    1.  **"Download Photo (JPG/PNG)":** Uses a Canvas to composite the first frames of the clips + the overlay frame into a single static high-res image. Triggers a browser download.
    2.  **"Download Video (MP4/GIF)":** 
        *   Implementation idea: Draw the 4 looping videos onto a hidden `<canvas>` per frame request (requestAnimationFrame), draw the PNG frame on top, and use `MediaRecorder` on the canvas stream (`canvas.captureStream()`) to record a 3-second final composite video.
        *   Provide the resulting Blob as a downloadable MP4/WebM file.

# Initial Prompts for Copilot / Developer Instructions
1.  **Phase 1:** Please generate the boilerplate Next.js structure and Tailwind configuration. Set up the Supabase client connection.
2.  **Phase 2:** Create the `CaptureScreen` component. Implement the WebRTC camera stream, the front/back camera toggle, and the sequence logic to record four separate 2-second video clips using `MediaRecorder`.
3.  **Phase 3:** Create the `ResultScreen` component. Display the 4 video clips in a grid behind a transparent frame overlay. Implement the CSS filters logic and the `window.print()` functionality for the static canvas.
4.  **Phase 4:** Implement the Supabase upload logic, QR code modal, and the dynamic route (`/download/[id]`) for the mobile client.