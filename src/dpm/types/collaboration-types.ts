// Digital Product Management Collaboration Types
// Team collaboration and communication types

export interface Team {
  id: string;
  name: string;
  description: string;
  type: TeamType;
  members: TeamMember[];
  lead: TeamMember;
  permissions: TeamPermissions;
  settings: TeamSettings;
  created: Date;
  updated: Date;
}

export enum TeamType {
  PRODUCT = 'product',
  ENGINEERING = 'engineering',
  DESIGN = 'design',
  MARKETING = 'marketing',
  SALES = 'sales',
  ANALYTICS = 'analytics',
  CROSS_FUNCTIONAL = 'cross_functional'
}

export interface TeamMember {
  id: string;
  name: string;
  email: string;
  role: TeamRole;
  permissions: MemberPermissions;
  availability: Availability;
  skills: Skill[];
  workload: Workload;
  timezone: string;
  preferences: MemberPreferences;
}

export enum TeamRole {
  PRODUCT_MANAGER = 'product_manager',
  SENIOR_PRODUCT_MANAGER = 'senior_product_manager',
  PRODUCT_OWNER = 'product_owner',
  ENGINEER = 'engineer',
  SENIOR_ENGINEER = 'senior_engineer',
  TECH_LEAD = 'tech_lead',
  DESIGNER = 'designer',
  UX_RESEARCHER = 'ux_researcher',
  MARKETER = 'marketer',
  ANALYST = 'analyst',
  STAKEHOLDER = 'stakeholder'
}

export interface MemberPermissions {
  canView: string[];
  canEdit: string[];
  canDelete: string[];
  canInvite: boolean;
  canManageTeam: boolean;
  isAdmin: boolean;
}

export interface Availability {
  status: AvailabilityStatus;
  capacity: number; // 0-100%
  schedule: Schedule[];
  timeOff: TimeOffPeriod[];
}

export enum AvailabilityStatus {
  AVAILABLE = 'available',
  BUSY = 'busy',
  AWAY = 'away',
  DO_NOT_DISTURB = 'do_not_disturb'
}

export interface Schedule {
  day: DayOfWeek;
  startTime: string;
  endTime: string;
  timezone: string;
}

export enum DayOfWeek {
  MONDAY = 'monday',
  TUESDAY = 'tuesday',
  WEDNESDAY = 'wednesday',
  THURSDAY = 'thursday',
  FRIDAY = 'friday',
  SATURDAY = 'saturday',
  SUNDAY = 'sunday'
}

export interface TimeOffPeriod {
  startDate: Date;
  endDate: Date;
  type: TimeOffType;
  description?: string;
}

export enum TimeOffType {
  VACATION = 'vacation',
  SICK = 'sick',
  PERSONAL = 'personal',
  CONFERENCE = 'conference',
  OTHER = 'other'
}

export interface Skill {
  name: string;
  category: SkillCategory;
  level: SkillLevel;
  certified: boolean;
  yearsExperience: number;
}

export enum SkillCategory {
  TECHNICAL = 'technical',
  PRODUCT = 'product',
  DESIGN = 'design',
  MARKETING = 'marketing',
  ANALYTICS = 'analytics',
  LEADERSHIP = 'leadership',
  COMMUNICATION = 'communication'
}

export enum SkillLevel {
  BEGINNER = 'beginner',
  INTERMEDIATE = 'intermediate',
  ADVANCED = 'advanced',
  EXPERT = 'expert'
}

export interface Workload {
  currentCapacity: number; // 0-100%
  assignments: Assignment[];
  estimatedHours: number;
  actualHours: number;
  burnoutRisk: RiskLevel;
}

export interface Assignment {
  taskId: string;
  name: string;
  estimatedHours: number;
  priority: Priority;
  deadline?: Date;
  status: AssignmentStatus;
}

