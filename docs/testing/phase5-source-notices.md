# Phase 5 — 来源署名展示工程

2026-09-07，LEG-04a。LEG-04 最终审查仍未完成。

首页提供 EN/FR/ES 来源与许可入口，包含登记的八个数据来源；地图/路线处理方另属 LEG-05。区分开发验证、计划接入、质量禁用与授权缺失，目录不是实时覆盖承诺。Reve 保持禁用，静态 EV 不冒充实时可用性。

紧凑列表与详情默认显示来源署名，不再要求展开证据；已登记来源的署名连接其固定许可地址。目录提供来源和许可按钮、失败提示、转换说明及不代表来源背书说明。MITECO 原始署名在三语页保留西班牙语原文。只允许静态登记链接，不把任意 API URL 交给外部打开器。

核对依据（2026-09-07）：[OSMF 署名指南](https://osmfoundation.org/wiki/Licence/Attribution_Guidelines)要求署名可见、易读和适当许可链接；[Licence Ouverte 2.0](https://www.data.gouv.fr/pages/legal/licences/etalab-2.0)、[CC BY 4.0](https://creativecommons.org/licenses/by/4.0/)及[MITECO 法律通知](https://www.datosabiertos.miteco.gob.es/es/aviso-legal.html)是各来源复核入口。工程页面不替代逐数据集授权证据。

验证：5 项目录/固定链接测试、3 项三语首页→目录→来源/失败恢复→返回交互、1 项折叠卡署名回归；移动端 179 tests、全量 890 tests、完整质量检查、双平台 bundle 与原生隐私配置检查通过。UI 组件测试与 bundle 不替代真实设备读屏/字号及原生外链验收。

待发布前关闭：OSM 衍生数据库/提供与混合使用义务、MITECO Fuel 历史许可措辞、实际分发版完整署名和日期、地图提供方标识。未开启公共 Beta 或任何新增数据授权。
