import { useState, useEffect } from "react";
import { UserPlus, Users, Loader2, Mail, MoreHorizontal, RefreshCw } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

// Legacy Aloware prefill retired: invitees are managed by name/email only.

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  aloware_user_id: string | null;
  created_at: string;
  title: string | null;
  email: string | null;
  invited_at: string | null;
  last_sign_in_at: string | null;
  status: "active" | "invited";
}

const ERROR_COPY: Record<string, string> = {
  invite_rate_limited: "Too many invitations. Try again in a minute.",
  email_unavailable: "That email can't be invited. It may belong to another workspace.",
  already_active: "This teammate already has an account. They can reset their password from the sign-in page.",
  invite_failed: "We couldn't send the invitation. Please try again.",
  not_found: "Teammate not found.",
  forbidden: "Only team managers can invite members.",
  unauthorized: "Please sign in again.",
  invalid_body: "Please check the invite details and try again.",
  list_failed: "We couldn't load your team. Please try again.",
};

// supabase-js surfaces non-2xx responses via FunctionsHttpError with the raw
// Response on `error.context`. Extract the JSON body so opaque server codes
// (invite_rate_limited, email_unavailable, already_active, …) map to friendly
// copy without leaking exception text.
async function readFunctionErrorCode(error: unknown): Promise<string | undefined> {
  const ctx = (error as { context?: unknown })?.context;
  if (!ctx || typeof (ctx as Response).clone !== "function") return undefined;
  try {
    const body = await (ctx as Response).clone().json();
    if (body && typeof body === "object") {
      const b = body as { code?: unknown; error?: unknown };
      if (typeof b.code === "string") return b.code;
      if (typeof b.error === "string") return b.error;
    }
  } catch {
    /* not JSON */
  }
  return undefined;
}

