const app = getApp();
const QRCodeBeautify = require('../../utils/qrcode-beautify.js');

Page({
  data: {
    qrcodeData: null,
    config: null,
    canvas: null,
    isGenerating: false,
    isGenerated: false,
    savedImagePath: ''
  },

  onLoad() {
    this.qrcodeData = app.globalData.qrcodeData;
    this.qrcodeBeautify = new QRCodeBeautify();
    
    const config = Object.assign({}, app.globalData.beautifyConfig);
    this.setData({
      config: config,
      qrcodeData: this.qrcodeData
    });
  },

  onReady() {
    this.initCanvas();
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#resultCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const dpr = wx.getSystemInfoSync().pixelRatio;
          const canvasSize = 800;
          
          canvas.width = canvasSize * dpr;
          canvas.height = canvasSize * dpr;
          ctx.scale(dpr, dpr);
          
          this.setData({ canvas: canvas, canvasSize: canvasSize });
          this.renderFinalQRCode();
        }
      });
  },

  renderFinalQRCode() {
    if (!this.data.canvas || !this.qrcodeData) return;

    const canvas = this.data.canvas;
    const ctx = canvas.getContext('2d');
    const canvasSize = this.data.canvasSize;
    
    const moduleCount = this.qrcodeData.moduleCount;
    const tileSize = canvasSize / moduleCount;
    
    ctx.fillStyle = this.data.config.backgroundColor;
    ctx.fillRect(0, 0, canvasSize, canvasSize);
    
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (!this.qrcodeData.modules[row][col]) continue;
        
        const isPositionPattern = this.isPositionPattern(row, col, moduleCount);
        
        const x = col * tileSize;
        const y = row * tileSize;
        const size = tileSize;
        
        if (isPositionPattern) {
          ctx.fillStyle = this.data.config.posColor;
          this.drawModule(ctx, x, y, size, this.data.config.posStyle, true);
        } else {
          ctx.fillStyle = this.data.config.dataColor;
          this.drawModule(ctx, x, y, size, this.data.config.dataStyle, false);
        }
      }
    }
    
    if (this.data.config.icon) {
      this.drawIcon(canvas, ctx, canvasSize, canvasSize);
    }
    
    this.setData({ isGenerated: true });
  },

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
  },

  drawIcon(canvas, ctx, width, height) {
    const iconSize = Math.min(width, height) * 0.25;
    const x = (width - iconSize) / 2;
    const y = (height - iconSize) / 2;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(x - 15, y - 15, iconSize + 30, iconSize + 30);
    
    if (this.data.config.iconType === 'image' && this.data.config.iconInfo) {
      return new Promise((resolve, reject) => {
        wx.getImageInfo({
          src: this.data.config.icon,
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
    } else if (typeof this.data.config.icon === 'string' && this.data.config.icon.length <= 4) {
      ctx.fillStyle = '#333333';
      ctx.font = `${iconSize * 0.7}px sans-serif`;
      ctx.textAlign = 'center';
      ctx.textBaseline = 'middle';
      ctx.fillText(this.data.config.icon, x + iconSize / 2, y + iconSize / 2);
    }
  },

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
  },

  downloadQRCode() {
    if (!this.data.canvas) {
      wx.showToast({
        title: '请先生成二维码',
        icon: 'none'
      });
      return;
    }

    this.setData({ isGenerating: true });

    wx.canvasToTempFilePath({
      canvas: this.data.canvas,
      success: (res) => {
        const tempFilePath = res.tempFilePath;
        
        wx.saveImageToPhotosAlbum({
          filePath: tempFilePath,
          success: () => {
            this.setData({ 
              isGenerating: false,
              savedImagePath: tempFilePath
            });
            
            wx.showModal({
              title: '保存成功',
              content: '二维码已保存到相册',
              showCancel: false,
              confirmText: '确定'
            });
          },
          fail: (err) => {
            this.setData({ isGenerating: false });
            
            if (err.errMsg.includes('auth deny') || err.errMsg.includes('authorize')) {
              wx.showModal({
                title: '权限申请',
                content: '需要获取相册权限才能保存图片，请在设置中开启',
                confirmText: '去设置',
                success: (modalRes) => {
                  if (modalRes.confirm) {
                    wx.openSetting();
                  }
                }
              });
            } else {
              wx.showToast({
                title: '保存失败',
                icon: 'none'
              });
            }
          }
        });
      },
      fail: (err) => {
        this.setData({ isGenerating: false });
        console.error('canvasToTempFilePath fail:', err);
        wx.showToast({
          title: '生成图片失败',
          icon: 'none'
        });
      }
    });
  },

  reEdit() {
    wx.navigateBack({
      delta: 1
    });
  },

  goHome() {
    wx.navigateBack({
      delta: 2
    });
  }
});
