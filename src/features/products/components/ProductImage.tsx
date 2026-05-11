import { useState } from 'react';
import type { CSSProperties } from 'react';
import { Package } from 'lucide-react';

interface ProductImageProps {
  src?: string;
  alt: string;
  className?: string;
  style?: CSSProperties;
  iconSize?: number;
}

export function ProductImage({ src, alt, className, style, iconSize = 28 }: ProductImageProps) {
  const [failed, setFailed] = useState(false);
  const showImage = Boolean(src) && !failed;

  if (showImage) {
    return (
      <img
        src={src}
        alt={alt}
        className={className}
        style={style}
        onError={() => setFailed(true)}
      />
    );
  }

  return (
    <div
      className={`flex items-center justify-center bg-gray-100 text-gray-400 ${className ?? ''}`}
      style={style}
      aria-label={alt}
      role="img"
    >
      <Package size={iconSize} strokeWidth={1.8} />
    </div>
  );
}
