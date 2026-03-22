import PDFDocument from 'pdfkit'

export interface InspectionForPDF {
  id: string
  created_at: string
  inspector_name: string | null
  gps_lat: number | null
  gps_lon: number | null
  equipment_data: Record<string, unknown> | null
  condition_data: Record<string, unknown> | null
  ai_image_result: Record<string, unknown> | null
  vin_lookup_result: Record<string, unknown> | null
  photos: Array<{ url: string; type: string }> | null
}

export class PDFGeneratorService {
  async generate(inspection: InspectionForPDF): Promise<Buffer> {
    return new Promise((resolve, reject) => {
      const doc = new PDFDocument({ margin: 50 })
      const chunks: Buffer[] = []

      doc.on('data', (chunk: Buffer) => chunks.push(chunk))
      doc.on('end', () => resolve(Buffer.concat(chunks)))
      doc.on('error', reject)

      // 1. Header
      doc
        .fontSize(20)
        .font('Helvetica-Bold')
        .text('EQUIPMENT INSPECTION REPORT', { align: 'center' })
      doc.moveDown(0.5)
      doc.fontSize(12).font('Helvetica').text('[Company Logo]', { align: 'center' })
      doc.moveDown(0.5)
      const inspectionDate = new Date(inspection.created_at).toLocaleDateString('en-US', {
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      })
      doc.text(`Date: ${inspectionDate}`, { align: 'center' })
      doc.moveDown(1)

      // Divider
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke()
      doc.moveDown(0.5)

      // 2. Inspector Info
      doc.fontSize(14).font('Helvetica-Bold').text('Inspector Information')
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
      doc.text(`Inspector Name: ${inspection.inspector_name ?? 'Not available'}`)
      doc.text(
        `GPS Coordinates: ${
          inspection.gps_lat !== null && inspection.gps_lon !== null
            ? `${inspection.gps_lat}, ${inspection.gps_lon}`
            : 'Not available'
        }`
      )
      doc.text(`Inspection ID: ${inspection.id}`)
      doc.moveDown(1)

      // 3. Equipment Specs
      doc.fontSize(14).font('Helvetica-Bold').text('Equipment Specifications')
      doc.moveDown(0.5)

      const equipFields: Array<{ key: string; label: string }> = [
        { key: 'make', label: 'Make' },
        { key: 'model', label: 'Model' },
        { key: 'year', label: 'Year' },
        { key: 'engineType', label: 'Engine Type' },
        { key: 'transmission', label: 'Transmission' },
        { key: 'gvwLbs', label: 'GVW (lbs)' },
      ]

      if (inspection.equipment_data) {
        const sourceIndicator =
          inspection.ai_image_result
            ? ' (AI)'
            : inspection.vin_lookup_result
            ? ' (VIN)'
            : ''

        doc.fontSize(11).font('Helvetica')
        const colWidth = (doc.page.width - 100) / 2
        const startX = 50

        for (const field of equipFields) {
          const value =
            inspection.equipment_data[field.key] !== undefined
              ? String(inspection.equipment_data[field.key])
              : 'N/A'
          const x = doc.x
          const y = doc.y
          doc.font('Helvetica-Bold').text(field.label + ':', startX, y, { width: colWidth, continued: false })
          doc.font('Helvetica').text(value + sourceIndicator, startX + colWidth, y, { width: colWidth })
          doc.moveDown(0.3)
        }
      } else {
        doc.fontSize(11).font('Helvetica').text('Equipment data: Not available')
      }
      doc.moveDown(1)

      // 4. Condition Assessment
      doc.fontSize(14).font('Helvetica-Bold').text('Condition Assessment')
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')

      if (inspection.condition_data) {
        const cd = inspection.condition_data
        doc.font('Helvetica-Bold').text('Overall Rating: ', { continued: true })
        doc.font('Helvetica').text(String(cd.overall ?? 'Not available'))
        doc.moveDown(0.5)

        const sections: string[] = ['engine', 'hydraulics', 'undercarriage', 'cab']
        for (const section of sections) {
          if (cd[section] && typeof cd[section] === 'object') {
            const sectionData = cd[section] as Record<string, unknown>
            doc.font('Helvetica-Bold').text(
              section.charAt(0).toUpperCase() + section.slice(1) + ':'
            )
            doc.font('Helvetica').text(`  Rating: ${sectionData.rating ?? 'N/A'}`)
            if (sectionData.notes) {
              doc.text(`  Notes: ${sectionData.notes}`)
            }
            doc.moveDown(0.3)
          }
        }
      } else {
        doc.text('Condition data: Not available')
      }
      doc.moveDown(1)

      // 5. Photo References
      doc.fontSize(14).font('Helvetica-Bold').text('Photo References')
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')

      if (inspection.photos && inspection.photos.length > 0) {
        for (const photo of inspection.photos) {
          doc.text(`[${photo.type}] ${photo.url}`)
        }
      } else {
        doc.text('No photos available')
      }
      doc.moveDown(1)

      // Divider
      doc
        .moveTo(50, doc.y)
        .lineTo(doc.page.width - 50, doc.y)
        .stroke()
      doc.moveDown(1)

      // 6. Signature Block
      doc.fontSize(14).font('Helvetica-Bold').text('Signature')
      doc.moveDown(0.5)
      doc.fontSize(11).font('Helvetica')
      doc.text('Inspector Signature: ___________________')
      doc.moveDown(0.5)
      doc.text(`Date: ___________________`)

      doc.end()
    })
  }
}
