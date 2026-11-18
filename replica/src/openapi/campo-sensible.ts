import { ApiProperty, ApiPropertyOptions } from '@nestjs/swagger';

/**
 * Campos que el OpenAPI marca con `x-sensitive: true` (DP-52, design D3).
 * Cada uno guarda la clase que lo declara y el nombre de la propiedad; el generador agrega la marca al esquema.
 */
export interface CampoRegistrado {
  clase: string;
  propiedad: string;
}

const registro: CampoRegistrado[] = [];

export function camposSensibles(): readonly CampoRegistrado[] {
  return registro;
}

/**
 * Igual que `@ApiProperty`, y además registra el campo como sensible. No depende de que
 * `@nestjs/swagger` copie las extensiones `x-` de `@ApiProperty`: la marca la agrega el generador.
 */
export function CampoSensible(opciones: ApiPropertyOptions = {}): PropertyDecorator {
  const propiedades = ApiProperty(opciones);
  return (objetivo: object, propiedad: string | symbol): void => {
    registro.push({ clase: objetivo.constructor.name, propiedad: String(propiedad) });
    propiedades(objetivo, propiedad);
  };
}
