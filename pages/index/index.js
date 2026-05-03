const app = getApp();
const QRCodeBeautify = require('../../utils/qrcode-beautify.js');

Page({
  data: {
    content: '',
    qrcodeData: null,
    qrcodeImage: '',
    isGenerated: false,
    canvas: null
  },

  onLoad() {
    this.qrcodeBeautify = new QRCodeBeautify();
  },

  onShow() {
    this.initCanvas();
  },

  onInputChange(e) {
    this.setData({
      content: e.detail.value
    });
  },

  initCanvas() {
    const query = wx.createSelectorQuery();
    query.select('#qrcodeCanvas')
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
          
          if (this.data.qrcodeData) {
            this.renderQRCode();
          }
        }
      });
  },

  generateQRCode() {
    const content = this.data.content.trim();
    
    if (!content) {
      wx.showToast({
        title: '请输入二维码内容',
        icon: 'none'
      });
      return;
    }

    try {
      const qrData = this.qrcodeBeautify.generateQRCode(content);
      
      this.setData({
        qrcodeData: qrData,
        isGenerated: true
      });

      app.globalData.qrcodeData = qrData;
      app.globalData.qrcodeContent = content;
      
      if (this.data.canvas) {
        this.renderQRCode();
      }
      
      wx.showToast({
        title: '二维码生成成功',
        icon: 'success'
      });
    } catch (error) {
      console.error('二维码生成失败:', error);
      wx.showToast({
        title: '二维码生成失败',
        icon: 'none'
      });
    }
  },

  renderQRCode() {
    if (!this.data.canvas || !this.data.qrcodeData) return;

    const canvas = this.data.canvas;
    const ctx = canvas.getContext('2d');
    
    const moduleCount = this.data.qrcodeData.moduleCount;
    const canvasWidth = 400;
    const canvasHeight = 400;
    const tileSize = canvasWidth / moduleCount;
    
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(0, 0, canvasWidth, canvasHeight);
    
    ctx.fillStyle = '#000000';
    for (let row = 0; row < moduleCount; row++) {
      for (let col = 0; col < moduleCount; col++) {
        if (this.data.qrcodeData.modules[row][col]) {
          const x = col * tileSize;
          const y = row * tileSize;
          const size = tileSize * 0.9;
          const offset = tileSize * 0.05;
          
          ctx.fillRect(x + offset, y + offset, size, size);
        }
      }
    }
  },

  uploadQRCode() {
    wx.showLoading({
      title: '识别二维码中...'
    });
    
    wx.scanCode({
      onlyFromCamera: false,
      scanType: ['qrCode'],
      success: (scanRes) => {
        wx.hideLoading();
        
        const content = scanRes.result;
        
        try {
          const qrData = this.qrcodeBeautify.generateQRCode(content);
          
          this.setData({
            content: content,
            qrcodeData: qrData,
            isGenerated: true
          });

          app.globalData.qrcodeData = qrData;
          app.globalData.qrcodeContent = content;
          
          if (this.data.canvas) {
            this.renderQRCode();
          }
          
          wx.showToast({
            title: '二维码识别成功',
            icon: 'success'
          });
        } catch (error) {
          console.error('二维码处理失败:', error);
          wx.showToast({
            title: '二维码处理失败',
            icon: 'none'
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('二维码识别失败:', error);
        wx.showToast({
          title: '未能识别二维码',
          icon: 'none'
        });
      }
    });
  },

  goToBeautify() {
    if (!this.data.qrcodeData) {
      wx.showToast({
        title: '请先生成或上传二维码',
        icon: 'none'
      });
      return;
    }
    
    wx.navigateTo({
      url: '/pages/beautify/beautify'
    });
  }
});
