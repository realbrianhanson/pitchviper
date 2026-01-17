import { useState, useEffect } from "react";
import { UserPlus, Users, Loader2, CheckCircle2, Copy, Eye, EyeOff } from "lucide-react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";
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
  const [teamMembers, setTeamMembers] = useState<TeamMember[]>([]);
  const [alowareUsers, setAlowareUsers] = useState<AlowareUser[]>([]);
  const [showForm, setShowForm] = useState(false);
  const [createdUsers, setCreatedUsers] = useState<CreatedUser[]>([]);
  const [showPasswords, setShowPasswords] = useState<Record<string, boolean>>({});
  
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
    setPassword(result);
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
                  <Button type="button" variant="outline" onClick={generatePassword}>
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
    </div>
  );
}
