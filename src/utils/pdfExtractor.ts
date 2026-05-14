/**
 * PDF Text Extractor
 *
 * Extracts readable text from text-based (non-scanned) PDF files.
 * Works by parsing PDF content streams and decompressing FlateDecode (zlib)
 * compressed streams using pako. Handles most digitally-generated bank
 * statement PDFs.
 *
 * Limitations:
 * - Scanned PDFs (images only) — no text to extract
 * - PDFs with non-standard encoding maps — partial extraction
 * - Password-protected PDFs — will fail gracefully
 */

import { inflate } from 'pako';

// ── Base64 → Uint8Array ────────────────────────────────────────────────────────

const B64_CHARS = 'ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789+/';

function base64ToUint8Array(b64: string): Uint8Array {
  const clean = b64.replace(/[^A-Za-z0-9+/=]/g, '');
  const len = clean.length;
  const out = new Uint8Array(Math.floor(len * 0.75));
  let ptr = 0;
  /* eslint-disable no-bitwise */
  for (let i = 0; i < len; i += 4) {
    const c0 = B64_CHARS.indexOf(clean[i]);
    const c1 = B64_CHARS.indexOf(clean[i + 1]);
    const c2 = clean[i + 2] === '=' ? 0 : B64_CHARS.indexOf(clean[i + 2]);
    const c3 = clean[i + 3] === '=' ? 0 : B64_CHARS.indexOf(clean[i + 3]);
    out[ptr++] = (c0 << 2) | (c1 >> 4);
    if (clean[i + 2] !== '=') out[ptr++] = ((c1 & 0xf) << 4) | (c2 >> 2);
    if (clean[i + 3] !== '=') out[ptr++] = ((c2 & 0x3) << 6) | c3;
  }
  /* eslint-enable no-bitwise */
  return out.slice(0, ptr);
}

// ── Uint8Array → Latin1 string ─────────────────────────────────────────────────

function uint8ArrayToString(bytes: Uint8Array): string {
  let result = '';
  const chunkSize = 8192;
  for (let i = 0; i < bytes.length; i += chunkSize) {
    const chunk = bytes.subarray(i, i + chunkSize);
    result += String.fromCharCode(...chunk);
  }
  return result;
}

// ── PDF String Decoding ────────────────────────────────────────────────────────

function decodePDFLiteralString(raw: string): string {
  let result = '';
  let i = 0;
  while (i < raw.length) {
    if (raw[i] === '\\') {
      i++;
      switch (raw[i]) {
        case 'n': result += '\n'; break;
        case 'r': result += '\r'; break;
        case 't': result += '\t'; break;
        case 'b': result += '\b'; break;
        case 'f': result += '\f'; break;
        case '(': result += '('; break;
        case ')': result += ')'; break;
        case '\\': result += '\\'; break;
        default:
          // Octal escape
          if (raw[i] >= '0' && raw[i] <= '7') {
            const oct = raw.slice(i, i + 3).match(/^[0-7]{1,3}/)?.[0] || '';
            result += String.fromCharCode(parseInt(oct, 8));
            i += oct.length - 1;
          } else {
            result += raw[i];
          }
      }
    } else {
      result += raw[i];
    }
    i++;
  }
  return result;
}

function decodeHexString(hex: string): string {
  const clean = hex.replace(/\s/g, '');
  let result = '';
  for (let i = 0; i < clean.length; i += 2) {
    const byte = parseInt(clean.slice(i, i + 2), 16);
    if (!isNaN(byte)) result += String.fromCharCode(byte);
  }
  return result;
}

// ── Text Operator Parser ───────────────────────────────────────────────────────

