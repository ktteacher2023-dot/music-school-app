'use client';

interface Props {
  value: number;
  onChange?: (v: number) => void;
  readonly?: boolean;
  size?: 'sm' | 'md' | 'lg';
}

export default function StarRating({
  value,
  onChange,
  readonly = false,
  size = 'md',
}: Props) {
  const px = { sm: 16, md: 22, lg: 30 }[size];

  return (
    <div className="flex gap-0.5">
      {[1, 2, 3, 4, 5].map((star) => (
        <button
          key={star}
          type="button"
          disabled={readonly}
          onClick={() => onChange?.(star)}
          className={readonly ? 'cursor-default' : 'cursor-pointer active:scale-90 transition-transform'}
        >
          <svg
            width={px}
            height={px}
            viewBox="0 0 24 24"
            fill={star <= value ? '#FF9F0A' : 'none'}
            stroke={star <= value ? '#FF9F0A' : '#C7C7CC'}
            strokeWidth="1.5"
          >
            <polygon points="12,2 15.09,8.26 22,9.27 17,14.14 18.18,21.02 12,17.77 5.82,21.02 7,14.14 2,9.27 8.91,8.26" />
          </svg>
        </button>
      ))}
    </div>
  );
}
