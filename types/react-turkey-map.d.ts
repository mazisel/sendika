declare module 'react-turkey-map' {
  import { ComponentType, CSSProperties } from 'react';

  export interface TurkeyMapProps {
    onClick?: (cityCode: string) => void;
    onHover?: (cityCode: string) => void;
    showTooltip?: boolean;
    colorData?: Record<string, string>;
    cityData?: Array<{
      plate: string;
      color?: string;
      data?: unknown;
    }>;
    hoverBorderColor?: string;
    hoverBorderWidth?: number;
    hoverColor?: string;
    customStyle?: CSSProperties;
    selected?: string;
  }

  const TurkeyMapComponent: ComponentType<TurkeyMapProps>;
  export default TurkeyMapComponent;
}
