import { useEffect, useState } from "react";
import api from "../services/api";

interface AuthenticatedImageProps {
  imageUrl: string;
  alt: string;
  className?: string;
}

export default function AuthenticatedImage({
  imageUrl,
  alt,
  className
}: AuthenticatedImageProps) {
  const [imageSrc, setImageSrc] = useState<string | null>(null);
  const [imageFailed, setImageFailed] = useState(false);

  useEffect(() => {
    let objectUrl: string | null = null;
    let cancelled = false;

    const fetchImage = async () => {
      setImageSrc(null);
      setImageFailed(false);

      try {
        const response = await api.get(imageUrl, {
          responseType: "blob"
        });

        if (cancelled) return;

        objectUrl = URL.createObjectURL(response.data);
        setImageSrc(objectUrl);
      } catch (error) {
        if (!cancelled) {
          console.warn(`Image unavailable for ${alt}:`, error);
          setImageFailed(true);
        }
      }
    };

    fetchImage();

    return () => {
      cancelled = true;

      if (objectUrl) {
        URL.revokeObjectURL(objectUrl);
      }
    };
  }, [imageUrl, alt]);

  if (imageFailed) {
    return (
      <div
        className={`${className ?? ""} flex items-center justify-center rounded-lg bg-background`}
      >
        <div className="text-center">
          <span className="text-3xl">🃏</span>
          <p className="mt-1 text-[10px] text-text-secondary">
            Image unavailable
          </p>
        </div>
      </div>
    );
  }

  return <img src={imageSrc ?? undefined} alt={alt} className={className} />;
}
