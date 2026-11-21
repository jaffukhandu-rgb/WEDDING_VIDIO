import { useEffect, useMemo, useState } from "react";
import { Player } from "@remotion/player";
import { WeddingTemplateMotionPreview } from "./WeddingTemplateMotionPreview.jsx";
import { VintageStorybookMotionPreview } from "./VintageStorybookMotionPreview.jsx";
import { WeddingMediaUploadControls } from "./WeddingMediaUploadControls.jsx";
import { VideoRenderPanel } from "./VideoRenderPanel.jsx";
import { buildRoyalPalaceInvitationHtml, createRoyalPalaceDefaultMusicDataUrl } from "../templates/royalPalaceInvitation.js";
import {
  WEDDING_VIDEO_DURATION_FRAMES,
  WEDDING_VIDEO_FPS,
} from "../data/weddingVideoConfig.js";

const fieldStyle = {
  width: "100%",
  boxSizing: "border-box",
  minHeight: 44,
  padding: "11px 13px",
  border: "1px solid rgba(201,170,108,.28)",
  borderRadius: 8,
  background: "#111213",
  color: "#f6f3ec",
  font: "inherit",
};

const labelStyle = {
  display: "grid",
  gap: 7,
  color: "#c9aa6c",
  fontSize: 12,
  fontWeight: 600,
};


async function imageUrlToDataUrl(url) {
  if (!url) return "";
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not read the selected photo.");
  const bitmap = await createImageBitmap(await response.blob());
  const scale = Math.min(1, 900 / Math.max(bitmap.width, bitmap.height));
  const canvas = document.createElement("canvas");
  canvas.width = Math.max(1, Math.round(bitmap.width * scale));
  canvas.height = Math.max(1, Math.round(bitmap.height * scale));
  canvas.getContext("2d").drawImage(bitmap, 0, 0, canvas.width, canvas.height);
  bitmap.close?.();
  return canvas.toDataURL("image/jpeg", 0.82);
}

async function audioUrlToDataUrl(url) {
  if (!url) return createRoyalPalaceDefaultMusicDataUrl();
  const response = await fetch(url);
  if (!response.ok) throw new Error("Could not read the selected music.");
  const blob = await response.blob();
  if (blob.size > 8 * 1024 * 1024) throw new Error("Music files must be 8 MB or smaller for MP4 export.");
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(String(reader.result || ""));
    reader.onerror = () => reject(new Error("Could not prepare the selected music."));
    reader.readAsDataURL(blob);
  });
}

