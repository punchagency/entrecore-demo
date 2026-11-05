// ─── Trigger Library Data ─────────────────────────────────────────────────────
// All trigger types available in the workflow builder.
// Each trigger is the "starting event" that kicks off a workflow.

export type TriggerColor =
  | "green"
  | "emerald"
  | "teal"
  | "cyan"
  | "blue"
  | "indigo"
  | "violet"
  | "purple"
  | "amber"
  | "orange"
  | "rose"
  | "pink";

export interface TriggerDefinition {
  id: string;
  label: string;
  description: string;
  iconName: string;
  color: TriggerColor;
  /** Category grouping */
  group: string;
}

export const TRIGGER_GROUPS: { group: string; triggers: TriggerDefinition[] }[] = [
  {
    group: "Scheduled",
    triggers: [
      {
        id: "trigger-schedule",
        label: "Schedule / Cron",
        description: "Run workflow at specific times or intervals",
        iconName: "Clock",
        color: "amber",
        group: "Scheduled",
      },
      {
        id: "trigger-delay",
        label: "Delay / Timer",
        description: "Start after a specified wait period",
        iconName: "Timer",
        color: "orange",
        group: "Scheduled",
      },
    ],
  },
  {
    group: "HTTP & Webhooks",
    triggers: [
      {
        id: "trigger-webhook",
        label: "Webhook",
        description: "Trigger on incoming HTTP POST/PUT request",
        iconName: "Zap",
        color: "green",
        group: "HTTP & Webhooks",
      },
      {
        id: "trigger-api-call",
        label: "API Call",
        description: "Triggered when a specific API endpoint is hit",
        iconName: "Globe",
        color: "teal",
        group: "HTTP & Webhooks",
      },
    ],
  },
  {
    group: "Data & Database",
    triggers: [
      {
        id: "trigger-db-change",
        label: "Database Change",
        description: "On INSERT, UPDATE, or DELETE in a table",
        iconName: "Database",
        color: "violet",
        group: "Data & Database",
      },
      {
        id: "trigger-new-record",
        label: "New Record",
        description: "When a new row is inserted into a table",
        iconName: "TableProperties",
        color: "indigo",
        group: "Data & Database",
      },
      {
        id: "trigger-data-quality",
        label: "Data Quality Failure",
        description: "Trigger when a data quality rule fails",
        iconName: "AlertTriangle",
        color: "rose",
        group: "Data & Database",
      },
    ],
  },
  {
    group: "Messaging & Events",
    triggers: [
      {
        id: "trigger-email-received",
        label: "Email Received",
        description: "When an email arrives matching criteria",
        iconName: "Mail",
        color: "blue",
        group: "Messaging & Events",
      },
      {
        id: "trigger-slack-message",
        label: "Slack / Teams Message",
        description: "When a message is posted in a channel",
        iconName: "MessageSquare",
        color: "purple",
        group: "Messaging & Events",
      },
      {
        id: "trigger-event-stream",
        label: "Event Stream",
        description: "Listen to a Kafka / Pub-Sub / SQS stream",
        iconName: "Radio",
        color: "cyan",
        group: "Messaging & Events",
      },
    ],
  },
  {
    group: "File & Storage",
    triggers: [
      {
        id: "trigger-file-upload",
        label: "File Uploaded",
        description: "When a file is added to a folder or bucket",
        iconName: "Upload",
        color: "emerald",
        group: "File & Storage",
      },
      {
        id: "trigger-file-change",
        label: "File Changed",
        description: "When a file is modified in a watched location",
        iconName: "FileEdit",
        color: "teal",
        group: "File & Storage",
      },
    ],
  },
  {
    group: "Manual & Human",
    triggers: [
      {
        id: "trigger-manual",
        label: "Manual Trigger",
        description: "Start workflow manually with a button click",
        iconName: "MousePointer2",
        color: "amber",
        group: "Manual & Human",
      },
      {
        id: "trigger-form-submit",
        label: "Form Submission",
        description: "Triggered when a user submits a form",
        iconName: "ClipboardList",
        color: "orange",
        group: "Manual & Human",
      },
      {
        id: "trigger-approval",
        label: "Approval Event",
        description: "Triggered after a human approves or rejects",
        iconName: "CheckCircle2",
        color: "green",
        group: "Manual & Human",
      },
    ],
  },
];

export const ALL_TRIGGERS: TriggerDefinition[] = TRIGGER_GROUPS.flatMap((g) => g.triggers);
