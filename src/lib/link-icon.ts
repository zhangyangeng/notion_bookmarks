export const FALLBACK_ICON_SRC = '/globe.svg';
export const ICON_LOAD_TIMEOUT_MS = 4000;

type LinkIconSource = {
  iconfile?: string | null;
  iconlink?: string | null;
};

export type IconLoadState = {
  src: string;
  isLoaded: boolean;
  hasFailed: boolean;
  showFallback: boolean;
  showSpinner: boolean;
};

export function getLinkIconUrl(link: LinkIconSource): string {
  if (link.iconfile) {
    return link.iconfile;
  }

  if (link.iconlink) {
    return link.iconlink;
  }

  return FALLBACK_ICON_SRC;
}

export function getInitialIconState(link: LinkIconSource): IconLoadState {
  const src = getLinkIconUrl(link);

  return {
    src,
    isLoaded: src === FALLBACK_ICON_SRC,
    hasFailed: false,
    showFallback: false,
    showSpinner: src !== FALLBACK_ICON_SRC,
  };
}

export function getLoadedIconState(state: IconLoadState): IconLoadState {
  return {
    ...state,
    isLoaded: true,
    showFallback: false,
    showSpinner: false,
  };
}

export function getFailedIconState(): IconLoadState {
  return {
    src: FALLBACK_ICON_SRC,
    isLoaded: true,
    hasFailed: true,
    showFallback: false,
    showSpinner: false,
  };
}

export function getTimedOutIconState(state: IconLoadState): IconLoadState {
  if (state.isLoaded || state.src === FALLBACK_ICON_SRC) {
    return {
      ...state,
      showSpinner: false,
    };
  }

  return {
    ...state,
    showFallback: true,
    showSpinner: false,
  };
}
