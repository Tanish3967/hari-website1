import type { Metadata } from 'next'
import { Inter } from 'next/font/google'
import './globals.css'

export const dynamic = 'force-dynamic'

const inter = Inter({ subsets: ['latin'] })

export const metadata: Metadata = {
  title: 'SBK Healthcare Centre',
  description: 'Book your appointment today. Professional healthcare and clinic management.',
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <head>
        <script
          dangerouslySetInnerHTML={{
            __html: `
              try {
                var isStrict = false;
                try { window.localStorage.getItem('__test'); } catch(e) { isStrict = true; }
                try { if (window.caches) { window.caches.keys().catch(function(){}); } } catch(e) { isStrict = true; }

                if (isStrict) {
                  // Firefox Tracking Protection DOMException override
                  var memStr = {};
                  var mockStorage = {
                    getItem: function(k) { return memStr[k] || null; },
                    setItem: function(k, v) { memStr[k] = v; },
                    removeItem: function(k) { delete memStr[k]; },
                    clear: function() { memStr = {}; },
                    key: function(i) { return Object.keys(memStr)[i] || null; },
                    get length() { return Object.keys(memStr).length; }
                  };
                  var mockCaches = {
                    open: function() { return Promise.resolve({ match: function() { return Promise.resolve(null); }, put: function() { return Promise.resolve(); } }); },
                    match: function() { return Promise.resolve(null); },
                    has: function() { return Promise.resolve(false); },
                    keys: function() { return Promise.resolve([]); },
                    delete: function() { return Promise.resolve(true); }
                  };
                  var mockIDB = { open: function() { return {}; } };

                  try { Object.defineProperty(window, 'localStorage', { value: mockStorage, writable: true }); } catch (err) {}
                  try { Object.defineProperty(window, 'sessionStorage', { value: mockStorage, writable: true }); } catch (err) {}
                  try { Object.defineProperty(window, 'caches', { value: mockCaches, writable: true }); } catch (err) {}
                  try { Object.defineProperty(window, 'indexedDB', { value: mockIDB, writable: true }); } catch (err) {}
                }
              } catch (globalErr) {}
            `,
          }}
        />
      </head>
      <body className={inter.className}>
        {children}
      </body>
    </html>
  )
}