function extractTextFromContentStream(stream: string): string {
  const lines: string[] = [];

  // Process BT/ET blocks
  const btRegex = /BT([\s\S]*?)ET/g;
  let btMatch: RegExpExecArray | null;

  while ((btMatch = btRegex.exec(stream)) !== null) {
    const block = btMatch[1];
    const words: string[] = [];

    // Parse the content of the BT block token by token
    let i = 0;
    const tokens: string[] = [];

    while (i < block.length) {
      // Skip whitespace
      if (/\s/.test(block[i])) { i++; continue; }

      // Literal string: (...)
      if (block[i] === '(') {
        let depth = 1;
        let str = '';
        i++; // skip opening (
        while (i < block.length && depth > 0) {
          if (block[i] === '\\') {
            str += block[i] + (block[i + 1] || '');
            i += 2;
          } else {
            if (block[i] === '(') depth++;
            if (block[i] === ')') depth--;
            if (depth > 0) str += block[i];
            i++;
          }
        }
        tokens.push('(' + str + ')');
        continue;
      }

      // Hex string: <...>
      if (block[i] === '<' && block[i + 1] !== '<') {
        const end = block.indexOf('>', i);
        if (end !== -1) {
          tokens.push(block.slice(i, end + 1));
          i = end + 1;
        } else {
          i++;
        }
        continue;
      }

      // Array: [...]
      if (block[i] === '[') {
        const end = block.indexOf(']', i);
        if (end !== -1) {
          tokens.push(block.slice(i, end + 1));
          i = end + 1;
        } else {
          i++;
        }
        continue;
      }

      // Number or keyword
      const wordMatch = block.slice(i).match(/^[^\s\[(< ]+/);
      if (wordMatch) {
        tokens.push(wordMatch[0]);
        i += wordMatch[0].length;
      } else {
        i++;
      }
    }

    // Now interpret the tokens
    let textLine = '';
    for (let t = 0; t < tokens.length; t++) {
      const tok = tokens[t];

      // Tj — show text
      if (tok === 'Tj' && t > 0) {
        const prev = tokens[t - 1];
        if (prev.startsWith('(')) {
          textLine += decodePDFLiteralString(prev.slice(1, -1));
        } else if (prev.startsWith('<')) {
          textLine += decodeHexString(prev.slice(1, -1));
        }
      }

      // TJ — show text array
      if (tok === 'TJ' && t > 0) {
        const arr = tokens[t - 1];
        if (arr.startsWith('[')) {
          const inner = arr.slice(1, -1);
          // Extract strings and numbers from array
          const arrayTokenRegex = /\(([^)]*)\)|<([^>]*)>|(-?\d+\.?\d*)/g;
          let m: RegExpExecArray | null;
          while ((m = arrayTokenRegex.exec(inner)) !== null) {
            if (m[1] !== undefined) {
              const decoded = decodePDFLiteralString(m[1]);
              textLine += decoded;
            } else if (m[2] !== undefined) {
              textLine += decodeHexString(m[2]);
            } else if (m[3] !== undefined) {
              // Negative kerning greater than word-space threshold → insert space
              const kern = parseFloat(m[3]);
              if (kern < -200) textLine += ' ';
            }
          }
        }
      }

      // ' — move to next line and show text
      if (tok === "'" && t > 0) {
        const prev = tokens[t - 1];
        if (textLine) words.push(textLine.trim());
        textLine = '';
        if (prev.startsWith('(')) textLine = decodePDFLiteralString(prev.slice(1, -1));
      }

      // TD, Td — text position change (new line in many cases)
      if ((tok === 'TD' || tok === 'Td') && t >= 2) {
        const y = parseFloat(tokens[t - 1]);
        if (!isNaN(y) && Math.abs(y) > 2) {
          if (textLine.trim()) words.push(textLine.trim());
          textLine = '';
        }
      }

      // T* — move to start of next line
      if (tok === 'T*') {
        if (textLine.trim()) words.push(textLine.trim());
        textLine = '';
      }
    }

    if (textLine.trim()) words.push(textLine.trim());
    if (words.length > 0) lines.push(words.join(' '));
  }

  return lines.join('\n');
}

// ── Stream Decompressor ────────────────────────────────────────────────────────

function decompressStream(rawBytes: Uint8Array): string | null {
  try {
    const decompressed = inflate(rawBytes);
    return uint8ArrayToString(decompressed);
  } catch {
    return null;
  }
}

// ── Find PDF Content Streams ───────────────────────────────────────────────────

interface PDFStream {
  filters: string[];
  data: string;
  rawBytes?: Uint8Array;
}

function parsePDFStreams(pdfContent: string): PDFStream[] {
  const streams: PDFStream[] = [];

  // Find all stream objects
  const streamRegex = /<<([\s\S]*?)>>\s*stream\r?\n([\s\S]*?)\r?\nendstream/g;
  let match: RegExpExecArray | null;

  while ((match = streamRegex.exec(pdfContent)) !== null) {
    const dict = match[1];
    const data = match[2];

    // Get filters
    const filterMatch = dict.match(/\/Filter\s*(\[([^\]]*)\]|\/\w+)/);
    const filters: string[] = [];

    if (filterMatch) {
      if (filterMatch[2]) {
        // Array of filters
        const filterNames = filterMatch[2].match(/\/\w+/g) || [];
        filters.push(...filterNames.map(f => f.slice(1)));
      } else if (filterMatch[1].startsWith('/')) {
        filters.push(filterMatch[1].slice(1));
      }
    }

    // Only care about content streams (not image/font streams)
    const typeMatch = dict.match(/\/Subtype\s*\/(\w+)/);
    const subtype = typeMatch ? typeMatch[1] : '';
    if (['Image', 'Form'].includes(subtype) && !dict.includes('/Type /XObject')) {
      continue;
    }

    streams.push({ filters, data });
  }

  return streams;
}

