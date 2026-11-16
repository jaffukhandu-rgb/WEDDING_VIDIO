# Wedding MP4 rendering service

The Vite frontend and the MP4 renderer run as separate processes.

## Local setup

1. Install project dependencies:

   ```bash
   npm install
   ```

2. Install the Chromium browser used by Playwright:

   ```bash
   npx playwright install chromium
   ```

3. Start the renderer in one terminal:

   ```bash
   npm run render:server
   ```

4. Start the website in a second terminal:

   ```bash
   npm run dev
   ```

Open the admin Video Editor and choose **Generate 30-second MP4**. The finished MP4 appears in the editor's video player.

## Renderer configuration

- `RENDER_HOST`: defaults to `127.0.0.1` for local-only access.
- `RENDER_PORT`: defaults to `4174`.
- `VITE_RENDER_API_URL`: optional frontend API base URL; defaults to `http://127.0.0.1:4174`.

For a deployed application, deploy this service to a host that supports persistent Node processes, Playwright Chromium and FFmpeg, then set `RENDER_HOST=0.0.0.0` and configure `VITE_RENDER_API_URL` to its HTTPS URL. Configure authentication and origin restrictions at the deployment layer before exposing the renderer publicly. The current project does not yet have admin authentication.

## Rendering limits

- Fixed output: 540 × 960 (9:16), 30 FPS, 30 seconds, H.264 MP4.
- One render runs at a time; HTML input is limited to 1 MB.
- Outbound network requests from the render browser are blocked for safety. Use embedded/data-URI images, fonts and media in the HTML.
- The renderer uses browser screenshots as video frames. Very complex pages may render slower than real time.
