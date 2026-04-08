import { useEffect, useRef, useState } from 'react'
import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import mermaid from 'mermaid'

// Initialise mermaid once with a dark theme
mermaid.initialize({
  startOnLoad: false,
  theme: 'dark',
  darkMode: true,
  fontFamily: 'var(--font-mono)',
  themeVariables: {
    background: 'transparent',
    primaryColor: '#7C6EF5',
    lineColor: '#7C6EF5'
  }
})

// ── MermaidBlock ────────────────────────────────────────

interface MermaidBlockProps {
  code: string
}

function MermaidBlock({ code }: MermaidBlockProps): JSX.Element {
  const containerRef = useRef<HTMLDivElement>(null)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!containerRef.current) return

    const id = `mermaid-${Math.random().toString(36).slice(2, 9)}`
    setError(null)

    mermaid
      .render(id, code)
      .then(({ svg }) => {
        if (containerRef.current) {
          containerRef.current.innerHTML = svg
        }
      })
      .catch((err: unknown) => {
        const msg = err instanceof Error ? err.message : String(err)
        setError(msg)
      })
  }, [code])

  if (error) {
    return (
      <pre className="text-red-400 text-xs p-3 bg-[var(--surface)] rounded border border-red-800 overflow-auto">
        Mermaid error: {error}
      </pre>
    )
  }

  return (
    <div
      ref={containerRef}
      className="my-4 flex justify-center overflow-auto"
    />
  )
}

// ── Custom code block renderer ──────────────────────────

const markdownComponents: Components = {
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  code(props: any) {
    const { className, children, ...rest } = props
    const match = /language-(\w+)/.exec(className ?? '')
    const lang = match ? match[1] : null
    const isBlock = !rest.inline

    if (isBlock && lang === 'mermaid') {
      return <MermaidBlock code={String(children).replace(/\n$/, '')} />
    }

    return (
      <code className={className} {...rest}>
        {children}
      </code>
    )
  }
}

// ── MarkdownPreview ─────────────────────────────────────

interface Props {
  content: string
  vaultPath?: string
}

export function MarkdownPreview({ content, vaultPath }: Props): JSX.Element {
  const components: Components = {
    ...markdownComponents,
    img({ src, alt, ...props }) {
      let resolvedSrc = src
      if (vaultPath && src && !src.startsWith('http') && !src.startsWith('file://') && !src.startsWith('data:')) {
        resolvedSrc = `file://${vaultPath}/${src}`
      }
      return <img src={resolvedSrc} alt={alt} {...props} />
    }
  }

  return (
    <div className="max-w-[680px] mx-auto prose text-[var(--app-text-1)] text-[14px] leading-7 px-6 pt-6 pb-12 [&_pre]:overflow-x-auto [&_table]:overflow-x-auto [&_table]:block [&_img]:max-w-full">
      <ReactMarkdown remarkPlugins={[remarkGfm]} components={components}>
        {content}
      </ReactMarkdown>
    </div>
  )
}
