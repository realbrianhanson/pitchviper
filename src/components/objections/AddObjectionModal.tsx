import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ObjectionCategory, ObjectionDifficulty } from "@/hooks/useObjections";
import { Shield, Loader2 } from "lucide-react";
import { toast } from "sonner";

interface AddObjectionModalProps {
  isOpen: boolean;
  onClose: () => void;
  onAdd: (data: {
    objection_text: string;
    category: ObjectionCategory;
    difficulty: ObjectionDifficulty;
    context?: string;
  }) => Promise<boolean | undefined>;
}

const categories: { value: ObjectionCategory; label: string }[] = [
  { value: 'price', label: 'Price/Budget' },
  { value: 'timing', label: 'Timing' },
  { value: 'competition', label: 'Competition' },
  { value: 'authority', label: 'Authority/Decision Maker' },
  { value: 'need', label: 'Need/Interest' },
  { value: 'trust', label: 'Trust/Credibility' },
  { value: 'stall', label: 'Stalls/Put-offs' }
];

const difficulties: { value: ObjectionDifficulty; label: string }[] = [
  { value: 'easy', label: 'Easy' },
  { value: 'medium', label: 'Medium' },
  { value: 'hard', label: 'Hard' }
];

export function AddObjectionModal({ isOpen, onClose, onAdd }: AddObjectionModalProps) {
  const [objectionText, setObjectionText] = useState('');
  const [category, setCategory] = useState<ObjectionCategory | ''>('');
  const [difficulty, setDifficulty] = useState<ObjectionDifficulty | ''>('');
  const [context, setContext] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async () => {
    if (!objectionText.trim() || !category || !difficulty) {
      toast.error('Please fill in all required fields');
      return;
    }

    setIsSubmitting(true);
    const success = await onAdd({
      objection_text: objectionText.trim(),
      category,
      difficulty,
      context: context.trim() || undefined
    });

    if (success) {
      toast.success('Objection added successfully!');
      setObjectionText('');
      setCategory('');
      setDifficulty('');
      setContext('');
      onClose();
    } else {
      toast.error('Failed to add objection');
    }
    setIsSubmitting(false);
  };

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-lg bg-card border-border">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-foreground">
            <Shield className="h-5 w-5 text-primary" />
            Add New Objection
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="objection-text">Objection Text *</Label>
            <Input
              id="objection-text"
              placeholder="e.g., Your price is too high"
              value={objectionText}
              onChange={(e) => setObjectionText(e.target.value)}
              className="bg-background border-border"
            />
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Category *</Label>
              <Select value={category} onValueChange={(value) => setCategory(value as ObjectionCategory)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select category" />
                </SelectTrigger>
                <SelectContent>
                  {categories.map(cat => (
                    <SelectItem key={cat.value} value={cat.value}>
                      {cat.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            <div className="space-y-2">
              <Label>Difficulty *</Label>
              <Select value={difficulty} onValueChange={(value) => setDifficulty(value as ObjectionDifficulty)}>
                <SelectTrigger className="bg-background border-border">
                  <SelectValue placeholder="Select difficulty" />
                </SelectTrigger>
                <SelectContent>
                  {difficulties.map(diff => (
                    <SelectItem key={diff.value} value={diff.value}>
                      {diff.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>

          <div className="space-y-2">
            <Label htmlFor="context">Why prospects say this (optional)</Label>
            <Textarea
              id="context"
              placeholder="Explain the psychology behind this objection..."
              value={context}
              onChange={(e) => setContext(e.target.value)}
              className="bg-background border-border min-h-[100px]"
            />
          </div>
        </div>

        <div className="flex justify-end gap-3">
          <Button variant="outline" onClick={onClose}>
            Cancel
          </Button>
          <Button onClick={handleSubmit} disabled={isSubmitting}>
            {isSubmitting && <Loader2 className="h-4 w-4 mr-2 animate-spin" />}
            Add Objection
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
