import { Injectable } from '@nestjs/common';
import PDFDocument = require('pdfkit');
import { Response } from 'express';

export interface ReportData {
  title: string;
  subtitle?: string;
  data: any[];
  columns: { key: string; label: string; width?: number }[];
  summary?: { label: string; value: string | number }[];
}

@Injectable()
export class PdfReportService {
  /**
   * Genera un reporte PDF y lo envía como respuesta
   */
  async generateReport(res: Response, reportData: ReportData): Promise<void> {
    const doc = new PDFDocument({ margin: 50, size: 'A4' });

    // Configurar headers para descarga
    res.setHeader('Content-Type', 'application/pdf');
    res.setHeader(
      'Content-Disposition',
      `attachment; filename="${this.sanitizeFilename(reportData.title)}.pdf"`,
    );

    // Pipe el PDF a la respuesta
    doc.pipe(res);

    // Encabezado del reporte
    this.addHeader(doc, reportData.title, reportData.subtitle);

    // Agregar fecha de generación
    doc.fontSize(10).text(`Fecha de generación: ${new Date().toLocaleDateString('es-AR')}`, {
      align: 'right',
    });
    doc.moveDown();

    // Agregar tabla de datos
    if (reportData.data && reportData.data.length > 0) {
      this.addTable(doc, reportData.data, reportData.columns);
    }

    // Agregar resumen si existe
    if (reportData.summary && reportData.summary.length > 0) {
      doc.moveDown(2);
      this.addSummary(doc, reportData.summary);
    }

    // Agregar footer
    this.addFooter(doc);

    // Finalizar el documento
    doc.end();
  }

  /**
   * Agregar encabezado al documento
   */
  private addHeader(doc: typeof PDFDocument, title: string, subtitle?: string): void {
    doc
      .fontSize(20)
      .font('Helvetica-Bold')
      .text(title, { align: 'center' });

    if (subtitle) {
      doc.fontSize(12).font('Helvetica').text(subtitle, { align: 'center' });
    }

    doc.moveDown(2);
  }

  /**
   * Agregar tabla de datos al documento
   */
  private addTable(
    doc: typeof PDFDocument,
    data: any[],
    columns: { key: string; label: string; width?: number }[],
  ): void {
    const tableTop = doc.y;
    const itemHeight = 25;
    let currentY = tableTop;

    // Calcular anchos de columna
    const pageWidth = doc.page.width - doc.page.margins.left - doc.page.margins.right;
    const totalCustomWidth = columns.reduce((sum, col) => sum + (col.width || 0), 0);
    const remainingWidth = pageWidth - totalCustomWidth;
    const columnsWithoutWidth = columns.filter((col) => !col.width).length;
    const defaultColumnWidth = remainingWidth / columnsWithoutWidth;

    // Dibujar encabezados
    doc.fontSize(10).font('Helvetica-Bold');
    let xPosition = doc.page.margins.left;

    columns.forEach((column) => {
      const columnWidth = column.width || defaultColumnWidth;
      doc.text(column.label, xPosition, currentY, {
        width: columnWidth,
        align: 'left',
      });
      xPosition += columnWidth;
    });

    currentY += itemHeight;

    // Dibujar línea después de los encabezados
    doc
      .moveTo(doc.page.margins.left, currentY - 5)
      .lineTo(doc.page.width - doc.page.margins.right, currentY - 5)
      .stroke();

    // Dibujar filas de datos
    doc.font('Helvetica').fontSize(9);

    data.forEach((row) => {
      // Verificar si necesitamos una nueva página
      if (currentY > doc.page.height - doc.page.margins.bottom - itemHeight) {
        doc.addPage();
        currentY = doc.page.margins.top;
      }

      xPosition = doc.page.margins.left;

      columns.forEach((column) => {
        const columnWidth = column.width || defaultColumnWidth;
        const value = this.getCellValue(row, column.key);
        doc.text(value, xPosition, currentY, {
          width: columnWidth,
          align: 'left',
          ellipsis: true,
        });
        xPosition += columnWidth;
      });

      currentY += itemHeight;
    });
  }

  /**
   * Agregar sección de resumen
   */
  private addSummary(
    doc: typeof PDFDocument,
    summary: { label: string; value: string | number }[],
  ): void {
    doc.fontSize(14).font('Helvetica-Bold').text('Resumen', { underline: true });
    doc.moveDown(0.5);

    doc.fontSize(11).font('Helvetica');
    summary.forEach((item) => {
      doc.text(`${item.label}: `, { continued: true }).font('Helvetica-Bold').text(`${item.value}`);
      doc.font('Helvetica');
    });
  }

  /**
   * Agregar footer al documento
   */
  private addFooter(doc: typeof PDFDocument): void {
    const bottomMargin = doc.page.margins.bottom;
    const pageHeight = doc.page.height;

    doc
      .fontSize(8)
      .font('Helvetica')
      .text(
        'Generado por CRM WallMapu - Sistema de Gestión',
        doc.page.margins.left,
        pageHeight - bottomMargin + 10,
        {
          align: 'center',
        },
      );
  }

  /**
   * Obtener valor de celda de forma segura
   */
  private getCellValue(obj: any, key: string): string {
    const keys = key.split('.');
    let value = obj;

    for (const k of keys) {
      if (value && typeof value === 'object') {
        value = value[k];
      } else {
        return '-';
      }
    }

    if (value === null || value === undefined) {
      return '-';
    }

    if (value instanceof Date) {
      return value.toLocaleDateString('es-AR');
    }

    return String(value);
  }

  /**
   * Sanitizar nombre de archivo
   */
  private sanitizeFilename(filename: string): string {
    return filename
      .toLowerCase()
      .replace(/[^a-z0-9]/g, '-')
      .replace(/-+/g, '-')
      .replace(/^-|-$/g, '');
  }
}
