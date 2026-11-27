import React from 'react';
import { ArrowLeft, ArrowUpRight, ChevronDown, Focus } from 'lucide-react';
import { ReadingDepth } from '../data/hsContent';
import { getSeoRoute, SeoRouteConfig } from '../data/seoRoutes';

interface RouteSpotlightProps {
  route: SeoRouteConfig;
  depth: ReadingDepth;
  onNavigate: (path: string, hash?: string) => void;
  onFocusScene: () => void;
}

export const RouteSpotlight: React.FC<RouteSpotlightProps> = ({
  route,
  depth,
  onNavigate,
  onFocusScene,
}) => {
  const related = route.relatedPaths.map((p) => getSeoRoute(p));

  const handleLinkClick = (e: React.MouseEvent<HTMLAnchorElement>, path: string, hash?: string) => {
    if (e.metaKey || e.ctrlKey || e.shiftKey || e.altKey || e.button !== 0) return;
    e.preventDefault();
    onNavigate(path, hash);
  };

  const parentSection =
    route.kind === 'gene'
      ? { label: 'Five Genes', hash: '#genetics' }
      : { label: 'Evaluation & Diagnosis', hash: '#diagnosis' };

  return (
    <section id="guide" className="ed-section route-spotlight">
      <div className="container">
        <nav className="route-breadcrumbs" aria-label="Breadcrumb">
          <a href="/" onClick={(e) => handleLinkClick(e, '/')}>
            HS Atlas
          </a>
          <span aria-hidden="true">/</span>
          <a href={`/${parentSection.hash}`} onClick={(e) => handleLinkClick(e, '/', parentSection.hash)}>
            {parentSection.label}
          </a>
          <span aria-hidden="true">/</span>
          <span aria-current="page">{route.shortLabel}</span>
        </nav>

        <div className="spotlight-header">
          <div>
            <p className="eyebrow">{route.kicker}</p>
            <h1 className="spotlight-title">{route.h1}</h1>
          </div>
          <div className="spotlight-actions">
            <button type="button" className="spotlight-btn spotlight-btn--primary" onClick={onFocusScene}>
              <Focus size={14} />
              <span>Inspect in 3D Above</span>
            </button>
            <a
              href="/"
              className="spotlight-btn"
              onClick={(e) => handleLinkClick(e, '/')}
            >
              <ArrowLeft size={14} />
              <span>Full Atlas Overview</span>
            </a>
          </div>
        </div>

        <p className="spotlight-lead">{route.lead[depth]}</p>

        {route.keyFacts && route.keyFacts.length > 0 && (
          <div className="spotlight-facts">
            {route.keyFacts.map((fact) => (
              <article key={fact.label} className="clue-box">
                <span className="clue-box__kicker">{fact.label}</span>
                <strong className="clue-box__big">{fact.value}</strong>
                <p>{fact.detail[depth]}</p>
              </article>
            ))}
          </div>
        )}

        {route.deepDiveParagraphs && route.deepDiveParagraphs.length > 0 && (
          <div className="spotlight-prose">
            {route.deepDiveParagraphs.map((para, i) => (
              <p key={i}>{para[depth]}</p>
            ))}
          </div>
        )}

        {route.faqs.length > 0 && (
          <div className="faq-block">
            <h2 className="sub-section-title">Key Questions</h2>
            <div className="details-stack">
              {route.faqs.map((faq, idx) => (
                <details key={faq.question} className="ed-details" open={idx === 0}>
                  <summary>
                    <span>{faq.question}</span>
                    <ChevronDown size={16} className="ed-details__chev" />
                  </summary>
                  <div className="ed-details__body">
                    <p>{faq.answer[depth]}</p>
                  </div>
                </details>
              ))}
            </div>
          </div>
        )}

        <div className="related-guides">
          <h2 className="sub-section-title">Explore Related 3D Guides</h2>
          <div className="related-guides__grid">
            {related.map((item) => (
              <a
                key={item.path}
                href={item.path}
                className="related-card"
                onClick={(e) => handleLinkClick(e, item.path)}
              >
                <span className="related-card__kicker">{item.kicker}</span>
                <strong>{item.shortLabel}</strong>
                <span className="related-card__cta">
                  Open guide <ArrowUpRight size={13} />
                </span>
              </a>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};
