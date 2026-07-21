import type { ReactNode } from 'react'

interface SectionHeadProps {
  number: string
  title: string
  subtitle?: string
  right?: ReactNode
}

export function SectionHead({ number, title, subtitle, right }: SectionHeadProps) {
  return (
    <div className="mb-5 flex flex-col gap-3 border-b border-mck-line pb-4 lg:flex-row lg:items-end lg:justify-between">
      <div>
        <div className="mb-2 flex items-center gap-3">
          <span className="text-[11px] font-semibold tracking-section text-mck-teal">{number}</span>
          <div className="mck-rule" />
        </div>
        <h2 className="font-serif text-2xl font-semibold tracking-tight text-mck-navy md:text-[28px]">
          {title}
        </h2>
        {subtitle ? <p className="mt-1 max-w-2xl text-sm text-mck-gray">{subtitle}</p> : null}
      </div>
      {right ? <div className="shrink-0">{right}</div> : null}
    </div>
  )
}
