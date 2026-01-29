# NVR设备监控系统 - API接口文档

## 概述

本文档描述了NVR设备监控系统的后端API接口规范。所有接口均采用RESTful风格，使用JSON格式进行数据交换。

## 基础信息

- **基础URL**: `/api`
- **认证方式**: Bearer Token (JWT)
- **响应格式**: JSON

## 认证接口

### 1. 用户登录

**接口地址**: `POST /api/auth/login`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| username | String | 是 | 用户名 |
| password | String | 是 | 密码 |

**响应示例**:
```json
{
  "success": true,
  "message": "登录成功",
  "data": {
    "token": "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9...",
    "user": {
      "id": "550e8400-e29b-41d4-a716-446655440000",
      "username": "admin",
      "realName": "系统管理员",
      "role": "ADMIN",
      "companyId": "...",
      "companyName": "总部"
    }
  }
}
```

### 2. 用户登出

**接口地址**: `POST /api/auth/logout`

**请求头**: `Authorization: Bearer <token>`

### 3. 获取用户信息

**接口地址**: `GET /api/auth/profile`

**请求头**: `Authorization: Bearer <token>`

### 4. 修改密码

**接口地址**: `PUT /api/auth/password`

**请求头**: `Authorization: Bearer <token>`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| oldPassword | String | 是 | 原密码 |
| newPassword | String | 是 | 新密码 |

## 公司管理接口

### 1. 获取公司列表

**接口地址**: `GET /api/companies`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| keyword | String | 否 | 搜索关键词 |
| status | String | 否 | 状态: 1-启用, 0-禁用 |

### 2. 获取公司树结构

**接口地址**: `GET /api/companies/tree`

### 3. 获取公司详情

**接口地址**: `GET /api/companies/:id`

### 4. 创建公司

**接口地址**: `POST /api/companies`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | String | 是 | 公司名称 |
| code | String | 是 | 公司编码 |
| parentId | String | 否 | 上级公司ID |
| address | String | 否 | 地址 |
| contactPerson | String | 否 | 联系人 |
| contactPhone | String | 否 | 联系电话 |
| remarks | String | 否 | 备注 |

### 5. 更新公司

**接口地址**: `PUT /api/companies/:id`

### 6. 删除公司

**接口地址**: `DELETE /api/companies/:id`

## 设备管理接口

### 1. 获取设备列表

**接口地址**: `GET /api/devices`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Number | 否 | 页码, 默认1 |
| limit | Number | 否 | 每页数量, 默认20 |
| keyword | String | 否 | 搜索关键词 |
| companyId | String | 否 | 公司ID |
| brand | String | 否 | 品牌: HIKVISION, DAHUA |
| status | String | 否 | 状态: ACTIVE, INACTIVE |

### 2. 获取全部设备

**接口地址**: `GET /api/devices/all`

### 3. 获取设备详情

**接口地址**: `GET /api/devices/:id`

### 4. 获取支持的品牌

**接口地址**: `GET /api/devices/brands`

### 5. 创建设备

**接口地址**: `POST /api/devices`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| name | String | 是 | 设备名称 |
| code | String | 是 | 设备编码 |
| brand | String | 是 | 品牌 |
| ipAddress | String | 是 | IP地址 |
| port | Number | 是 | 端口号 |
| username | String | 是 | 设备用户名 |
| password | String | 是 | 设备密码 |
| companyId | String | 是 | 所属公司ID |
| model | String | 否 | 设备型号 |
| channelCount | Number | 否 | 通道数量 |
| remarks | String | 否 | 备注 |

### 6. 更新设备

**接口地址**: `PUT /api/devices/:id`

### 7. 删除设备

**接口地址**: `DELETE /api/devices/:id`

### 8. 测试设备连接

**接口地址**: `POST /api/devices/:id/test`

### 9. 采集设备数据

**接口地址**: `POST /api/devices/:id/collect`

### 10. 获取设备历史状态

