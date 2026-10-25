import { createContext, useContext } from "react";
import type { ImgHTMLAttributes } from "react";
import { DEFAULT_THEME } from "./themes";
import type { ThemeId } from "./themes";
import { artworkUrl } from "./artwork";

export const ThemeContext = createContext<ThemeId>(DEFAULT_THEME);

export function ThemedImage({
  src,
  ...props
}: ImgHTMLAttributes<HTMLImageElement>) {
  const theme = useContext(ThemeContext);
  return <img {...props} src={src ? artworkUrl(src, theme) : src} />;
}
