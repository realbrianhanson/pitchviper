import { useState, useEffect } from "react";
import { Building2, Save, Plus, X } from "lucide-react";
import { ViperCard } from "@/components/ui/viper-card";
import { ViperButton } from "@/components/ui/viper-button";
import { ViperInput } from "@/components/ui/viper-input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Badge } from "@/components/ui/badge";
import { Separator } from "@/components/ui/separator";
import { useCompanySettings } from "@/hooks/useCompanySettings";

export function CompanyProfileCard() {
  const { settings, isLoading, isSaving, saveSettings } = useCompanySettings();

  const [companyName, setCompanyName] = useState("");
  const [productDescription, setProductDescription] = useState("");
  const [valuePropositions, setValuePropositions] = useState<string[]>([]);
  const [commonUseCases, setCommonUseCases] = useState<string[]>([]);
  const [industry, setIndustry] = useState("");
  const [targetAudience, setTargetAudience] = useState("");

  const [newValueProp, setNewValueProp] = useState("");
  const [newUseCase, setNewUseCase] = useState("");

  useEffect(() => {
    if (settings) {
      setCompanyName(settings.company_name || "");
      setProductDescription(settings.product_description || "");
      setValuePropositions(settings.value_propositions || []);
      setCommonUseCases(settings.common_use_cases || []);
      setIndustry(settings.industry || "");
      setTargetAudience(settings.target_audience || "");
    }
  }, [settings]);

  const addValueProp = () => {
    if (newValueProp.trim() && !valuePropositions.includes(newValueProp.trim())) {
      setValuePropositions([...valuePropositions, newValueProp.trim()]);
      setNewValueProp("");
    }
  };

  const removeValueProp = (prop: string) => {
    setValuePropositions(valuePropositions.filter((p) => p !== prop));
  };

  const addUseCase = () => {
    if (newUseCase.trim() && !commonUseCases.includes(newUseCase.trim())) {
      setCommonUseCases([...commonUseCases, newUseCase.trim()]);
      setNewUseCase("");
    }
  };

  const removeUseCase = (useCase: string) => {
    setCommonUseCases(commonUseCases.filter((u) => u !== useCase));
  };

  const handleSave = () => {
    saveSettings({
      company_name: companyName,
      product_description: productDescription,
      value_propositions: valuePropositions,
      common_use_cases: commonUseCases,
      industry: industry || null,
      target_audience: targetAudience || null,
    });
  };

  if (isLoading) {
    return (
      <ViperCard className="p-6">
        <div className="animate-pulse space-y-4">
          <div className="h-6 bg-muted rounded w-1/3"></div>
          <div className="h-10 bg-muted rounded"></div>
          <div className="h-20 bg-muted rounded"></div>
        </div>
      </ViperCard>
    );
  }

  return (
    <ViperCard className="p-6">
      <div className="flex items-center gap-3 mb-6">
        <Building2 className="h-5 w-5 text-primary" />
        <div>
          <h2 className="text-lg font-semibold">Company Profile</h2>
          <p className="text-sm text-muted-foreground">
            This information is used to make roleplay scenarios more realistic
          </p>
        </div>
      </div>

      <div className="space-y-6">
        {/* Company Name */}
        <div className="space-y-2">
          <Label htmlFor="companyName">Company Name</Label>
          <ViperInput
            id="companyName"
            value={companyName}
            onChange={(e) => setCompanyName(e.target.value)}
            placeholder="e.g., Acme Software"
          />
        </div>

        {/* Industry */}
        <div className="space-y-2">
          <Label htmlFor="industry">Industry</Label>
          <ViperInput
            id="industry"
            value={industry}
            onChange={(e) => setIndustry(e.target.value)}
            placeholder="e.g., SaaS, Financial Services, Healthcare"
          />
        </div>

        {/* Target Audience */}
        <div className="space-y-2">
          <Label htmlFor="targetAudience">Target Audience</Label>
          <ViperInput
            id="targetAudience"
            value={targetAudience}
            onChange={(e) => setTargetAudience(e.target.value)}
            placeholder="e.g., Mid-market B2B companies, Enterprise IT teams"
          />
        </div>

        {/* Product Description */}
        <div className="space-y-2">
          <Label htmlFor="productDescription">Product/Service Description</Label>
          <Textarea
            id="productDescription"
            value={productDescription}
            onChange={(e) => setProductDescription(e.target.value)}
            placeholder="Describe what you sell in 2-3 sentences..."
            className="min-h-[100px] bg-background/50 border-border/50"
          />
          <p className="text-xs text-muted-foreground">
            Be concise - this helps the AI understand what you're selling
          </p>
        </div>

        <Separator />

        {/* Value Propositions */}
        <div className="space-y-3">
          <Label>Key Value Propositions</Label>
          <p className="text-xs text-muted-foreground">
            What are the main benefits your customers get?
          </p>
          
          <div className="flex flex-wrap gap-2">
            {valuePropositions.map((prop) => (
              <Badge
                key={prop}
                variant="secondary"
                className="gap-1 pr-1"
              >
                {prop}
                <button
                  onClick={() => removeValueProp(prop)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <ViperInput
              value={newValueProp}
              onChange={(e) => setNewValueProp(e.target.value)}
              placeholder="e.g., Saves 10 hours per week"
              onKeyDown={(e) => e.key === "Enter" && addValueProp()}
            />
            <ViperButton
              variant="outline"
              size="icon"
              onClick={addValueProp}
              disabled={!newValueProp.trim()}
            >
              <Plus className="h-4 w-4" />
            </ViperButton>
          </div>
        </div>

        <Separator />

        {/* Common Use Cases */}
        <div className="space-y-3">
          <Label>Common Use Cases</Label>
          <p className="text-xs text-muted-foreground">
            Typical scenarios where customers use your product
          </p>
          
          <div className="flex flex-wrap gap-2">
            {commonUseCases.map((useCase) => (
              <Badge
                key={useCase}
                variant="outline"
                className="gap-1 pr-1"
              >
                {useCase}
                <button
                  onClick={() => removeUseCase(useCase)}
                  className="ml-1 hover:bg-destructive/20 rounded-full p-0.5"
                >
                  <X className="h-3 w-3" />
                </button>
              </Badge>
            ))}
          </div>

          <div className="flex gap-2">
            <ViperInput
              value={newUseCase}
              onChange={(e) => setNewUseCase(e.target.value)}
              placeholder="e.g., Sales team automation"
              onKeyDown={(e) => e.key === "Enter" && addUseCase()}
            />
            <ViperButton
              variant="outline"
              size="icon"
              onClick={addUseCase}
              disabled={!newUseCase.trim()}
            >
              <Plus className="h-4 w-4" />
            </ViperButton>
          </div>
        </div>

        <Separator />

        <div className="flex justify-end">
          <ViperButton onClick={handleSave} disabled={isSaving} className="gap-2">
            <Save className="h-4 w-4" />
            {isSaving ? "Saving..." : "Save Company Profile"}
          </ViperButton>
        </div>
      </div>
    </ViperCard>
  );
}
