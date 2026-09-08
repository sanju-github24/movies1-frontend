import React, { useContext, useEffect } from 'react';
import { Helmet } from 'react-helmet';

import Header from '../components/Header';
import { AppContext } from '../context/AppContext';
import { absUrl, jsonLd } from '../utils/seo';

/* The home page named itself nothing at all — no title, no description, no
   canonical — so it inherited index.html's generic tags, and it was outside the
   prerender matcher, meaning a crawler got an empty shell. It is the page most
   likely to be crawled first, and the one every other page links back to. */
const Home = () => {
  const { movies = [] } = useContext(AppContext);
  const ready = movies.length > 0;

  // Tell the prerenderer to wait for the catalogue rather than snapshot an
  // empty grid. Same flag the language collections use.
  useEffect(() => {
    document.documentElement.dataset.prerender = ready ? 'ready' : 'loading';
    return () => { delete document.documentElement.dataset.prerender; };
  }, [ready]);

  return (
    <div className="flex flex-col items-center justify-start min-h-screen bg-white">
      <Helmet>
        <title>AnchorMovies — Watch & Download Movies and Web Series in HD</title>
        <meta
          name="description"
          content="Watch and download the latest movies and web series in Tamil, Telugu,
                   Kannada, Hindi, Malayalam and English — 1080p, 720p and 480p, added daily."
        />
        <link rel="canonical" href={absUrl('/')} />
        <meta property="og:type" content="website" />
        <meta property="og:title" content="AnchorMovies — Watch & Download Movies and Web Series in HD" />
        <meta property="og:url" content={absUrl('/')} />
        <script type="application/ld+json">{jsonLd({
          '@context': 'https://schema.org',
          '@type': 'WebSite',
          name: 'AnchorMovies',
          url: absUrl('/'),
          potentialAction: {
            '@type': 'SearchAction',
            target: { '@type': 'EntryPoint', urlTemplate: `${absUrl('/search')}?query={search_term_string}` },
            'query-input': 'required name=search_term_string',
          },
        })}</script>
      </Helmet>

      <Header />
    </div>
  );
};

export default Home;
