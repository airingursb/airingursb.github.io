export type BearPostPreview = {
  readonly title: string;
  readonly href: string;
  readonly dateLabel: string;
  readonly excerpt: string;
};

export type BearPhotoPreview = {
  readonly title: string;
  readonly href: string;
  readonly dateLabel: string;
  readonly imageSrc: string;
  readonly imageAlt: string;
  readonly width: number;
  readonly height: number;
};

export type BearBookPreview = {
  readonly title: string;
  readonly author: string;
  readonly quote: string;
  readonly href: string;
  readonly dateLabel: string;
};

export type BearPreviewProps = {
  readonly idPrefix: string;
  readonly post?: BearPostPreview | null;
  readonly photo?: BearPhotoPreview | null;
  readonly book?: BearBookPreview | null;
};
