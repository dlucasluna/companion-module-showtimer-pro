import { forwardRef, type AnchorHTMLAttributes, type MouseEvent } from "react";
import { useRouterStore } from "../router";

type LinkProps = Omit<AnchorHTMLAttributes<HTMLAnchorElement>, "href"> & {
  href: string | { pathname: string };
  prefetch?: boolean;
  replace?: boolean;
  scroll?: boolean;
};

/** `next/link` stand-in: in-app navigation through the in-memory router. */
const Link = forwardRef<HTMLAnchorElement, LinkProps>(function Link({ href, onClick, replace, ...rest }, ref) {
  // Next-only props have no <a> equivalent.
  const props: Partial<LinkProps> = { ...rest };
  delete props.prefetch;
  delete props.scroll;
  const target = typeof href === "string" ? href : href.pathname;
  const external = /^https?:\/\//.test(target);
  function handleClick(event: MouseEvent<HTMLAnchorElement>) {
    onClick?.(event);
    if (external || event.defaultPrevented || event.metaKey || event.ctrlKey) return;
    event.preventDefault();
    const router = useRouterStore.getState();
    if (replace) router.replace(target);
    else router.push(target);
  }
  return <a ref={ref} {...(props as AnchorHTMLAttributes<HTMLAnchorElement>)} href={external ? target : `#${target}`} onClick={handleClick} />;
});

export default Link;
