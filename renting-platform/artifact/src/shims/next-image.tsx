import type { CSSProperties, ImgHTMLAttributes } from "react";
import { PRODUCT_IMAGES } from "../images";

type ImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, "src"> & {
  src: string;
  fill?: boolean;
  sizes?: string;
  unoptimized?: boolean;
  priority?: boolean;
};

/** `next/image` stand-in: plain <img>, honouring `fill`; /products/* paths resolve to embedded images. */
export default function Image({ src, fill, style, alt, ...rest }: ImageProps) {
  // Next-only props have no <img> equivalent.
  const props: Partial<ImageProps> = { ...rest };
  delete props.sizes;
  delete props.unoptimized;
  delete props.priority;
  const fillStyle: CSSProperties | undefined = fill ? { position: "absolute", inset: 0, width: "100%", height: "100%" } : undefined;
  // eslint-disable-next-line @next/next/no-img-element -- this is the next/image replacement
  return <img src={PRODUCT_IMAGES[src] ?? src} alt={alt ?? ""} style={{ ...fillStyle, ...style }} {...props} />;
}
