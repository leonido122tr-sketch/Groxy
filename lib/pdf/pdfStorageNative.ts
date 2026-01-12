import { registerPlugin } from '@capacitor/core'

export interface PdfStoragePlugin {
  savePdf(options: { filename: string; data: string }): Promise<{ uri: string; path: string }>
}

const PdfStorage = registerPlugin<PdfStoragePlugin>('PdfStorage', {
  web: () => import('./pdfStorageWeb').then(m => new m.PdfStorageWeb()),
})

console.log('PdfStorage плагин зарегистрирован:', typeof PdfStorage, PdfStorage)

export default PdfStorage

