import { AlertCallout } from "@/components/feedback/AlertCallout";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/Card";
import { Switch } from "@/components/ui/Switch";

export function NotificationAvailability() {
  return (
    <Card>
      <CardHeader>
        <CardTitle>Notifications</CardTitle>
        <CardDescription>
          In-app notifications are live. Email delivery is on the roadmap.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AlertCallout
          tone="info"
          title="Email notifications aren't available yet"
        >
          Scan, report, and team events already appear in the bell menu in the
          top bar. Email delivery is not built yet, so these planned preferences
          cannot be changed or saved.
        </AlertCallout>

        <fieldset
          disabled
          aria-describedby="notification-email-status"
          className="space-y-4 divide-y divide-line opacity-60"
        >
          <legend className="sr-only">Planned email notifications</legend>
          <div className="pt-4 first:pt-0">
            <Switch
              id="notification-scan-complete"
              checked={false}
              disabled
              readOnly
              className="cursor-not-allowed"
              label="Scan complete"
              description="Email me when a scan I started finishes."
            />
          </div>
          <div className="pt-4">
            <Switch
              id="notification-critical"
              checked={false}
              disabled
              readOnly
              className="cursor-not-allowed"
              label="New critical findings"
              description="Alert me if a scan introduces new critical issues."
            />
          </div>
          <div className="pt-4">
            <Switch
              id="notification-weekly"
              checked={false}
              disabled
              readOnly
              className="cursor-not-allowed"
              label="Weekly summary"
              description="A Monday-morning roundup of workspace activity."
            />
          </div>
        </fieldset>
        <p
          id="notification-email-status"
          className="text-xs text-ink-600"
        >
          These switches are disabled until email delivery ships.
        </p>
      </CardContent>
    </Card>
  );
}