export enum Priority {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export enum AssignmentStatus {
  TODO = 'todo',
  IN_PROGRESS = 'in_progress',
  REVIEW = 'review',
  DONE = 'done',
  BLOCKED = 'blocked'
}

export enum RiskLevel {
  LOW = 'low',
  MEDIUM = 'medium',
  HIGH = 'high',
  CRITICAL = 'critical'
}

export interface MemberPreferences {
  communicationStyle: CommunicationStyle;
  workingHours: WorkingHours;
  notificationSettings: NotificationSettings;
  collaborationTools: string[];
}

export enum CommunicationStyle {
  DIRECT = 'direct',
  COLLABORATIVE = 'collaborative',
  ANALYTICAL = 'analytical',
  SUPPORTIVE = 'supportive'
}

export interface WorkingHours {
  startTime: string;
  endTime: string;
  timezone: string;
  flexibleHours: boolean;
}

export interface NotificationSettings {
  email: boolean;
  slack: boolean;
  inApp: boolean;
  sms: boolean;
  frequency: NotificationFrequency;
}

export enum NotificationFrequency {
  IMMEDIATE = 'immediate',
  HOURLY = 'hourly',
  DAILY = 'daily',
  WEEKLY = 'weekly',
  NEVER = 'never'
}

export interface TeamPermissions {
  visibility: Visibility;
  joinPolicy: JoinPolicy;
  invitePolicy: InvitePolicy;
  contentSharing: ContentSharingPolicy;
}

export enum Visibility {
  PUBLIC = 'public',
  PRIVATE = 'private',
  ORGANIZATION = 'organization'
}

export enum JoinPolicy {
  OPEN = 'open',
  REQUEST = 'request',
  INVITE_ONLY = 'invite_only'
}

export enum InvitePolicy {
  ANYONE = 'anyone',
  MEMBERS = 'members',
  ADMINS = 'admins'
}

export enum ContentSharingPolicy {
  OPEN = 'open',
  RESTRICTED = 'restricted',
  PRIVATE = 'private'
}

export interface TeamSettings {
  defaultRole: TeamRole;
  requireApproval: boolean;
  allowGuestAccess: boolean;
  retentionPolicy: RetentionPolicy;
  integrations: TeamIntegration[];
}

export interface RetentionPolicy {
  enabled: boolean;
  duration: number; // days
  archiveInactive: boolean;
}

export interface TeamIntegration {
  type: IntegrationType;
  config: Record<string, any>;
  enabled: boolean;
}

export enum IntegrationType {
  SLACK = 'slack',
  TEAMS = 'teams',
  JIRA = 'jira',
  GITHUB = 'github',
  FIGMA = 'figma',
  NOTION = 'notion'
}

export interface Meeting {
  id: string;
  title: string;
  description: string;
  type: MeetingType;
  organizer: TeamMember;
  attendees: MeetingAttendee[];
  agenda: AgendaItem[];
  startTime: Date;
  endTime: Date;
  timezone: string;
  location?: string;
  virtualMeeting?: VirtualMeetingInfo;
  recurring?: RecurrencePattern;
  status: MeetingStatus;
  notes?: string;
  recordings?: Recording[];
  actionItems?: ActionItem[];
}

export enum MeetingType {
  STANDUP = 'standup',
  PLANNING = 'planning',
  REVIEW = 'review',
  RETROSPECTIVE = 'retrospective',
  ONE_ON_ONE = 'one_on_one',
  ALL_HANDS = 'all_hands',
  STAKEHOLDER = 'stakeholder',
  CUSTOMER = 'customer'
}

export interface MeetingAttendee {
  member: TeamMember;
  status: AttendeeStatus;
  role: AttendeeRole;
  required: boolean;
}

export enum AttendeeStatus {
  INVITED = 'invited',
  ACCEPTED = 'accepted',
  DECLINED = 'declined',
  TENTATIVE = 'tentative',
  NO_RESPONSE = 'no_response'
}

export enum AttendeeRole {
  ORGANIZER = 'organizer',
  PRESENTER = 'presenter',
  PARTICIPANT = 'participant',
  OBSERVER = 'observer'
}

export interface AgendaItem {
  id: string;
  title: string;
  description?: string;
  duration: number; // minutes
  owner: TeamMember;
  type: AgendaItemType;
  attachments?: Attachment[];
}

export enum AgendaItemType {
  DISCUSSION = 'discussion',
  PRESENTATION = 'presentation',
  DECISION = 'decision',
  UPDATE = 'update',
  BRAINSTORM = 'brainstorm'
}

export interface VirtualMeetingInfo {
  platform: VirtualPlatform;
  meetingId: string;
  password?: string;
  dialInNumber?: string;
  webUrl: string;
}

export enum VirtualPlatform {
  ZOOM = 'zoom',
  TEAMS = 'teams',
  MEET = 'meet',
  WEBEX = 'webex'
}

export interface RecurrencePattern {
  frequency: RecurrenceFrequency;
  interval: number;
  daysOfWeek?: DayOfWeek[];
  endDate?: Date;
  occurrences?: number;
}

export enum RecurrenceFrequency {
  DAILY = 'daily',
  WEEKLY = 'weekly',
  MONTHLY = 'monthly',
  YEARLY = 'yearly'
}

export enum MeetingStatus {
  SCHEDULED = 'scheduled',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled',
  RESCHEDULED = 'rescheduled'
}

export interface Recording {
  id: string;
  url: string;
  duration: number;
  size: number;
  format: string;
  created: Date;
}

export interface ActionItem {
  id: string;
  description: string;
  assignee: TeamMember;
  dueDate?: Date;
  priority: Priority;
  status: ActionItemStatus;
  created: Date;
  completed?: Date;
}

export enum ActionItemStatus {
  OPEN = 'open',
  IN_PROGRESS = 'in_progress',
  COMPLETED = 'completed',
  CANCELLED = 'cancelled'
}

export interface Attachment {
  id: string;
  name: string;
  type: AttachmentType;
  url: string;
  size: number;
  uploaded: Date;
  uploadedBy: TeamMember;
}

export enum AttachmentType {
  DOCUMENT = 'document',
  PRESENTATION = 'presentation',
  SPREADSHEET = 'spreadsheet',
  IMAGE = 'image',
  VIDEO = 'video',
  AUDIO = 'audio',
  OTHER = 'other'
}

export interface Communication {
  id: string;
  type: CommunicationType;
  channel: string;
  sender: TeamMember;
  receivers: TeamMember[];
  subject?: string;
  content: string;
  attachments?: Attachment[];
  priority: Priority;
  status: CommunicationStatus;
  thread?: Communication[];
  timestamp: Date;
  readBy?: ReadReceipt[];
}

export enum CommunicationType {
  MESSAGE = 'message',
  EMAIL = 'email',
  NOTIFICATION = 'notification',
  ANNOUNCEMENT = 'announcement',
  ALERT = 'alert'
}

export enum CommunicationStatus {
  SENT = 'sent',
  DELIVERED = 'delivered',
  READ = 'read',
  FAILED = 'failed'
}

export interface ReadReceipt {
  member: TeamMember;
  readAt: Date;
}

export interface Workspace {
  id: string;
  name: string;
  description: string;
  teams: Team[];
  projects: string[];
  settings: WorkspaceSettings;
  permissions: WorkspacePermissions;
  created: Date;
  updated: Date;
}

export interface WorkspaceSettings {
  timezone: string;
  language: string;
  dateFormat: string;
  timeFormat: string;
  currency: string;
  integrations: WorkspaceIntegration[];
}

export interface WorkspaceIntegration {
  type: IntegrationType;
  config: Record<string, any>;
  enabled: boolean;
  permissions: string[];
}

export interface WorkspacePermissions {
  admins: string[];
  canCreateTeams: string[];
  canInviteUsers: string[];
  canManageIntegrations: string[];
} 