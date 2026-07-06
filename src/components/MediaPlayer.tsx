import { useRef, useState } from 'react';

interface Props {
  src: string;
  className?: string;
}

export function MediaPlayer({ src, className }: Props) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const [isAudioOnly, setIsAudioOnly] = useState(false);

  function handleMetadata() {
    if (videoRef.current && videoRef.current.videoWidth === 0) {
      setIsAudioOnly(true);
    }
  }

  if (isAudioOnly) {
    return <audio src={src} controls className={className} />;
  }

  return (
    <video
      ref={videoRef}
      src={src}
      controls
      className={className}
      onLoadedMetadata={handleMetadata}
    />
  );
}
