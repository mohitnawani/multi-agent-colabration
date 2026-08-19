import Markdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import remarkBreaks from 'remark-breaks'
import type { Components } from 'react-markdown'
import { cn } from '../../lib/cn'

const components: Components = {
  h1: ({ children, ...props }) => (
    <h1 {...props} className="mt-5 mb-2 text-lg font-semibold tracking-tight text-ink first:mt-0">
      {children}
    </h1>
  ),
  h2: ({ children, ...props }) => (
    <h2 {...props} className="mt-5 mb-2 text-base font-semibold tracking-tight text-ink first:mt-0">
      {children}
    </h2>
  ),
  h3: ({ children, ...props }) => (
    <h3 {...props} className="mt-4 mb-1.5 text-sm font-semibold text-ink first:mt-0">
      {children}
    </h3>
  ),
  p: ({ children, ...props }) => (
    <p {...props} className="my-2.5 text-sm leading-relaxed text-ink first:mt-0 last:mb-0">
      {children}
    </p>
  ),
  strong: ({ children, ...props }) => (
    <strong {...props} className="font-semibold text-ink">
      {children}
    </strong>
  ),
  em: ({ children, ...props }) => (
    <em {...props} className="italic">
      {children}
    </em>
  ),
  a: ({ children, ...props }) => (
    <a
      {...props}
      className="font-medium text-accent underline underline-offset-4 transition-opacity hover:opacity-80"
      target="_blank"
      rel="noopener noreferrer"
    >
      {children}
    </a>
  ),
  ul: ({ children, ...props }) => (
    <ul {...props} className="my-2.5 space-y-1 pl-5 text-sm text-ink marker:text-ink-muted [&>li]:list-disc">
      {children}
    </ul>
  ),
  ol: ({ children, ...props }) => (
    <ol {...props} className="my-2.5 space-y-1 pl-5 text-sm text-ink marker:text-ink-muted [&>li]:list-decimal">
      {children}
    </ol>
  ),
  li: ({ children, ...props }) => (
    <li {...props} className="leading-relaxed">
      {children}
    </li>
  ),
  code: ({ className, children, ...props }) => {
    const isBlock = className?.includes('language-')
    if (isBlock) {
      return (
        <code {...props} className={cn('font-mono text-xs leading-relaxed', className)}>
          {children}
        </code>
      )
    }
    return (
      <code
        {...props}
        className={cn(
          'rounded bg-ink/5 px-1.5 py-0.5 font-mono text-[11px] font-medium text-ink ring-1 ring-inset ring-line',
          className,
        )}
      >
        {children}
      </code>
    )
  },
  pre: ({ children, ...props }) => (
    <pre
      {...props}
      className="my-3 overflow-x-auto rounded-field border border-base-300 bg-console/70 p-3 text-ink first:mt-0 last:mb-0"
    >
      {children}
    </pre>
  ),
  blockquote: ({ children, ...props }) => (
    <blockquote
      {...props}
      className="my-3 border-l-2 border-base-300 pl-3 text-sm italic text-ink-muted first:mt-0 last:mb-0"
    >
      {children}
    </blockquote>
  ),
  hr: ({ ...props }) => <hr {...props} className="my-4 border-base-300" />,
  table: ({ children, ...props }) => (
    <div className="my-3 overflow-x-auto first:mt-0 last:mb-0">
      <table {...props} className="w-full border-collapse text-sm">
        {children}
      </table>
    </div>
  ),
  thead: ({ children, ...props }) => (
    <thead {...props} className="bg-console/70">
      {children}
    </thead>
  ),
  th: ({ node, children, ...props }) => (
    <th
      {...props}
      style={{ textAlign: (node?.properties?.align as 'left' | 'center' | 'right' | undefined) ?? undefined }}
      className="border-b border-base-300 px-3 py-2 text-left text-xs font-semibold text-ink"
    >
      {children}
    </th>
  ),
  td: ({ node, children, ...props }) => (
    <td
      {...props}
      style={{ textAlign: (node?.properties?.align as 'left' | 'center' | 'right' | undefined) ?? undefined }}
      className="border-b border-base-300/70 px-3 py-2 align-top text-xs text-ink-muted"
    >
      {children}
    </td>
  ),
}

/** LLM responses rendered as styled markdown, tuned to the design system. */
export function MarkdownView({ children, className }: { children: string; className?: string }) {
  return (
    <div className={cn('markdown min-w-0 text-ink', className)}>
      <Markdown remarkPlugins={[remarkGfm, remarkBreaks]} components={components}>
        {children}
      </Markdown>
    </div>
  )
}