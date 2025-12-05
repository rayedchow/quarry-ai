"use client";

import React, { useState } from "react";
import { DatasetReputation, api } from "@/lib/api";
import { ReputationBadgeComponent } from "@/components/ui/reputation-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";

interface ReputationPanelProps {
  reputation: DatasetReputation;
}

export function ReputationPanel({ reputation }: ReputationPanelProps) {
  const [qaReport, setQaReport] = useState<any>(null);
  const [loadingReport, setLoadingReport] = useState(false);

  const loadQAReport = async () => {
    if (qaReport) return;
    
    setLoadingReport(true);
    try {
      const report = await api.getIPFSContent(reputation.qa_report.ipfs_cid);
      setQaReport(report);
    } catch (error) {
      console.error("Failed to load QA report:", error);
    } finally {
      setLoadingReport(false);
    }
  };

  const getScoreColor = (score: number) => {
    if (score >= 90) return "text-green-600";
    if (score >= 75) return "text-yellow-600";
    return "text-red-600";
  };

  const getScoreLabel = (score: number) => {
    if (score >= 90) return "Excellent";
    if (score >= 75) return "Good";
    if (score >= 60) return "Fair";
    return "Poor";
  };

  return (
    <div className="space-y-6">
      {/* Badges */}
      {reputation.badges && reputation.badges.length > 0 && (
        <div>
          <h3 className="text-sm font-medium mb-3">Reputation Badges</h3>
          <div className="flex flex-wrap gap-2">
            {reputation.badges.map((badge, index) => (
              <ReputationBadgeComponent key={index} badge={badge} />
            ))}
          </div>
        </div>
      )}

      {/* QA Summary */}
      {reputation.qa_report?.summary && (
        <div>
          <h3 className="text-sm font-medium mb-3">Quality Checks</h3>
          <div className="grid grid-cols-2 gap-4">
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Completeness</p>
              <p className="font-medium capitalize">{reputation.qa_report.summary.completeness}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Duplicates</p>
              <p className="font-medium capitalize">{reputation.qa_report.summary.duplicates}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">PII Risk</p>
              <p className="font-medium capitalize">{reputation.qa_report.summary.pii_risk}</p>
            </div>
            <div className="p-4 bg-muted/50 rounded-lg">
              <p className="text-xs text-muted-foreground mb-1">Freshness</p>
              <p className="font-medium capitalize">{reputation.qa_report.summary.freshness}</p>
            </div>
          </div>
        </div>
      )}

      {/* Attestations */}
      {reputation.attestations && (
        <div>
          <h3 className="text-sm font-medium mb-3">On-Chain Attestations</h3>
          <div className="space-y-3">
            {reputation.attestations.quality && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Quality Attestation</p>
                  <span className="text-xs text-green-600">✓ Valid</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Schema: {reputation.attestations.quality.schema}</p>
                  <p className="font-mono truncate">
                    ID: {reputation.attestations.quality.id}
                  </p>
                  <p>Issued: {new Date(reputation.attestations.quality.issued_at).toLocaleDateString()}</p>
                  {reputation.attestations.quality.expires_at && (
                    <p>Expires: {new Date(reputation.attestations.quality.expires_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}

            {reputation.attestations.freshness && (
              <div className="p-4 border rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <p className="font-medium text-sm">Freshness Attestation</p>
                  <span className="text-xs text-green-600">✓ Valid</span>
                </div>
                <div className="space-y-1 text-xs text-muted-foreground">
                  <p>Schema: {reputation.attestations.freshness.schema}</p>
                  <p className="font-mono truncate">
                    ID: {reputation.attestations.freshness.id}
                  </p>
                  <p>Issued: {new Date(reputation.attestations.freshness.issued_at).toLocaleDateString()}</p>
                  {reputation.attestations.freshness.expires_at && (
                    <p>Expires: {new Date(reputation.attestations.freshness.expires_at).toLocaleDateString()}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Full QA Report */}
      {reputation.qa_report?.ipfs_cid && (
        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium">Full QA Report</h3>
            <a
              href={`https://ipfs.io/ipfs/${reputation.qa_report.ipfs_cid}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-xs text-cyan-400 hover:text-cyan-300 transition-colors"
            >
              View on IPFS →
            </a>
          </div>
          
          {!qaReport ? (
            <Button 
              variant="outline" 
              className="w-full" 
              onClick={loadQAReport}
              disabled={loadingReport}
            >
              {loadingReport ? (
                <>
                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-current mr-2"></div>
                  Loading Report...
                </>
              ) : (
                "Load Full QA Report"
              )}
            </Button>
          ) : (
            <div className="border border-white/10 rounded-lg overflow-hidden">
              <div className="max-h-[400px] overflow-y-auto bg-black/20 p-4">
                <pre className="text-xs text-white/80 overflow-x-auto">
                  {JSON.stringify(qaReport, null, 2)}
                </pre>
              </div>
              <div className="p-3 bg-white/[0.02] border-t border-white/10 flex items-center justify-between">
                <span className="text-xs text-white/40 font-mono">
                  {reputation.qa_report.ipfs_cid}
                </span>
                <Button
                  variant="ghost"
                  size="sm"
                  onClick={() => setQaReport(null)}
                  className="text-xs"
                >
                  Hide
                </Button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Dataset PDA */}
      {reputation.dataset_version_pda && (
        <div className="p-4 bg-muted/30 rounded-lg">
          <p className="text-xs text-muted-foreground mb-1">Dataset Version PDA</p>
          <p className="text-xs font-mono break-all">{reputation.dataset_version_pda}</p>
          <p className="text-xs text-muted-foreground mt-2">
            This is the stable on-chain identifier for this dataset version
          </p>
        </div>
      )}
    </div>
  );
}

