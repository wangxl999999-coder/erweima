const app = getApp();
const QRCodeBeautify = require('../../utils/qrcode-beautify.js');

Page({
  data: {
    content: '',
    qrcodeData: null,
    qrcodeImage: '',
    isGenerated: false
  },

  onLoad() {
    this.qrcodeBeautify = new QRCodeBeautify();
  },

  onInputChange(e) {
    this.setData({
      content: e.detail.value
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

  uploadQRCode() {
    wx.chooseMedia({
      count: 1,
      mediaType: ['image'],
      sourceType: ['album', 'camera'],
      success: (res) => {
        const tempFilePath = res.tempFiles[0].tempFilePath;
        
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
              app.globalData.uploadedImage = tempFilePath;
              
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
      fail: (error) => {
        console.error('选择图片失败:', error);
        wx.showToast({
          title: '选择图片失败',
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
