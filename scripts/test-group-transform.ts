import JSZip from 'jszip';
import { readFileSync } from 'fs';

const CANVAS_W = 1920;
const CANVAS_H = 1080;
let slideWidthEmu = 9144000;
let slideHeightEmu = 5143500;

function emuToPxX(emu: number) { return Math.round((emu / slideWidthEmu) * CANVAS_W); }
function emuToPxY(emu: number) { return Math.round((emu / slideHeightEmu) * CANVAS_H); }

function extractBalancedTags(xml: string, tagName: string): string[] {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  const results: string[] = [];
  let i = 0;
  while (i < xml.length) {
    const openIdx = xml.indexOf(openTag, i);
    if (openIdx === -1) break;
    let depth = 1;
    let j = openIdx + openTag.length;
    while (j < xml.length && depth > 0) {
      const nextOpen = xml.indexOf(openTag, j);
      const nextClose = xml.indexOf(closeTag, j);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; j = nextOpen + openTag.length; }
      else { depth--; j = nextClose + closeTag.length; }
    }
    results.push(xml.slice(openIdx + openTag.length, j - closeTag.length));
    i = j;
  }
  return results;
}

function stripBalancedTags(xml: string, tagName: string): string {
  const openTag = `<${tagName}>`;
  const closeTag = `</${tagName}>`;
  let result = xml;
  let i = 0;
  while (true) {
    const openIdx = result.indexOf(openTag, i);
    if (openIdx === -1) break;
    let depth = 1;
    let j = openIdx + openTag.length;
    while (j < result.length && depth > 0) {
      const nextOpen = result.indexOf(openTag, j);
      const nextClose = result.indexOf(closeTag, j);
      if (nextClose === -1) break;
      if (nextOpen !== -1 && nextOpen < nextClose) { depth++; j = nextOpen + openTag.length; }
      else { depth--; j = nextClose + closeTag.length; }
    }
    result = result.slice(0, openIdx) + result.slice(j);
  }
  return result;
}

async function main() {
  const buf = readFileSync('/Users/rmartin/Downloads/PRESENTATIONS/Halloween XL by Slidesgo.pptx');
  const zip = await JSZip.loadAsync(buf);
  
  // Read slideLayout17 (used by slide 9 = section "01" with tree/pumpkin)
  const layoutXml = await zip.file('ppt/slideLayouts/slideLayout17.xml')!.async('string');
  
  // Extract groups exactly as import does
  const groups = extractBalancedTags(layoutXml, 'p:grpSp');
  console.log(`Layout groups: ${groups.length}`);
  
  for (let gi = 0; gi < groups.length; gi++) {
    const grpXml = groups[gi];
    
    const grpSpPr = grpXml.match(/<p:grpSpPr>([\s\S]*?)<\/p:grpSpPr>/);
    if (!grpSpPr) { console.log(`Group ${gi}: NO grpSpPr`); continue; }
    
    const grpOff = grpSpPr[1].match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
    const grpExt = grpSpPr[1].match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
    const chOffM = grpSpPr[1].match(/<a:chOff\s+x="(-?\d+)"\s+y="(-?\d+)"/);
    const chExtM = grpSpPr[1].match(/<a:chExt\s+cx="(\d+)"\s+cy="(\d+)"/);
    if (!grpOff || !grpExt) continue;
    
    const gx = parseInt(grpOff[1]), gy = parseInt(grpOff[2]);
    const gw = parseInt(grpExt[1]), gh = parseInt(grpExt[2]);
    const cox = chOffM ? parseInt(chOffM[1]) : gx;
    const coy = chOffM ? parseInt(chOffM[2]) : gy;
    const cow = chExtM ? parseInt(chExtM[1]) : gw;
    const coh = chExtM ? parseInt(chExtM[2]) : gh;
    const scaleGX = cow > 0 ? gw / cow : 1;
    const scaleGY = coh > 0 ? gh / coh : 1;
    
    console.log(`\nGroup ${gi}:`);
    console.log(`  gx=${gx} gy=${gy} gw=${gw} gh=${gh}`);
    console.log(`  cox=${cox} coy=${coy} cow=${cow} coh=${coh}`);
    console.log(`  scaleX=${scaleGX.toFixed(4)} scaleY=${scaleGY.toFixed(4)}`);
    
    // Extract child shapes (strip nested groups)
    const noSubGroups = stripBalancedTags(grpXml, 'p:grpSp');
    const childMatches = [...noSubGroups.matchAll(/<p:sp>([\s\S]*?)<\/p:sp>/g)];
    
    console.log(`  ${childMatches.length} child shapes`);
    
    for (let ci = 0; ci < Math.min(5, childMatches.length); ci++) {
      const sp = childMatches[ci][1];
      const childOff = sp.match(/<a:off\s+x="(-?\d+)"\s+y="(-?\d+)"/);
      const childExt = sp.match(/<a:ext\s+cx="(\d+)"\s+cy="(\d+)"/);
      if (!childOff || !childExt) continue;
      
      const cx = parseInt(childOff[1]), cy = parseInt(childOff[2]);
      const cw = parseInt(childExt[1]), ch = parseInt(childExt[2]);
      
      // Transform
      const tx = gx + (cx - cox) * scaleGX;
      const ty = gy + (cy - coy) * scaleGY;
      const tw = cw * scaleGX;
      const th = ch * scaleGY;
      
      // To pixels
      const px_x = emuToPxX(tx);
      const px_y = emuToPxY(ty);
      const px_w = emuToPxX(tw);
      const px_h = emuToPxY(th);
      
      console.log(`  child ${ci}: EMU(${cx},${cy}) ${cw}x${ch} → transform(${tx.toFixed(0)},${ty.toFixed(0)}) ${tw.toFixed(0)}x${th.toFixed(0)} → PX(${px_x},${px_y}) ${px_w}x${px_h}`);
    }
  }
}

main();
