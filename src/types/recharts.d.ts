// Recharts type declarations
declare module 'recharts' {
  export interface TooltipProps<TValue, TName> {
    contentStyle?: React.CSSProperties;
    formatter?: (value: TValue, name: TName, props: any) => React.ReactNode;
  }

  export interface AxisProps {
    dataKey?: string;
    tick?: React.CSSProperties | ((props: any) => React.ReactNode);
    tickLine?: boolean;
    axisLine?: React.CSSProperties | boolean;
    unit?: string;
  }

  export interface LineProps {
    type?: 'monotone' | 'linear';
    dataKey?: string;
    stroke?: string;
    strokeWidth?: number;
    dot?: boolean;
    activeDot?: React.CSSProperties | boolean;
  }

  export interface PieProps {
    data: any[];
    cx?: string | number;
    cy?: string | number;
    innerRadius?: number;
    outerRadius?: number;
    paddingAngle?: number;
    dataKey?: string;
  }
}
