export interface Location {
  path: string;
  segments: string[];
  query: URLSearchParams;
}

export function currentLocation(): Location {
  const hash = window.location.hash.replace(/^#/, '') || '/';
  const [path = '/', queryString = ''] = hash.split('?');
  return { path, segments: path.split('/').filter(Boolean), query: new URLSearchParams(queryString) };
}

export function navigate(href: string): void {
  const target = href.startsWith('#') ? href : `#${href}`;
  if (window.location.hash === target) {
    window.dispatchEvent(new HashChangeEvent('hashchange'));
    return;
  }
  window.location.hash = target;
}

export function withQuery(path: string, params: Record<string, string | undefined>): string {
  const query = new URLSearchParams();
  Object.entries(params).forEach(([key, value]) => {
    if (value) query.set(key, value);
  });
  const queryString = query.toString();
  return queryString ? `#${path}?${queryString}` : `#${path}`;
}
