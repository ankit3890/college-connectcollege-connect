import fs from "fs";
import pdf from "pdf-parse";
import { v4 as uuidv4 } from "uuid";

export interface Page {
  pageNumber: number;
  text: string;
  subject?: string | null;
  code?: string | null;
  topics?: string[];
}

import { SyllabusEntry } from "../../models/syllabus/SyllabusEntry";

export interface ParsedDoc {
  id: string;
  title: string;
  meta?: any;
  pages: Page[];
  entries: SyllabusEntry[];
}

function findSubjectFromText(text: string) {
  const lines = text.split(/\r?\n/).map(l => l.trim()).filter(Boolean);
  let subject = "", code = "";

  for (const line of lines) {
    // Code: e.g., MA101, CS202L, 18CS45, IT 101L
    // Prioritize lines with "Course Code" or "Subject Code"
    // Allow spaces in code but stop before "Course Name" or "Subject Name"
    const codeMatch = line.match(/(?:Course|Subject)\s*Code\s*[:\-]?\s*([A-Z0-9\s]+?)(?=\s*(?:Course|Subject)|$)/i);
    if (codeMatch) {
      code = codeMatch[1].replace(/\s+/g, ""); // Remove spaces (IT 101L -> IT101L)
    }

    // Subject Name
    const nameMatch = line.match(/(?:Course|Subject)\s*Name\s*[:\-]?\s*([^\n\r]+)/i);
    if (nameMatch) {
      subject = nameMatch[1].trim();
      // Clean up if it grabbed trailing table chars or credits
      subject = subject.replace(/L\s*T\s*P\s*C.*/i, "").trim();
    }
  }

  // Fallback for subject if not found by prefix
  if (!subject) {
    for (const line of lines.slice(0, 15)) {
      if (line.length > 5 && line === line.toUpperCase() && !line.includes("SEMESTER") && !line.includes("EXAM") && !line.includes("CODE")) {
        subject = line;
        break;
      }
    }
  }

  return { subject, code };
}

function extractCredits(text: string) {
  // Look for L T P C pattern specifically
  const ltpMatch = text.match(/L\s*T\s*P\s*C\s*[\r\n]+([0-9\s]+)/i);
  if (ltpMatch) return ltpMatch[1].trim();

  const match = text.match(/(?:Credits|L[:\-]T[:\-]P)\s*[:\-]?\s*([0-9\s:\-\+]+)/i);
  return match ? match[1].trim() : undefined;
}

function extractTopics(text: string) {
  // Clean up asterisks that might be artifacts of bold text
  text = text.replace(/\*\*/g, "");

  // Remove page headers/footers
  text = text.replace(/Course\s*Book\s*let\s*B\.\s*Tech\..*$/gim, "");
  text = text.replace(/KIET\s*Group\s*of\s*Institutions.*$/gim, "");

  const topics: string[] = [];
  // Regex to find start of a unit
  // Capture the unit number and the rest of the line
  const unitRegex = /(?:Unit|Module)\s*([IVX0-9]+)\s*[:\-]?\s*([^\n]*)/gi;

  let match;
  let lastIndex = 0;
  // Store structured info about the last unit found
  let lastUnit: { num: string, title: string, hours: string } | null = null;

  while ((match = unitRegex.exec(text)) !== null) {
    if (lastUnit) {
      // Capture content between last match and this match
      let content = text.substring(lastIndex, match.index).trim();

      // Check for hours in content if not found in title
      if (!lastUnit.hours) {
        const hMatch = content.match(/^([\d\s]+\s*hours)/i);
        if (hMatch) {
          lastUnit.hours = hMatch[1].trim();
          content = content.replace(/^([\d\s]+\s*hours)/i, "").trim();
        }
      }

      // Push structured string: Unit || Title || Hours || Content
      topics.push(`Unit ${lastUnit.num} || ${lastUnit.title} || ${lastUnit.hours} || ${content}`);
    }

    let unitNum = match[1];
    let title = match[2].trim();
    let hours = "";
    lastIndex = unitRegex.lastIndex;

    // Check title for hours
    const hMatch = title.match(/([\d\s]+\s*hours)/i);
    if (hMatch) {
      hours = hMatch[1].trim();
      title = title.replace(/[\d\s]+\s*hours/i, "").trim();
    }
    // Clean trailing punctuation
    title = title.replace(/[:\-]+$/, "").trim();

    // If title is empty, check next line
    if (!title && lastIndex < text.length) {
      // Skip newlines to get to the start of the next line
      let tempIndex = lastIndex;
      while (tempIndex < text.length && (text[tempIndex] === '\r' || text[tempIndex] === '\n' || text[tempIndex] === ' ')) {
        tempIndex++;
      }

      const nextNewline = text.indexOf('\n', tempIndex);
      if (nextNewline !== -1) {
        const nextLine = text.substring(tempIndex, nextNewline).trim();
        // If next line is short and not another Unit, treat as title
        if (nextLine.length > 0 && nextLine.length < 100 && !/Unit\s*\d+/i.test(nextLine)) {
          title = nextLine;
          // Check this new title line for hours
          const hMatchNext = title.match(/([\d\s]+\s*hours)/i);
          if (hMatchNext) {
            hours = hMatchNext[1].trim();
            title = title.replace(/[\d\s]+\s*hours/i, "").trim();
          }
          lastIndex = nextNewline + 1;
        }
      }
    }

    lastUnit = { num: unitNum, title, hours };
  }

  // Capture the last unit's content
  if (lastUnit) {
    const remaining = text.substring(lastIndex);
    const endMatch = remaining.match(/(?:Text\s*Books|Reference|Course\s*Outcome|Evaluation|Mode\s*of\s*Evaluation)/i);
    let content = endMatch ? remaining.substring(0, endMatch.index).trim() : remaining.trim();

    if (!lastUnit.hours) {
      const hMatch = content.match(/^([\d\s]+\s*hours)/i);
      if (hMatch) {
        lastUnit.hours = hMatch[1].trim();
        content = content.replace(/^([\d\s]+\s*hours)/i, "").trim();
      }
    }

    topics.push(`Unit ${lastUnit.num} || ${lastUnit.title} || ${lastUnit.hours} || ${content}`);
  }

  return topics;
}

