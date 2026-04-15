export const metadata = {
  title: "TMB Command Center",
  description: "AI-powered prospecting and business management for The Marketing Block",
  manifest: "/manifest.json",
  themeColor: "#4CAF50",
  viewport: "width=device-width, initial-scale=1, maximum-scale=1, user-scalable=no",
};

export default function RootLayout({ children }) {
  return (
    <html lang="en">
      <head>
        <link
          href="https://fonts.googleapis.com/css2?family=DM+Sans:opsz,wght@9..40,400;9..40,500;9..40,600;9..40,700;9..40,800&display=swap"
          rel="stylesheet"
        />
        <meta name="apple-mobile-web-app-capable" content="yes" />
        <meta name="apple-mobile-web-app-status-bar-style" content="default" />
        <meta name="apple-mobile-web-app-title" content="TMB Command" />
        <link rel="apple-touch-icon" href="/icon-192.png" />
      </head>
      <body
        style={{
          margin: 0,
          padding: 0,
          background: "#F0F2F5",
          fontFamily: "'DM Sans', -apple-system, BlinkMacSystemFont, sans-serif",
        }}
      >
        {children}
      </body>
    </html>
  );
}
