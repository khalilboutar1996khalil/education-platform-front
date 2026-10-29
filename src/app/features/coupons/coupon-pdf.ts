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

type Rgb = [number, number, number];

const INK: Rgb = [15, 23, 42];
const MUTED: Rgb = [100, 116, 139];
const GREEN_DARK: Rgb = [20, 83, 45];
const GREEN: Rgb = [22, 163, 74];
const GREEN_SOFT: Rgb = [220, 252, 231];
const GREEN_LINE: Rgb = [134, 239, 172];
const SCRATCH: Rgb = [226, 232, 240];
const WHITE: Rgb = [255, 255, 255];

/**
 * One page per copy of the book, laid out as the book's activation page: a header band, the QR
 * code in a card beside three numbered steps, the activation code in a grey box sized for a
 * scratch-off sticker, and a footer with the address to type when there is no QR reader.
 * Every measure is written for A4 and scaled, so A5 keeps the same proportions.
 *
 * Loaded on demand, so the libraries only download when an admin actually prints.
 */
/** The school year a book printed today is for: from September on, it is the year that starts. */
export function schoolYear(today = new Date()): string {
  const year = today.getFullYear();
  const start = today.getMonth() >= 7 ? year : year - 1; // August already prints for September
  return `${start} / ${start + 1}`;
}

/**
 * @param title what the framed title says, e.g. the batch name "Cours de 7e année"; the level name
 *              is used when the batch has none
 */
