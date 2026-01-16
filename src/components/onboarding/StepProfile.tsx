import { useState } from "react";
import { ViperInput } from "@/components/ui/viper-input";
import { ViperButton } from "@/components/ui/viper-button";
import { AvatarUpload } from "./AvatarUpload";
import { Briefcase, Calendar } from "lucide-react";

interface ProfileData {
  avatarUrl: string | null;
  title: string;
  hireDate: string;
}

interface StepProfileProps {
  fullName: string;
  initialData: ProfileData;
  onComplete: (data: ProfileData) => void;
}

export function StepProfile({ fullName, initialData, onComplete }: StepProfileProps) {
  const [avatarUrl, setAvatarUrl] = useState(initialData.avatarUrl);
  const [title, setTitle] = useState(initialData.title);
  const [hireDate, setHireDate] = useState(initialData.hireDate);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onComplete({ avatarUrl, title, hireDate });
  };

  const firstName = fullName.split(" ")[0] || "there";

  return (
    <div className="animate-fade-in">
      <div className="text-center mb-8">
        <h2 className="text-3xl font-display font-bold text-foreground mb-2">
          Welcome, {firstName}!
        </h2>
        <p className="text-muted-foreground">
          Let's set up your profile so your team knows who's crushing it.
        </p>
      </div>

      <form onSubmit={handleSubmit} className="space-y-6">
        {/* Avatar Upload */}
        <div className="flex justify-center">
          <AvatarUpload
            currentUrl={avatarUrl}
            onUploadComplete={(url) => setAvatarUrl(url)}
          />
        </div>

        {/* Job Title */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Job Title</label>
          <div className="relative">
            <Briefcase className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="text"
              placeholder="e.g., Senior Account Executive"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="pl-10"
              variant="glow"
              required
            />
          </div>
        </div>

        {/* Hire Date */}
        <div className="space-y-2">
          <label className="text-sm font-medium text-foreground">Hire Date</label>
          <div className="relative">
            <Calendar className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <ViperInput
              type="date"
              value={hireDate}
              onChange={(e) => setHireDate(e.target.value)}
              className="pl-10"
              variant="glow"
              required
            />
          </div>
        </div>

        <div className="flex gap-3 pt-4">
          <ViperButton
            type="button"
            variant="ghost"
            className="flex-1"
            onClick={() => onComplete({ avatarUrl: null, title, hireDate })}
          >
            Skip Photo
          </ViperButton>
          <ViperButton type="submit" className="flex-1">
            Continue
          </ViperButton>
        </div>
      </form>
    </div>
  );
}