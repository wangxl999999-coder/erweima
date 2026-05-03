const app = getApp();
const QRCodeBeautify = require('../../utils/qrcode-beautify.js');

Page({
  data: {
    config: {
      dataColor: '#000000',
      posColor: '#000000',
      dataStyle: 'rect',
      posStyle: 'rect',
      icon: null,
      backgroundColor: '#ffffff'
    },
    colorPresets: [
      '#000000', '#3b82f6', '#10b981', '#f59e0b',
      '#ef4444', '#8b5cf6', '#ec4899', '#06b6d4'
    ],
    defaultIcons: [],
    showColorPicker: false,
    currentColorType: '',
    canvas: null
  },

  onLoad() {
    this.qrcodeBeautify = new QRCodeBeautify();
    this.qrcodeData = app.globalData.qrcodeData;
    
    this.setData({
      defaultIcons: this.getDefaultIcons()
    });
  },

  onShow() {
    if (this.qrcodeData) {
      this.initCanvas();
    }
  },

  getDefaultIcons() {
    return [
      { id: 1, name: '爱心', icon: '❤️' },
      { id: 2, name: '星星', icon: '⭐' },
      { id: 3, name: '笑脸', icon: '😊' },
      { id: 4, name: '火焰', icon: '🔥' },
      { id: 5, name: '闪电', icon: '⚡' },
      { id: 6, name: '太阳', icon: '☀️' }
    ];
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#beautifyCanvas')
      .fields({ node: true, size: true })
      .exec((res) => {
        if (res && res[0]) {
          const canvas = res[0].node;
          const ctx = canvas.getContext('2d');
          
          const dpr = wx.getSystemInfoSync().pixelRatio;
          canvas.width = res[0].width * dpr;
          canvas.height = res[0].height * dpr;
          ctx.scale(dpr, dpr);
          
          this.setData({ canvas: canvas });
          this.renderQRCode();
        }
      });
  },

  renderQRCode() {
    if (!this.data.canvas || !this.qrcodeData) return;

    const canvas = this.data.canvas;
    const ctx = canvas.getContext('2d');
    
    const moduleCount = this.qrcodeData.moduleCount;
    const canvasWidth = 400;
    const canvasHeight = 400;
    const tileSize = canvasWidth / moduleCount;
    
    ctx.fillStyle = this.data.config.backgroundColor;
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
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
      this.drawIcon(canvas, ctx, canvasWidth, canvasHeight);
    }
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
    ctx.fillRect(x - 10, y - 10, iconSize + 20, iconSize + 20);
    
    ctx.fillStyle = '#333333';
    ctx.font = `${iconSize * 0.7}px sans-serif`;
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    
    if (typeof this.data.config.icon === 'string' && this.data.config.icon.length <= 4) {
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

  selectDataColor(e) {
    const color = e.currentTarget.dataset.color;
    const config = this.data.config;
    config.dataColor = color;
    this.setData({ config: config });
    this.renderQRCode();
  },

  selectPosColor(e) {
    const color = e.currentTarget.dataset.color;
    const config = this.data.config;
    config.posColor = color;
    this.setData({ config: config });
    this.renderQRCode();
  },

  selectDataStyle(e) {
    const style = e.currentTarget.dataset.style;
    const config = this.data.config;
    config.dataStyle = style;
    this.setData({ config: config });
    this.renderQRCode();
  },

  selectPosStyle(e) {
    const style = e.currentTarget.dataset.style;
    const config = this.data.config;
    config.posStyle = style;
    this.setData({ config: config });
    this.renderQRCode();
  },

  selectDefaultIcon(e) {
    const icon = e.currentTarget.dataset.icon;
    const config = this.data.config;
    config.icon = icon;
    this.setData({ config: config });
    this.renderQRCode();
  },

  uploadCustomIcon() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
        wx.getImageInfo({
          src: tempFilePath,
          success: (infoRes) => {
            const config = this.data.config;
            config.icon = tempFilePath;
            config.iconType = 'image';
            config.iconInfo = infoRes;
            this.setData({ config: config });
            this.renderQRCode();
          },
          fail: (err) => {
            console.error('获取图片信息失败:', err);
            wx.showToast({
              title: '图片处理失败',
              icon: 'none'
            });
          }
        });
      },
      fail: (err) => {
        console.error('选择图片失败:', err);
        wx.showToast({
          title: '选择图片失败',
          icon: 'none'
        });
      }
    });
  },

  removeIcon() {
    const config = this.data.config;
    config.icon = null;
    config.iconType = null;
    config.iconInfo = null;
    this.setData({ config: config });
    this.renderQRCode();
  },

  goToResult() {
    app.globalData.beautifyConfig = this.data.config;
    app.globalData.renderedCanvas = this.data.canvas;
    
    wx.navigateTo({
      url: '/pages/result/result'
    });
  }
});
