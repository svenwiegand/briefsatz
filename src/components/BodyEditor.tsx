import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import type { PartialBlock } from '@blocknote/core'
import { de as deDictionary } from '@blocknote/core/locales'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'
import type { StoredBlocks } from '../types'

const DEFAULT_INITIAL_CONTENT: PartialBlock[] = [
  {
    type: 'paragraph',
    content:
      'vielen Dank für Ihre Nachricht. Hier können Sie den Brieftext mit Formatierungen erfassen.',
  },
  { type: 'paragraph' },
  {
    type: 'paragraph',
    content:
      'Markieren Sie Text, um ihn fett, kursiv oder als Liste zu formatieren. Über das „+" am Zeilenanfang fügen Sie weitere Blöcke wie Überschriften oder Listen ein.',
  },
]

export interface BodyEditorChange {
  blocks: StoredBlocks
  html: string
}

interface Props {
  initialBlocks?: StoredBlocks
  onChange: (next: BodyEditorChange) => void
}

export function BodyEditor({ initialBlocks, onChange }: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const editor = useCreateBlockNote({
    dictionary: deDictionary,
    initialContent:
      initialBlocks && initialBlocks.length > 0
        ? (initialBlocks as PartialBlock[])
        : DEFAULT_INITIAL_CONTENT,
  })

  useEffect(() => {
    let cancelled = false
    const emit = async () => {
      const blocks = editor.document
      const html = await editor.blocksToHTMLLossy(blocks)
      if (!cancelled) {
        onChangeRef.current({ blocks: blocks as StoredBlocks, html })
      }
    }
    void emit()
    const unsubscribe = editor.onChange(() => {
      void emit()
    })
    return () => {
      cancelled = true
      unsubscribe?.()
    }
  }, [editor])

  return (
    <div className="body-editor" aria-label="Brieftext-Editor">
      <BlockNoteView editor={editor} theme="light" />
    </div>
  )
}
