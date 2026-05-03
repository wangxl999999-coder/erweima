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

    wx.showLoading({
      title: '生成中...'
    });

    try {
      console.log('Generating QRCode for content: ' + content.substring(0, 50) + (content.length > 50 ? '...' : ''));
      console.log('Content length: ' + content.length);
      
      const qrData = this.qrcodeBeautify.generateQRCode(content);
      
      console.log('QRCode generated successfully, moduleCount: ' + qrData.moduleCount);
      
      this.setData({
        qrcodeData: qrData,
        isGenerated: true
      });

      app.globalData.qrcodeData = qrData;
      app.globalData.qrcodeContent = content;
      
      wx.hideLoading();
      
      if (this.data.canvas) {
        this.renderQRCode();
      }
      
      wx.showToast({
        title: '二维码生成成功',
        icon: 'success'
      });
    } catch (error) {
      wx.hideLoading();
      console.error('二维码生成失败:', error);
      console.error('Error message:', error.message);
      
      let errorMsg = '二维码生成失败';
      if (error.message && error.message.includes('too long')) {
        errorMsg = '内容过长，请缩短后重试';
      } else if (error.message) {
        errorMsg = error.message;
      }
      
      wx.showModal({
        title: '生成失败',
        content: errorMsg,
        showCancel: false
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

  showUploadOptions() {
    wx.showActionSheet({
      itemList: ['从相册选择图片', '拍照识别'],
      success: (res) => {
        if (res.tapIndex === 0) {
          this.uploadQRCode('album');
        } else {
          this.uploadQRCode('camera');
        }
      },
      fail: (res) => {
        console.log('用户取消选择');
      }
    });
  },

  uploadQRCode(sourceType) {
    wx.showLoading({
      title: '准备识别...'
    });
    
    console.log('Starting QRCode scan...');
    
    wx.scanCode({
      onlyFromCamera: sourceType === 'camera',
      scanType: ['qrCode'],
      success: (scanRes) => {
        wx.hideLoading();
        
        console.log('QRCode scan result:', scanRes);
        
        const content = scanRes.result;
        
        if (!content) {
          wx.showToast({
            title: '未能识别二维码内容',
            icon: 'none'
          });
          return;
        }
        
        console.log('QRCode content: ' + content.substring(0, 50) + (content.length > 50 ? '...' : ''));
        console.log('Content length: ' + content.length);
        
        wx.showLoading({
          title: '处理中...'
        });
        
        try {
          const qrData = this.qrcodeBeautify.generateQRCode(content);
          
          console.log('QRCode regenerated successfully, moduleCount: ' + qrData.moduleCount);
          
          this.setData({
            content: content,
            qrcodeData: qrData,
            isGenerated: true
          });

          app.globalData.qrcodeData = qrData;
          app.globalData.qrcodeContent = content;
          
          wx.hideLoading();
          
          if (this.data.canvas) {
            this.renderQRCode();
          }
          
          wx.showToast({
            title: '二维码识别成功',
            icon: 'success'
          });
        } catch (error) {
          wx.hideLoading();
          console.error('二维码处理失败:', error);
          console.error('Error message:', error.message);
          
          let errorMsg = '二维码处理失败';
          if (error.message && error.message.includes('too long')) {
            errorMsg = '二维码内容过长，无法处理';
          } else if (error.message) {
            errorMsg = error.message;
          }
          
          wx.showModal({
            title: '处理失败',
            content: errorMsg + '\n\n原始内容已保存，您可以尝试手动复制内容后重新生成。',
            confirmText: '复制内容',
            cancelText: '确定',
            success: (modalRes) => {
              if (modalRes.confirm && content) {
                wx.setClipboardData({
                  data: content,
                  success: () => {
                    wx.showToast({
                      title: '内容已复制',
                      icon: 'success'
                    });
                  }
                });
              }
            }
          });
        }
      },
      fail: (error) => {
        wx.hideLoading();
        console.error('二维码识别失败:', error);
        console.error('Error errMsg:', error.errMsg);
        
        let errorMsg = '未能识别二维码';
        
        if (error.errMsg) {
          if (error.errMsg.includes('cancel')) {
            console.log('用户取消扫码');
            return;
          }
          if (error.errMsg.includes('fail')) {
            errorMsg = '识别失败，请确保图片清晰';
          }
        }
        
        wx.showModal({
          title: '识别失败',
          content: errorMsg + '\n\n请确保：\n1. 图片中包含清晰的二维码\n2. 二维码没有被遮挡或损坏\n3. 尝试使用拍照功能直接扫描',
          showCancel: false,
          confirmText: '我知道了'
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
