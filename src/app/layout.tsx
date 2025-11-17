export const metadata = {
  title: 'API Backend',
  description: 'Backend API for ContaZoom',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="pt-BR">
      <body>{children}</body>
    </html>
  )
}
