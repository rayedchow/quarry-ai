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
      // For now, using a placeholder receipt - in production, get actual receipt from backend
      const receipt = "placeholder_receipt_attestation";
      
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
                  <div className="flex items-center gap-3 mb-2">
                    {renderStars(review.rating)}
                    {review.is_verified_purchaser && (
                      <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-green-500/10 border border-green-500/20">
                        <Shield className="h-3 w-3 text-green-400" />
                        <span className="text-xs text-green-400">Verified Purchaser</span>
                      </span>
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
                  <span>•</span>
                  <a
                    href={`https://ipfs.io/ipfs/${review.review_text_cid}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="hover:text-cyan-400 transition-colors"
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

