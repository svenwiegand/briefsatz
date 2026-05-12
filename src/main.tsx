import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import {
  MantineProvider,
  createTheme,
  type MantineColorsTuple,
} from '@mantine/core'
import { DatesProvider } from '@mantine/dates'
import dayjs from 'dayjs'
import 'dayjs/locale/de'

import '@mantine/core/styles.css'
import '@mantine/dates/styles.css'
import './index.css'

import App from './App.tsx'

dayjs.locale('de')

const sky: MantineColorsTuple = [
  '#f0f9ff',
  '#e0f2fe',
  '#bae6fd',
  '#7dd3fc',
  '#38bdf8',
  '#0ea5e9',
  '#0284c7',
  '#0369a1',
  '#075985',
  '#0c4a6e',
]

const theme = createTheme({
  primaryColor: 'sky',
  primaryShade: { light: 6, dark: 4 },
  colors: { sky },
  defaultRadius: 'md',
  fontFamily:
    'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  headings: {
    fontFamily:
      'system-ui, -apple-system, "Segoe UI", Roboto, "Helvetica Neue", Arial, sans-serif',
  },
})

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <MantineProvider theme={theme} defaultColorScheme="auto">
      <DatesProvider settings={{ locale: 'de', firstDayOfWeek: 1 }}>
        <App />
      </DatesProvider>
    </MantineProvider>
  </StrictMode>,
)
