import { Axios } from "@/app/config/axios";
import { isAxiosError } from "axios";

export type CompanyRole = "admin" | "member" | "viewer";

export type CompanyMember = {
  id: string;
  email: string;
  full_name?: string | null;
  first_name?: string | null;
  last_name?: string | null;
  company_role?: string | null;
  is_owner: boolean;
  profile_image?: string | null;
};

export type CompanyMembersResult = {
  caller_is_owner: boolean;
  members: CompanyMember[];
};

export type PendingInvite = {
  id: string;
  email: string;
  role: string;
  status: string;
  expires_at: string;
  created_at: string;
  invite_link?: string | null;
};

export type InviteResult = {
  id: string;
  email: string;
  company_id: string;
  role: string;
  status: string;
  expires_at: string;
  invite_link?: string | null;
  email_sent: boolean;
};

export type JoinResult = {
  message: string;
  company_id: string;
  company_name?: string | null;
  role: string;
  /** True when the caller was already in the company (link reopened / second click). */
  already_member?: boolean;
  /**
   * The workspace the user was in before joining, when different. Joining adds a
   * membership rather than replacing one, so it is still available to switch back to.
   */
  previous_company_id?: string | null;
  /**
   * Access token minted after the membership change. Tenancy claims live in the
   * JWT, so the previous token still describes the user's old company.
   */
  access_token?: string;
  token_type?: string;
  expires_at?: string;
};

export type InvitePreview = {
  email: string;
  company_name?: string | null;
  role: string;
  expires_at: string;
  account_exists: boolean;
};

export function extractTeamApiError(error: unknown, fallback: string): string {
  if (isAxiosError(error)) {
    const detail = error.response?.data?.detail;
    if (typeof detail === "string" && detail.trim()) return detail;
    if (Array.isArray(detail) && detail[0]?.msg) return String(detail[0].msg);
  }
  if (error instanceof Error && error.message) return error.message;
  return fallback;
}

export async function listCompanyMembers(
  companyId: string
): Promise<CompanyMembersResult> {
  const { data } = await Axios.get<CompanyMembersResult>(
    `/auth/company/${companyId}/members`
  );
  return data;
}

export async function listPendingInvites(): Promise<PendingInvite[]> {
  const { data } = await Axios.get<PendingInvite[]>("/auth/companies/invites");
  return data;
}

export async function inviteCompanyMember(
  email: string,
  role: CompanyRole
): Promise<InviteResult> {
  const { data } = await Axios.post<InviteResult>("/auth/companies/invite", {
    email,
    role,
  });
  return data;
}

export async function revokeInvite(inviteId: string): Promise<void> {
  await Axios.delete(`/auth/companies/invites/${inviteId}`);
}

export async function updateMemberRole(
  companyId: string,
  userId: string,
  role: CompanyRole
): Promise<void> {
  await Axios.put(`/auth/company/${companyId}/members/${userId}/role`, { role });
}

/** Owner/admin only; only the owner can remove an admin, and never the owner. */
export async function removeMember(companyId: string, userId: string): Promise<void> {
  await Axios.delete(`/auth/company/${companyId}/members/${userId}`);
}

/**
 * Owner only (EP-1038): hand the company to another verified member. The
 * caller stays an admin; both people are emailed.
 */
export async function transferOwnership(
  companyId: string,
  newOwnerId: string
): Promise<void> {
  await Axios.post(`/auth/company/${companyId}/transfer-ownership`, {
    new_owner_id: newOwnerId,
  });
}

/** Public: describes an invite to its token holder (no account needed). */
export async function previewCompanyInvite(token: string): Promise<InvitePreview> {
  const { data } = await Axios.get<InvitePreview>("/auth/companies/invites/preview", {
    params: { token },
  });
  return data;
}

export async function acceptCompanyInvite(token: string): Promise<JoinResult> {
  const { data } = await Axios.post<JoinResult>("/auth/companies/join", { token });
  return data;
}

export function memberDisplayName(member: CompanyMember): string {
  if (member.full_name?.trim()) return member.full_name.trim();
  const parts = [member.first_name, member.last_name].filter(Boolean);
  if (parts.length) return parts.join(" ");
  return member.email;
}

export function roleLabel(role?: string | null): string {
  switch ((role || "").toLowerCase()) {
    case "admin":
      return "Admin";
    case "viewer":
      return "Viewer";
    case "member":
      return "Member";
    case "owner":
      return "Owner";
    default:
      return role || "Member";
  }
}