**接口地址**: `GET /api/devices/:id/history`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| startTime | Date | 否 | 开始时间 |
| endTime | Date | 否 | 结束时间 |
| limit | Number | 否 | 返回条数, 默认100 |

## 监控数据接口

### 1. 获取实时监控数据

**接口地址**: `GET /api/monitor/realtime`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| companyId | String | 否 | 公司ID |
| brand | String | 否 | 品牌 |
| onlineStatus | String | 否 | 在线状态: true, false |

**响应示例**:
```json
{
  "success": true,
  "data": {
    "devices": [
      {
        "id": "...",
        "name": "NVR-01",
        "ipAddress": "192.168.1.100",
        "brand": "HIKVISION",
        "isOnline": true,
        "diskUsageRate": 75.5,
        "channelInfo": {
          "online": 8,
          "total": 16
        },
        "recordingStatus": "RECORDING"
      }
    ],
    "summary": {
      "total": 100,
      "online": 85,
      "offline": 15,
      "avgDiskUsage": 65.2
    }
  }
}
```

### 2. 获取设备趋势数据

**接口地址**: `GET /api/monitor/device/:id/trend`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| period | String | 否 | 时间周期: 24h, 7d, 30d |

### 3. 获取监控统计

**接口地址**: `GET /api/monitor/statistics`

### 4. 全量数据采集

**接口地址**: `POST /api/monitor/collect/all`

## 告警管理接口

### 1. 获取告警列表

**接口地址**: `GET /api/alarms`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| page | Number | 否 | 页码 |
| limit | Number | 否 | 每页数量 |
| deviceId | String | 否 | 设备ID |
| companyId | String | 否 | 公司ID |
| alarmType | String | 否 | 告警类型 |
| alarmLevel | String | 否 | 告警级别 |
| status | String | 否 | 状态 |
| startTime | Date | 否 | 开始时间 |
| endTime | Date | 否 | 结束时间 |

### 2. 获取待处理告警

**接口地址**: `GET /api/alarms/pending`

### 3. 获取告警统计

**接口地址**: `GET /api/alarms/statistics`

### 4. 获取告警趋势

**接口地址**: `GET /api/alarms/trend`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| days | Number | 否 | 天数, 默认7 |

### 5. 处理告警

**接口地址**: `POST /api/alarms/:id/handle`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| handleContent | String | 是 | 处理意见 |

### 6. 批量处理告警

**接口地址**: `PUT /api/alarms/batch/handle`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| alarmIds | Array | 是 | 告警ID列表 |
| handleContent | String | 是 | 处理意见 |

## 仪表盘接口

### 1. 获取概览数据

**接口地址**: `GET /api/dashboard/overview`

### 2. 获取设备统计

**接口地址**: `GET /api/dashboard/device-stats`

### 3. 获取品牌分布

**接口地址**: `GET /api/dashboard/brand-distribution`

### 4. 获取硬盘使用率图表数据

**接口地址**: `GET /api/dashboard/disk-usage-chart`

### 5. 获取在线状态图表数据

**接口地址**: `GET /api/dashboard/online-status-chart`

### 6. 获取告警趋势

**接口地址**: `GET /api/dashboard/alarm-trend`

### 7. 获取最新告警

**接口地址**: `GET /api/dashboard/recent-alarms`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| limit | Number | 否 | 返回数量, 默认10 |

### 8. 获取设备排行

**接口地址**: `GET /api/dashboard/top-devices`

**请求参数**:
| 参数名 | 类型 | 必填 | 说明 |
|--------|------|------|------|
| type | String | 否 | 类型: disk, offline |
| limit | Number | 否 | 返回数量, 默认10 |

## 错误码说明

| 错误码 | 说明 |
|--------|------|
| 400 | 请求参数错误 |
| 401 | 未认证或Token过期 |
| 403 | 无权限访问 |
| 404 | 请求的资源不存在 |
| 500 | 服务器内部错误 |
