import { useState } from "react";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ViperCard, ViperCardContent, ViperCardHeader, ViperCardTitle } from "@/components/ui/viper-card";
import { Calculator, TrendingUp, DollarSign, PiggyBank } from "lucide-react";

export function CalculatorsTab() {
  // ROI Calculator state
  const [roiInputs, setRoiInputs] = useState({
    numReps: 10,
    avgQuota: 500000,
    productivityGain: 20
  });

  // Payment Calculator state
  const [paymentInputs, setPaymentInputs] = useState({
    totalPrice: 50000,
    termMonths: 12,
    interestRate: 0
  });

  // Savings Calculator state
  const [savingsInputs, setSavingsInputs] = useState({
    currentSpend: 10000,
    ourPrice: 5000,
    additionalSavings: 2000
  });

  // Calculations
  const roiResult = {
    additionalRevenue: (roiInputs.numReps * roiInputs.avgQuota * (roiInputs.productivityGain / 100)),
    perRepIncrease: (roiInputs.avgQuota * (roiInputs.productivityGain / 100))
  };

  const paymentResult = {
    monthlyPayment: paymentInputs.totalPrice / paymentInputs.termMonths,
    totalCost: paymentInputs.totalPrice * (1 + paymentInputs.interestRate / 100)
  };

  const savingsResult = {
    monthlySavings: savingsInputs.currentSpend - savingsInputs.ourPrice + savingsInputs.additionalSavings,
    annualSavings: (savingsInputs.currentSpend - savingsInputs.ourPrice + savingsInputs.additionalSavings) * 12,
    percentSavings: ((savingsInputs.currentSpend - savingsInputs.ourPrice) / savingsInputs.currentSpend) * 100
  };

  const formatCurrency = (value: number) => 
    new Intl.NumberFormat('en-US', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 }).format(value);

  return (
    <Tabs defaultValue="roi" className="w-full">
      <TabsList className="grid w-full grid-cols-3 bg-muted/50">
        <TabsTrigger value="roi" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          ROI
        </TabsTrigger>
        <TabsTrigger value="payment" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Payment
        </TabsTrigger>
        <TabsTrigger value="savings" className="text-xs data-[state=active]:bg-primary data-[state=active]:text-primary-foreground">
          Savings
        </TabsTrigger>
      </TabsList>

      {/* ROI Calculator */}
      <TabsContent value="roi" className="mt-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Number of Sales Reps</Label>
            <Input
              type="number"
              value={roiInputs.numReps}
              onChange={(e) => setRoiInputs(prev => ({ ...prev, numReps: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Average Annual Quota ($)</Label>
            <Input
              type="number"
              value={roiInputs.avgQuota}
              onChange={(e) => setRoiInputs(prev => ({ ...prev, avgQuota: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Expected Productivity Gain (%)</Label>
            <Input
              type="number"
              value={roiInputs.productivityGain}
              onChange={(e) => setRoiInputs(prev => ({ ...prev, productivityGain: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
        </div>

        <ViperCard variant="glow" className="bg-success/10 border-success/30">
          <ViperCardContent className="pt-4">
            <div className="flex items-center gap-2 text-success mb-2">
              <TrendingUp className="h-4 w-4" />
              <span className="text-sm font-semibold">Projected Annual Impact</span>
            </div>
            <p className="text-2xl font-bold text-success">
              {formatCurrency(roiResult.additionalRevenue)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(roiResult.perRepIncrease)} additional per rep
            </p>
          </ViperCardContent>
        </ViperCard>
      </TabsContent>

      {/* Payment Calculator */}
      <TabsContent value="payment" className="mt-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Total Price ($)</Label>
            <Input
              type="number"
              value={paymentInputs.totalPrice}
              onChange={(e) => setPaymentInputs(prev => ({ ...prev, totalPrice: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Term (months)</Label>
            <Input
              type="number"
              value={paymentInputs.termMonths}
              onChange={(e) => setPaymentInputs(prev => ({ ...prev, termMonths: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Interest Rate (%)</Label>
            <Input
              type="number"
              value={paymentInputs.interestRate}
              onChange={(e) => setPaymentInputs(prev => ({ ...prev, interestRate: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
        </div>

        <ViperCard variant="glow" className="bg-primary/10 border-primary/30">
          <ViperCardContent className="pt-4">
            <div className="flex items-center gap-2 text-primary mb-2">
              <DollarSign className="h-4 w-4" />
              <span className="text-sm font-semibold">Monthly Payment</span>
            </div>
            <p className="text-2xl font-bold text-primary">
              {formatCurrency(paymentResult.monthlyPayment)}
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              Total: {formatCurrency(paymentResult.totalCost)}
            </p>
          </ViperCardContent>
        </ViperCard>
      </TabsContent>

      {/* Savings Calculator */}
      <TabsContent value="savings" className="mt-4 space-y-4">
        <div className="space-y-3">
          <div className="space-y-1.5">
            <Label className="text-xs">Current Monthly Spend ($)</Label>
            <Input
              type="number"
              value={savingsInputs.currentSpend}
              onChange={(e) => setSavingsInputs(prev => ({ ...prev, currentSpend: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Our Monthly Price ($)</Label>
            <Input
              type="number"
              value={savingsInputs.ourPrice}
              onChange={(e) => setSavingsInputs(prev => ({ ...prev, ourPrice: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
          <div className="space-y-1.5">
            <Label className="text-xs">Additional Savings from Efficiency ($)</Label>
            <Input
              type="number"
              value={savingsInputs.additionalSavings}
              onChange={(e) => setSavingsInputs(prev => ({ ...prev, additionalSavings: Number(e.target.value) }))}
              className="bg-background border-border"
            />
          </div>
        </div>

        <ViperCard variant="glow" className="bg-emerald-500/10 border-emerald-500/30">
          <ViperCardContent className="pt-4">
            <div className="flex items-center gap-2 text-emerald-400 mb-2">
              <PiggyBank className="h-4 w-4" />
              <span className="text-sm font-semibold">Total Savings</span>
            </div>
            <p className="text-2xl font-bold text-emerald-400">
              {formatCurrency(savingsResult.annualSavings)}/year
            </p>
            <p className="text-xs text-muted-foreground mt-1">
              {formatCurrency(savingsResult.monthlySavings)}/month • {savingsResult.percentSavings.toFixed(0)}% reduction
            </p>
          </ViperCardContent>
        </ViperCard>
      </TabsContent>
    </Tabs>
  );
}
