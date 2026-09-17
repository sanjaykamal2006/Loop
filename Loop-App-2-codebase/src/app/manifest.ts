import { MetadataRoute } from 'next';

export default function manifest(): MetadataRoute.Manifest {
  return {
    name: 'LOOP',
    short_name: 'LOOP',
    description: 'Rides go better in Loop. Purpose-based real-time ride coordination for students.',
    start_url: '/',
    id: '/',
    display: 'standalone',
    background_color: '#000000',
    theme_color: '#000000',
    orientation: 'portrait',
    icons: [
      {
        src: '/icon-192.png',
        sizes: '192x192',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'any',
      },
      {
        src: '/icon-512.png',
        sizes: '512x512',
        type: 'image/png',
        purpose: 'maskable',
      },
      {
        src: '/logo.png',
        sizes: '1024x1024',
        type: 'image/png',
        purpose: 'any',
      },
    ],
    screenshots: [
      {
        src: '/screenshots/screenshot-1.png',
        sizes: '472x1024',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'LOOP Campus Cab & Auto Sharing',
      },
      {
        src: '/screenshots/screenshot-2.png',
        sizes: '472x1024',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Simple Student Sign In & Sign Up',
      },
      {
        src: '/screenshots/screenshot-3.png',
        sizes: '472x1024',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Explore and Join Campus Rides',
      },
      {
        src: '/screenshots/screenshot-4.png',
        sizes: '472x1024',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Real-time Coordination & Group Chat',
      },
      {
        src: '/screenshots/screenshot-5.png',
        sizes: '472x1024',
        type: 'image/png',
        form_factor: 'narrow',
        label: 'Emergency Contacts & Smart Features',
      },
    ],
    categories: ['transportation', 'social', 'travel'],
    lang: 'en',
    dir: 'ltr',
    prefer_related_applications: false,
    ...({
      iarc_rating_id: 'PEGI_3',
      privacy_policy: '/privacy',
    } as any),
  };
}
