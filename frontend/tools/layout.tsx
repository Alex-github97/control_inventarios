import React from 'react'
export function Layout({ children }: { title?: string; children: React.ReactNode }) {
  return <div>{children}</div>
}
export default Layout