// ── Main PDF Text Extractor ────────────────────────────────────────────────────

export interface PDFExtractionResult {
  success: boolean;
  text: string;
  pageCount: number;
  method: 'flateDecode' | 'rawText' | 'failed';
  warning?: string;
}

export function extractTextFromPDFBase64(base64Content: string): PDFExtractionResult {
  try {
    // Convert base64 to binary string
    const bytes = base64ToUint8Array(base64Content);
    const pdfString = uint8ArrayToString(bytes);

    // Verify it's a PDF
    if (!pdfString.startsWith('%PDF')) {
      return {
        success: false,
        text: '',
        pageCount: 0,
        method: 'failed',
        warning: 'File does not appear to be a valid PDF.',
      };
    }

    // Count pages
    const pageCountMatch = pdfString.match(/\/Count\s+(\d+)/);
    const pageCount = pageCountMatch ? parseInt(pageCountMatch[1], 10) : 1;

    // Parse streams
    const streams = parsePDFStreams(pdfString);
    const allText: string[] = [];
    let usedFlateDecode = false;

    for (const stream of streams) {
      let streamContent = '';

      if (stream.filters.includes('FlateDecode') || stream.filters.includes('Fl')) {
        // Try to extract raw bytes for this stream
        let rawStart = -1;
        const streamPos = pdfString.indexOf(stream.data.substring(0, 20));

        if (streamPos !== -1) {
          rawStart = streamPos;
        }

        if (rawStart !== -1) {
          const length = stream.data.length;
          const rawBytes = bytes.slice(rawStart, rawStart + length);
          const decompressed = decompressStream(rawBytes);
          if (decompressed) {
            streamContent = decompressed;
            usedFlateDecode = true;
          }
        }
      } else if (stream.filters.length === 0 || stream.filters.includes('Identity')) {
        // Uncompressed stream — use directly
        streamContent = stream.data;
      }

      if (streamContent && (streamContent.includes('BT') || streamContent.includes('Tj'))) {
        const extracted = extractTextFromContentStream(streamContent);
        if (extracted.trim()) {
          allText.push(extracted);
        }
      }
    }

    // If FlateDecode didn't work well, try extracting text from the raw PDF string
    if (allText.length === 0) {
      // Fallback: look for BT/ET blocks anywhere in the file (uncompressed PDFs)
      const rawExtracted = extractTextFromContentStream(pdfString);
      if (rawExtracted.trim()) {
        allText.push(rawExtracted);
        return {
          success: true,
          text: rawExtracted,
          pageCount,
          method: 'rawText',
        };
      }
    }

    if (allText.length === 0) {
      return {
        success: false,
        text: '',
        pageCount,
        method: 'failed',
        warning:
          'Could not extract text from this PDF. It may be scanned or encrypted. ' +
          'Use "Paste Statement Text" instead.',
      };
    }

    return {
      success: true,
      text: allText.join('\n'),
      pageCount,
      method: usedFlateDecode ? 'flateDecode' : 'rawText',
    };
  } catch (err: any) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      method: 'failed',
      warning: `PDF parsing error: ${err?.message || 'Unknown error'}`,
    };
  }
}

// ── Read and Extract from File URI ────────────────────────────────────────────

import RNFS from 'react-native-fs';

export async function extractTextFromPDFFile(fileUri: string): Promise<PDFExtractionResult> {
  try {
    const path = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;

    let base64Content: string;
    try {
      base64Content = await RNFS.readFile(path, 'base64');
    } catch {
      // Try reading as text for content:// URIs
      try {
        const text = await RNFS.readFile(path, 'utf8');
        return {
          success: true,
          text,
          pageCount: 1,
          method: 'rawText',
        };
      } catch {
        return {
          success: false,
          text: '',
          pageCount: 0,
          method: 'failed',
          warning: 'Could not read the file. Try "Paste Statement Text" instead.',
        };
      }
    }

    return extractTextFromPDFBase64(base64Content);
  } catch (err: any) {
    return {
      success: false,
      text: '',
      pageCount: 0,
      method: 'failed',
      warning: err?.message || 'Unexpected error reading PDF.',
    };
  }
}

// ── Read Text/CSV File ─────────────────────────────────────────────────────────

export async function readTextFile(fileUri: string): Promise<string> {
  const path = fileUri.startsWith('file://') ? fileUri.slice(7) : fileUri;
  try {
    return await RNFS.readFile(path, 'utf8');
  } catch {
    // Try content URI via base64 decode
    const b64 = await RNFS.readFile(path, 'base64');
    const bytes = base64ToUint8Array(b64);
    return uint8ArrayToString(bytes);
  }
}
