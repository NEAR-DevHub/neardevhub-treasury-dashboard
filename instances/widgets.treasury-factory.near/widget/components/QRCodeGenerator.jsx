// filepath: /Users/peter/git/neardevhub-treasury-dashboard/instances/widgets.treasury-factory.near/widget/components/QRCodeGenerator.jsx
// Props:
// - text: String (The text to encode in the QR code)
// - cellSize: Number (Optional, default: 4 - size of each QR module in pixels)
// - margin: Number (Optional, default: 4 - margin around the QR code in modules)

const textToEncode = props.text;
const cellSize = props.cellSize || 4;
const margin = props.margin || 4;

if (!textToEncode) {
  return <p style={{color: "red", textAlign: "center", margin: "10px"}}>Error: No text provided for QR code.</p>;
}

// Serialize props for safe embedding in the script string
const serializedText = JSON.stringify(textToEncode);
const serializedCellSize = JSON.stringify(cellSize);
const serializedMargin = JSON.stringify(margin);

// This is the original QR code generation script, adapted to return a data URL.
// All bitwise operators (<<=, ^=, &, ^) should work in the iframe's context.
const qrGenerationFunctionString = `
function generateQrDataUrl(text, cellSizeInternal, marginInternal) {
  // Default values for cellSize and margin if not provided
  const currentCellSize = cellSizeInternal || 4;
  const currentMargin = marginInternal || 4;

  // --- Start of Original QR Code Generation Logic ---
  // GF(256) math for Reed-Solomon ECC
  const gfExp = [], gfLog = [];
  for (let i = 0, x = 1; i < 256; i++) {
    gfExp[i] = x;
    gfLog[x] = i;
    x <<= 1; // Original bitwise operation
    if (x & 0x100) x ^= 0x11d; // Original bitwise operations
  }
  const mul = (x, y) => x && y ? gfExp[(gfLog[x] + gfLog[y]) % 255] : 0;

  // Encode data (byte mode)
  const version = 4, ecLevel = 'L'; // Fixed version as in original script
  const ecCodewordsPerBlock = { 'L': [7,10,15,20] }[ecLevel][version - 1];
  const capacity = [17,32,53,78][version - 1];
  if (text.length > capacity) {
    // This error will be caught by the try...catch in the iframe script
    throw new Error('Text too long for QR code capacity (v4). Max: ' + capacity + ' chars.');
  }
  const dataBits = [0,1,0,0]; // byte mode
  dataBits.push(...text.length.toString(2).padStart(8, '0').split('').map(Number));
  for (const c of text) dataBits.push(...c.charCodeAt().toString(2).padStart(8, '0').split('').map(Number));
  while (dataBits.length % 8) dataBits.push(0);
  const bytes = [];
  for (let i = 0; i < dataBits.length; i += 8)
    bytes.push(parseInt(dataBits.slice(i, i + 8).join(''), 2));
  const totalDataBytes = [19,34,55,80][version - 1];
  while (bytes.length < totalDataBytes) bytes.push(bytes.length % 2 ? 0x11 : 0xec);

  // Reed-Solomon error correction
  const rsPoly = [1];
  for (let i = 0; i < ecCodewordsPerBlock; i++) {
    rsPoly.push(0);
    for (let j = rsPoly.length - 1; j > 0; j--)
      rsPoly[j] = rsPoly[j - 1] ^ mul(rsPoly[j], gfExp[i]); // Original bitwise op
    rsPoly[0] = mul(rsPoly[0], gfExp[i]);
  }
  const ecc = new Array(ecCodewordsPerBlock).fill(0);
  for (const b of bytes) {
    const factor = b ^ ecc[0]; // Original bitwise op
    ecc.shift();
    ecc.push(0);
    rsPoly.forEach((coef, i) => ecc[i] ^= mul(coef, factor)); // Original bitwise op
  }
  const fullBytes = bytes.concat(ecc);

  // Simplified interleaving for 1 block
  let bitStr = '';
  fullBytes.forEach(b => bitStr += b.toString(2).padStart(8, '0'));

  // Initialize QR matrix
  const qrMatrixSize = 21 + 4 * (version - 1); // size of the QR code matrix (e.g., 33x33 for v4)
  const matrix = Array.from({ length: qrMatrixSize }, () => Array(qrMatrixSize).fill(null));

  const placeFinder = (r, c) => {
    for (let y = -1; y <= 7; y++) for (let x = -1; x <= 7; x++) {
      const rx = r + x, ry = c + y;
      if (0 <= rx && rx < qrMatrixSize && 0 <= ry && ry < qrMatrixSize)
        matrix[ry][rx] = (0 <= x && x <= 6 && (y === 0 || y === 6) ||
                          0 <= y && y <= 6 && (x === 0 || x === 6) ||
                          2 <= x && x <= 4 && 2 <= y && y <= 4);
    }
  };
  placeFinder(0, 0); placeFinder(qrMatrixSize - 7, 0); placeFinder(0, qrMatrixSize - 7);
  for (let i = 8; i < qrMatrixSize - 8; i++) { // Timing patterns
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }
  // Note: Alignment patterns for version >= 2 were not fully implemented in original snippet.
  // For v4, an alignment pattern would typically be at (qrMatrixSize-7, qrMatrixSize-7) or similar.
  // The original script might be simplified for very specific versions/cases.

  // Place data bits (simplified for 1 block, mask 0)
  let k = 0, up = true;
  for (let x = qrMatrixSize - 1; x > 0; x -= 2) {
    if (x === 6) x--; // Skip timing pattern
    for (let y = 0; y < qrMatrixSize; y++) {
      const row = up ? qrMatrixSize - 1 - y : y;
      for (let dx = 0; dx < 2; dx++) {
        const col = x - dx;
        if (matrix[row][col] === null) {
          if (k < bitStr.length) {
            matrix[row][col] = bitStr[k++] === '1';
          } else {
            matrix[row][col] = false; // Padding
          }
        }
      }
    }
    up = !up;
  }

  // Generate SVG string
  const svgComputedSize = (qrMatrixSize + currentMargin * 2) * currentCellSize;
  let svg = \`<svg xmlns="http://www.w3.org/2000/svg" width="\${svgComputedSize}" height="\${svgComputedSize}" viewBox="0 0 \${svgComputedSize} \${svgComputedSize}" shape-rendering="crispEdges">\`;
  svg += \`<rect width="100%" height="100%" fill="white"/>\`;
  for (let y = 0; y < qrMatrixSize; y++) {
    for (let x = 0; x < qrMatrixSize; x++) {
      if (matrix[y][x]) {
        const cx = (x + currentMargin) * currentCellSize;
        const cy = (y + currentMargin) * currentCellSize;
        svg += \`<rect x="\${cx}" y="\${cy}" width="\${currentCellSize}" height="\${currentCellSize}" fill="black"/>\`;
      }
    }
  }
  svg += \`</svg>\`;
  // --- End of Original QR Code Generation Logic ---

  return \`data:image/svg+xml;base64,\${btoa(svg)}\`;
}
`;

