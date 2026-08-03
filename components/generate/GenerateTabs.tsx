"use client";

import { useState } from "react";
import { AdaptRecipeForm } from "@/components/generate/AdaptRecipeForm";
import { ScratchDishForm } from "@/components/generate/ScratchDishForm";
import { Tabs } from "@/components/ui/Tabs";

type GenerateTabsProps = {
  defaultTab?: "adapt" | "scratch";
};

export function GenerateTabs({ defaultTab = "adapt" }: GenerateTabsProps) {
  const [tab, setTab] = useState<"adapt" | "scratch">(defaultTab);

  return (
    <Tabs
      items={[
        { id: "adapt", label: "Adapt recipe" },
        { id: "scratch", label: "From scratch" },
      ]}
      value={tab}
      onChange={(id) => setTab(id as "adapt" | "scratch")}
    >
      {tab === "adapt" ? <AdaptRecipeForm /> : <ScratchDishForm />}
    </Tabs>
  );
}
