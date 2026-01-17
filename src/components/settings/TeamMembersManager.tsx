import { useState, useEffect } from "react";
import { UserPlus, Users, Loader2, CheckCircle2, Copy, Eye, EyeOff, KeyRound, MoreHorizontal } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
import { DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger } from "@/components/ui/dropdown-menu";
import { Dialog, DialogContent, DialogDescription, DialogFooter, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";
import { supabase } from "@/integrations/supabase/client";

interface AlowareUser {
  id: string | number;
  name: string;
  email: string;
}

interface TeamMember {
  id: string;
  user_id: string;
  full_name: string;
  aloware_user_id: string | null;
  created_at: string;
  title: string | null;
}

interface CreatedUser {
  email: string;
  password: string;
  fullName: string;
}

export function TeamMembersManager() {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(false);
  const [isCreating, setIsCreating] = useState(false);
  const [isResetting, setIsResetting] = useState(false);
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [alowareUsers, setAlowareUsers] = useState<AlowareUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
  // Reset password modal state
  const [resetModalOpen, setResetModalOpen] = useState(false);
  const [selectedMember, setSelectedMember] = useState<TeamMember | null>(null);
  const [newPassword, setNewPassword] = useState("");
  
  // Form state
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [fullName, setFullName] = useState("");
  const [selectedAlowareUser, setSelectedAlowareUser] = useState<string>("");

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    setIsLoading(true);
    try {
      // Load team members
      const { data: membersData } = await supabase.functions.invoke("create-team-member", {
        body: { action: "list" }
      });
      if (membersData?.success) {
        setTeamMembers(membersData.members || []);
      }

      // Load Aloware users
      const { data: alowareData } = await supabase.functions.invoke("create-team-member", {
        body: { action: "get-aloware-users" }
      });
      if (alowareData?.success) {
        setAlowareUsers(alowareData.users || []);
      }
    } catch (error) {
      console.error("Error loading data:", error);
    } finally {
      setIsLoading(false);
    }
  };

  const generatePassword = () => {
    const chars = "ABCDEFGHJKLMNPQRSTUVWXYZabcdefghjkmnpqrstuvwxyz23456789!@#$";
    let result = "";
    for (let i = 0; i < 12; i++) {
      result += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return result;
  };

  const handleGeneratePassword = () => {
    setPassword(generatePassword());
  };

  const handleGenerateNewPassword = () => {
    setNewPassword(generatePassword());
  };

  const handleOpenResetModal = (member: TeamMember) => {
    setSelectedMember(member);
    setNewPassword(generatePassword());
    setResetModalOpen(true);
  };

  const handleResetPassword = async () => {
    if (!selectedMember || !newPassword) return;

    setIsResetting(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          action: "reset-password",
          userId: selectedMember.user_id,
          newPassword,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Password Reset!",
          description: `New password set for ${selectedMember.full_name}`,
        });

        // Add to created users list so they can see/copy the new password
        setCreatedUsers(prev => [...prev.filter(u => u.fullName !== selectedMember.full_name), { 
          email: `${selectedMember.full_name}'s account`, 
          password: newPassword, 
          fullName: selectedMember.full_name 
        }]);

        setResetModalOpen(false);
        setSelectedMember(null);
        setNewPassword("");
      } else {
        throw new Error(data?.error || "Failed to reset password");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to reset password",
        variant: "destructive",
      });
    } finally {
      setIsResetting(false);
    }
  };

  const handleSelectAlowareUser = (alowareId: string) => {
    setSelectedAlowareUser(alowareId);
    const user = alowareUsers.find(u => String(u.id) === alowareId);
    if (user) {
      setFullName(user.name);
      setEmail(user.email);
    }
  };

  const handleCreateMember = async () => {
    if (!email || !password || !fullName) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields",
        variant: "destructive",
      });
      return;
    }

    setIsCreating(true);
    try {
      const { data, error } = await supabase.functions.invoke("create-team-member", {
        body: {
          action: "create",
          email,
          password,
          fullName,
          alowareUserId: selectedAlowareUser || null,
        }
      });

      if (error) throw error;

      if (data?.success) {
        toast({
          title: "Team Member Created!",
          description: `Account for ${fullName} has been created.`,
        });

        // Store the created user credentials for reference
        setCreatedUsers(prev => [...prev, { email, password, fullName }]);

        // Reset form
        setEmail("");
        setPassword("");
        setFullName("");
        setSelectedAlowareUser("");
        setShowForm(false);

        // Reload team members
        loadData();
      } else {
        throw new Error(data?.error || "Failed to create team member");
      }
    } catch (error: any) {
      toast({
        title: "Error",
        description: error.message || "Failed to create team member",
        variant: "destructive",
      });
    } finally {
      setIsCreating(false);
    }
  };

  const copyToClipboard = (text: string) => {
    navigator.clipboard.writeText(text);
    toast({
      title: "Copied!",
      description: "Copied to clipboard",
    });
  };

  const togglePasswordVisibility = (email: string) => {
    setShowPasswords(prev => ({ ...prev, [email]: !prev[email] }));
  };

  if (isLoading) {
    return (
      <Card className="glass-card">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="glass-card">
        <CardHeader>
          <div className="flex items-center justify-between">
            <div>
              <CardTitle className="flex items-center gap-2">
                <Users className="h-5 w-5 text-primary" />
                Team Members
              </CardTitle>
              <CardDescription>
                Create and manage accounts for your team members
              </CardDescription>
            </div>
            <Button onClick={() => setShowForm(!showForm)}>
              <UserPlus className="mr-2 h-4 w-4" />
              Add Member
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Add Member Form */}
          {showForm && (
            <div className="p-4 rounded-lg border border-primary/20 bg-primary/5 space-y-4">
              <h4 className="font-medium">Create New Team Member</h4>
              
              {/* Aloware User Selection */}
              {alowareUsers.length > 0 && (
                <div className="space-y-2">
                  <Label>Link to Aloware User (Optional)</Label>
                  <Select value={selectedAlowareUser} onValueChange={handleSelectAlowareUser}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select Aloware user to auto-fill..." />
                    </SelectTrigger>
                    <SelectContent>
                      {alowareUsers.map((user) => (
                        <SelectItem key={user.id} value={String(user.id)}>
                          {user.name} ({user.email})
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
                    placeholder="John Doe"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="email">Email *</Label>
                  <Input
                    id="email"
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="john@company.com"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password *</Label>
                <div className="flex gap-2">
                  <Input
                    id="password"
                    type="text"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="Enter password"
                  />
                  <Button type="button" variant="outline" onClick={handleGeneratePassword}>
                    Generate
                  </Button>
                </div>
                <p className="text-xs text-muted-foreground">
                  Share this password with the team member. They can change it after logging in.
                </p>
              </div>

              <div className="flex gap-2 justify-end">
                <Button variant="outline" onClick={() => setShowForm(false)}>
                  Cancel
                </Button>
                <Button onClick={handleCreateMember} disabled={isCreating}>
                  {isCreating ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Creating...
                    </>
                  ) : (
                    <>
                      <CheckCircle2 className="mr-2 h-4 w-4" />
                      Create Account
                    </>
                  )}
                </Button>
              </div>
            </div>
          )}

          {/* Team Members Table */}
          {teamMembers.length > 0 ? (
            <div className="rounded-lg border overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow>
                    <TableHead>Name</TableHead>
                    <TableHead>Title</TableHead>
                    <TableHead>Aloware Linked</TableHead>
                    <TableHead>Created</TableHead>
                    <TableHead className="w-[50px]"></TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {teamMembers.map((member) => (
                    <TableRow key={member.id}>
                      <TableCell className="font-medium">{member.full_name}</TableCell>
                      <TableCell>{member.title || "-"}</TableCell>
                      <TableCell>
                        {member.aloware_user_id ? (
                          <Badge variant="default" className="gap-1">
                            <CheckCircle2 className="h-3 w-3" />
                            Linked
                          </Badge>
                        ) : (
                          <Badge variant="outline">Not Linked</Badge>
                        )}
                      </TableCell>
                      <TableCell className="text-muted-foreground">
                        {new Date(member.created_at).toLocaleDateString()}
                      </TableCell>
                      <TableCell>
                        <DropdownMenu>
                          <DropdownMenuTrigger asChild>
                            <Button variant="ghost" size="icon" className="h-8 w-8">
                              <MoreHorizontal className="h-4 w-4" />
                            </Button>
                          </DropdownMenuTrigger>
                          <DropdownMenuContent align="end">
                            <DropdownMenuItem onClick={() => handleOpenResetModal(member)}>
                              <KeyRound className="mr-2 h-4 w-4" />
                              Reset Password
                            </DropdownMenuItem>
                          </DropdownMenuContent>
                        </DropdownMenu>
                      </TableCell>
                    </TableRow>
                  ))}
                </TableBody>
              </Table>
            </div>
          ) : (
            <div className="text-center py-8 text-muted-foreground">
              No team members yet. Click "Add Member" to create accounts for your team.
            </div>
          )}
        </CardContent>
      </Card>

      {/* Recently Created Accounts */}
      {createdUsers.length > 0 && (
        <Card className="glass-card border-green-500/20">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-green-600">
              <CheckCircle2 className="h-5 w-5" />
              Recently Created Accounts
            </CardTitle>
            <CardDescription>
              Save these credentials! They won't be shown again after you leave this page.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {createdUsers.map((user) => (
                <div
                  key={user.email}
                  className="p-3 rounded-lg bg-muted/50 flex items-center justify-between gap-4"
                >
                  <div className="flex-1 min-w-0">
                    <p className="font-medium">{user.fullName}</p>
                    <p className="text-sm text-muted-foreground truncate">{user.email}</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex items-center gap-1">
                      <code className="px-2 py-1 bg-background rounded text-sm">
                        {showPasswords[user.email] ? user.password : "••••••••••••"}
                      </code>
                      <Button
                        variant="ghost"
                        size="icon"
                        className="h-8 w-8"
                        onClick={() => togglePasswordVisibility(user.email)}
                      >
                        {showPasswords[user.email] ? (
                          <EyeOff className="h-4 w-4" />
                        ) : (
                          <Eye className="h-4 w-4" />
                        )}
                      </Button>
                    </div>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => copyToClipboard(`Email: ${user.email}\nPassword: ${user.password}`)}
                    >
                      <Copy className="h-4 w-4 mr-1" />
                      Copy
                    </Button>
                  </div>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Reset Password Dialog */}
      <Dialog open={resetModalOpen} onOpenChange={setResetModalOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <KeyRound className="h-5 w-5 text-primary" />
              Reset Password
            </DialogTitle>
            <DialogDescription>
              Set a new password for {selectedMember?.full_name}
            </DialogDescription>
          </DialogHeader>
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="newPassword">New Password</Label>
              <div className="flex gap-2">
                <Input
                  id="newPassword"
                  type="text"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="Enter new password"
                />
                <Button type="button" variant="outline" onClick={handleGenerateNewPassword}>
                  Generate
                </Button>
              </div>
              <p className="text-xs text-muted-foreground">
                Share this new password with the team member.
              </p>
            </div>
          </div>
          <DialogFooter>
            <Button variant="outline" onClick={() => setResetModalOpen(false)}>
              Cancel
            </Button>
            <Button onClick={handleResetPassword} disabled={isResetting || !newPassword}>
              {isResetting ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Resetting...
                </>
              ) : (
                <>
                  <KeyRound className="mr-2 h-4 w-4" />
                  Reset Password
                </>
              )}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
