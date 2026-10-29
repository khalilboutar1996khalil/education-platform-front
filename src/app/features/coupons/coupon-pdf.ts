import { environment } from '../../../environments/environment';
import { Coupon, formatCode } from './coupons.model';

export type PageFormat = 'a4' | 'a5';

/** Where every QR code of a batch leads; the serial tells the activation page which book it is. */
export function activationUrl(serial: string): string {
  const site = (environment.siteUrl || window.location.origin).replace(/\/+$/, '');
  return `${site}/activer?serial=${encodeURIComponent(serial)}`;
}

/**
 * The built-in PDF fonts only cover Latin-1: "7ᵉ année" would print as garbage, so the
 * superscript becomes a plain "e" and anything else outside Latin-1 is dropped.
 */
function printable(text: string): string {
  return text.replace(/ᵉ/g, 'e').replace(/[’‘]/g, "'").replace(/[^\u0000-ÿ«»]/g, '');
}

/**
 * One page per copy of the book: the QR code, the book's number, and the activation code in a
 * box sized for a scratch-off sticker. Loaded on demand, so the libraries only download when an
 * admin actually prints.
 */
export async function buildCouponPdf(
  coupons: Coupon[],
  levelName: string,
  format: PageFormat,
): Promise<Blob> {
  const [{ jsPDF }, qrModule] = await Promise.all([import('jspdf'), import('qrcode')]);
  // qrcode is CommonJS: depending on the bundler its functions sit on the module or on .default
  const QRCode = (qrModule as unknown as { default?: typeof qrModule }).default ?? qrModule;

  const doc = new jsPDF({ unit: 'mm', format, orientation: 'portrait' });
  const width = doc.internal.pageSize.getWidth();
  const height = doc.internal.pageSize.getHeight();
  // A5 is A4 scaled by 1/√2; every measure below is written for A4 and scaled
  const k = width / 210;
  const cx = width / 2;
  const green: [number, number, number] = [22, 101, 52];
  const grey: [number, number, number] = [100, 116, 139];

  for (const [index, coupon] of coupons.entries()) {
    if (index > 0) {
      doc.addPage(format, 'portrait');
    }
    const url = activationUrl(coupon.serial);
    const qr = await QRCode.toDataURL(url, { errorCorrectionLevel: 'M', margin: 1, width: 600 });

    let y = 34 * k;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(26 * k);
    doc.setTextColor(...green);
    doc.text('EduFlow', cx, y, { align: 'center' });

    y += 10 * k;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(14 * k);
    doc.setTextColor(30, 41, 59);
    doc.text(printable(levelName), cx, y, { align: 'center' });

    y += 16 * k;
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(17 * k);
    doc.text('Activez votre livre en ligne', cx, y, { align: 'center' });

    const qrSize = 70 * k;
    y += 8 * k;
    doc.addImage(qr, 'PNG', cx - qrSize / 2, y, qrSize, qrSize);

    y += qrSize + 8 * k;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(11 * k);
    doc.setTextColor(...grey);
    doc.text('Scannez ce QR code avec votre téléphone', cx, y, { align: 'center' });

    y += 12 * k;
    doc.setFontSize(12 * k);
    doc.setTextColor(30, 41, 59);
    doc.text(`N° du livre : ${coupon.serial}`, cx, y, { align: 'center' });

    // The box the scratch-off sticker covers
    const boxW = 90 * k;
    const boxH = 28 * k;
    y += 8 * k;
    doc.setDrawColor(...green);
    doc.setLineWidth(0.6 * k);
    doc.setLineDashPattern([2 * k, 1.5 * k], 0);
    doc.roundedRect(cx - boxW / 2, y, boxW, boxH, 3 * k, 3 * k);
    doc.setLineDashPattern([], 0);

    doc.setFontSize(9 * k);
    doc.setTextColor(...grey);
    doc.text("CODE D'ACTIVATION", cx, y + 7 * k, { align: 'center' });
    doc.setFont('courier', 'bold');
    doc.setFontSize(22 * k);
    doc.setTextColor(15, 23, 42);
    doc.text(formatCode(coupon.code), cx, y + 19 * k, { align: 'center' });

    y += boxH + 7 * k;
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9.5 * k);
    doc.setTextColor(...grey);
    doc.text('Grattez la zone pour découvrir votre code.', cx, y, { align: 'center' });

    // How it works, at the foot of the page
    const steps = [
      '1. Scannez le QR code (ou ouvrez ' + printable(new URL(url).host) + '/activer).',
      '2. Grattez la zone et saisissez le code, votre prénom et votre nom.',
      '3. Notez l\'identifiant que le site vous donne pour vous reconnecter.',
    ];
    doc.setFontSize(9.5 * k);
    doc.setTextColor(71, 85, 105);
    let footY = height - 30 * k;
    for (const step of steps) {
      doc.text(printable(step), 22 * k, footY);
      footY += 6 * k;
    }
    doc.setFontSize(8 * k);
    doc.setTextColor(...grey);
    doc.text('Ce code ne fonctionne qu\'une seule fois.', 22 * k, footY + 2 * k);
  }

  return doc.output('blob');
}
