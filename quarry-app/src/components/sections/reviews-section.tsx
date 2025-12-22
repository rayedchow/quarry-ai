"use client";

import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { api } from "@/lib/api";
import { Button } from "@/components/ui/button";
import { Star, ThumbsUp, Shield, Loader2 } from "lucide-react";

interface Review {
  id: string;
  reviewer_wallet: string;
  rating: number;
  review_text: string;
  review_text_cid: string;
  usage_receipt_attestation: string;
  review_attestation_id: string;
  helpful_count: number;
  created_at: string;
  is_verified_purchaser: boolean;
  time_ago: string;
}

interface ReviewsData {
  reviews: Review[];
  total_reviews: number;
  average_rating: number;
  rating_distribution: { [key: number]: number };
}

interface ReviewsSectionProps {
  datasetId: string;
  datasetVersion?: string;
}

export function ReviewsSection({ datasetId, datasetVersion = "v1" }: ReviewsSectionProps) {
  const { publicKey } = useWallet();
  const [reviews, setReviews] = useState<ReviewsData | null>(null);
  const [loading, setLoading] = useState(true);
  const [showReviewForm, setShowReviewForm] = useState(false);
  const [rating, setRating] = useState(5);
  const [reviewText, setReviewText] = useState("");
  const [submitting, setSubmitting] = useState(false);
  const [canReview, setCanReview] = useState(false);
  const [checkingEligibility, setCheckingEligibility] = useState(false);

  useEffect(() => {
    loadReviews();
  }, [datasetId]);

  useEffect(() => {
    if (publicKey) {
      checkEligibility();
    }
  }, [publicKey, datasetId]);

  const loadReviews = async () => {
    try {
      const data = await api.getDatasetReviews(datasetId, datasetVersion);
      setReviews(data);
    } catch (error) {
      console.error("Failed to load reviews:", error);
    } finally {
      setLoading(false);
    }
  };

  const checkEligibility = async () => {
    if (!publicKey) return;
    
    setCheckingEligibility(true);
    try {
      const result = await api.checkReviewEligibility(datasetId, publicKey.toBase58());
      setCanReview(result.can_review);
    } catch (error) {
      console.warn("Failed to check eligibility:", error);
      setCanReview(false);
    } finally {
      setCheckingEligibility(false);
    }
  };

  const submitReview = async () => {
    if (!publicKey || !reviewText.trim() || submitting) return;

    setSubmitting(true);
    try {
      // Get the actual usage receipt from eligibility check
      const eligibilityResult = await api.checkReviewEligibility(datasetId, publicKey.toBase58());
      
      if (!eligibilityResult.can_review || !eligibilityResult.usage_receipt_attestation) {
        alert("You need to use this dataset before you can review it. Query some data in the agent first!");
        setSubmitting(false);
        return;
      }

      const receipt = eligibilityResult.usage_receipt_attestation;
      
      await api.createReview(
        datasetId,
        publicKey.toBase58(),
        rating,
        reviewText,
        receipt,
        datasetVersion
      );

      // Reload reviews
      await loadReviews();
      
      // Reset form
      setReviewText("");
      setRating(5);
      setShowReviewForm(false);
      setCanReview(false);
    } catch (error: any) {
      alert(`Failed to submit review: ${error.message || "Unknown error"}`);
    } finally {
      setSubmitting(false);
    }
  };

  const markHelpful = async (reviewId: string) => {
    if (!publicKey) return;

    try {
      await api.markReviewHelpful(reviewId, publicKey.toBase58());
      // Reload reviews to show updated count
      await loadReviews();
    } catch (error: any) {
      console.error("Failed to mark helpful:", error);
    }
  };

  const renderStars = (count: number, interactive: boolean = false, onRate?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            onClick={() => interactive && onRate && onRate(star)}
            disabled={!interactive}
            className={`${interactive ? 'cursor-pointer hover:scale-110' : ''} transition-transform`}
          >
            <Star
              className={`h-5 w-5 ${
                star <= count
                  ? "fill-yellow-400 text-yellow-400"
                  : "fill-none text-white/20"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  if (loading) {
    return (
      <div className="glass-panel p-8">
        <div className="flex items-center justify-center py-8">
          <Loader2 className="h-8 w-8 text-cyan-400 animate-spin" />
        </div>
      </div>
    );
  }

  return (
    <div className="glass-panel p-8 space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <p className="section-label">User reviews</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">
            Community Feedback
          </h2>
        </div>
        {reviews && reviews.total_reviews > 0 && (
          <div className="text-right">
            <div className="flex items-center gap-2">
              {renderStars(Math.round(reviews.average_rating))}
              <span className="text-2xl font-bold text-white">
                {reviews.average_rating.toFixed(1)}
              </span>
            </div>
            <p className="text-sm text-white/50 mt-1">
              {reviews.total_reviews} verified review{reviews.total_reviews !== 1 ? 's' : ''}
            </p>
          </div>
        )}
      </div>

      {/* Trust Banner */}
      {reviews && reviews.reviews.length > 0 && (
        <div className="bg-gradient-to-r from-green-500/10 to-cyan-500/10 border border-green-500/20 rounded-lg p-4">
          <div className="flex items-start gap-3">
            <Shield className="h-5 w-5 text-green-400 flex-shrink-0 mt-0.5" />
            <div className="flex-1">
              <p className="text-sm font-medium text-white mb-1">
                🛡️ 100% Verified Reviews with Blockchain Proof
              </p>
              <p className="text-xs text-white/60 leading-relaxed">
                Every review is from someone who provably paid for and used this dataset. 
                Click any <span className="text-green-400 font-medium">"Verified Purchase"</span> badge 
                to see the on-chain payment proof on Solana Explorer. Cannot be faked or manipulated.
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Verified Purchases Stats */}
      {reviews && reviews.reviews.length > 0 && (
        <div className="grid grid-cols-2 gap-4">
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-green-500/5 border border-green-500/20">
            <Shield className="h-5 w-5 text-green-400" />
            <div>
              <p className="text-xs text-white/50">Verified Purchases</p>
              <p className="text-lg font-semibold text-white">
                {reviews.reviews.filter(r => r.is_verified_purchaser).length}
              </p>
            </div>
          </div>
          <div className="flex items-center gap-3 px-4 py-3 rounded-lg bg-cyan-500/5 border border-cyan-500/20">
            <svg className="h-5 w-5 text-cyan-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <div>
              <p className="text-xs text-white/50">On-Chain Proof</p>
              <p className="text-lg font-semibold text-white">100%</p>
            </div>
          </div>
        </div>
      )}

      {/* Write Review Button */}
      {publicKey && canReview && !showReviewForm && (
        <Button
          onClick={() => setShowReviewForm(true)}
          className="btn-primary w-full"
        >
          <Shield className="h-4 w-4" />
          Write Verified Review
        </Button>
      )}

      {/* Review Form */}
      {showReviewForm && (
        <div className="border border-white/10 rounded-lg p-6 bg-white/[0.02] space-y-4">
          <div>
            <label className="text-sm text-white/70 mb-2 block">Your Rating</label>
            {renderStars(rating, true, setRating)}
          </div>

          <div>
            <label className="text-sm text-white/70 mb-2 block">Your Review</label>
            <textarea
              value={reviewText}
              onChange={(e) => setReviewText(e.target.value)}
              placeholder="Share your experience with this dataset..."
              className="w-full min-h-[120px] px-4 py-3 bg-white/[0.05] border border-white/10 rounded-lg text-white placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-cyan-500/50"
              maxLength={2000}
            />
            <p className="text-xs text-white/40 mt-1">
              {reviewText.length} / 2000 characters
            </p>
          </div>

          <div className="flex gap-3">
            <Button
              onClick={submitReview}
              disabled={submitting || !reviewText.trim()}
              className="btn-primary flex-1"
            >
              {submitting ? (
                <>
                  <Loader2 className="h-4 w-4 animate-spin" />
                  Submitting to chain...
                </>
              ) : (
                <>
                  <Shield className="h-4 w-4" />
                  Submit On-Chain Review
                </>
              )}
            </Button>
            <Button
              onClick={() => setShowReviewForm(false)}
              variant="outline"
              disabled={submitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {reviews && reviews.reviews.length > 0 ? (
        <div className="space-y-4">
          {reviews.reviews.map((review) => (
            <div
              key={review.id}
              className="border border-white/10 rounded-lg p-6 bg-white/[0.02] space-y-3"
            >
              <div className="flex items-start justify-between">
                <div className="flex-1">
                  <div className="flex items-center gap-3 mb-2 flex-wrap">
                    {renderStars(review.rating)}
                    {review.is_verified_purchaser && review.usage_receipt_attestation && (
                      <a
                        href={`https://explorer.solana.com/tx/${review.usage_receipt_attestation}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-green-500/10 border border-green-500/30 hover:bg-green-500/20 hover:border-green-500/50 transition-all group"
                        title="This reviewer provably purchased data from this dataset. Click to verify payment on Solana blockchain."
                      >
                        <Shield className="h-3.5 w-3.5 text-green-400 group-hover:scale-110 transition-transform" />
                        <span className="text-xs font-medium text-green-400">Verified Purchase</span>
                        <svg className="h-3 w-3 text-green-400/60 group-hover:text-green-400 transition-colors" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                        </svg>
                      </a>
                    )}
                  </div>
                  <p className="text-sm text-white/80 leading-relaxed">{review.review_text}</p>
                </div>
              </div>

              <div className="flex items-center justify-between pt-3 border-t border-white/5">
                <div className="flex items-center gap-4 text-xs text-white/40">
                  <span className="font-mono">{review.reviewer_wallet.slice(0, 4)}...{review.reviewer_wallet.slice(-4)}</span>
                  <span>•</span>
                  <span>{review.time_ago}</span>
                  {review.is_verified_purchaser && review.usage_receipt_attestation && (
                    <>
                      <span>•</span>
                      <a
                        href={`https://explorer.solana.com/tx/${review.usage_receipt_attestation}`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="flex items-center gap-1 hover:text-green-400 transition-colors group"
                        title="View proof of purchase on Solana blockchain"
                      >
                        <Shield className="h-3 w-3" />
                        <span className="font-medium">Verify on Solana</span>
                      </a>
                    </>
                  )}
                  <span>•</span>
                  <a
                    href={`https://ipfs.io/ipfs/${review.review_text_cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
                    title="View review on IPFS"
                  >
                    IPFS
                  </a>
                </div>
                
                <button
                  onClick={() => markHelpful(review.id)}
                  className="flex items-center gap-2 px-3 py-1.5 rounded-lg hover:bg-white/[0.05] transition-colors group"
                  disabled={!publicKey}
                >
                  <ThumbsUp className="h-4 w-4 text-white/40 group-hover:text-cyan-400 transition-colors" />
                  <span className="text-sm text-white/60 group-hover:text-white transition-colors">
                    {review.helpful_count}
                  </span>
                </button>
              </div>
            </div>
          ))}
        </div>
      ) : (
        <div className="border border-white/10 rounded-lg p-8 text-center bg-white/[0.02]">
          <Star className="h-12 w-12 text-white/20 mx-auto mb-3" />
          <p className="text-white/60">No reviews yet</p>
          <p className="text-sm text-white/40 mt-2">
            Be the first to review this dataset after using it!
          </p>
        </div>
      )}

      {/* Not Eligible Message */}
      {publicKey && !canReview && !showReviewForm && !checkingEligibility && (
        <div className="border border-yellow-500/20 bg-yellow-500/5 rounded-lg p-4 text-center">
          <p className="text-sm text-yellow-200/80">
            💡 Use this dataset to leave a verified review
          </p>
          <p className="text-xs text-yellow-200/60 mt-1">
            Query the data in the agent to earn your review badge
          </p>
        </div>
      )}
    </div>
  );
}


