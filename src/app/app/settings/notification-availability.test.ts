import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it } from "vitest";
import { NotificationAvailability } from "./notification-availability";

describe("NotificationAvailability", () => {
  it("distinguishes live in-app notifications from unavailable email delivery", () => {
    const html = renderToStaticMarkup(
      createElement(NotificationAvailability)
    );

    expect(html).toContain("In-app notifications are live");
    expect(html).toContain("Email notifications aren&#x27;t available yet");
    expect(html).toContain("<fieldset disabled=");
    expect(html).toContain("Planned email notifications");
    expect(html.match(/role=\"switch\"/g)).toHaveLength(3);
    expect(html.match(/disabled=\"\"/g)?.length).toBeGreaterThanOrEqual(4);
    expect(html).toContain(
      "These switches are disabled until email delivery ships"
    );
  });
});
