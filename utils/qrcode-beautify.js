const app = getApp();

class QRCodeBeautify {
  constructor() {
    this.defaultConfig = {
      dataColor: '#000000',
      posColor: '#000000',
      dataStyle: 'rect',
      posStyle: 'rect',
      icon: null,
      backgroundColor: '#ffffff'
    };
  }

  generateQRCode(data, config = {}) {
    const finalConfig = Object.assign({}, this.defaultConfig, config);
    const QRCode = require('./qrcode.js');
    return QRCode.qrcode(data, 400);
  }

  drawQRCode(canvas, qrData, config = {}) {
    const finalConfig = Object.assign({}, this.defaultConfig, config);
    const ctx = canvas.getContext('2d');
    
    const width = canvas.width;
    const height = canvas.height;
    const moduleCount = qrData.moduleCount;
    const tileSize = width / moduleCount;
    
    ctx.fillStyle = finalConfig.backgroundColor;
    ctx.fillRect(0, 0, width, height);
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!qrData.modules[row][col]) continue;
        
        const isPositionPattern = this.isPositionPattern(row, col, moduleCount);
        const isAlignmentPattern = this.isAlignmentPattern(row, col, moduleCount);
        
        const x = col * tileSize;
        const y = row * tileSize;
        const size = tileSize;
        
        if (isPositionPattern || isAlignmentPattern) {
          ctx.fillStyle = finalConfig.posColor;
          this.drawModule(ctx, x, y, size, finalConfig.posStyle, isPositionPattern);
        } else {
          ctx.fillStyle = finalConfig.dataColor;
          this.drawModule(ctx, x, y, size, finalConfig.dataStyle, false);
        }
      }
    }
    
    return this.drawIcon(canvas, finalConfig.icon, width, height);
  }

  drawModule(ctx, x, y, size, style, isPosition) {
    const padding = isPosition ? 0 : size * 0.1;
    const actualSize = size - padding * 2;
    const actualX = x + padding;
    const actualY = y + padding;
    
    switch (style) {
      case 'circle':
        ctx.beginPath();
        ctx.arc(
          actualX + actualSize / 2,
          actualY + actualSize / 2,
          actualSize / 2,
          0,
          Math.PI * 2
        );
        ctx.fill();
        break;
      case 'rect':
      default:
        ctx.fillRect(actualX, actualY, actualSize, actualSize);
        break;
    }
  }

  drawIcon(canvas, iconPath, width, height) {
    if (!iconPath) return Promise.resolve();
    
    return new Promise((resolve, reject) => {
      const iconSize = Math.min(width, height) * 0.25;
      const x = (width - iconSize) / 2;
      const y = (height - iconSize) / 2;
      const ctx = canvas.getContext('2d');
      
      ctx.fillStyle = '#ffffff';
      ctx.fillRect(x - 10, y - 10, iconSize + 20, iconSize + 20);
      
      wx.getImageInfo({
        src: iconPath,
        success: (res) => {
          const iconCanvas = wx.createOffscreenCanvas({
            type: '2d',
            width: iconSize,
            height: iconSize
          });
          const iconCtx = iconCanvas.getContext('2d');
          
          iconCtx.drawImage(res.path, 0, 0, iconSize, iconSize);
          
          ctx.drawImage(iconCanvas, x, y, iconSize, iconSize);
          resolve();
        },
        fail: (err) => {
          console.error('Failed to load icon:', err);
          resolve();
        }
      });
    });
  }

  isPositionPattern(row, col, moduleCount) {
    const size = 7;
    const patterns = [
      [0, 0],
      [moduleCount - size, 0],
      [0, moduleCount - size]
    ];
    
    for (const [pr, pc] of patterns) {
      if (row >= pr && row < pr + size && col >= pc && col < pc + size) {
        return true;
      }
    }
    return false;
  }

  isAlignmentPattern(row, col, moduleCount) {
    const positions = this.getAlignmentPatternPositions(moduleCount);
    const size = 5;
    
    for (const [ar, ac] of positions) {
      if (row >= ar && row < ar + size && col >= ac && col < ac + size) {
        return true;
      }
    }
    return false;
  }

  getAlignmentPatternPositions(moduleCount) {
    if (moduleCount < 21) return [];
    
    const positions = [];
    const step = (moduleCount - 13) / Math.floor((moduleCount - 10) / 28) || 1;
    
    let pos = 6;
    while (pos < moduleCount - 7) {
      positions.push([pos - 2, pos - 2]);
      pos += step;
    }
    
    return positions;
  }
}

module.exports = QRCodeBeautify;