export function TeamMembersManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [isInviting, setIsInviting] = useState(false);
  const [resendingId, setResendingId] = useState<string | null>(null);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  
  const [showForm, setShowForm] = useState(false);

  // Form state — no password, ever.
  const [email, setEmail] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedAlowareUser, setSelectedAlowareUser] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const { data: membersData, error: membersErr } = await supabase.functions.invoke(
        "create-team-member",
        { body: { action: "list" } },
      );
      if (membersErr || !membersData?.success) {
        setLoadError(ERROR_COPY.list_failed);
      } else {
        setTeamMembers(membersData.members || []);
      }

    } catch (error) {
      console.error("Error loading team data:", error);
      setLoadError(ERROR_COPY.list_failed);
    } finally {
      setIsLoading(false);
    }
  };

  const showError = (code: string | undefined, fallback = "Something went wrong.") => {
    toast({
      title: "Error",
      description: (code && ERROR_COPY[code]) || fallback,
      variant: "destructive",
    });
  };

  const handleSelectAlowareUser = (alowareId: string) => {
    setSelectedAlowareUser(alowareId);
    const user = alowareUsers.find((u) => String(u.id) === alowareId);
    if (user) {
      setFullName(user.name);
      setEmail(user.email);
    }
  };

  const resetForm = () => {
    setEmail("");
    setFullName("");
    setSelectedAlowareUser("");
  };

  const handleInvite = async () => {
    if (!email.trim() || !fullName.trim()) {
      toast({
        title: "Missing information",
        description: "Full name and email are required.",
        variant: "destructive",
      });
      return;
    }

    setIsInviting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          action: "invite",
          email: email.trim(),
          fullName: fullName.trim(),
          alowareUserId: selectedAlowareUser || null,
        },
      });

      if (error) {
        const code = await readFunctionErrorCode(error);
        showError(code, "Failed to send invitation.");
        return;
      }

      if (data?.success) {
        const status = data.status;
        toast({
          title:
            status === "already_member"
              ? "Already on your team"
              : status === "resent"
                ? "Invitation resent"
                : "Invitation sent",
          description:
            status === "already_member"
              ? `${fullName} is already a member of this team.`
              : `${email} will set their own password from the invite email.`,
        });
        resetForm();
        setShowForm(false);
        loadData();
      } else {
        showError(data?.code, "Failed to send invitation.");
      }
    } catch (err: any) {
      const code = await readFunctionErrorCode(err);
      showError(code, "Failed to send invitation.");
    } finally {
      setIsInviting(false);
    }
  };

  const handleResend = async (member: TeamMember) => {
    setResendingId(member.user_id);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: { action: "resend-invite", userId: member.user_id },
      });
      if (error) {
        const code = await readFunctionErrorCode(error);
        showError(code, "Failed to resend invitation.");
        return;
      }
      if (data?.success) {
        toast({
          title: "Invitation resent",
          description: `A new invite email is on its way to ${member.full_name}.`,
        });
        loadData();
      } else {
        showError(data?.code, "Failed to resend invitation.");
      }
    } catch (err: any) {
      const code = await readFunctionErrorCode(err);
      showError(code, "Failed to resend invitation.");
    } finally {
      setResendingId(null);
    }
  };

  if (isLoading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <div className="flex items-center justify-between gap-3 flex-wrap">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>
                Invite teammates by email. They'll set their own password — you'll never see or manage it.
              </CardDescription>
            </div>
            {!showForm && (
              <Button onClick={() => setShowForm(true)}>
                <UserPlus className="mr-2 h-4 w-4" />
                Invite Member
              </Button>
            )}
          </div>
        </CardHeader>

        <CardContent className="space-y-6">
          {showForm && (
            <div className="space-y-4 border rounded-md p-4 bg-muted/20">
              {alowareUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Prefill from Aloware (optional)</Label>
                  <Select value={selectedAlowareUser} onValueChange={handleSelectAlowareUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select an Aloware user…" />
                    </SelectTrigger>
                    <SelectContent>
                      {alowareUsers.map((u) => (
                        <SelectItem key={u.id} value={String(u.id)}>
                          {u.name} · {u.email}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}

              <div className="grid gap-4 md:grid-cols-2">
                <div className="space-y-2">
                  <Label htmlFor="fullName">Full Name *</Label>
                  <Input
                    id="fullName"
                    value={fullName}
                    onChange={(e) => setFullName(e.target.value)}
                    placeholder="Jordan Rivera"
                    maxLength={120}
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Work Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="jordan@company.com"
                    maxLength={254}
                  />
                </div>
              </div>

              <p className="text-xs text-muted-foreground">
                We'll email a single-use invite link. Invitees create their own password and land in onboarding —
                you never see or transmit credentials.
              </p>

              <div className="flex gap-2 justify-end">
                <Button
                  variant="outline"
                  onClick={() => {
                    setShowForm(false);
                    resetForm();
                  }}
                >
                  Cancel
                </Button>
                <Button onClick={handleInvite} disabled={isInviting}>
                  {isInviting ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Sending…
                    </>
                  ) : (
                    <>
                      <Mail className="mr-2 h-4 w-4" />
                      Send Invitation
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {loadError ? (
            <div className="rounded-md border border-destructive/40 bg-destructive/5 px-4 py-3 text-sm text-destructive flex items-center justify-between gap-4">
              <span>{loadError}</span>
              <Button variant="outline" size="sm" onClick={loadData}>
                Try again
              </Button>
            </div>
          ) : teamMembers.length > 0 ? (
            <div className="rounded-md border overflow-hidden">
              <div className="overflow-x-auto">
                <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Email</TableHead>
                    <TableHead>Status</TableHead>
                    <TableHead>Aloware</TableHead>
                    <TableHead className="w-[60px]" />
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => {
                    const isPending = member.status === "invited";
                    return (
                      <TableRow key={member.id}>
                        <TableCell className="font-medium">{member.full_name}</TableCell>
                        <TableCell className="text-muted-foreground">
                          {member.email || "—"}
                        </TableCell>
                        <TableCell>
                          {member.status === "active" ? (
                            <Badge variant="default">Active</Badge>
                          ) : (
                            <Badge variant="outline">Invited</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          {member.aloware_user_id ? (
                            <Badge variant="default">Linked</Badge>
                          ) : (
                            <Badge variant="outline">—</Badge>
                          )}
                        </TableCell>
                        <TableCell>
                          <DropdownMenu>
                            <DropdownMenuTrigger asChild>
                              <Button
                                variant="ghost"
                                size="icon"
                                className="h-8 w-8"
                                aria-label={`Actions for ${member.full_name || member.email || "teammate"}`}
                              >
                                <MoreHorizontal className="h-4 w-4" />
                              </Button>
                            </DropdownMenuTrigger>
                            <DropdownMenuContent align="end">
                              <DropdownMenuItem
                                disabled={!isPending || resendingId === member.user_id}
                                onClick={() => isPending && handleResend(member)}
                              >
                                <RefreshCw className="mr-2 h-4 w-4" />
                                {resendingId === member.user_id ? "Resending…" : "Resend invitation"}
                              </DropdownMenuItem>
                            </DropdownMenuContent>
                          </DropdownMenu>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
              </div>
              <p className="text-xs text-muted-foreground px-4 py-3 border-t bg-muted/20">
                Teammates reset their own passwords from the sign-in page. Managers can't view or change
                passwords for security.
              </p>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No teammates yet. Click "Invite Member" to send an email invitation.
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