const iframeSrcDoc = `
<html>
<head>
  <style>
    body { margin: 0; display: flex; justify-content: center; align-items: center; background-color: transparent; }
    img { display: block; max-width: 100%; max-height: 100%; }
    p.error { color: red; font-family: sans-serif; text-align: center; padding: 10px; font-size: 12px; }
  </style>
</head>
<body>
  <img id="qrCodeImageElement" alt="Loading QR Code..." />
  <script>
    ${qrGenerationFunctionString}

    try {
      // Directly use the values embedded from the outer scope
      const textForQR = '${textToEncode ? textToEncode.replace(/'/g, "\\'") : ''}'; // Escape single quotes in text
      const cs = ${cellSize};
      const m = ${margin};

      if (textForQR && typeof generateQrDataUrl === 'function') {
        const dataUrl = generateQrDataUrl(textForQR, cs, m);
        const imgElement = document.getElementById('qrCodeImageElement');
        imgElement.src = dataUrl;
        imgElement.alt = "QR Code for " + textForQR.substring(0, 20) + "...";
      } else {
        let errorMsg = "Required data ('textForQR') not available or QR function missing in iframe.";
        if (!textForQR) errorMsg = "No text provided to iframe for QR code generation.";
        document.body.innerHTML = '<p class="error">' + errorMsg + '</p>';
      }
    } catch (e) {
      document.body.innerHTML = '<p class="error">QR Generation Error: ' + e.message.substring(0, 200) + '</p>';
    }
  </script>
</body>
</html>`;

// Calculate iframe dimensions based on fixed version 4 QR logic
const version = 4; // Must match the version used in qrGenerationFunctionString
const qrMatrixSize = 21 + 4 * (version - 1); // 33 for v4
const iframeWidth = (qrMatrixSize + margin * 2) * cellSize;
const iframeHeight = iframeWidth;

return (
  <iframe
    srcDoc={iframeSrcDoc}
    style={{
      width: `${iframeWidth}px`,
      height: `${iframeHeight}px`,
      border: "none",
      display: "block",
      margin: "15px auto", // Centered with some vertical margin
    }}
    sandbox="allow-scripts" // allow-scripts is needed for the script in srcDoc to run.
    title={`QR Code for ${textToEncode ? textToEncode.substring(0, 30) + '...' : 'address'}`}
  />
);
