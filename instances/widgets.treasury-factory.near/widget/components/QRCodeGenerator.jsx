// QRCodeGenerator.jsx (NEAR BOS Widget Component)
// Props:
// - text: String (required) – the text to encode in the QR code
// - cellSize: Number (optional) – size of each module in pixels, default 4
// - margin: Number (optional) – white border in modules, default 4

const textToEncode = props.text;
const cellSize = props.cellSize || 4;
const margin = props.margin || 4;

if (!textToEncode) {
  return (
    <p style={{ color: "red", textAlign: "center", margin: "10px" }}>
      Error: No text provided for QR code.
    </p>
  );
}

const qrGenerationFunctionString = `
function generateQrDataUrl(text, cellSize, margin) {
  var gfExp = [], gfLog = [];
  for (var i = 0, x = 1; i < 256; i++) {
    gfExp[i] = x;
    gfLog[x] = i;
    x <<= 1;
    if (x & 0x100) x ^= 0x11d;
  }
  var mul = function(x, y) {
    return x && y ? gfExp[(gfLog[x] + gfLog[y]) % 255] : 0;
  };

  var version = 4;
  var ecCodewordsPerBlock = 20;
  var totalDataBytes = 80 - ecCodewordsPerBlock;

  if (text.length > 78) throw new Error('Too long for version 4 QR');

  var data = [0x4]; // byte mode
  data.push(text.length);
  for (i = 0; i < text.length; i++) data.push(text.charCodeAt(i));
  while (data.length < totalDataBytes) data.push(data.length % 2 ? 0x11 : 0xec);

  var rsPoly = [1];
  for (i = 0; i < ecCodewordsPerBlock; i++) {
    rsPoly.push(0);
    for (var j = rsPoly.length - 1; j > 0; j--) rsPoly[j] ^= mul(rsPoly[j - 1], gfExp[i]);
    rsPoly[0] = mul(rsPoly[0], gfExp[i]);
  }

  var ecc = new Array(ecCodewordsPerBlock).fill(0);
  for (var b of data) {
    var factor = b ^ ecc[0];
    ecc.shift();
    ecc.push(0);
    rsPoly.forEach(function(coef, i) {
      ecc[i] ^= mul(coef, factor);
    });
  }

  var allBytes = data.concat(ecc);
  var bits = allBytes.map(function(b) {
    return b.toString(2).padStart(8, '0');
  }).join('');

  var size = 33;
  var matrix = [];
  for (i = 0; i < size; i++) matrix.push(new Array(size).fill(null));

  var placeFinder = function(r, c) {
    for (var y = -1; y <= 7; y++) {
      for (var x = -1; x <= 7; x++) {
        var rx = r + x, ry = c + y;
        if (rx >= 0 && ry >= 0 && rx < size && ry < size) {
          var isDark = (
            (0 <= x && x <= 6 && (y === 0 || y === 6)) ||
            (0 <= y && y <= 6 && (x === 0 || x === 6)) ||
            (2 <= x && x <= 4 && 2 <= y && y <= 4)
          );
          matrix[ry][rx] = isDark;
        }
      }
    }
  };

  placeFinder(0, 0);
  placeFinder(size - 7, 0);
  placeFinder(0, size - 7);

  for (i = 8; i < size - 8; i++) {
    matrix[6][i] = i % 2 === 0;
    matrix[i][6] = i % 2 === 0;
  }

  var placeFormat = function(fmtBits) {
    var fmt = fmtBits.split('').map(function(b) { return b === '1'; });
    var coords = [
      [0,8],[1,8],[2,8],[3,8],[4,8],[5,8],[7,8],[8,8],[8,7],
      [8,5],[8,4],[8,3],[8,2],[8,1],[8,0]
    ];
    coords.forEach(function(coord, i) {
      matrix[coord[1]][coord[0]] = fmt[i];
    });
    var mirror = [[size-1,8],[size-2,8],[size-3,8],[size-4,8],[size-5,8],[size-6,8],[size-7,8],[8,size-8],[8,size-7],[8,size-6],[8,size-5],[8,size-4],[8,size-3],[8,size-2],[8,size-1]];
    mirror.forEach(function(coord, i) {
      matrix[coord[1]][coord[0]] = fmt[i];
    });
  };

  placeFormat("111011111000100"); // Level L, Mask 0

  var k = 0, up = true;
  for (var x = size - 1; x > 0; x -= 2) {
    if (x === 6) x--;
    for (var y = 0; y < size; y++) {
      var row = up ? size - 1 - y : y;
      for (var dx = 0; dx < 2; dx++) {
        var col = x - dx;
        if (matrix[row][col] === null) {
          var bit = bits[k++] || '0';
          var masked = ((bit === '1') ^ ((row + col) % 2 === 0)) !== 0;
          matrix[row][col] = masked;
        }
      }
    }
    up = !up;
  }

  var s = (size + margin * 2) * cellSize;
  var svg = '<svg xmlns="http://www.w3.org/2000/svg" width="' + s + '" height="' + s + '" viewBox="0 0 ' + s + ' ' + s + '">';
  svg += '<rect width="100%" height="100%" fill="white"/>';
  for (var y = 0; y < size; y++) {
    for (var x = 0; x < size; x++) {
      if (matrix[y][x]) {
        var cx = (x + margin) * cellSize;
        var cy = (y + margin) * cellSize;
        svg += '<rect x="' + cx + '" y="' + cy + '" width="' + cellSize + '" height="' + cellSize + '" fill="black"/>';
      }
    }
  }
  svg += '</svg>';
  return 'data:image/svg+xml;base64,' + btoa(svg);
}
`;

const escapedText = textToEncode.replace(/'/g, "\\'");
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
      const textForQR = '${escapedText}';
      const cs = ${cellSize};
      const m = ${margin};
      if (textForQR && typeof generateQrDataUrl === 'function') {
        const dataUrl = generateQrDataUrl(textForQR, cs, m);
        //document.getElementById('qrCodeImageElement').src = dataUrl;
        document.getElementById('qrCodeImageElement').src = "https://api.qrserver.com/v1/create-qr-code/?data="+textForQR+"&amp;size=100x100";
      } else {
        document.body.innerHTML = '<p class="error">Error: Missing input.</p>';
      }
    } catch (e) {
      document.body.innerHTML = '<p class="error">QR Generation Error: ' + e.message.substring(0, 200) + '</p>';
    }
  </script>
</body>
</html>
`;

const version = 4;
const qrMatrixSize = 21 + 4 * (version - 1); // version 4 = 33
const iframeWidth = (qrMatrixSize + margin * 2) * cellSize;
const iframeHeight = iframeWidth;

return (
  <iframe
    srcDoc={iframeSrcDoc}
    style={{
      width: iframeWidth + "px",
      height: iframeHeight + "px",
      border: "none",
      display: "block",
      margin: "15px auto",
    }}
    sandbox="allow-scripts"
    title={"QR Code for " + textToEncode}
  />
);
