import { useState } from "react";

const initialDetails = {
  brideName: "",
  groomName: "",
  weddingDate: "",
  weddingTime: "",
  venueName: "",
  venueAddress: "",
  invitationMessage: "",
};

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

export function WeddingEventDetailsEditor({ template }) {
  const [details, setDetails] = useState(initialDetails);
  const [saved, setSaved] = useState(false);

  const updateField = (event) => {
    const { name, value } = event.target;
    setDetails((current) => ({ ...current, [name]: value }));
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
    </section>
  );
}
