"use client";

import { useState, useRef } from "react";
import { useRouter } from "next/navigation";
import {
  Upload,
  Database,
  FileJson,
  Shield,
  Tag,
  Info,
  CheckCircle2,
  ArrowRight,
  Loader2,
  X,
  FileText,
  AlertCircle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import Link from "next/link";
import { api } from "@/lib/api";

export default function PublishDatasetPage() {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);
  
  const [dragActive, setDragActive] = useState(false);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  
  // Form fields
  const [name, setName] = useState("");
  const [publisher, setPublisher] = useState("");
  const [publisherWallet, setPublisherWallet] = useState("");
  const [description, setDescription] = useState("");
  const [tags, setTags] = useState("");
  const [pricePerRow, setPricePerRow] = useState("0.001");
  const [updateFrequency, setUpdateFrequency] = useState("static");

  const handleDrag = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (e.type === "dragenter" || e.type === "dragover") {
      setDragActive(true);
    } else if (e.type === "dragleave") {
      setDragActive(false);
    }
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    e.stopPropagation();
    setDragActive(false);
    
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const handleFileSelect = (file: File) => {
    const allowedExtensions = ['.csv', '.json', '.sql'];
    const fileExt = '.' + file.name.split('.').pop()?.toLowerCase();
    
    if (!allowedExtensions.includes(fileExt)) {
      setError(`Invalid file type. Allowed: ${allowedExtensions.join(', ')}`);
      return;
    }
    
    setSelectedFile(file);
    setError(null);
    
    // Auto-fill name from filename if empty
    if (!name) {
      const baseName = file.name.replace(/\.[^/.]+$/, "");
      setName(baseName.replace(/[-_]/g, ' ').replace(/\b\w/g, l => l.toUpperCase()));
    }
  };

  const handleFileInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      handleFileSelect(files[0]);
    }
  };

  const removeFile = () => {
    setSelectedFile(null);
    if (fileInputRef.current) {
      fileInputRef.current.value = "";
    }
  };

  const handleSubmit = async () => {
    if (!selectedFile) {
      setError("Please select a file to upload");
      return;
    }
    
    if (!name.trim()) {
      setError("Please enter a dataset name");
      return;
    }
    
    if (!publisher.trim()) {
      setError("Please enter a publisher name");
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const formData = new FormData();
      formData.append("file", selectedFile);
      formData.append("name", name.trim());
      formData.append("publisher", publisher.trim());
      formData.append("publisher_wallet", publisherWallet.trim());
      formData.append("description", description.trim());
      formData.append("tags", tags);
      formData.append("price_per_row", pricePerRow);
      formData.append("update_frequency", updateFrequency);

      const response = await api.createDataset(formData);
      
      setSuccess(true);
      
      // Redirect to the new dataset page after a brief delay
      setTimeout(() => {
        router.push(`/datasets/${response.dataset.slug}`);
      }, 1500);
    } catch (err) {
      setError(err instanceof Error ? err.message : "Failed to upload dataset");
    } finally {
      setUploading(false);
    }
  };

  const getFileIcon = () => {
    if (!selectedFile) return <Upload className="h-7 w-7 text-white/50" />;
    const ext = selectedFile.name.split('.').pop()?.toLowerCase();
    return <FileText className="h-7 w-7 text-cyan-400" />;
  };

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  if (success) {
    return (
      <div className="min-h-[60vh] flex items-center justify-center">
        <div className="glass-panel p-12 text-center max-w-md">
          <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-full bg-emerald-500/20 mb-6">
            <CheckCircle2 className="h-8 w-8 text-emerald-400" />
          </div>
          <h2 className="text-2xl font-semibold text-white mb-2">Dataset Published!</h2>
          <p className="text-white/50 mb-6">
            Your dataset has been successfully uploaded and is now available in the marketplace.
          </p>
          <div className="flex items-center justify-center gap-2 text-cyan-400">
            <Loader2 className="h-4 w-4 animate-spin" />
            <span className="text-sm">Redirecting...</span>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-12 py-8">
      {/* Hero Section */}
      <div className="glass-panel p-8 md:p-10 space-y-6">
        <div className="space-y-4">
          <div className="inline-flex items-center gap-2 rounded-full border border-violet-500/20 bg-violet-500/10 px-4 py-1.5">
            <Upload className="h-3.5 w-3.5 text-violet-400" />
            <span className="text-xs font-medium text-violet-400">
              Publish Dataset
            </span>
          </div>

          <h1 className="text-3xl md:text-4xl font-semibold tracking-tight text-white">
            Share your data securely.
            <br />
            <span className="text-gradient-accent">Keep full control.</span>
          </h1>

          <p className="max-w-2xl text-white/60 leading-relaxed">
            Upload your data file and let AI agents query your data without ever
            exposing raw rows. You maintain complete ownership and control.
          </p>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div className="glass-panel p-4 border-red-500/20 bg-red-500/5">
          <div className="flex items-center gap-3">
            <AlertCircle className="h-5 w-5 text-red-400 shrink-0" />
            <p className="text-red-400 flex-1">{error}</p>
            <button onClick={() => setError(null)} className="text-red-400/70 hover:text-red-400">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {/* Upload Form */}
      <div className="grid gap-8 lg:grid-cols-3">
        {/* Main Upload Area */}
        <div className="lg:col-span-2 space-y-6">
          {/* File Upload */}
          <div className="glass-panel p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-cyan-500/20 to-blue-500/20 border border-white/10">
                <FileJson className="h-5 w-5 text-cyan-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Upload Data File
                </h2>
                <p className="text-sm text-white/50">
                  JSON, CSV, or SQL DDL supported
                </p>
              </div>
            </div>

            <div
              className={`relative rounded-2xl border-2 border-dashed p-12 text-center transition-all duration-300 ${
                dragActive
                  ? "border-cyan-500/60 bg-cyan-500/10"
                  : selectedFile
                  ? "border-emerald-500/40 bg-emerald-500/5"
                  : "border-white/10 bg-white/[0.02] hover:border-white/20 hover:bg-white/[0.04]"
              }`}
              onDragEnter={handleDrag}
              onDragLeave={handleDrag}
              onDragOver={handleDrag}
              onDrop={handleDrop}
            >
              <input
                ref={fileInputRef}
                type="file"
                className="absolute inset-0 cursor-pointer opacity-0"
                accept=".json,.csv,.sql"
                onChange={handleFileInputChange}
              />
              
              {selectedFile ? (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-emerald-500/20 to-cyan-500/20 border border-emerald-500/20">
                    {getFileIcon()}
                  </div>
                  <div>
                    <p className="text-white font-medium">{selectedFile.name}</p>
                    <p className="mt-1 text-sm text-white/40">
                      {formatFileSize(selectedFile.size)}
                    </p>
                  </div>
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeFile();
                    }}
                    className="text-white/50 hover:text-red-400"
                  >
                    <X className="h-4 w-4 mr-1" />
                    Remove file
                  </Button>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="mx-auto flex h-16 w-16 items-center justify-center rounded-2xl bg-gradient-to-br from-white/[0.08] to-white/[0.02] border border-white/10">
                    <Upload className="h-7 w-7 text-white/50" />
                  </div>
                  <div>
                    <p className="text-white/80 font-medium">
                      Drop your data file here
                    </p>
                    <p className="mt-1 text-sm text-white/40">
                      or click to browse
                    </p>
                  </div>
                  <div className="flex flex-wrap justify-center gap-2">
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                      .json
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                      .csv
                    </span>
                    <span className="rounded-full border border-white/10 bg-white/[0.04] px-3 py-1 text-xs text-white/50">
                      .sql
                    </span>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Dataset Details */}
          <div className="glass-panel p-6 md:p-8 space-y-6">
            <div className="flex items-center gap-3">
              <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-violet-500/20 to-fuchsia-500/20 border border-white/10">
                <Database className="h-5 w-5 text-violet-400" />
              </div>
              <div>
                <h2 className="text-lg font-semibold text-white">
                  Dataset Details
                </h2>
                <p className="text-sm text-white/50">
                  Help others discover your data
                </p>
              </div>
            </div>

            <div className="space-y-5">
              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Dataset Name <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={name}
                  onChange={(e) => setName(e.target.value)}
                  placeholder="e.g., Global Weather Observations"
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Publisher <span className="text-red-400">*</span>
                </label>
                <input
                  type="text"
                  value={publisher}
                  onChange={(e) => setPublisher(e.target.value)}
                  placeholder="e.g., Your Organization Name"
                  className="input-field"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                  Publisher Wallet <span className="text-red-400">*</span>
                  <span className="text-xs text-cyan-400 font-normal">(Receives payments)</span>
                </label>
                <input
                  type="text"
                  value={publisherWallet}
                  onChange={(e) => setPublisherWallet(e.target.value)}
                  placeholder="Your Solana wallet address (e.g., 7xKxD...abc123)"
                  className="input-field font-mono text-sm"
                  required
                />
                <p className="text-xs text-white/40 flex items-start gap-1.5">
                  <Info className="h-3.5 w-3.5 mt-0.5 flex-shrink-0" />
                  <span>Payments for dataset queries will be sent directly to this wallet address</span>
                </p>
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70">
                  Description
                </label>
                <textarea
                  rows={4}
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  placeholder="Describe what's in your dataset, how it was collected, and potential use cases..."
                  className="input-field resize-none"
                />
              </div>

              <div className="space-y-2">
                <label className="text-sm font-medium text-white/70 flex items-center gap-2">
                  <Tag className="h-3.5 w-3.5" />
                  Tags
                </label>
                <input
                  type="text"
                  value={tags}
                  onChange={(e) => setTags(e.target.value)}
                  placeholder="e.g., weather, climate, time-series (comma separated)"
                  className="input-field"
                />
              </div>

              <div className="grid gap-5 sm:grid-cols-2">
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Price per Row (SOL)
                  </label>
                  <input
                    type="number"
                    step="0.0001"
                    min="0"
                    value={pricePerRow}
                    onChange={(e) => setPricePerRow(e.target.value)}
                    placeholder="0.001"
                    className="input-field"
                  />
                </div>
                <div className="space-y-2">
                  <label className="text-sm font-medium text-white/70">
                    Update Frequency
                  </label>
                  <select
                    value={updateFrequency}
                    onChange={(e) => setUpdateFrequency(e.target.value)}
                    className="input-field"
                  >
                    <option value="static">Static</option>
                    <option value="realtime">Real-time</option>
                    <option value="daily">Daily</option>
                    <option value="weekly">Weekly</option>
                    <option value="monthly">Monthly</option>
                  </select>
                </div>
              </div>
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex justify-end gap-4">
            <Button className="btn-secondary" asChild>
              <Link href="/datasets">Cancel</Link>
            </Button>
            <Button
              className="btn-primary"
              onClick={handleSubmit}
              disabled={uploading || !selectedFile || !name.trim() || !publisher.trim()}
            >
              {uploading ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Uploading...
                </>
              ) : (
                <>
                  <Upload className="h-4 w-4" />
                  Publish Dataset
                  <ArrowRight className="h-4 w-4" />
                </>
              )}
            </Button>
          </div>
        </div>

        {/* Sidebar */}
        <div className="space-y-6">
          {/* How it works */}
          <div className="glass-panel p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Info className="h-4 w-4 text-cyan-400" />
              How it works
            </h3>
            <div className="space-y-4">
              {[
                {
                  step: "1",
                  title: "Upload data file",
                  desc: "CSV, JSON, or SQL DDL file",
                },
                {
                  step: "2",
                  title: "Auto-detect schema",
                  desc: "We extract columns and types automatically",
                },
                {
                  step: "3",
                  title: "Convert to Parquet",
                  desc: "Optimized storage for fast queries",
                },
                {
                  step: "4",
                  title: "Go live",
                  desc: "Agents can now discover and query your data",
                },
              ].map((item) => (
                <div key={item.step} className="flex gap-3">
                  <div className="flex h-6 w-6 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-cyan-500/20 to-violet-500/20 border border-white/10 text-xs font-medium text-cyan-400">
                    {item.step}
                  </div>
                  <div>
                    <p className="text-sm font-medium text-white">
                      {item.title}
                    </p>
                    <p className="text-xs text-white/50">{item.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Security Features */}
          <div className="glass-panel p-6 space-y-5">
            <h3 className="text-sm font-semibold text-white flex items-center gap-2">
              <Shield className="h-4 w-4 text-violet-400" />
              Security guarantees
            </h3>
            <div className="space-y-3">
              {[
                "Raw data never leaves your vault",
                "End-to-end encryption",
                "Audit logs for all queries",
                "Revoke access anytime",
              ].map((feature) => (
                <div
                  key={feature}
                  className="flex items-center gap-2 text-sm text-white/60"
                >
                  <CheckCircle2 className="h-4 w-4 text-emerald-400/70" />
                  {feature}
                </div>
              ))}
            </div>
          </div>

          {/* Supported Formats */}
          <div className="glass-panel p-6 space-y-4">
            <h3 className="text-sm font-semibold text-white">
              Supported formats
            </h3>
            <div className="space-y-3 text-sm">
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="font-medium text-white">.csv</p>
                <p className="text-xs text-white/40 mt-1">Standard CSV with headers</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="font-medium text-white">.json</p>
                <p className="text-xs text-white/40 mt-1">Array of objects or schema definition</p>
              </div>
              <div className="p-3 rounded-lg bg-white/[0.03] border border-white/5">
                <p className="font-medium text-white">.sql</p>
                <p className="text-xs text-white/40 mt-1">CREATE TABLE DDL statements</p>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
