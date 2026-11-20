# Code template publishing and MP4 export

This system extends the existing HTML/CSS/JS Admin preparation studio. Use only the approved project branch: `feature/wedding-vintage-storybook`.

## Requirements

- Node.js 22+ and npm
- MongoDB Atlas or a local MongoDB server (database credentials are server-side)
- Playwright Chromium (for HTML animation screenshots)
- FFmpeg is supplied by the existing `ffmpeg-static` dependency

## Run locally

1. Install packages with `npm install`.
2. Install the Playwright browser with `npx playwright install chromium`.
3. Copy `.env.example` to `.env` and fill in your real MongoDB URI and private Admin key.
   Generate a strong key with:
   `node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"`
4. In one terminal, run `npm run render:server:env` to start the Express API at `http://127.0.0.1:4174`.
5. In another terminal, run `npm run dev` to start Vite.
6. Open `http://localhost:5173/admin.html`, paste the template, Analyze, Preview, complete the visual review checkbox, and Generate MP4.
7. If the MP4 is valid, choose **Choose category & publish**, select Wedding / Festival / Birthday / Engagement / Anniversary / Baby Shower / Corporate, and publish. The original HTML and generated field map are saved in MongoDB.
8. On the customer home page, select the same occasion to see and preview published templates.

**Important:** The Admin access key is entered into the browser for privileged publish/export requests. Do not share it. The key is not stored in localStorage. Admin page navigation itself is not an authentication boundary.

## Configuration

- `MONGODB_URI`: required for publishing and browsing templates; never expose to Vite or the client.
- `MONGODB_DB_NAME`: optional, defaults to `wedding_video_maker`.
- `ADMIN_API_KEY`: required for raw HTML MP4 rendering and publishing; at least 24 UTF-8 bytes.
- `RENDER_HOST`: defaults to `127.0.0.1`; do not expose a raw HTML rendering endpoint to the public internet.
- `RENDER_PORT`: defaults to `4174`.
- `FRONTEND_ORIGIN`: allowed frontend origin for browser CORS.
- `VITE_RENDER_API_URL`: optional public API base URL for the frontend; default `http://127.0.0.1:4174` for local development.

MongoDB stores published template code, category, schema and metadata only. Sample preview photos/music are not persisted from the Admin form. Rendering uses temporary files deleted after each request.

## Security and deployment limits

The current workflow is a **development/admin prototype**, not a production multi-user service. It requires server credentials and real infrastructure before requests can reach MongoDB. Publishing access is protected by an API key; there is no per-user login, subscription/payment check, customer rate limiting or production-grade sandboxing of arbitrary HTML/JavaScript. Keep the renderer bound to loopback or behind a trusted private gateway.

The Playwright renderer blocks outbound network requests but **this alone is not sufficient isolation for hostile code**. In production, render only approved templates in a separately sandboxed/containerized process with strict CPU, memory and filesystem limits. Run before-and-after tests of the complete film, fonts, photos, audio synchronization and MP4 frame timing. Static validation and the browser smoke test do not prove final render fidelity.

Customer-side template discovery and sandboxed sample preview are supported. Customer editing and unprivileged customer MP4 requests remain out of scope until authentication, quotas and resource isolation are implemented.

## Checks

- `npm run test` for the Node regression tests.
- `npm run build` for the Vite production bundle.
- `GET /api/health` checks that the API responds and whether MongoDB/Admin configuration *exists*; it does not prove the database is connected.
- Test the UI at both desktop and mobile widths, and manually inspect the exported MP4. There is no live MongoDB connection in repository source control.
