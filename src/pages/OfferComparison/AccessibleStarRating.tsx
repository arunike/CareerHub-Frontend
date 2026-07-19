import { StarFilled, StarOutlined } from '@ant-design/icons';
import { useRef, type KeyboardEvent } from 'react';

type AccessibleStarRatingProps = {
  label: string;
  value: number;
  onChange: (value: number) => void;
  disabled?: boolean;
};

const RATING_VALUES = [1, 2, 3, 4, 5] as const;

const clampRating = (value: number) => Math.min(5, Math.max(1, value));

const AccessibleStarRating = ({
  label,
  value,
  onChange,
  disabled = false,
}: AccessibleStarRatingProps) => {
  const buttonRefs = useRef<Array<HTMLButtonElement | null>>([]);
  const activeRating = clampRating(value || 1);

  const moveSelection = (nextRating: number) => {
    if (disabled) return;
    const normalizedRating = clampRating(nextRating);
    onChange(normalizedRating);
    buttonRefs.current[normalizedRating - 1]?.focus();
  };

  const handleKeyDown = (event: KeyboardEvent<HTMLButtonElement>, rating: number) => {
    if (disabled) return;
    let nextRating: number | undefined;

    switch (event.key) {
      case 'ArrowRight':
      case 'ArrowUp':
        nextRating = rating + 1;
        break;
      case 'ArrowLeft':
      case 'ArrowDown':
        nextRating = rating - 1;
        break;
      case 'Home':
        nextRating = 1;
        break;
      case 'End':
        nextRating = 5;
        break;
      default:
        return;
    }

    event.preventDefault();
    moveSelection(nextRating);
  };

  return (
    <div
      role="radiogroup"
      aria-label={label}
      aria-disabled={disabled ? 'true' : undefined}
      className="-mx-1 flex w-fit items-center"
    >
      {RATING_VALUES.map((rating) => {
        const isSelected = value === rating;
        const isFilled = rating <= value;

        return (
          <button
            key={rating}
            ref={(node) => {
              buttonRefs.current[rating - 1] = node;
            }}
            type="button"
            role="radio"
            aria-checked={isSelected}
            aria-label={`${rating} out of 5`}
            tabIndex={disabled ? -1 : rating === activeRating ? 0 : -1}
            disabled={disabled}
            className={`group flex h-11 w-11 shrink-0 items-center justify-center rounded-lg text-lg transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-blue-500 focus-visible:ring-offset-1 sm:h-8 sm:w-8 ${
              disabled
                ? isFilled
                  ? 'text-amber-400/60'
                  : 'text-slate-200'
                : isFilled
                  ? 'text-amber-400'
                  : 'text-slate-300 hover:text-amber-400'
            }`}
            onClick={() => {
              if (!disabled) {
                onChange(isSelected ? 0 : rating);
              }
            }}
            onKeyDown={(event) => handleKeyDown(event, rating)}
          >
            {isFilled ? (
              <StarFilled aria-hidden="true" className="block" />
            ) : (
              <StarOutlined aria-hidden="true" className="block" />
            )}
          </button>
        );
      })}
    </div>
  );
};

export default AccessibleStarRating;
