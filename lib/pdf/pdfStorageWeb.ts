import type { PdfStoragePlugin } from './pdfStorageNative'

export class PdfStorageWeb implements PdfStoragePlugin {
  async savePdf(options: { filename: string; data: string }): Promise<{ uri: string; path: string }> {
    // В веб-версии используем стандартный download
    const blob = this.base64ToBlob(options.data, 'application/pdf')
    const url = URL.createObjectURL(blob)
    const link = document.createElement('a')
    link.href = url
    link.download = options.filename
    link.click()
    URL.revokeObjectURL(url)
    return { uri: url, path: url }
  }

  private base64ToBlob(base64: string, mimeType: string): Blob {
    const byteCharacters = atob(base64)
    const byteNumbers = new Array(byteCharacters.length)
    for (let i = 0; i < byteCharacters.length; i++) {
      byteNumbers[i] = byteCharacters.charCodeAt(i)
    }
    const byteArray = new Uint8Array(byteNumbers)
    return new Blob([byteArray], { type: mimeType })
  }
}


