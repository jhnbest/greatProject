/**
 * 大华NVR设备API集成服务
 * 基于大华官方DHAPI协议实现
 */

const axios = require('axios');
const crypto = require('crypto');

class DahuaService {
  constructor(config) {
    this.baseUrl = `http://${config.ip}:${config.port}`;
    this.username = config.username;
    this.password = config.password;
    this.session = null;
    this.requestSeq = 1;
  }

  async login() {
    try {
      const params = {
        userName: this.username,
        password: this.password
      };

      const response = await axios.post(
        `${this.baseUrl}/RPC2_Login`,
        params,
        { timeout: 10000 }
      );

      if (response.data.result && response.data.session) {
        this.session = response.data.session;
        return { success: true, session: this.session };
      }
      
      return { success: false, message: '登录失败' };
    } catch (error) {
      throw new Error(`大华设备登录失败: ${error.message}`);
    }
  }

  async request(method, params = {}) {
    try {
      if (!this.session) {
        await this.login();
      }

      const payload = {
        id: this.requestSeq++,
        session: this.session,
        method: method,
        params: params
      };

      const response = await axios.post(
        `${this.baseUrl}/RPC2`,
        payload,
        { timeout: 10000 }
      );

      if (response.data.result) {
        return response.data.params || {};
      }

      throw new Error(response.data.error?.message || '请求失败');
    } catch (error) {
      if (error.message.includes('Session')) {
        this.session = null;
      }
      throw new Error(`大华设备API请求失败: ${error.message}`);
    }
  }

  async getDeviceInfo() {
    try {
      const result = await this.request('magicBox.getDeviceInfo');
      
      return {
        deviceName: result.DeviceName || '',
        deviceID: result.DeviceID || '',
        deviceType: result.DeviceType || '',
        model: result.model || '',
        serialNumber: result.SerialNumber || '',
        firmwareVersion: result.FirmwareVersion || '',
        firmwareVersionAbbr: result.FirmwareVersionAbbr || '',
        encoderVersion: result.EncoderVersion || '',
        displayName: result.DisplayName || ''
      };
    } catch (error) {
      throw new Error(`获取设备信息失败: ${error.message}`);
    }
  }

  async getStorageDevice() {
    try {
      const result = await this.request('magicBox.getStorageDevice');
      
      const disks = (result.AHCI || []).map((disk, index) => ({
        id: `Disk_${index}`,
        name: disk.Name || `磁盘${index}`,
        type: disk.Type || 'HDD',
        status: disk.Status || 'UNKNOWN',
        capacity: parseFloat(disk.Capacity || 0),
        freeSpace: parseFloat(disk.FreeSpace || 0),
        usedSpace: parseFloat(disk.UsedSpace || 0),
        volume: disk.Volume || ''
      }));

      return disks;
    } catch (error) {
      throw new Error(`获取存储设备信息失败: ${error.message}`);
    }
  }

  async getDeviceStatus() {
    try {
      const [deviceInfo, storageInfo] = await Promise.all([
        this.getDeviceInfo(),
        this.getStorageDevice()
      ]);

      const totalCapacity = storageInfo.reduce((sum, disk) => sum + disk.capacity, 0);
      const totalFree = storageInfo.reduce((sum, disk) => sum + disk.freeSpace, 0);
      const totalUsed = storageInfo.reduce((sum, disk) => sum + disk.usedSpace, 0);
      const usageRate = totalCapacity > 0 ? (totalUsed / totalCapacity * 100).toFixed(2) : 0;

      return {
        deviceInfo,
        diskInfo: storageInfo,
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

  async getChannelNumber() {
    try {
      const result = await this.request('magicBox.getChannelNumber');
      return {
        analog: result.Analog || 0,
        digital: result.Digital || 0,
        total: (result.Analog || 0) + (result.Digital || 0)
      };
    } catch (error) {
      throw new Error(`获取通道数量失败: ${error.message}`);
    }
  }

  async getRecordStatus() {
    try {
      const result = await this.request('recordManager.getRecordStatus');
      return result;
    } catch (error) {
      throw new Error(`获取录像状态失败: ${error.message}`);
    }
  }

  async getNetworkInfo() {
    try {
      const result = await this.request('magicBox.getNetworkInfo');
      return {
        ip: result.IP || '',
        subnetMask: result.SubnetMask || '',
        gateway: result.Gateway || '',
        mac: result.MAC || '',
        dns1: result.DNS1 || '',
        dns2: result.DNS2 || ''
      };
    } catch (error) {
      throw new Error(`获取网络信息失败: ${error.message}`);
    }
  }

  async getSystemInfo() {
    try {
      const [deviceInfo, networkInfo, channelInfo] = await Promise.all([
        this.getDeviceInfo(),
        this.getNetworkInfo(),
        this.getChannelNumber()
      ]);

      return {
        deviceInfo,
        networkInfo,
        channelInfo
      };
    } catch (error) {
      throw new Error(`获取系统信息失败: ${error.message}`);
    }
  }

  async testConnection() {
    try {
      await this.login();
      const deviceInfo = await this.getDeviceInfo();
      return { success: true, message: '连接成功', deviceInfo };
    } catch (error) {
      return { success: false, message: error.message };
    }
  }

  async logout() {
    try {
      if (this.session) {
        await this.request('magicBox.logout');
        this.session = null;
      }
    } catch (error) {
      console.error('登出失败:', error);
    }
  }
}

module.exports = DahuaService;
