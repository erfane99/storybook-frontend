'use client';

import { User, Book, Palette, Image, Heart, Edit } from 'lucide-react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { StarRating } from './StarRating';
import { RatingData } from './RatingModal';

interface ExistingRatingProps {
  rating: RatingData & {
    created_at?: string;
    updated_at?: string;
  };
  onUpdateClick?: () => void;
}

export function ExistingRating({ rating, onUpdateClick }: ExistingRatingProps) {
  const ratings = [
    rating.character_consistency,
    rating.story_flow,
    rating.art_quality,
    rating.scene_consistency,
    rating.overall_experience,
  ];

  const averageRating = ratings.reduce((sum, r) => sum + r, 0) / ratings.length;

  const formatDate = (dateString?: string) => {
    if (!dateString) return '';
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
    });
  };

  const ratingDate = rating.updated_at || rating.created_at;

  return (
    <Card className="border-2">
      <CardHeader>
        <div className="flex items-start justify-between">
          <div>
            <CardTitle className="text-xl">Your Rating</CardTitle>
            {ratingDate && (
              <p className="text-sm text-muted-foreground mt-1">
                {rating.updated_at ? 'Updated' : 'Rated'} on {formatDate(ratingDate)}
              </p>
            )}
          </div>
          {onUpdateClick && (
            <Button variant="outline" size="sm" onClick={onUpdateClick}>
              <Edit className="h-4 w-4 mr-2" />
              Update
            </Button>
          )}
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <div className="bg-gradient-to-br from-yellow-50 to-orange-50 dark:from-yellow-950/20 dark:to-orange-950/20 rounded-lg p-6 text-center border border-yellow-200 dark:border-yellow-800">
          <p className="text-sm text-muted-foreground mb-2">Overall Rating</p>
          <div className="flex items-center justify-center gap-3">
            <span className="text-5xl font-bold text-yellow-600 dark:text-yellow-400">
              {averageRating.toFixed(1)}
            </span>
            <div className="flex flex-col items-start">
              <div className="flex">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className={`h-6 w-6 ${
                      i < Math.round(averageRating)
                        ? 'fill-yellow-400 text-yellow-400'
                        : 'fill-transparent text-gray-300 dark:text-gray-600'
                    }`}
                  />
                ))}
              </div>
              <span className="text-xs text-muted-foreground mt-1">out of 5 stars</span>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
            Category Ratings
          </h4>
          <div className="space-y-3">
            <StarRating
              value={rating.character_consistency}
              readonly
              label="Character Consistency"
              icon={<User className="h-4 w-4" />}
              size="sm"
            />
            <StarRating
              value={rating.story_flow}
              readonly
              label="Story Flow & Narrative"
              icon={<Book className="h-4 w-4" />}
              size="sm"
            />
            <StarRating
              value={rating.art_quality}
              readonly
              label="Art Quality & Visual Appeal"
              icon={<Palette className="h-4 w-4" />}
              size="sm"
            />
            <StarRating
              value={rating.scene_consistency}
              readonly
              label="Scene & Background Consistency"
              icon={<Image className="h-4 w-4" />}
              size="sm"
            />
            <StarRating
              value={rating.overall_experience}
              readonly
              label="Overall Experience"
              icon={<Heart className="h-4 w-4" />}
              size="sm"
            />
          </div>
        </div>

        {rating.comment && (
          <div className="space-y-2">
            <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wide">
              Your Feedback
            </h4>
            <div className="bg-muted/50 rounded-lg p-4">
              <p className="text-sm leading-relaxed whitespace-pre-wrap">{rating.comment}</p>
            </div>
          </div>
        )}

        {rating.would_recommend && (
          <div className="flex items-center gap-2 text-sm">
            <div className="h-2 w-2 rounded-full bg-green-500" />
            <span className="text-muted-foreground">You would recommend this storybook</span>
          </div>
        )}

        {rating.time_spent_reading > 0 && (
          <div className="text-xs text-muted-foreground border-t pt-4">
            Reading time: {Math.floor(rating.time_spent_reading / 60)} min{' '}
            {rating.time_spent_reading % 60} sec
          </div>
        )}
      </CardContent>
    </Card>
  );
}

function Star({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      fill="currentColor"
      viewBox="0 0 20 20"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
    </svg>
  );
}
