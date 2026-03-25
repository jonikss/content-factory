'use client'

import Link from 'next/link'
import type { ReactNode } from 'react'

interface TopbarProps {
  title: string
  subtitle?: string
  actions?: ReactNode
}

export function Topbar({ title, subtitle, actions }: TopbarProps) {
  return (
    <div className="h-[46px] border-b border-border flex items-center px-4.5 gap-2.5 shrink-0">
      <div className="text-sm font-semibold">{title}</div>
      {subtitle && (
        <>
          <div className="w-px h-3.5 bg-border" />
          <div className="text-[11px] text-text3 font-mono">{subtitle}</div>
        </>
      )}
      <div className="ml-auto flex gap-1.5">
        {actions ?? (
          <Link
            href="/generate"
            className="px-3 py-1.5 rounded-md text-[11px] font-medium bg-accent text-white hover:bg-accent2 transition-colors"
          >
            + Новая статья
          </Link>
        )}
      </div>
    </div>
  )
}
