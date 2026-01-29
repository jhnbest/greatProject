/**
 * 海康威视NVR设备API集成服务
 * 基于海康威视官方ISAPI协议实现
 */

const axios = require('axios');
const { XMLParser } = require('xml2js');
const crypto = require('crypto');

class HikvisionService {
  constructor(config) {
    this.baseUrl = `http://${config.ip}:${config.port}`;
    this.username = config.username;
    this.password = config.password;
    this.deviceInfo = null;
  }

  generateDigestAuthHeader(method, uri) {
    const nonce = crypto.randomBytes(16).toString('hex');
    const qop = 'auth';
    const nc = '00000001';
    const cnonce = crypto.randomBytes(8).toString('hex');
    
    const ha1 = crypto.createHash('md5')
      .update(`${this.username}:${nonce}:${this.password}`)
      .digest('hex');
    
    const ha2 = crypto.createHash('md5')
      .update(`${method}:${uri}`)
      .digest('hex');
    
    const response = crypto.createHash('md5')
      .update(`${ha1}:${nonce}:${nc}:${cnonce}:${qop}:${ha2}`)
      .digest('hex');
    
    return `Digest username="${this.username}", realm="Digest", nonce="${nonce}", uri="${uri}", qop=${qop}, nc=${nc}, cnonce="${cnonce}", response="${response}"`;
  }

  async request(method, path, data = null) {
    try {
      const headers = {
        'Authorization': this.generateDigestAuthHeader(method, path),
        'Content-Type': 'application/xml'
      };

      const response = await axios({
        method,
        url: `${this.baseUrl}${path}`,
        headers,
        data,
        timeout: 10000
      });

      return response.data;
    } catch (error) {
      throw new Error(`海康设备API请求失败: ${error.message}`);
    }
  }

  async getDeviceInfo() {
    try {
      const xmlData = await this.request('GET', '/ISAPI/System/deviceInfo');
      const parser = new XMLParser();
      const result = parser.parse(xmlData);
      
      const deviceInfo = result.DeviceInfo || {};
      
      this.deviceInfo = {
        deviceName: deviceInfo.deviceName?.[0] || '',
        deviceID: deviceInfo.deviceID?.[0] || '',
        deviceType: deviceInfo.deviceType?.[0] || '',
        model: deviceInfo.model?.[0] || '',
        serialNumber: deviceInfo.serialNumber?.[0] || '',
        firmwareVersion: deviceInfo.firmwareVersion?.[0] || '',
        firmwareVersionAbbr: deviceInfo.firmwareVersionAbbr?.[0] || '',
        encoderVersion: deviceInfo.encoderVersion?.[0] || '',
        displayName: deviceInfo.displayName?.[0] || ''
      };

      return this.deviceInfo;
    } catch (error) {
      throw new Error(`获取设备信息失败: ${error.message}`);
    }
  }

  async getDiskInfo() {
    try {
      const xmlData = await this.request('GET', '/ISAPI/Storage/diskInfo');
      const parser = new XMLParser();
      const result = parser.parse(xmlData);
      
      const disks = result.Disks || {};
      const diskList = (disks.Disk || []).map(disk => ({
        id: disk.id?.[0] || '',
        name: disk.name?.[0] || '',
        type: disk.type?.[0] || '',
        status: disk.status?.[0] || '',
        capacity: parseFloat(disk.capacity?.[0] || 0),
        freeSpace: parseFloat(disk.freeSpace?.[0] || 0),
        usedSpace: parseFloat(disk.usedSpace?.[0] || 0),
        volume: disk.volume?.[0] || ''
      }));

      return diskList;
    } catch (error) {
      throw new Error(`获取硬盘信息失败: ${error.message}`);
    }
  }

  async getDeviceStatus() {
    try {
      const [deviceInfo, diskInfo] = await Promise.all([
        this.getDeviceInfo(),
        this.getDiskInfo()
      ]);

      const totalCapacity = diskInfo.reduce((sum, disk) => sum + disk.capacity, 0);
      const totalFree = diskInfo.reduce((sum, disk) => sum + disk.freeSpace, 0);
      const totalUsed = diskInfo.reduce((sum, disk) => sum + disk.usedSpace, 0);
      const usageRate = totalCapacity > 0 ? (totalUsed / totalCapacity * 100).toFixed(2) : 0;

      return {
        deviceInfo,
        diskInfo,
        summary: {
          diskTotal: (totalCapacity / 1024 / 1024 / 1024).toFixed(2),
          diskUsed: (totalUsed / 1024 / 1024 / 1024).toFixed(2),
          diskFree: (totalFree / 1024 / 1024 / 1024).toFixed(2),
          diskUsageRate: parseFloat(usageRate),
          onlineStatus: 'ONLINE'
        }
      };
    } catch (error) {
      throw new Error(`获取设备状态失败: ${error.message}`);
    }
  }

  async getChannelList() {
    try {
      const xmlData = await this.request('GET', '/ISAPI/Streaming/channels');
      const parser = new XMLParser();
      const result = parser.parse(xmlData);
      
      const channels = result.ChannelList || {};
      const channelInfo = (channels.Channel || []).map(channel => ({
        id: channel.id?.[0] || '',
        name: channel.Name?.[0] || '',
        videoEnabled: channel.VideoEnabled?.[0] || '',
        audioEnabled: channel.AudioEnabled?.[0] || '',
        status: channel.Status?.[0] || ''
      }));

      return channelInfo;
    } catch (error) {
      throw new Error(`获取通道列表失败: ${error.message}`);
    }
  }

  async getSystemInfo() {
    try {
      const xmlData = await this.request('GET', '/ISAPI/System/capabilities');
      const parser = new XMLParser();
      const result = parser.parse(xmlData);
      
      return result;
    } catch (error) {
      throw new Error(`获取系统能力集失败: ${error.message}`);
    }
  }

  async getNetworkInfo() {
    try {
      const xmlData = await this.request('GET', '/ISAPI/System/network/interfaces');
      const parser = new XMLParser();
      const result = parser.parse(xmlData);
      
      const interfaces = result.NetworkInterfaceList || {};
      const netInfo = (interfaces.NetworkInterface || []).map(iface => ({
        id: iface.id?.[0] || '',
        name: iface.name?.[0] || '',
        ipAddress: iface.IPAddress?.[0] || '',
        subnetMask: iface.subnetMask?.[0] || '',
        macAddress: iface.macAddress?.[0] || '',
        status: iface.status?.[0] || ''
      }));

      return netInfo;
    } catch (error) {
      throw new Error(`获取网络信息失败: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this.getDeviceInfo();
      return { success: true, message: '连接成功' };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }
}

module.exports = HikvisionService;
