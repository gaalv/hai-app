import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export function MarkdownPreview({ content }: Props): JSX.Element {
  return (
    <div className="px-8 py-6 h-full overflow-auto bg-[var(--bg)]">
      <div className="max-w-[680px] mx-auto prose text-[var(--text)] text-[15px] leading-7">
        <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
      </div>
    </div>
  )
}