export function WeddingEventDetailsEditor({ template, details, onDetailsChange }) {
  const [saved, setSaved] = useState(false);
  const [media, setMedia] = useState({ photos: [], videos: [], musicUrl: "" });
  const [royalPhotoDataUrl, setRoyalPhotoDataUrl] = useState("");
  const [royalMusicDataUrl, setRoyalMusicDataUrl] = useState("");
  const [royalMediaError, setRoyalMediaError] = useState("");
  const isRoyalPalaceTemplate = template.styleId === "royal" || template.compositionId === "royal-palace-html";

  const updateField = (event) => {
    const { name, value } = event.target;
    onDetailsChange((current) => ({ ...current, [name]: value }));
    setSaved(false);
  };

  const handleSubmit = (event) => {
    event.preventDefault();
    setSaved(true);
  };

  const displayDate = details.weddingDate
    ? new Date(details.weddingDate + "T00:00:00").toLocaleDateString(undefined, {
        day: "numeric",
        month: "long",
        year: "numeric",
      })
    : "Wedding date";

  const displayTime = details.weddingTime
    ? new Date("2000-01-01T" + details.weddingTime + ":00").toLocaleTimeString(undefined, {
        hour: "numeric",
        minute: "2-digit",
      })
    : "";

  useEffect(() => {
    if (!isRoyalPalaceTemplate) return undefined;
    let active = true;
    const prepareMedia = async () => {
      try {
        const photo = media.photos[0]?.src ? await imageUrlToDataUrl(media.photos[0].src) : "";
        const music = await audioUrlToDataUrl(media.musicUrl);
        if (active) {
          setRoyalPhotoDataUrl(photo);
          setRoyalMusicDataUrl(music);
          setRoyalMediaError("");
        }
      } catch (error) {
        if (active) setRoyalMediaError(error instanceof Error ? error.message : "Could not prepare your media.");
      }
    };
    prepareMedia();
    return () => { active = false; };
  }, [isRoyalPalaceTemplate, media.photos, media.musicUrl]);

  const royalHtml = useMemo(() => buildRoyalPalaceInvitationHtml({
    brideName: details.brideName,
    groomName: details.groomName,
    date: displayDate === "Wedding date" ? "" : displayDate,
    time: displayTime,
    venue: details.venueName,
    address: details.venueAddress,
    message: details.invitationMessage,
    host: details.hostLine,
  }, royalPhotoDataUrl), [
    details.brideName, details.groomName, details.venueName, details.venueAddress,
    details.invitationMessage, details.hostLine, displayDate, displayTime, royalPhotoDataUrl
  ]);

  return (
    <section
      aria-labelledby="wedding-event-details-title"
      style={{
        margin: "28px 0 56px",
        padding: "clamp(20px, 4vw, 32px)",
        border: "1px solid rgba(201,170,108,.28)",
        borderRadius: 18,
        background: "#101112",
        color: "#f6f3ec",
      }}
    >
      <div style={{ marginBottom: 24 }}>
        <p style={{ margin: "0 0 7px", color: "#c9aa6c", fontSize: 10, fontWeight: 700, letterSpacing: ".2em" }}>
          PERSONALISE YOUR INVITATION
        </p>
        <h2 id="wedding-event-details-title" style={{ margin: 0, fontFamily: "Georgia,serif", fontSize: "clamp(26px, 4vw, 34px)", fontWeight: 500 }}>
          Wedding Details
        </h2>
        <p style={{ margin: "9px 0 0", color: "#aaa49a", fontSize: 13, lineHeight: 1.6 }}>
          Add the information you want to include in {template.name}.
        </p>
      </div>

      <form onSubmit={handleSubmit}>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit, minmax(min(100%, 230px), 1fr))", gap: 16 }}>
          <label style={labelStyle}>
            Bride's name *
            <input style={fieldStyle} name="brideName" value={details.brideName} onChange={updateField} autoComplete="name" required maxLength={80} placeholder="Enter bride's name" />
          </label>
          <label style={labelStyle}>
            Groom's name *
            <input style={fieldStyle} name="groomName" value={details.groomName} onChange={updateField} required maxLength={80} placeholder="Enter groom's name" />
          </label>
          <label style={labelStyle}>
            Wedding date *
            <input style={fieldStyle} type="date" name="weddingDate" value={details.weddingDate} onChange={updateField} required />
          </label>
          <label style={labelStyle}>
            Wedding time
            <input style={fieldStyle} type="time" name="weddingTime" value={details.weddingTime} onChange={updateField} />
          </label>
          <label style={labelStyle}>
            Venue name *
            <input style={fieldStyle} name="venueName" value={details.venueName} onChange={updateField} required maxLength={120} placeholder="Enter venue name" />
          </label>
          <label style={labelStyle}>
            Venue address
            <input style={fieldStyle} name="venueAddress" value={details.venueAddress} onChange={updateField} maxLength={240} placeholder="Enter venue address" />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Invitation message
            <textarea style={{ ...fieldStyle, minHeight: 100, resize: "vertical" }} name="invitationMessage" value={details.invitationMessage} onChange={updateField} maxLength={500} placeholder="Add a personal invitation message (optional)" />
          </label>
          <label style={{ ...labelStyle, gridColumn: "1 / -1" }}>
            Host line (optional)
            <input style={fieldStyle} name="hostLine" value={details.hostLine || ""} onChange={updateField} maxLength={120} placeholder="Together with our families" />
          </label>
        </div>

        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "center", justifyContent: "space-between", gap: 14, marginTop: 22 }}>
          <p style={{ margin: 0, color: "#8f8a82", fontSize: 11 }}>* Required fields</p>
          <button type="submit" style={{ minHeight: 44, padding: "0 22px", border: 0, borderRadius: 999, background: "#d9b875", color: "#211b12", fontWeight: 700, cursor: "pointer" }}>
            Save details
          </button>
        </div>
        {saved && (
          <p role="status" style={{ margin: "14px 0 0", color: "#b8d7b5", fontSize: 13 }}>
            Wedding details saved in this editor.
          </p>
        )}
      </form>

      <aside aria-live="polite" style={{ marginTop: 24, padding: 18, border: "1px solid rgba(255,255,255,.09)", borderRadius: 12, background: "#171819" }}>
        <p style={{ margin: "0 0 12px", color: "#c9aa6c", fontSize: 10, fontWeight: 700, letterSpacing: ".16em" }}>
          DETAILS SUMMARY
        </p>
        <h3 style={{ margin: "0 0 8px", fontFamily: "Georgia,serif", fontSize: 25, fontWeight: 500 }}>
          {details.brideName || "Bride's name"} & {details.groomName || "Groom's name"}
        </h3>
        <p style={{ margin: "0 0 5px", color: "#e4dfd5", fontSize: 13 }}>
          {displayDate}{details.weddingTime ? " · " + details.weddingTime : ""}
        </p>
        <p style={{ margin: 0, color: "#aaa49a", fontSize: 13 }}>
          {details.venueName || "Venue name"}{details.venueAddress ? " · " + details.venueAddress : ""}
        </p>
        {details.invitationMessage && (
          <p style={{ margin: "12px 0 0", color: "#c9c1b4", fontSize: 13, lineHeight: 1.6 }}>
            {details.invitationMessage}
          </p>
        )}
      </aside>

      <WeddingMediaUploadControls onChange={setMedia} showVideos={!isRoyalPalaceTemplate} maxPhotos={isRoyalPalaceTemplate ? 1 : 6} />

      <div style={{ marginTop: 24 }}>
        <div style={{ display: "flex", flexWrap: "wrap", alignItems: "baseline", justifyContent: "space-between", gap: 10, marginBottom: 12 }}>
          <h3 style={{ margin: 0, color: "#f6f3ec", fontFamily: "Georgia,serif", fontSize: 22, fontWeight: 500 }}>
            Live 30-second invitation preview
          </h3>
          <span style={{ color: "#aaa49a", fontSize: 11 }}>9:16 · Updates as you type</span>
        </div>
        <div style={{ display: isRoyalPalaceTemplate ? "none" : "block", width: "min(100%, 320px)", aspectRatio: "9 / 16", margin: "0 auto", overflow: "hidden", border: "1px solid rgba(201,170,108,.35)", borderRadius: 14, background: "#08090b" }}>
          <Player
            component={template.compositionId === "vintage-storybook" ? VintageStorybookMotionPreview : WeddingTemplateMotionPreview}
            inputProps={
              template.compositionId === "vintage-storybook"
                ? {
                    template,
                    partner1Name: details.brideName,
                    partner2Name: details.groomName,
                    eventDate: displayDate === "Wedding date" ? "" : displayDate,
                    eventTime: details.weddingTime,
                    venueName: details.venueName,
                    venueCity: details.venueAddress,
                    invitationMessage: details.invitationMessage,
                    photos: media.photos,
                    videos: media.videos,
                    musicUrl: media.musicUrl,
                  }
                : {
                    template,
                    eventDetails: details,
                    photos: media.photos,
                    videos: media.videos,
                    musicUrl: media.musicUrl,
                  }
            }
            durationInFrames={WEDDING_VIDEO_DURATION_FRAMES}
            compositionWidth={540}
            compositionHeight={960}
            fps={WEDDING_VIDEO_FPS}
            loop
            autoPlay
            controls
            style={{ width: "100%", height: "100%" }}
          />
        </div>
        {isRoyalPalaceTemplate && (
          <div style={{ display: "grid", gap: 13, justifyItems: "center" }}>
            <div style={{ width: "min(100%, 320px)", aspectRatio: "9 / 16", overflow: "hidden", border: "1px solid rgba(201,170,108,.35)", borderRadius: 14, background: "#08090b" }}>
              <iframe
                title="Royal Palace wedding invitation live preview"
                srcDoc={royalHtml}
                sandbox="allow-scripts"
                style={{ width: "100%", height: "100%", display: "block", border: 0 }}
              />
            </div>
            <p style={{ margin: 0, color: "#aaa49a", fontSize: 11, textAlign: "center" }}>
              Your names, date, venue, message and first photo update in this preview.
            </p>
            {royalMediaError && <p role="alert" style={{ margin: 0, color: "#e5a19a", fontSize: 11 }}>{royalMediaError}</p>}
            <audio controls loop preload="metadata" src={royalMusicDataUrl} style={{ display: "block", width: "min(100%, 360px)" }}>
              Your browser does not support audio playback.
            </audio>
            <VideoRenderPanel
              html={royalHtml}
              audioDataUrl={royalMusicDataUrl}
              title={(details.brideName || "royal") + "-" + (details.groomName || "wedding") + "-invitation"}
            />
          </div>
        )}
      </div>
    </section>
  );
}
