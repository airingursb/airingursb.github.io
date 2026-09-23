export interface FooterActivity {
  readonly kind?: 'watering' | 'lighting';
  readonly keepStaticProps?: boolean;
  readonly atlas: HTMLImageElement;
  readonly fps: number;
  readonly frameCount: number;
  readonly columns: number;
  readonly cellWidth: number;
  readonly cellHeight: number;
  readonly left: number;
  readonly top: number;
}
