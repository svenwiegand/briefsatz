import { useEffect, useRef } from 'react'
import { useCreateBlockNote } from '@blocknote/react'
import { BlockNoteView } from '@blocknote/mantine'
import { de as deDictionary } from '@blocknote/core/locales'
import '@blocknote/core/fonts/inter.css'
import '@blocknote/mantine/style.css'

interface Props {
  onChange: (html: string) => void
}

export function BodyEditor({ onChange }: Props) {
  const onChangeRef = useRef(onChange)
  useEffect(() => {
    onChangeRef.current = onChange
  })

  const editor = useCreateBlockNote({
    dictionary: deDictionary,
    initialContent: [
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
    ],
  })

  useEffect(() => {
    let cancelled = false
    const emit = async () => {
      const html = await editor.blocksToHTMLLossy(editor.document)
      if (!cancelled) {
        onChangeRef.current(html)
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
