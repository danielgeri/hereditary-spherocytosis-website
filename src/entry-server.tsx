import { renderToString } from 'react-dom/server';
import { App } from './App';
import { PUBMED_REFERENCES, SEO_ROUTES, SITE_LAST_UPDATED, SITE_ORIGIN } from './data/seoRoutes';

export { PUBMED_REFERENCES, SEO_ROUTES, SITE_LAST_UPDATED, SITE_ORIGIN };

export function renderRoute(path: string): string {
  return renderToString(<App initialPath={path} />);
}
