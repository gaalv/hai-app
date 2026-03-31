import ReactMarkdown from 'react-markdown'
import remarkGfm from 'remark-gfm'

interface Props {
  content: string
}

export function MarkdownPreview({ content }: Props): JSX.Element {
  return (
    <div style={styles.container}>
      <ReactMarkdown remarkPlugins={[remarkGfm]}>{content}</ReactMarkdown>
    </div>
  )
}

const styles: Record<string, React.CSSProperties> = {
  container: {
    padding: '16px 24px',
    height: '100%',
    overflow: 'auto',
    color: '#e5e5e5',
    fontFamily: 'Georgia, serif',
    fontSize: 15,
    lineHeight: 1.7,
    background: '#0f0f0f'
  }
}
