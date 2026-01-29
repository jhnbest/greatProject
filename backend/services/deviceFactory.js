/**
 * NVR设备工厂服务
 * 根据设备品牌创建对应的服务实例
 */

const HikvisionService = require('./hikvisionService');
const DahuaService = require('./dahuaService');

class DeviceFactory {
  static createService(brand, config) {
    switch (brand.toUpperCase()) {
      case 'HIKVISION':
      case '海康':
      case 'HK':
        return new HikvisionService(config);
      case 'DAHUA':
      case '大华':
      case 'DH':
        return new DahuaService(config);
      default:
        throw new Error(`不支持的设备品牌: ${brand}`);
    }
  }

  static getSupportedBrands() {
    return [
      { code: 'HIKVISION', name: '海康威视', shortName: '海康' },
      { code: 'DAHUA', name: '大华', shortName: '大华' }
    ];
  }

  static async testConnection(brand, config) {
    const service = this.createService(brand, config);
    return await service.testConnection();
  }
}

module.exports = DeviceFactory;