export async function buildCouponPdf(
  coupons: Coupon[],
  levelName: string,
  title: string | null,
  format: PageFormat,
): Promise<Blob> {
  const [{ jsPDF }, qrModule] = await Promise.all([import('jspdf'), import('qrcode')]);
  // qrcode is CommonJS: depending on the bundler its functions sit on the module or on .default
  const QRCode = (qrModule as unknown as { default?: typeof qrModule }).default ?? qrModule;

  const doc = new jsPDF({ unit: 'mm', format, orientation: 'portrait' });
  const W = doc.internal.pageSize.getWidth();
  const H = doc.internal.pageSize.getHeight();
  const k = W / 210;
  const m = 18 * k; // side margin
  const level = printable(levelName);
  const bookTitle = printable(title?.trim() || `Cours de ${levelName}`);
  const yearLine = `Année scolaire ${schoolYear()}`;

  const fill = (c: Rgb) => doc.setFillColor(c[0], c[1], c[2]);
  const stroke = (c: Rgb) => doc.setDrawColor(c[0], c[1], c[2]);
  const ink = (c: Rgb) => doc.setTextColor(c[0], c[1], c[2]);
  const font = (style: 'normal' | 'bold', size: number, family = 'helvetica') => {
    doc.setFont(family, style);
    doc.setFontSize(size * k);
  };

  for (const [index, coupon] of coupons.entries()) {
    if (index > 0) {
      doc.addPage(format, 'portrait');
    }
    const url = activationUrl(coupon.serial);
    const host = printable(new URL(url).host);
    const qr = await QRCode.toDataURL(url, {
      // Black on white with a quiet zone: what every phone camera reads first time, even on
      // cheap paper. Coloured modules look nicer and scan noticeably worse.
      errorCorrectionLevel: 'M',
      margin: 2,
      width: 640,
    });

    // ---------- header band ----------
    const bandH = 40 * k;
    fill(GREEN_DARK);
    doc.rect(0, 0, W, bandH, 'F');
    fill(GREEN);
    doc.rect(0, bandH, W, 2.2 * k, 'F');

    // logo: the initial in a rounded square, like the app's icon
    const logo = 14 * k;
    const lx = m;
    const ly = (bandH - logo) / 2;
    fill(GREEN);
    doc.roundedRect(lx, ly, logo, logo, 3.5 * k, 3.5 * k, 'F');
    ink(WHITE);
    font('bold', 20);
    doc.text('E', lx + logo / 2, ly + logo / 2 + 2.6 * k, { align: 'center' });

    ink(WHITE);
    font('bold', 21);
    doc.text('EduFlow', lx + logo + 5 * k, bandH / 2 + 0.5 * k);
    ink(GREEN_LINE);
    font('bold', 7.5);
    doc.text('PLATEFORME PEDAGOGIQUE', lx + logo + 5 * k, bandH / 2 + 6 * k, { charSpace: 0.6 * k });

    // level pill, right-aligned in the band
    font('bold', 10);
    const pillW = Math.min(doc.getTextWidth(level) + 12 * k, W / 2 - m);
    const pillH = 10 * k;
    const px = W - m - pillW;
    const py = (bandH - pillH) / 2;
    fill(WHITE);
    doc.roundedRect(px, py, pillW, pillH, pillH / 2, pillH / 2, 'F');
    ink(GREEN_DARK);
    doc.text(level, px + pillW / 2, py + pillH / 2 + 1.3 * k, { align: 'center', maxWidth: pillW - 6 * k });

    // ---------- framed book title ----------
    const frameW = W - 2 * m;
    const frameH = 24 * k;
    const frameY = bandH + 10 * k;
    fill(GREEN_SOFT);
    stroke(GREEN);
    doc.setLineWidth(0.9 * k);
    doc.roundedRect(m, frameY, frameW, frameH, 4 * k, 4 * k, 'FD');
    ink(GREEN_DARK);
    font('bold', 17);
    doc.text(bookTitle, W / 2, frameY + 10.5 * k, { align: 'center', maxWidth: frameW - 12 * k });
    ink(MUTED);
    font('bold', 11);
    doc.text(yearLine, W / 2, frameY + 18 * k, { align: 'center' });

    // ---------- title ----------
    let y = frameY + frameH + 15 * k;
    ink(INK);
    font('bold', 23);
    doc.text('Activez votre livre en ligne', W / 2, y, { align: 'center' });
    y += 8 * k;
    ink(MUTED);
    font('normal', 11);
    doc.text('Cours, quiz et TP de votre niveau, accessibles depuis votre téléphone ou votre ordinateur.',
      W / 2, y, { align: 'center', maxWidth: W - 2 * m });

    // ---------- QR card + steps ----------
    const cardY = y + 8 * k;
    const cardW = 82 * k;
    const cardH = 96 * k;
    fill(WHITE);
    stroke(GREEN_LINE);
    doc.setLineWidth(0.7 * k);
    doc.roundedRect(m, cardY, cardW, cardH, 5 * k, 5 * k, 'FD');
    const qrSize = 64 * k;
    doc.addImage(qr, 'PNG', m + (cardW - qrSize) / 2, cardY + 9 * k, qrSize, qrSize);
    fill(GREEN_SOFT);
    const tagW = 44 * k;
    const tagH = 9 * k;
    doc.roundedRect(m + (cardW - tagW) / 2, cardY + cardH - tagH - 8 * k, tagW, tagH, tagH / 2, tagH / 2, 'F');
    ink(GREEN_DARK);
    font('bold', 10);
    doc.text('Scannez-moi', m + cardW / 2, cardY + cardH - 8 * k - tagH / 2 + 1.3 * k, { align: 'center' });

    const sx = m + cardW + 12 * k;
    const sw = W - m - sx;
    const steps: [string, string][] = [
      ['Scannez le QR code', 'avec l\'appareil photo de votre téléphone.'],
      ['Grattez la zone grise', 'ci-dessous et saisissez le code avec votre prénom et votre nom.'],
      ['Notez votre identifiant', 'affiché par le site : il vous servira pour vous reconnecter.'],
    ];
    let stepY = cardY + 6 * k;
    for (const [i, [title, text]] of steps.entries()) {
      const r = 5.5 * k;
      fill(GREEN);
      doc.circle(sx + r, stepY + r, r, 'F');
      ink(WHITE);
      font('bold', 12);
      doc.text(String(i + 1), sx + r, stepY + r + 1.6 * k, { align: 'center' });

      const tx = sx + 2 * r + 5 * k;
      const tw = sw - 2 * r - 5 * k;
      ink(INK);
      font('bold', 12);
      doc.text(printable(title), tx, stepY + 4.2 * k);
      ink(MUTED);
      font('normal', 10);
      const lines = doc.splitTextToSize(printable(text), tw) as string[];
      doc.text(lines, tx, stepY + 10 * k, { lineHeightFactor: 1.35 });
      stepY += 13 * k + lines.length * 4.8 * k + 6 * k;
    }

    // ---------- activation code (scratch area) ----------
    y = cardY + cardH + 13 * k;
    ink(GREEN_DARK);
    font('bold', 9);
    doc.text("CODE D'ACTIVATION", W / 2, y, { align: 'center', charSpace: 0.8 * k });

    const boxW = 112 * k;
    const boxH = 30 * k;
    const bx = (W - boxW) / 2;
    y += 4 * k;
    fill(SCRATCH);
    stroke(MUTED);
    doc.setLineWidth(0.5 * k);
    doc.setLineDashPattern([2.2 * k, 1.6 * k], 0);
    doc.roundedRect(bx, y, boxW, boxH, 5 * k, 5 * k, 'FD');
    doc.setLineDashPattern([], 0);
    ink(INK);
    font('bold', 26, 'courier');
    doc.text(formatCode(coupon.code), W / 2, y + boxH / 2 + 3 * k, { align: 'center', charSpace: 1 * k });

    y += boxH + 7 * k;
    ink(MUTED);
    font('normal', 9.5);
    doc.text('Zone à gratter. Ce code est personnel et ne fonctionne qu\'une seule fois.',
      W / 2, y, { align: 'center', maxWidth: W - 2 * m });

    // ---------- footer band ----------
    const footH = 24 * k;
    const fy = H - footH;
    fill(GREEN_SOFT);
    doc.rect(0, fy, W, footH, 'F');
    ink(GREEN_DARK);
    font('normal', 9.5);
    doc.text('Pas de QR code ? Ouvrez', m, fy + 10 * k);
    font('bold', 11);
    doc.text(`${host}/activer`, m, fy + 16 * k);

    const serialLabel = `N° ${coupon.serial}`;
    font('bold', 12);
    const sW = doc.getTextWidth(serialLabel) + 10 * k;
    const sH = 10 * k;
    fill(WHITE);
    stroke(GREEN_LINE);
    doc.setLineWidth(0.5 * k);
    doc.roundedRect(W - m - sW, fy + (footH - sH) / 2, sW, sH, 2.5 * k, 2.5 * k, 'FD');
    ink(GREEN_DARK);
    doc.text(serialLabel, W - m - sW / 2, fy + footH / 2 + 1.5 * k, { align: 'center' });
  }

  return doc.output('blob');
}