function extractMarks(text: string) {
  const marks: any = {};

  // Find Evaluation Scheme section
  const evalMatch = text.match(/Evaluation\s*Scheme/i);
  if (!evalMatch) return null;

  // Limit search to the evaluation section (stop at next Course Code or Unit)
  const evalSection = text.substring(evalMatch.index!).split(/Course\s*Code|Unit/i)[0];

  // Extract all numbers
  const numbers = evalSection.match(/\d+/g)?.map(Number) || [];

  if (numbers.length >= 5) {
    // Sort descending
    const sorted = [...numbers].sort((a, b) => b - a);
    const total = sorted[0];

    // Try to find specific patterns
    // Pattern 1: 150, 75, 30, 30, 6, 6, 3 (IT106B)
    if (total === 150) {
      marks['Total'] = 150;
      marks['ESE'] = numbers.find(n => n === 75) || 75;
      marks['MSE 1'] = 30;
      marks['MSE 2'] = 30;
      marks['CA1'] = 6;
      marks['CA2'] = 6;
      marks['CA3'] = 3;
      return marks;
    }

    // Pattern 2: 200, 100, 40, 40, 8, 8, 4 (Standard)
    if (total === 200) {
      marks['Total'] = 200;
      marks['ESE'] = 100;
      marks['MSE 1'] = 40;
      marks['MSE 2'] = 40;
      marks['CA1'] = 8;
      marks['CA2'] = 8;
      marks['CA3'] = 4;
      return marks;
    }

    // Fallback: Map sorted values
    marks['Total'] = sorted[0];
    marks['ESE'] = sorted[1];
    // Assuming next two are MSEs
    marks['MSE 1'] = sorted[2];
    marks['MSE 2'] = sorted[3];
    // Rest are CAs
    marks['CA1'] = sorted[4];
    marks['CA2'] = sorted[5] || sorted[4];
    marks['CA3'] = sorted[6] || sorted[4] / 2;
  }

  return marks;
}

function extractPrerequisites(text: string) {
  const match = text.match(/Pre\s*-\s*requisite\s*[:\-]?\s*([^\n\r]+)/i) || text.match(/Pre-requisite\s*[:\-]?\s*([^\n\r]+)/i);
  return match ? match[1].trim() : undefined;
}

function extractListSection(text: string, headerRegex: RegExp, endRegex: RegExp) {
  const startMatch = text.match(headerRegex);
  if (!startMatch) return undefined;

  const startIndex = startMatch.index! + startMatch[0].length;
  const remainingText = text.substring(startIndex);

  const endMatch = remainingText.match(endRegex);
  const content = endMatch ? remainingText.substring(0, endMatch.index) : remainingText;

  // Split by numbered list items (1., 2., etc.) or newlines if no numbers
  const items = content.split(/\r?\n(?=\d+\.|•|\-)/).map(l => l.trim()).filter(l => l.length > 0);

  // If split didn't work well (single block), try splitting by newlines and cleaning
  if (items.length <= 1) {
    return content.split(/\r?\n/).map(l => l.trim()).filter(l => l.length > 0);
  }

  return items;
}

