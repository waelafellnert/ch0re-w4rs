import { HeadContent, Scripts, createRootRoute, Link } from '@tanstack/react-router'


import '../styles.css'

const siteName = 'Chore Wars — Clean Together, Launch Together'
const siteDescription =
  'A co-op spaceship game played while doing real chores. Create a mission, share the room code, and every crew member completes real household tasks on their own phone to bring the ship online — then launch it together.'

export const Route = createRootRoute({
  head: () => ({
    meta: [
      {
        charSet: 'utf-8',
      },
      {
        name: 'viewport',
        content: 'width=device-width, initial-scale=1, viewport-fit=cover',
      },
      {
        title: siteName,
      },
      {
        name: 'description',
        content: siteDescription,
      },
      {
        name: 'theme-color',
        content: '#060a16',
      },
      {
        property: 'og:title',
        content: siteName,
      },
      {
        property: 'og:description',
        content: siteDescription,
      },
      {
        property: 'og:type',
        content: 'website',
      },
      {
        name: 'twitter:card',
        content: 'summary_large_image',
      },
    ],
    links: [
      { rel: 'icon', type: 'image/svg+xml', href: '/favicon.svg' },
      { rel: 'icon', href: '/favicon.ico', sizes: '48x48' },
      { rel: 'apple-touch-icon', href: '/apple-touch-icon.png' },
      { rel: 'preconnect', href: 'https://fonts.googleapis.com' },
      {
        rel: 'preconnect',
        href: 'https://fonts.gstatic.com',
        crossOrigin: 'anonymous',
      },
      {
        rel: 'stylesheet',
        href: 'https://fonts.googleapis.com/css2?family=Bungee&family=Chakra+Petch:wght@400;500;600;700&display=swap',
      },
    ],
  }),
  shellComponent: RootDocument,
  notFoundComponent: NotFound,
})

function NotFound() {
  return (
    <div className="screen">
      <main className="screen-main centered">
        <h1 className="screen-title">LOST IN SPACE</h1>
        <p className="screen-sub">This sector doesn't exist.</p>
        <Link to="/" className="btn btn-secondary">
          BACK TO BASE
        </Link>
      </main>
    </div>
  )
}

function RootDocument({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <HeadContent />
      </head>
      <body>
        {children}
        <Scripts />
      </body>
    </html>
  )
}
