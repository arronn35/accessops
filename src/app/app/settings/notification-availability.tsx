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
          In-app notifications are live, including regression alerts from
          monitors. Email delivery is on the roadmap.
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-5">
        <AlertCallout
          tone="info"
          title="Email notifications aren't available yet"
        >
          Scan, report, and team events appear in the bell menu in the top bar,
          and a monitor that finds new critical issues or a significant score
          drop raises one there too. What is missing is delivery to your inbox,
          so you still have to open the app to see them. These planned
          preferences cannot be changed or saved yet.
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
              description="Email me when a monitor finds new critical issues. Already shown in the bell menu."
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