export async function parsePdfAndExtract(input: string | Buffer): Promise<ParsedDoc> {
  const data = typeof input === 'string' ? fs.readFileSync(input) : input;
  const renderPage = (pageData: any) => {
    return pageData.getTextContent().then((textContent: any) => {
      // Sort items by Y (descending) then X (ascending)
      const items = textContent.items.map((item: any) => ({
        str: item.str,
        x: item.transform[4],
        y: item.transform[5]
      }));

      // Sort by Y (desc) with tolerance, then X (asc)
      items.sort((a: any, b: any) => {
        const yDiff = Math.abs(a.y - b.y);
        if (yDiff < 5) { // Tolerance for same line
          return a.x - b.x;
        }
        return b.y - a.y; // Top to bottom
      });

      let text = "";
      let lastY = -1;

      for (const item of items) {
        if (lastY === -1) {
          text += item.str;
        } else {
          // If Y changed significantly, add newline
          if (Math.abs(item.y - lastY) > 5) {
            text += "\n" + item.str;
          } else {
            // Same line, add space if needed (simple heuristic)
            text += " " + item.str;
          }
        }
        lastY = item.y;
      }
      return text + "\f"; // Delimiter for page splitting
    });
  };

  const parsed = await pdf(data, { pagerender: renderPage });
  const rawText = parsed.text || "";
  const chunks = rawText.split(/\f+/).filter(Boolean);

  const docId = uuidv4();
  const pages: Page[] = [];
  const entries: SyllabusEntry[] = [];

  let currentCode = "";
  let currentSubject = "";
  let currentText = "";
  let currentStartPage = 0;

  chunks.forEach((t, i) => {
    // Clean up extra spaces but preserve newlines
    const cleanText = t.replace(/  +/g, " ");
    const { subject, code: rawCode } = findSubjectFromText(cleanText);
    const code = rawCode ? rawCode.toUpperCase() : "";

    // Store page info (raw)
    pages.push({
      pageNumber: i + 1,
      text: cleanText.trim(),
      subject: subject || (currentCode ? currentSubject : undefined),
      code: code || (currentCode ? currentCode : undefined),
      topics: extractTopics(cleanText)
    });

    if (code && code !== currentCode) {
      // Found a NEW subject start (different from current).
      // We need to split the text: before the code belongs to previous subject, 
      // after (and including) the code belongs to new subject.

      let splitIndex = 0;
      // Try to find the "Course Code: CODE" line
      const codeRegex = new RegExp(`(?:Course|Subject)\\s*Code\\s*[:\\-]?\\s*${code}`, "i");
      const match = cleanText.match(codeRegex);
      if (match) {
        splitIndex = match.index!;
      } else {
        // Fallback: find the code itself
        const simpleMatch = cleanText.match(new RegExp(`\\b${code}\\b`, 'i'));
        if (simpleMatch) splitIndex = simpleMatch.index!;
      }

      const textBefore = cleanText.substring(0, splitIndex);
      const textAfter = cleanText.substring(splitIndex);

      // Append textBefore to the PREVIOUS subject
      if (currentCode) {
        currentText += "\n" + textBefore;

        // Finalize previous subject
        const credits = extractCredits(currentText);
        const topics = extractTopics(currentText);
        const marks = extractMarks(currentText);
        const prerequisites = extractPrerequisites(currentText);
        const objectives = extractListSection(currentText, /Course\s*Objectives\s*[:\-]?/i, /Course\s*Outcome|CO\s*-\s*PO|CO-PO|Unit/i);
        const outcomes = extractListSection(currentText, /Course\s*Outcome\s*[:\-]?/i, /CO\s*-\s*PO|CO-PO|Unit/i);

        entries.push({
          id: uuidv4(),
          docId,
          subjectCode: currentCode,
          subjectName: currentSubject || "Unknown Subject",
          credits,
          prerequisites,
          objectives,
          outcomes,
          topics,
          marksCriteria: marks,
          sourcePage: currentStartPage
        });
      }

      // Start NEW subject with textAfter
      currentCode = code;
      currentSubject = subject;
      currentText = textAfter;
      currentStartPage = i + 1;

    } else {
      // No new code found OR same code found, append entire text to current subject
      if (currentCode) {
        currentText += "\n" + cleanText;
      }
    }
  });

  // Finalize the last subject
  if (currentCode) {
    const credits = extractCredits(currentText);
    const topics = extractTopics(currentText);
    const marks = extractMarks(currentText);
    const prerequisites = extractPrerequisites(currentText);
    const objectives = extractListSection(currentText, /Course\s*Objectives\s*[:\-]?/i, /Course\s*Outcome|CO\s*-\s*PO|CO-PO|Unit/i);
    const outcomes = extractListSection(currentText, /Course\s*Outcome\s*[:\-]?/i, /CO\s*-\s*PO|CO-PO|Unit/i);

    entries.push({
      id: uuidv4(),
      docId,
      subjectCode: currentCode,
      subjectName: currentSubject || "Unknown Subject",
      credits,
      prerequisites,
      objectives,
      outcomes,
      topics,
      marksCriteria: marks,
      sourcePage: currentStartPage
    });
  }

  return {
    id: docId,
    title: `Syllabus ${new Date().toISOString()}`,
    meta: { originalName: typeof input === 'string' ? input : "Buffer" },
    pages,
    entries
  };
}
