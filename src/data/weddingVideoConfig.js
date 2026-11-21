export const WEDDING_VIDEO_FPS = 30;
export const WEDDING_VIDEO_DURATION_SECONDS = 30;
export const WEDDING_VIDEO_DURATION_FRAMES =
  WEDDING_VIDEO_FPS * WEDDING_VIDEO_DURATION_SECONDS;

export const WEDDING_VIDEO_SCENE_COUNT = 5;
export const WEDDING_VIDEO_SCENE_FRAMES =
  WEDDING_VIDEO_DURATION_FRAMES / WEDDING_VIDEO_SCENE_COUNT;

/**
 * Preview-only example props.
 * Real Event Details inputs will replace these values in the personalisation flow.
 * The composition itself does not hardcode names, dates or venue details.
 */
export const VINTAGE_STORYBOOK_PREVIEW_PROPS = {
  partner1Name: "Aarav",
  partner2Name: "Kiara",
  monogram: "",
  eventDate: "24 April 2026",
  eventTime: "",
  venueName: "The Royal Garden",
  venueCity: "Pune, Maharashtra",
  invitationMessage:
    "Together with their families, we request the pleasure of your company as they begin their life together.",
  hostLine: "",
  photos: [],
  musicUrl: "",
};
