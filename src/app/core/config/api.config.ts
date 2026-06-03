type RuntimeEnv = {
  __env?: {
    API_URL?: string;
  };
};

const DEFAULT_API_URL = 'http://95.111.238.203/api';

function normalizeApiUrl(url: string): string {
  return url.replace(/\/+$/, '');
}

export const API_BASE_URL = normalizeApiUrl(
  (globalThis as RuntimeEnv).__env?.API_URL?.trim() || DEFAULT_API_URL,
);
