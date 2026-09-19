/**
 * panel/requestType 映射（对照快照 `constants/queryBuilder.ts PANEL_TYPES`
 * + `prepareQueryRangePayloadV5.mapPanelTypeToRequestType`，逻辑一致）。
 */
export const PANEL_TYPES = {
  TIME_SERIES: 'graph',
  VALUE: 'value',
  TABLE: 'table',
  LIST: 'list',
  TRACE: 'trace',
  BAR: 'bar',
  PIE: 'pie',
  HISTOGRAM: 'histogram',
  ROW: 'row',
} as const;

export type PanelType = (typeof PANEL_TYPES)[keyof typeof PANEL_TYPES] | string;

export type RequestType = 'scalar' | 'time_series' | 'trace' | 'raw' | 'distribution' | '';

export function mapPanelTypeToRequestType(panelType: string): RequestType {
  switch (panelType) {
    case PANEL_TYPES.TIME_SERIES:
    case PANEL_TYPES.BAR:
      return 'time_series';
    case PANEL_TYPES.TABLE:
    case PANEL_TYPES.PIE:
    case PANEL_TYPES.VALUE:
      return 'scalar';
    case PANEL_TYPES.TRACE:
      return 'trace';
    case PANEL_TYPES.LIST:
      return 'raw';
    case PANEL_TYPES.HISTOGRAM:
      return 'distribution';
    default:
      return '';
  }
}
