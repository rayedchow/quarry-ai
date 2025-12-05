"use client";

import { useState, useEffect } from "react";

const STORAGE_KEY = "quarry-attached-datasets";

export function useAttachedDatasets() {
  const [attachedSlugs, setAttachedSlugs] = useState<string[]>([]);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved) {
      try {
        setAttachedSlugs(JSON.parse(saved));
      } catch {
        setAttachedSlugs([]);
      }
    }

    // Listen for storage changes (cross-tab)
    const handleStorage = (e: StorageEvent) => {
      if (e.key === STORAGE_KEY && e.newValue) {
        try {
          setAttachedSlugs(JSON.parse(e.newValue));
        } catch {
          // ignore
        }
      }
    };

    // Custom event for same-tab updates
    const handleLocalUpdate = (e: CustomEvent<string[]>) => {
      setAttachedSlugs(e.detail);
    };

    window.addEventListener("storage", handleStorage);
    window.addEventListener("quarry-attached-update", handleLocalUpdate as EventListener);

    return () => {
      window.removeEventListener("storage", handleStorage);
      window.removeEventListener("quarry-attached-update", handleLocalUpdate as EventListener);
    };
  }, []);

  const toggleDataset = (slug: string) => {
    const newSlugs = attachedSlugs.includes(slug)
      ? attachedSlugs.filter((s) => s !== slug)
      : [...attachedSlugs, slug];
    
    setAttachedSlugs(newSlugs);
    localStorage.setItem(STORAGE_KEY, JSON.stringify(newSlugs));
    
    // Dispatch event for other components to update
    window.dispatchEvent(new CustomEvent("quarry-attached-update", { detail: newSlugs }));
  };

  const isAttached = (slug: string) => attachedSlugs.includes(slug);

  return {
    attachedSlugs,
    toggleDataset,
    isAttached,
    mounted,
  };
}

